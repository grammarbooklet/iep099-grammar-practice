// IEP099 grammar practice — the "keep coming back" layer: a daily streak, per-unit progress and mastery,
// the mistakes a student still has to fix, and the small rewards after each check. Everything is derived
// from what practice.js already saves in this browser's own localStorage — nothing is sent anywhere, and
// there are no accounts, so all of it is per device (clearing browser data starts it over).
//
// Loaded on every student-facing page (see head() in generate.mjs). IEP_DATA (site-data.js) tells it how
// big each unit is; without it the unit-level features quietly do nothing.
(function () {
  "use strict";
  var RESULTS_KEY = "iep099-results", DAYS_KEY = "iep099-days", DAILY_KEY = "iep099-daily";
  var MASTERY = 0.9; // a unit counts as mastered at 90% of all its questions, once every activity is done

  function read(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dayStr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dayStr(new Date()); }
  function shiftDay(str, delta) { var p = str.split("-"); return dayStr(new Date(+p[0], +p[1] - 1, +p[2] + delta)); }
  function data() { return window.IEP_DATA || null; }
  function results() { return read(RESULTS_KEY, {}); }

  // ---------- daily streak ----------
  function recordDay() {
    var days = read(DAYS_KEY, []), t = today();
    if (days.indexOf(t) === -1) { days.push(t); days.sort(); write(DAYS_KEY, days.slice(-400)); }
  }
  // Consecutive days with any practice, counting today if done, otherwise up to yesterday (so a student who
  // hasn't practiced yet today still sees the streak they're about to extend rather than a reset to zero).
  function streak() {
    var set = {}; read(DAYS_KEY, []).forEach(function (d) { set[d] = 1; });
    var cursor = today();
    if (!set[cursor]) cursor = shiftDay(cursor, -1);
    var n = 0;
    while (set[cursor]) { n++; cursor = shiftDay(cursor, -1); }
    return n;
  }
  function practicedToday() { return read(DAYS_KEY, []).indexOf(today()) !== -1; }
  function renderStreak() {
    var badge = document.getElementById("streakBadge"), text = document.getElementById("streakText");
    if (!badge || !text) return;
    var n = streak();
    if (n < 1) { badge.hidden = true; return; }
    text.textContent = n + "-day streak";
    badge.title = practicedToday() ? "Nice — you've practiced today. Come back tomorrow to keep it going." : "Practice today to keep your " + n + "-day streak alive.";
    badge.hidden = false;
  }

  // ---------- Daily 5 bookkeeping ----------
  function dailyDoneToday() { var d = read(DAILY_KEY, null); return !!(d && d.date === today()); }
  function recordDaily(score) { write(DAILY_KEY, { date: today(), score: score }); }

  // ---------- unit progress ----------
  function unitStats(unitKey, res) {
    var D = data(); if (!D) return null;
    var u = null; D.units.forEach(function (x) { if (x.key === unitKey) u = x; });
    if (!u) return null;
    res = res || results();
    var done = 0, correct = 0;
    u.acts.forEach(function (id) { var r = res[id]; if (r) { done++; correct += Math.min(r.correct, D.act[id].n); } });
    var pct = u.total ? correct / u.total : 0;
    return { unit: u, done: done, acts: u.acts.length, correct: correct, total: u.total, pct: pct, mastered: done === u.acts.length && pct >= MASTERY };
  }

  // The topic a student is doing worst on, once they've answered enough questions in it to mean something.
  function weakestTopic(res) {
    var D = data(); if (!D) return null;
    res = res || results();
    var agg = {};
    Object.keys(res).forEach(function (id) {
      var a = D.act[id]; if (!a) return;
      var r = res[id], t = agg[a.t] = agg[a.t] || { c: 0, n: 0 };
      t.c += Math.min(r.correct, r.total); t.n += r.total;
    });
    var best = null;
    Object.keys(agg).forEach(function (tid) {
      var t = agg[tid]; if (t.n < 10) return;
      var pct = t.c / t.n;
      if (pct < 0.8 && (!best || pct < best.pct)) best = { id: tid, pct: pct };
    });
    if (!best) return null;
    var found = null;
    D.units.forEach(function (u) { u.topics.forEach(function (t) { if (t.id === best.id) found = { id: t.id, title: t.title, href: t.href, pct: best.pct, unit: u }; }); });
    return found;
  }

  // ---------- mistakes to fix ----------
  // One entry per activity that still has wrong answers: { id, idx: [item indexes] }. Activities checked
  // before item-level results were saved have no list, so every item of theirs is offered for a re-check.
  function mistakes(res) {
    var D = data(); if (!D) return [];
    res = res || results();
    var out = [];
    Object.keys(res).forEach(function (id) {
      var a = D.act[id], r = res[id]; if (!a || r.correct >= r.total) return;
      var idx;
      if (Array.isArray(r.wrong)) idx = r.wrong.slice();
      else { idx = []; for (var i = 0; i < a.n; i++) idx.push(i); }
      if (idx.length) out.push({ id: id, idx: idx, legacy: !Array.isArray(r.wrong) });
    });
    return out;
  }
  function mistakeCount(res) { return mistakes(res).reduce(function (n, m) { return n + m.idx.length; }, 0); }

  // ---------- rewards ----------
  function confetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var c = document.createElement("canvas");
    c.className = "confetti"; c.width = window.innerWidth; c.height = window.innerHeight;
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    var colors = ["#07B8A5", "#FCAD1B", "#B3372F", "#6C7BD6", "#FFFFFF"];
    var parts = [];
    for (var i = 0; i < 140; i++) parts.push({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.4, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4, s: 6 + Math.random() * 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, col: colors[i % colors.length] });
    var start = null;
    function frame(t) {
      if (start === null) start = t;
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      });
      if (t - start < 2600) requestAnimationFrame(frame); else c.remove();
    }
    requestAnimationFrame(frame);
  }

  // Called by practice.js right after a real activity page is checked and its result saved.
  function afterCheck(container, id, right, total) {
    if (window.IEPBadges) window.IEPBadges.announce();
    recordDay();
    renderStreak();
    var old = container.querySelector(".after-check"); if (old) old.remove();
    if (total > 0 && right === total) confetti();
    var D = data(); if (!D || !D.act[id]) return;
    var st = unitStats(D.act[id].u); if (!st) return;
    var left = st.acts - st.done, u = st.unit, nextId = u.acts[u.acts.indexOf(id) + 1];

    var wrap = document.createElement("div"); wrap.className = "after-check";
    var msg = document.createElement("p"); msg.className = "after-msg";
    var lead = right === total && total > 0 ? "Perfect score! " : "";
    msg.textContent = lead + (left > 0
      ? left + (left === 1 ? " activity" : " activities") + " left to finish Unit " + u.num + "."
      : "You've done every activity in Unit " + u.num + "!");
    wrap.appendChild(msg);
    var link = document.createElement("a"); link.className = "next-btn";
    if (nextId) { link.href = D.act[nextId].h; link.textContent = "Next activity →"; }
    else { link.href = u.href; link.textContent = "Back to Unit " + u.num + " →"; }
    wrap.appendChild(link);
    container.appendChild(wrap);
  }

  // ---------- catalog / unit-page decorations ----------
  function ringHtml(pct, mastered) {
    var c = 2 * Math.PI * 15, off = c * (1 - Math.min(1, pct));
    return '<svg viewBox="0 0 36 36" class="ring-svg" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="15"/>' +
      '<circle class="ring-fg' + (mastered ? " done" : "") + '" cx="18" cy="18" r="15" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 18 18)"/>' +
      (mastered ? '<path class="ring-check" d="M12 18.5l4 4 8-9"/>' : "") + "</svg>" +
      (mastered ? "" : '<span class="ring-pct">' + Math.round(pct * 100) + "</span>");
  }
  function decorate() {
    var res = results();
    Array.prototype.forEach.call(document.querySelectorAll("a.toc-topic[data-unit], a.pu-row[data-unit]"), function (a) {
      var st = unitStats(a.getAttribute("data-unit"), res); if (!st || a.querySelector(".ring")) return;
      var ring = document.createElement("span"); ring.className = "ring" + (st.mastered ? " mastered" : "");
      ring.title = st.done + " of " + st.acts + " activities done · " + Math.round(st.pct * 100) + "% correct overall";
      ring.innerHTML = ringHtml(st.pct, st.mastered);
      a.insertBefore(ring, a.firstChild);
      if (st.mastered) {
        var tag = document.createElement("span"); tag.className = "mastered-tag"; tag.textContent = "Mastered";
        var count = a.querySelector(".count"); a.insertBefore(tag, count || a.querySelector(".arrow"));
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".unit-progress[data-unit]"), function (p) {
      var st = unitStats(p.getAttribute("data-unit"), res); if (!st) return;
      p.textContent = st.done === 0
        ? "Not started yet — " + st.acts + " activities in this unit."
        : st.done + " of " + st.acts + " activities done · " + Math.round(st.pct * 100) + "% correct" + (st.mastered ? " · Mastered" : "");
      p.hidden = false;
    });
  }

  function init() { renderStreak(); decorate(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.IEPEngage = {
    MASTERY: MASTERY, read: read, write: write, results: results, today: today, shiftDay: shiftDay, dayStr: dayStr,
    recordDay: recordDay, streak: streak, practicedToday: practicedToday, renderStreak: renderStreak,
    dailyDoneToday: dailyDoneToday, recordDaily: recordDaily,
    unitStats: unitStats, weakestTopic: weakestTopic, mistakes: mistakes, mistakeCount: mistakeCount,
    confetti: confetti, afterCheck: afterCheck, decorate: decorate, RESULTS_KEY: RESULTS_KEY
  };
})();
