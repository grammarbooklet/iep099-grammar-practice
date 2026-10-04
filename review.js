// IEP099 grammar practice — the two "bring the questions back" modes, sharing one page:
//   ?mode=daily     the Daily 5: five quick questions, a few from the student's own past mistakes and the
//                   rest new (or, once everything's been tried, random), for a 2-minute habit-sized session.
//   ?mode=mistakes  "Fix my mistakes": every question the student got wrong, brought back in rounds.
// Questions are rendered with the same engine as every activity page (window.IEPPractice), one card per
// activity containing only the chosen questions. One button checks them all; anything now answered right
// is taken off the student's mistakes list in their saved progress, anything missed goes on it.
(function () {
  "use strict";
  var E = window.IEPEngage, D = window.IEP_DATA, P = window.IEPPractice;
  var mode = new URLSearchParams(location.search).get("mode") === "mistakes" ? "mistakes" : "daily";
  var DAILY_SIZE = 5, DAILY_FROM_MISTAKES = 3, MISTAKES_PER_ROUND = 15;

  var $ = function (id) { return document.getElementById(id); };
  var titleEl = $("reviewTitle"), subEl = $("reviewSub"), emptyEl = $("reviewEmpty"), mainEl = $("reviewMain");
  var listEl = $("reviewList"), checkBtn = $("reviewCheckBtn"), summaryEl = $("reviewSummary");
  var STRAND_SHORT = { ls: "L&S", rw: "R&W" };
  var cards = [], totalMistakes = 0;

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function empty(html) { mainEl.hidden = true; emptyEl.innerHTML = html; emptyEl.hidden = false; }

  document.title = (mode === "daily" ? "Daily 5" : "Fix my mistakes") + " — IEP099 Grammar Practice";
  titleEl.textContent = mode === "daily" ? "Daily 5" : "Fix my mistakes";
  $("reviewEyebrow").textContent = mode === "daily" ? "IEP099 · A 2-minute warm-up" : "IEP099 · Bring the hard ones back";

  if (!E || !D || !P) { empty("Couldn’t load the practice tools. Check your connection and reload."); return; }

  fetch("activities.json").then(function (r) { return r.json(); }).then(start).catch(function () {
    empty("Couldn’t load the questions. Check your connection and reload.");
  });

  // A copy of an activity containing only the questions at idxs. For a matching activity that means the
  // chosen left-hand items and their own right-hand answers, which keeps each pair lined up.
  function subset(ex, idxs) {
    var spec = JSON.parse(JSON.stringify(ex.spec));
    if (spec.type === "match") {
      spec.left = idxs.map(function (i) { return ex.spec.left[i]; });
      spec.right = idxs.map(function (i) { return ex.spec.right[i]; });
    } else {
      spec.items = idxs.map(function (i) { return ex.spec.items[i]; });
    }
    return { title: ex.title, spec: spec };
  }

  function start(all) {
    var res = E.results(), pool = E.mistakes(res), groups;
    totalMistakes = pool.reduce(function (n, m) { return n + m.idx.length; }, 0);
    if (mode === "mistakes") {
      groups = pickMistakeRound(pool);
      if (!groups.length) {
        empty("<b>No mistakes to fix right now.</b><br>Anything you get wrong in an activity shows up here to try again. Keep going, or play the <a class=\"plan-link\" href=\"review.html?mode=daily\">Daily 5</a>.");
        return;
      }
      var shown = groups.reduce(function (n, g) { return n + g.idx.length; }, 0);
      subEl.textContent = "Here " + (shown === totalMistakes ? "are all " : "are ") + shown + (shown === 1 ? " question" : " questions") + " you got wrong before" + (shown < totalMistakes ? " (" + (totalMistakes - shown) + " more waiting for the next round)" : "") + ". Get them right and they disappear from your list.";
    } else {
      groups = pickDaily(all, res, pool);
      subEl.textContent = "Five quick questions — some from your past mistakes, some new. Check them all at the end.";
    }
    groups = groups.filter(function (g) { return all[g.id]; });
    if (!groups.length) { empty("There’s nothing to practice yet. Try an activity from the catalog first."); return; }
    render(all, groups);
  }

  // Whole activities' worth of mistakes at a time, in random order, until a round is big enough.
  function pickMistakeRound(pool) {
    var out = [], count = 0;
    shuffle(pool).forEach(function (m) {
      if (count >= MISTAKES_PER_ROUND) return;
      out.push({ id: m.id, idx: m.idx.slice().sort(function (a, b) { return a - b; }), mistake: true });
      count += m.idx.length;
    });
    return out;
  }

  // Five single questions from five different activities: up to three of the student's mistakes, then new
  // questions from activities they've never opened, then anything left if there still aren't five.
  function pickDaily(all, res, pool) {
    var groups = [], used = {};
    function add(id, i, mistake) {
      if (used[id] || groups.length >= DAILY_SIZE || !all[id]) return;
      used[id] = 1; groups.push({ id: id, idx: [i], mistake: !!mistake });
    }
    var mi = [];
    pool.forEach(function (m) { m.idx.forEach(function (i) { mi.push({ id: m.id, i: i }); }); });
    shuffle(mi).forEach(function (x) { if (groups.length < DAILY_FROM_MISTAKES) add(x.id, x.i, true); });
    var unseen = Object.keys(D.act).filter(function (id) { return !res[id]; });
    shuffle(unseen).forEach(function (id) { add(id, Math.floor(Math.random() * D.act[id].n), false); });
    shuffle(mi).forEach(function (x) { add(x.id, x.i, true); });
    shuffle(Object.keys(D.act)).forEach(function (id) { add(id, Math.floor(Math.random() * D.act[id].n), false); });
    return shuffle(groups);
  }

  function render(all, groups) {
    listEl.innerHTML = ""; cards = [];
    groups.forEach(function (g) {
      var entry = all[g.id], m = entry.meta;
      var wrap = document.createElement("div");
      var eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow"; eyebrow.style.margin = "22px 0 6px";
      eyebrow.textContent = (STRAND_SHORT[m.strand] || "") + " · Unit " + m.unit + (m.topicTitle ? " · " + m.topicTitle : "");
      wrap.appendChild(eyebrow);
      var card = document.createElement("div"); card.className = "ex";
      wrap.appendChild(card); listEl.appendChild(wrap);
      // No id on the meta: the engine only saves a result when it has one, and a partial activity must never
      // overwrite the student's saved score for the whole thing — applyResults() below does that carefully.
      var result = P.buildExercise(card, subset(entry.exercise, g.idx), entry.rules, m, function () {});
      cards.push({ g: g, card: card, result: result });
    });
    mainEl.hidden = false;
  }

  checkBtn.addEventListener("click", function () {
    // Click each card's own Check button first, while still enabled — a disabled button ignores clicks.
    cards.forEach(function (c) { var b = c.card.querySelector("button.btn.accent"); if (b) b.click(); });
    Array.prototype.forEach.call(listEl.querySelectorAll("input, select, button"), function (el) { el.disabled = true; });
    $("reviewActions").hidden = true;
    finish();
  });

  // Update the student's saved results to match what they just answered. Activities checked before item-level
  // results were saved can only be updated when every one of their questions was re-asked.
  function applyResults() {
    var res = E.results(), changed = false;
    cards.forEach(function (c) {
      var r = res[c.g.id], n = D.act[c.g.id] ? D.act[c.g.id].n : 0;
      if (!r) return;
      if (!Array.isArray(r.wrong)) {
        if (c.g.idx.length !== n) return;
        r.wrong = c.g.idx.filter(function (orig, j) { return !c.result.itemOk[j]; });
        r.correct = n - r.wrong.length;
      } else {
        c.g.idx.forEach(function (orig, j) {
          var ok = !!c.result.itemOk[j], pos = r.wrong.indexOf(orig);
          if (ok && pos !== -1) { r.wrong.splice(pos, 1); r.correct = Math.min(r.total, r.correct + 1); }
          else if (!ok && pos === -1) { r.wrong.push(orig); r.correct = Math.max(0, r.correct - 1); }
        });
      }
      r.date = new Date().toISOString();
      changed = true;
    });
    if (changed) E.write(E.RESULTS_KEY, res);
  }

  function finish() {
    var total = 0, right = 0, fixed = 0;
    cards.forEach(function (c) {
      c.g.idx.forEach(function (orig, j) {
        total++;
        if (c.result.itemOk[j]) { right++; if (c.g.mistake) fixed++; }
      });
    });
    applyResults();
    E.recordDay(); E.renderStreak();
    // Badges: remember each finished Daily 5, and how many earlier mistakes were fixed.
    try {
      if (mode === "daily") { if (right < 1) throw 0; var dl = JSON.parse(localStorage.getItem("iep099-dailylog") || "[]"); dl.push(E.today()); localStorage.setItem("iep099-dailylog", JSON.stringify(dl.slice(-300))); }
      else if (fixed > 0) localStorage.setItem("iep099-fixed", String((parseInt(localStorage.getItem("iep099-fixed"), 10) || 0) + fixed));
    } catch (e) {}
    if (right === total) E.confetti();

    var html;
    if (mode === "daily") {
      E.recordDaily(right);
      var msg = right === total ? "Perfect — a clean sweep!" : right >= 3 ? "Nice work. Come back tomorrow for five new ones." : "Good effort — practice the units in the catalog, then try again.";
      html = "<b>You got " + right + " of " + total + ".</b><p>" + msg + '</p><p><a class="plan-link" href="review.html?mode=daily">Play again →</a> &nbsp; <a class="plan-link" href="review.html?mode=mistakes">Fix my mistakes →</a> &nbsp; <a class="plan-link" href="catalog.html">Back to the catalog →</a></p>';
    } else {
      var left = E.mistakeCount();
      html = "<b>You fixed " + fixed + " of " + total + (total === 1 ? " mistake" : " mistakes") + ".</b><p>" +
        (left > 0 ? left + " more " + (left === 1 ? "question is" : "questions are") + " still on your list." : "Your mistakes list is empty — nicely done!") +
        '</p><p>' + (left > 0 ? '<a class="plan-link" href="review.html?mode=mistakes">Another round →</a> &nbsp; ' : '<a class="plan-link" href="review.html?mode=daily">Play the Daily 5 →</a> &nbsp; ') +
        '<a class="plan-link" href="progress.html">My progress →</a></p>';
    }
    summaryEl.innerHTML = html; summaryEl.hidden = false;
    if (window.IEPBadges) window.IEPBadges.announce();
    summaryEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
