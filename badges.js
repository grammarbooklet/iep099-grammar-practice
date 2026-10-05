/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// IEP099 badges: 52 badges (the six speaking badges are paused until speaking has a proper home), every one locked until it is really earned. Each has a plain rule ("Finish 10 grammar
// activities") and a progress count, worked out from what this browser has saved (grammar results, practice days,
// speaking sessions, Daily 5, Writing Center). Nothing is sent anywhere. Once earned, a badge stays earned.
//
// Loaded on every student page: it adds a small badge icon (with a progress ring) to the top bar, shows a short
// toast when something new is earned, and exposes IEPBadges for the "My Writing Center" page.
(function () {
  "use strict";
  var KEY = "iep099-badges";

  function read(key, fb) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; } catch (e) { return fb; } }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  // Writing Center lesson ids by stage (the lessons exist in writing-content/; 5 and 6 are still being written).
  function range(stage, from, to) { var a = []; for (var i = from; i <= to; i++) a.push(stage + "." + i); return a; }
  var STAGES = { 1: range(1, 1, 9), 2: range(2, 1, 9), 3: range(3, 1, 10), 4: range(4, 1, 13), 5: range(5, 1, 9), 6: range(6, 1, 11) };
  var REVIEWS = ["1.9", "2.9", "3.10", "4.13", "5.9", "6.11"];

  function snapshot() {
    var wc = read("iep099-wc", {}) || {};
    wc.lessons = wc.lessons || {}; wc.skills = wc.skills || {}; wc.portfolio = wc.portfolio || []; wc.days = wc.days || [];
    var res = read("iep099-results", {}) || {};
    return { wc: wc, res: res, days: read("iep099-days", []) || [], speak: read("iep099-speak", {}) || {},
      daily: read("iep099-dailylog", []) || [], fixed: parseInt(localStorage.getItem("iep099-fixed"), 10) || 0, sets: read("iep099-sets", {}) || {} };
  }
  // Lessons genuinely finished (a lesson skipped by passing a stage check does not count).
  function real(s, id) { var l = s.wc.lessons[id]; return !!(l && l.done && !l.skipped); }
  function stars(s, id) { return real(s, id) ? (s.wc.lessons[id].stars || 0) : 0; }
  function doneIds(s) { return Object.keys(s.wc.lessons).filter(function (id) { return real(s, id); }); }
  function stageOf(id) { return parseInt(id.split(".")[0], 10); }
  function distinct(a) { var o = {}; a.forEach(function (x) { o[x] = 1; }); return Object.keys(o).length; }
  // A run of practice days. Friday and Saturday are the weekend: they never break a run (and do not count towards it).
  function isWeekend(str) { var p = str.split("-"), g = new Date(+p[0], +p[1] - 1, +p[2]).getDay(); return g === 5 || g === 6; }
  function prevCourseDay(str) { var c = shift(str, -1); while (isWeekend(c)) c = shift(c, -1); return c; }
  function bestRun(days) {
    var set = {}; days.forEach(function (d) { if (!isWeekend(d)) set[d] = 1; });
    var best = 0, ds = Object.keys(set).sort();
    ds.forEach(function (d) { var n = 0, cur = d; while (set[cur]) { n++; cur = prevCourseDay(cur); if (n > 400) break; } if (n > best) best = n; });
    return best;
  }
  function shift(str, n) { var p = str.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function count(n, need) { return { have: Math.min(n, need), need: need }; }

  // kind "w" = Writing Center and learning habits; kind "p" = grammar practice and speaking.
  var DEFS = [
    { id: "first-step", name: "First Step", kind: "w", how: "Finish your first Writing Center lesson.", prog: function (s) { return count(doneIds(s).length, 1); } },
    { id: "curiosity-seeker", name: "Curiosity Seeker", kind: "w", how: "Finish lessons in three different stages.", prog: function (s) { return count(distinct(doneIds(s).map(stageOf)), 3); } },
    { id: "focus-finder", name: "Focus Finder", kind: "w", how: "Get a perfect score on 3 lessons.", prog: function (s) { return count(doneIds(s).filter(function (id) { return s.wc.lessons[id].best >= 100; }).length, 3); } },
    { id: "skill-builder", name: "Skill Builder", kind: "w", how: "Raise a Writing Center skill to strength 4.", prog: function (s) { var m = 0; Object.keys(s.wc.skills).forEach(function (k) { m = Math.max(m, Math.floor(s.wc.skills[k].s || 0)); }); return count(m, 4); } },
    { id: "progress-climber", name: "Progress Climber", kind: "w", how: "Earn 500 Writing Center XP.", prog: function (s) { return count(Math.floor(s.wc.xp || 0), 500); } },
    { id: "punctuation-pro", name: "Punctuation Pro", kind: "w", how: "Earn 2 or more stars on lessons 1.5, 1.6 and 3.7.", prog: function (s) { return count(["1.5", "1.6", "3.7"].filter(function (id) { return stars(s, id) >= 2; }).length, 3); } },
    { id: "question-asker", name: "Question Asker", kind: "w", how: "Earn 2 or more stars on lesson 1.8, Statements and questions.", prog: function (s) { return count(stars(s, "1.8") >= 2 ? 1 : 0, 1); } },
    { id: "creative-thinker", name: "Creative Thinker", kind: "w", how: "Save 20 pieces of writing to your portfolio.", prog: function (s) { return count(s.wc.portfolio.length, 20); } },
    { id: "idea-connector", name: "Idea Connector", kind: "w", how: "Finish 5 lessons in Stage 3, Linking Words.", prog: function (s) { return count(doneIds(s).filter(function (id) { return stageOf(id) === 3; }).length, 5); } },
    { id: "idea-organizer", name: "Idea Organizer", kind: "w", how: "Finish lessons 4.6 and 4.7 (order and coherence).", prog: function (s) { return count(["4.6", "4.7"].filter(function (id) { return real(s, id); }).length, 2); } },
    { id: "pathfinder", name: "Pathfinder", kind: "w", how: "Finish every lesson in 3 different stages.", prog: function (s) {
      var full = Object.keys(STAGES).filter(function (k) { return STAGES[k].every(function (id) { return real(s, id); }); }).length;
      return count(full, 3);
    } },
    { id: "evidence-collector", name: "Evidence Collector", kind: "w", how: "Earn 2 or more stars on lessons 4.2 and 4.5.", prog: function (s) { return count(["4.2", "4.5"].filter(function (id) { return stars(s, id) >= 2; }).length, 2); } },
    { id: "plan-maker", name: "Plan Maker", kind: "w", how: "Finish a stage review lesson.", prog: function (s) { return count(REVIEWS.filter(function (id) { return real(s, id); }).length, 1); } },
    { id: "idea-generator", name: "Idea Generator", kind: "w", how: "Save 60 drafts and revisions.", prog: function (s) { return count(s.wc.portfolio.reduce(function (n, p) { return n + p.versions.length; }, 0), 60); } },
    { id: "draft-starter", name: "Draft Starter", kind: "w", how: "Save your first draft.", prog: function (s) { return count(s.wc.portfolio.length, 1); } },
    { id: "keep-improving", name: "Keep Improving", kind: "w", how: "Revise your writing in 3 lessons.", prog: function (s) { return count(doneIds(s).filter(function (id) { return s.wc.lessons[id].revised; }).length, 3); } },
    { id: "careful-checker", name: "Careful Checker", kind: "w", how: "Earn 3 stars on 20 lessons.", prog: function (s) { return count(doneIds(s).filter(function (id) { return stars(s, id) >= 3; }).length, 20); } },
    { id: "reading-explorer", name: "Reading Explorer", kind: "w", how: "Finish 30 Writing Center lessons.", prog: function (s) { return count(doneIds(s).length, 30); } },
    { id: "daily-learner", name: "Daily Learner", kind: "w", how: "Practise in the Writing Center on 4 different days.", prog: function (s) { return count(distinct(s.wc.days), 4); } },
    { id: "bounce-back", name: "Bounce Back", kind: "w", how: "Raise a lesson from 1 star to 3 stars.", prog: function (s) { return count(s.wc.bounce ? 1 : 0, 1); } },

    { id: "word-collector", name: "Word Collector", kind: "p", how: "Finish 20 grammar activities.", prog: function (s) { return count(Object.keys(s.res).length, 20); } },
    { id: "grammar-detective", name: "Grammar Detective", kind: "p", how: "Fix 8 earlier mistakes in Fix my mistakes.", prog: function (s) { return count(s.fixed, 8); } },
    { id: "word-roots-explorer", name: "Word Roots Explorer", kind: "p", how: "Finish grammar activities in 10 different units.", prog: function (s) { return count(distinct(Object.keys(s.res).map(function (k) { return s.res[k].unitTitle || s.res[k].unit; })), 10); } },
    { id: "pattern-spotter", name: "Pattern Spotter", kind: "p", how: "Finish the Daily 5 three times.", prog: function (s) { return count(s.daily.length, 3); } },
    { id: "detail-detective", name: "Detail Detective", kind: "p", how: "Score 100% on 25 grammar activities.", prog: function (s) { return count(Object.keys(s.res).filter(function (k) { return s.res[k].total > 0 && s.res[k].correct >= s.res[k].total; }).length, 25); } },
    { id: "goal-setter", name: "Goal Setter", kind: "p", how: "Finish a practice set from the “This week” panel.", prog: function (s) { return count(s.sets.self || 0, 1); } },
    { id: "study-strategist", name: "Study Strategist", kind: "p", how: "Finish the Daily 5 on 8 different days.", prog: function (s) { return count(distinct(s.daily), 8); } },
    { id: "team-player", name: "Team Player", kind: "p", how: "Finish a practice set from your instructor.", prog: function (s) { return count(s.sets.assigned || 0, 1); } },
    { id: "memory-keeper", name: "Memory Keeper", kind: "p", how: "Bring 6 Writing Center skills to strength 3 or more.", prog: function (s) { return count(Object.keys(s.wc.skills).filter(function (k) { return (s.wc.skills[k].s || 0) >= 3; }).length, 6); } },
    { id: "independent-learner", name: "Independent Learner", kind: "p", how: "Practise on 12 different days.", prog: function (s) { return count(distinct(s.days), 12); } },
    { id: "question-trailblazer", name: "Question Trailblazer", kind: "p", how: "Finish 45 Writing Center lessons.", prog: function (s) { return count(doneIds(s).length, 45); } },
    { id: "time-keeper", name: "Time Keeper", kind: "p", how: "Practise on 5 course days in a row. Weekends do not break your run.", prog: function (s) { return count(bestRun(s.days), 5); } },
    { id: "problem-solver", name: "Problem Solver", kind: "p", how: "Fix 40 earlier mistakes in Fix my mistakes.", prog: function (s) { return count(s.fixed, 40); } },
    { id: "sentence-builder", name: "Sentence Builder", kind: "w", how: "Finish every lesson in Stage 1, The Sentence.", svg: 1, prog: function (s) { return count(STAGES[1].filter(function (id) { return real(s, id); }).length, STAGES[1].length); } },
    { id: "sentence-mixer", name: "Sentence Mixer", kind: "w", how: "Finish every lesson in Stage 2, Types of Sentences.", svg: 1, prog: function (s) { return count(STAGES[2].filter(function (id) { return real(s, id); }).length, STAGES[2].length); } },
    { id: "link-master", name: "Link Master", kind: "w", how: "Finish every lesson in Stage 3, Linking Words.", svg: 1, prog: function (s) { return count(STAGES[3].filter(function (id) { return real(s, id); }).length, STAGES[3].length); } },
    { id: "paragraph-pro", name: "Paragraph Pro", kind: "w", how: "Finish every lesson in Stage 4, The Paragraph.", svg: 1, prog: function (s) { return count(STAGES[4].filter(function (id) { return real(s, id); }).length, STAGES[4].length); } },
    { id: "thesis-writer", name: "Thesis Writer", kind: "w", how: "Finish every lesson in Stage 5, Before the Essay.", svg: 1, prog: function (s) { return count(STAGES[5].filter(function (id) { return real(s, id); }).length, STAGES[5].length); } },
    { id: "essay-writer", name: "Essay Writer", kind: "w", how: "Finish every lesson in Stage 6, The Expository Essay.", svg: 1, prog: function (s) { return count(STAGES[6].filter(function (id) { return real(s, id); }).length, STAGES[6].length); } },
    { id: "star-collector", name: "Star Collector", kind: "w", how: "Collect 90 stars across your lessons.", svg: 1, prog: function (s) { return count(doneIds(s).reduce(function (n, id) { return n + stars(s, id); }, 0), 90); } },
    { id: "sharp-shooter", name: "Sharp Shooter", kind: "w", how: "Get a perfect score on 18 lessons.", svg: 1, prog: function (s) { return count(doneIds(s).filter(function (id) { return s.wc.lessons[id].best >= 100; }).length, 18); } },
    { id: "polish-pro", name: "Polish Pro", kind: "w", how: "Revise your writing in 25 lessons.", svg: 1, prog: function (s) { return count(doneIds(s).filter(function (id) { return s.wc.lessons[id].revised; }).length, 25); } },
    { id: "long-writer", name: "Long Writer", kind: "w", how: "Save a piece of writing of 100 words or more.", svg: 1, prog: function (s) { var m = 0; s.wc.portfolio.forEach(function (p) { (p.versions || []).forEach(function (v) { var n = (String(v.text || "").trim().match(/\S+/g) || []).length; if (n > m) m = n; }); }); return count(m, 100); } },
    { id: "skill-master", name: "Skill Master", kind: "w", how: "Raise a Writing Center skill to full strength (5).", svg: 1, prog: function (s) { var m = 0; Object.keys(s.wc.skills).forEach(function (k) { m = Math.max(m, Math.floor(s.wc.skills[k].s || 0)); }); return count(m, 5); } },
    { id: "all-rounder", name: "All-Rounder", kind: "w", how: "Practise 30 different Writing Center skills.", svg: 1, prog: function (s) { return count(Object.keys(s.wc.skills).length, 30); } },
    { id: "top-of-class", name: "Top of the Class", kind: "w", how: "Earn 3,500 Writing Center XP.", svg: 1, prog: function (s) { return count(Math.floor(s.wc.xp || 0), 3500); } },
    { id: "grammar-giant", name: "Grammar Giant", kind: "p", how: "Finish 130 grammar activities.", svg: 1, prog: function (s) { return count(Object.keys(s.res).length, 130); } },
    { id: "accuracy-ace", name: "Accuracy Ace", kind: "p", how: "Score 100% on 40 grammar activities.", svg: 1, prog: function (s) { return count(Object.keys(s.res).filter(function (k) { return s.res[k].total > 0 && s.res[k].correct >= s.res[k].total; }).length, 40); } },
    { id: "two-week-run", name: "Two-Week Run", kind: "p", how: "Practise on 10 course days in a row (two weeks). Weekends do not break your run.", svg: 1, prog: function (s) { return count(bestRun(s.days), 10); } },
    { id: "monthly-regular", name: "Monthly Regular", kind: "p", how: "Practise on 45 different days.", svg: 1, prog: function (s) { return count(distinct(s.days), 45); } },
    { id: "daily-five-hero", name: "Daily 5 Hero", kind: "p", how: "Finish the Daily 5 forty times.", svg: 1, prog: function (s) { return count(s.daily.length, 40); } },
    { id: "milestone-reacher", name: "Milestone Reacher", kind: "p", how: "Earn 40 other badges.", meta: 40, prog: function (s, earned) { return count(earned, 40); } }
  ];

  function earnedMap() { return read(KEY, {}) || {}; }

  // Full state: every badge with its progress. Earned badges stay earned even if the data behind them changes.
  function state() {
    var s = snapshot(), saved = earnedMap(), out = [], others = 0;
    DEFS.filter(function (d) { return !d.meta; }).forEach(function (d) {
      var p = d.prog(s, 0), got = !!saved[d.id] || p.have >= p.need;
      if (got) others++;
      out.push({ def: d, have: p.have, need: p.need, earned: got, when: saved[d.id] || null });
    });
    var meta = DEFS.filter(function (d) { return d.meta; })[0], mp = meta.prog(s, others);
    out.push({ def: meta, have: mp.have, need: mp.need, earned: !!saved[meta.id] || mp.have >= mp.need, when: saved[meta.id] || null });
    var order = {}; DEFS.forEach(function (d, i) { order[d.id] = i; });
    return out.sort(function (a, b) { return order[a.def.id] - order[b.def.id]; });
  }

  // Saves newly earned badges and returns them.
  function check() {
    var st = state(), saved = earnedMap(), fresh = [], now = new Date().toISOString();
    st.forEach(function (b) { if (b.earned && !saved[b.def.id]) { saved[b.def.id] = now; fresh.push(b.def); } });
    if (fresh.length) { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} refreshIcon(); }
    return fresh;
  }
  function src(def) { return "badges/" + def.id + (def.svg ? ".svg" : ".webp"); }

  // ---------- a short toast when something new is earned ----------
  // A new badge: it appears large in the middle of the screen over a blurred page for a couple of seconds, then fades.
  function toast(def) {
    if (window.IEPSound) window.IEPSound.play("badge");
    var st = document.getElementById("iepBadgeRevealStyle");
    if (!st) {
      st = document.createElement("style"); st.id = "iepBadgeRevealStyle";
      st.textContent = ".iep-reveal{position:fixed;inset:0;z-index:9997;display:grid;place-items:center;padding:20px;background:rgba(6,10,30,.5);-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);opacity:0;transition:opacity .6s ease;cursor:pointer}" +
        ".iep-reveal.on{opacity:1}.iep-rv{position:relative;display:grid;justify-items:center;gap:6px;text-align:center;color:#fff;font-family:var(--sans,system-ui,sans-serif)}" +
        ".iep-rv-glow{position:absolute;left:50%;top:84px;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:50%;background:radial-gradient(circle,rgba(252,173,27,.55),rgba(252,173,27,0) 68%);animation:iepglow 4.5s ease-out both}" +
        ".iep-rv img{position:relative;width:170px;height:170px;object-fit:contain;filter:drop-shadow(0 8px 22px rgba(0,0,0,.45));animation:ieppop .7s cubic-bezier(.2,1.5,.4,1) both}" +
        ".iep-rv small{position:relative;margin-top:6px;font:800 12.5px/1 var(--sans,sans-serif);letter-spacing:.2em;text-transform:uppercase;color:#F2B600}" +
        ".iep-rv b{position:relative;font:700 26px/1.2 var(--serif,Georgia,serif)}.iep-rv em{position:relative;font:400 13px var(--sans,sans-serif);font-style:normal;opacity:.75}.iep-rv u{position:relative;margin-top:10px;font:400 11.5px var(--sans,sans-serif);text-decoration:none;opacity:.45;letter-spacing:.05em}" +
        ".iep-sp{position:absolute;left:50%;top:84px;width:8px;height:8px;margin:-4px;border-radius:50%;background:#F2B600;opacity:0;animation:iepsp 1.3s ease-out .25s both}" +
        "@keyframes ieppop{0%{transform:scale(.3) rotate(-14deg);opacity:0}60%{transform:scale(1.14) rotate(3deg);opacity:1}100%{transform:none}}" +
        "@keyframes iepglow{0%{transform:scale(.4);opacity:0}40%{opacity:1}100%{transform:scale(1.15);opacity:.55}}" +
        "@keyframes iepsp{0%{opacity:1;transform:rotate(var(--a)) translateY(-48px) scale(1)}100%{opacity:0;transform:rotate(var(--a)) translateY(-130px) scale(.3)}}" +
        "@media (prefers-reduced-motion:reduce){.iep-rv img,.iep-rv-glow,.iep-sp{animation:none}.iep-sp{display:none}.iep-reveal{transition:none}}";
      document.head.appendChild(st);
    }
    var o = document.createElement("div"); o.className = "iep-reveal"; o.setAttribute("role", "status");
    var sparks = ""; for (var k = 0; k < 10; k++) sparks += '<i class="iep-sp" style="--a:' + (k * 36) + 'deg"></i>';
    o.innerHTML = '<div class="iep-rv"><span class="iep-rv-glow"></span>' + sparks + '<img src="' + src(def) + '" alt=""><small>New badge</small><b>' + esc(def.name) + "</b><em>" + esc(def.how) + "</em><u>Tap anywhere to continue</u></div>";
    document.body.appendChild(o);
    var gone = false;
    function close() { if (gone) return; gone = true; o.classList.remove("on"); setTimeout(function () { o.remove(); }, 650); }
    o.addEventListener("click", close); document.addEventListener("keydown", function esc2(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc2); } });
    setTimeout(function () { o.classList.add("on"); }, 30);
    setTimeout(close, 5200);
  }
  function announce() { var fresh = check(); fresh.forEach(function (d, i) { setTimeout(function () { toast(d); }, i * 6000); }); refreshIcon(); return fresh; }

  // ---------- the badge icon in the top bar, with a progress ring ----------
  function iconHtml(n, total) {
    var c = 2 * Math.PI * 11, off = c * (1 - (total ? n / total : 0));
    return '<svg viewBox="0 0 28 28" class="bb-ring" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="2.4"/>' +
      '<circle cx="14" cy="14" r="11" fill="none" stroke="#FCAD1B" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 14 14)"/>' +
      '<path d="M14 8.6l1.7 3.4 3.7.5-2.7 2.6.6 3.7-3.3-1.8-3.3 1.8.6-3.7-2.7-2.6 3.7-.5z" fill="currentColor"/></svg><span class="bb-n">' + n + "/" + total + '<span class="bb-w"> badges</span></span>';
  }
  function refreshIcon() {
    var el = document.getElementById("barBadges"); if (!el) return;
    var st = state(), n = st.filter(function (b) { return b.earned; }).length;
    el.innerHTML = iconHtml(n, st.length);
    el.title = n + " of " + st.length + " badges earned. Open your badges, skills, portfolio and backup.";
    el.setAttribute("aria-label", "My badges and progress: " + n + " of " + st.length + " earned");
  }
  function addIcon() {
    if (/set.html/.test(location.pathname)) return; // practice sets are assessments: no badge button there
    var bar = document.querySelector(".bar"); if (!bar || document.getElementById("barBadges")) return;
    var a = document.createElement("a"); a.id = "barBadges"; a.className = "bar-link bar-badges"; a.href = "my-writing.html#badges";
    if (/my-writing\.html/.test(location.pathname)) a.setAttribute("aria-current", "page");
    var first = bar.querySelector(".bar-link"); if (first) bar.insertBefore(a, first); else bar.appendChild(a);
    var css = document.getElementById("iepBadgeBarStyle");
    if (!css) { css = document.createElement("style"); css.id = "iepBadgeBarStyle";
      css.textContent = ".bar-badges{gap:5px}.bar-badges .bb-ring{width:22px;height:22px;flex:none}.bar-badges .bb-n{font:700 12px var(--sans,sans-serif)}@media (max-width:600px){.bar-badges{font-size:12px!important}}";
      document.head.appendChild(css); }
    refreshIcon();
  }
  function init() { addIcon(); var fresh = check(); fresh.forEach(function (d, i) { setTimeout(function () { toast(d); }, 600 + i * 6000); }); refreshIcon(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.IEPBadges = { DEFS: DEFS, state: state, check: check, announce: announce, src: src, reveal: toast };
})();
