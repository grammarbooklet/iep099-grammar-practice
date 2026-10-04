/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// Writing Center — progress storage and reward rules. No page code lives here: the trail map and the lesson
// player both read and write progress through this one module, so the same rules (and, later, the same saved
// record) can be reused by an installable app.
//
// Saved in this browser only: localStorage "iep099-wc" = { v, xp, lessons: { "1.1": {stars, best, done, built,
// revised, skipped, tries} }, badges: [ids], builds: { "1.1": { draft, revision } } }. Nothing is sent anywhere.
//
// Reward rules (learning, not repetition):
//   - XP is earned for FIRST completion, for each extra star, for the first Build It, and for the first revision.
//     Replaying a lesson earns XP only if it improves the star rating — an unchanged replay earns nothing.
//   - A lesson's third star needs the Build It to have been written; skipping the writing caps it at 2 stars.
//   - A level needs both the XP and the Writing Center stages it is named for, so a learner can't reach
//     "Paragraph Pro" from sentence lessons alone.
(function () {
  "use strict";
  var KEY = "iep099-wc";
  var E = window.IEPEngage;

  // `stages` = how many Writing Center stages (counting from Stage 1) must be fully completed.
  var LEVELS = [
    { n: 1, name: "Sentence Starter", min: 0, stages: 0 },
    { n: 2, name: "Sentence Builder", min: 150, stages: 1 },
    { n: 3, name: "Sentence Crafter", min: 350, stages: 2 },
    { n: 4, name: "Link Builder", min: 600, stages: 3 },
    { n: 5, name: "Paragraph Pro", min: 900, stages: 4 },
    { n: 6, name: "Essay Planner", min: 1200, stages: 5 },
    { n: 7, name: "Essay Writer", min: 1500, stages: 6 }
  ];
  var XP = { first: 20, star: 10, build: 15, revise: 10 };

  var BADGES = {}; // retired: badges now live in badges.js

  function read() {
    var r = null;
    try { r = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!r || typeof r !== "object") r = {};
    r.v = 1; r.xp = r.xp || 0; r.lessons = r.lessons || {}; r.badges = r.badges || []; r.builds = r.builds || {};
    r.skills = r.skills || {}; r.portfolio = r.portfolio || []; r.progress = r.progress || {}; r.days = r.days || [];
    return r;
  }
  function write(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) {} }

  function done(r, id) { return !!(r.lessons[id] && r.lessons[id].done); }
  function doneCount(r) { return Object.keys(r.lessons).filter(function (k) { return r.lessons[k].done; }).length; }
  function count(r, field) { return Object.keys(r.lessons).filter(function (k) { return r.lessons[k][field]; }).length; }
  function anyStars(r, n) { return Object.keys(r.lessons).some(function (k) { return r.lessons[k].stars >= n; }); }
  function starsOf(r, id) { return r.lessons[id] && r.lessons[id].stars || 0; }

  // A stage counts as complete only when every one of its lessons exists and has been finished.
  function stageComplete(r, n) {
    var idx = window.__WC_IDX; if (!idx) return false;
    var st = idx.stages.filter(function (s) { return s.n === n; })[0];
    return !!st && st.lessons.length > 0 && st.lessons.every(function (l) { return l.ready && done(r, l.id); });
  }
  function stagesDone(r) { var n = 0; while (n < 6 && stageComplete(r, n + 1)) n++; return n; }

  // The highest level whose XP and stage requirements are both met. `need` says what is holding the learner back.
  function level(xp, r) {
    var sd = stagesDone(r || read()), cur = LEVELS[0];
    LEVELS.forEach(function (l) { if (xp >= l.min && sd >= l.stages) cur = l; });
    var next = LEVELS[cur.n] || null, need = "";
    if (next && xp >= next.min && sd < next.stages) need = "Finish Stage " + (sd + 1) + " to reach " + next.name + ".";
    return { n: cur.n, name: cur.name, min: cur.min, next: next, need: need, pct: next ? Math.max(0, Math.min(100, Math.round((xp - cur.min) / (next.min - cur.min) * 100))) : 100 };
  }

  // 3 stars at 90%+, 2 at 70%+, otherwise 1 for finishing. Skipping the writing caps the lesson at 2 stars.
  function starsFor(pct, built) {
    var s = pct >= 90 ? 3 : pct >= 70 ? 2 : 1;
    return built ? s : Math.min(s, 2);
  }

  // Records a finished lesson. The best result is kept, so a weaker retry never lowers earned stars or XP.
  // Returns what changed so the reward screen can say honestly why XP was (or wasn't) earned.
  function complete(id, o) {
    var r = read(), cur = r.lessons[id] || { stars: 0, best: 0, tries: 0 };
    var snapshot = JSON.parse(JSON.stringify(r)), oldLevel = level(r.xp, snapshot);
    var first = !cur.done, gained = 0, built = !!(o.built || cur.built), stars = starsFor(o.pct, built);
    if (!first && cur.stars <= 1 && stars >= 3) r.bounce = true; // badge: raised a lesson from 1 star to 3
    var tdy = today(); if (r.days.indexOf(tdy) === -1) r.days.push(tdy);
    if (first) gained += XP.first;
    if (stars > cur.stars) gained += (stars - cur.stars) * XP.star;
    if (o.built && !cur.built) gained += XP.build;
    if (o.revised && !cur.revised) gained += XP.revise;
    cur.stars = Math.max(cur.stars, stars);
    cur.best = Math.max(cur.best, o.pct);
    cur.done = cur.done || new Date().toISOString();
    cur.skipped = false;
    cur.tries = (cur.tries || 0) + 1;
    if (o.built) {
      cur.built = true;
      if (o.revised) cur.revised = true;
      if (o.draft) r.builds[id] = { draft: String(o.draft).slice(0, 4000), revision: o.revision ? String(o.revision).slice(0, 4000) : "" };
    }
    r.lessons[id] = cur;
    delete r.progress[id]; // finished: the reached-so-far marker is no longer needed
    r.xp += gained;
    var earned = [];
    Object.keys(BADGES).forEach(function (b) {
      if (r.badges.indexOf(b) === -1 && BADGES[b].test(r)) { r.badges.push(b); earned.push(b); }
    });
    write(r);
    if (E) E.recordDay();
    var lv = level(r.xp, r);
    return { gained: gained, stars: cur.stars, earned: earned, level: lv, levelUp: lv.n > oldLevel.n, record: r, first: first, capped: !built && o.pct >= 90 };
  }

  // A passed stage review marks the stage's unfinished lessons as skipped: counted as done, with one star.
  function markSkipped(ids) {
    var r = read();
    ids.forEach(function (id) {
      if (!done(r, id)) r.lessons[id] = { stars: 1, best: 0, tries: 0, done: new Date().toISOString(), skipped: true };
    });
    write(r);
  }

  var indexPromise = null;
  function index() {
    if (!indexPromise) indexPromise = fetch("writing-content/index.json").then(function (x) { return x.json(); }).then(function (d) {
      window.__WC_IDX = d;
      return d;
    });
    return indexPromise;
  }

  // The first ready lesson not yet done, in path order (falls back to the first lesson).
  function nextLesson(idx, r) {
    var found = null, first = null;
    idx.stages.forEach(function (s) {
      s.lessons.forEach(function (l) {
        if (!l.ready) return;
        if (!first) first = { stage: s, lesson: l };
        if (!found && !done(r, l.id)) found = { stage: s, lesson: l };
      });
    });
    return found || first;
  }

  // "done" counts lessons genuinely finished; lessons skipped by passing the stage check are counted apart,
  // so a ring and a tick only ever show real completion.
  function stageProgress(stage, r) {
    var ready = stage.lessons.filter(function (l) { return l.ready; });
    var skipped = ready.filter(function (l) { return done(r, l.id) && r.lessons[l.id].skipped; }).length;
    return { done: ready.filter(function (l) { return done(r, l.id); }).length - skipped, skipped: skipped, ready: ready.length, total: stage.lessons.length };
  }
  // Where the learner has got to inside an unfinished lesson (shown on the path as a partly filled circle).
  function setProgress(id, n, of, label) {
    var r = read();
    if (r.lessons[id] && r.lessons[id].done) return; // replaying a finished lesson: leave its tick alone
    r.progress[id] = { n: n, of: of, label: label, at: new Date().toISOString() }; write(r);
  }

  // ---------- skill strength and the review schedule ----------
  // Every question belongs to a skill. A skill's strength (0–5) rises on a correct first try (+1) or after a
  // hint (+0.5) and falls on a miss (−0.5). The stronger the skill, the longer until it comes back for review.
  var STEPS = [0, 1, 3, 7, 14, 30];
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dayStr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dayStr(new Date()); }
  function addDays(str, n) { var p = str.split("-"); return dayStr(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
  function daysBetween(a, b) { var x = a.split("-"), y = b.split("-"); return Math.round((new Date(+y[0], +y[1] - 1, +y[2]) - new Date(+x[0], +x[1] - 1, +x[2])) / 86400000); }

  // kind: "first" (right first try), "helped" (right after a hint), "miss".
  function skillResult(skill, kind) {
    if (!skill) return null;
    var r = read(), s = r.skills[skill] || { s: 0, seen: 0, miss: 0 };
    s.seen++;
    if (kind === "miss") { s.s = Math.max(0, s.s - 0.5); s.miss++; }
    else {
      // A skill can only grow by 1 point a day, so repeating questions in one sitting can't "farm" mastery:
      // real mastery needs the skill to come back on later days.
      var t = today(), used = s.gd === t ? (s.ga || 0) : 0, gain = Math.min(kind === "first" ? 1 : 0.5, Math.max(0, 1 - used));
      s.s = Math.min(5, s.s + gain); s.gd = t; s.ga = used + gain;
    }
    s.due = addDays(today(), STEPS[Math.floor(s.s)]);
    r.skills[skill] = s; write(r);
    return s;
  }
  // Skills due for review today (or overdue), weakest first.
  function dueSkills(r) {
    r = r || read();
    return Object.keys(r.skills).filter(function (k) { return r.skills[k].due && r.skills[k].due <= today(); })
      .sort(function (a, b) { return r.skills[a].s - r.skills[b].s; });
  }

  // ---------- portfolio: every piece the learner writes, with each version ----------
  function savePiece(o) {
    var r = read(), p = r.portfolio.filter(function (x) { return x.id === o.id; })[0];
    if (!p) { p = { id: o.id, lesson: o.lesson, title: o.title, prompt: o.prompt, versions: [], fav: false }; r.portfolio.push(p); }
    var last = p.versions[p.versions.length - 1];
    if (!last || last.text !== o.text) p.versions.push({ text: String(o.text).slice(0, 4000), at: new Date().toISOString(), kind: o.kind || "draft" });
    if (r.portfolio.length > 80) r.portfolio = r.portfolio.slice(-80);
    write(r); return p;
  }
  function toggleFav(id) { var r = read(); r.portfolio.forEach(function (p) { if (p.id === id) p.fav = !p.fav; }); write(r); }

  // ---------- backup and restore (no accounts, so the learner keeps their own copy) ----------
  // The code is the whole record, encoded as text. Restoring MERGES it with what's on the device (keeping the
  // better of each), so restoring never wipes out newer work.
  // Besides the Writing Center record, the backup carries what badges depend on (earned badges, speaking sessions,
  // Daily 5, practice sets, fixed mistakes) and the grammar practice progress, so a restore brings everything back.
  function jget(k, fb) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } }
  function readExt() {
    return { badges: jget("iep099-badges", {}), speak: jget("iep099-speak", {}), dailylog: jget("iep099-dailylog", []),
      fixed: parseInt(localStorage.getItem("iep099-fixed"), 10) || 0, sets: jget("iep099-sets", {}),
      results: jget("iep099-results", {}), days: jget("iep099-days", []) };
  }
  function applyExt(x) {
    if (!x || typeof x !== "object") return;
    function put(k, v) { try { localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); } catch (e) {} }
    var cur = readExt(), b = Object.assign({}, x.badges || {}, cur.badges);          // keep the earliest date for each badge
    Object.keys(x.badges || {}).forEach(function (k) { if (cur.badges[k] && x.badges[k] < cur.badges[k]) b[k] = x.badges[k]; });
    put("iep099-badges", b);
    var sp = cur.speak, xs = x.speak || {};
    sp.n = Math.max(sp.n || 0, xs.n || 0); sp.l90 = Math.max(sp.l90 || 0, xs.l90 || 0); sp.f120 = Math.max(sp.f120 || 0, xs.f120 || 0);
    sp.themes = Object.assign({}, xs.themes || {}, sp.themes || {}); put("iep099-speak", sp);
    put("iep099-dailylog", (x.dailylog || []).length > cur.dailylog.length ? x.dailylog : cur.dailylog);
    put("iep099-fixed", String(Math.max(cur.fixed, x.fixed || 0)));
    var st = cur.sets, xt = x.sets || {}; st.self = Math.max(st.self || 0, xt.self || 0); st.assigned = Math.max(st.assigned || 0, xt.assigned || 0); put("iep099-sets", st);
    var rs = cur.results; Object.keys(x.results || {}).forEach(function (id) { var a = rs[id], c = x.results[id]; if (!a || (c.correct || 0) > (a.correct || 0)) rs[id] = c; }); put("iep099-results", rs);
    var ds = cur.days.slice(); (x.days || []).forEach(function (d) { if (ds.indexOf(d) === -1) ds.push(d); }); ds.sort(); put("iep099-days", ds);
  }
  function exportCode() {
    var rec = read(); rec.ext = readExt();
    var json = JSON.stringify(rec);
    return "WC1." + btoa(unescape(encodeURIComponent(json)));
  }
  function parseCode(text) {
    var t = String(text || "").trim();
    if (t.indexOf("WC1.") === 0) t = decodeURIComponent(escape(atob(t.slice(4))));
    var o = JSON.parse(t);
    if (!o || typeof o !== "object" || typeof o.lessons !== "object" || typeof (o.xp || 0) !== "number") throw new Error("not a Writing Center backup");
    return o;
  }
  function merge(a, b) {
    var out = JSON.parse(JSON.stringify(a));
    out.xp = Math.max(a.xp || 0, b.xp || 0);
    Object.keys(b.lessons || {}).forEach(function (id) {
      var x = out.lessons[id], y = b.lessons[id];
      if (!x) { out.lessons[id] = y; return; }
      x.stars = Math.max(x.stars || 0, y.stars || 0); x.best = Math.max(x.best || 0, y.best || 0);
      x.built = x.built || y.built; x.revised = x.revised || y.revised;
      x.skipped = !!(x.skipped && y.skipped); x.tries = Math.max(x.tries || 0, y.tries || 0);
      if (y.done && (!x.done || y.done < x.done)) x.done = y.done;
    });
    out.badges = (out.badges || []).concat((b.badges || []).filter(function (k) { return (out.badges || []).indexOf(k) === -1; }));
    Object.keys(b.skills || {}).forEach(function (k) { var x = out.skills[k], y = b.skills[k]; if (!x || (y.seen || 0) > (x.seen || 0)) out.skills[k] = y; });
    (b.portfolio || []).forEach(function (p) {
      var q = out.portfolio.filter(function (z) { return z.id === p.id; })[0];
      if (!q) { out.portfolio.push(p); return; }
      var have = {}; q.versions.forEach(function (v) { have[v.at] = 1; });
      p.versions.forEach(function (v) { if (!have[v.at]) q.versions.push(v); });
      q.versions.sort(function (m, n) { return m.at < n.at ? -1 : 1; }); q.fav = q.fav || p.fav;
    });
    Object.keys(b.builds || {}).forEach(function (k) { if (!out.builds[k]) out.builds[k] = b.builds[k]; });
    (b.days || []).forEach(function (dd) { if (out.days.indexOf(dd) === -1) out.days.push(dd); });
    out.bounce = !!(out.bounce || b.bounce);
    Object.keys(b.progress || {}).forEach(function (k) { if (!out.progress[k] || b.progress[k].n > out.progress[k].n) out.progress[k] = b.progress[k]; });
    return out;
  }
  function importCode(text) {
    var o = parseCode(text), merged = merge(read(), o);
    write(merged); applyExt(o.ext); return merged;
  }

  window.WC = {
    LEVELS: LEVELS, XP: XP, BADGES: BADGES, STEPS: STEPS, read: read, write: write, level: level, starsFor: starsFor,
    complete: complete, markSkipped: markSkipped, index: index, nextLesson: nextLesson, stageProgress: stageProgress,
    setProgress: setProgress, skillResult: skillResult, dueSkills: dueSkills, today: today, addDays: addDays, daysBetween: daysBetween,
    savePiece: savePiece, toggleFav: toggleFav, exportCode: exportCode, importCode: importCode
  };
})();
