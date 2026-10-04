/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// Writing Center — the lesson player. One lesson = Spot It → Try It → Build It → Reward. All lesson content
// comes from writing-content/stageN.json; this file only knows how to show each kind of question, check the
// answer, and hand the final score to WC (writing.js), which owns stars, XP and badges.
//
// Question types: choose, tap (tap words), sort (put each item in a group), label (pick a label for each part),
// order (build a sentence from tiles — click or press Enter, no dragging needed), fix (type the correction).
// Typed and ordered answers accept any listed variant or pattern, never just one model answer.
(function () {
  "use strict";
  var WC = window.WC, E = window.IEPEngage;
  var root = document.getElementById("lessonRoot");
  var params = new URLSearchParams(location.search);
  var lessonId = params.get("id") || "1.1";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  // ==subject== **verb** ++object++ — the same lightweight markup the grammar pages use, plus a highlight.
  function md(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\+\+(.+?)\+\+/g, "<u>$1</u>").replace(/==(.+?)==/g, "<mark>$1</mark>");
  }
  function h(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function norm(s) { return String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim(); }
  function sameSet(a, b) { if (a.length !== b.length) return false; var x = a.slice().sort(), y = b.slice().sort(); return x.every(function (v, i) { return v === y[i]; }); }
  function clear() { root.innerHTML = ""; window.scrollTo(0, 0); }

  var idx, stage, lesson, stageData, meta;
  var items = [], pos = 0, earned = 0, possible = 0, missed = [], skillStats = {}, practiceOnly = false;
  var buildText = "", buildDone = false, revisionText = "", revised = false, completed = null;

  Promise.all([WC.index()]).then(function (r) {
    idx = r[0];
    idx.stages.forEach(function (s) { s.lessons.forEach(function (l) { if (l.id === lessonId) { stage = s; meta = l; } }); });
    if (!meta) return fail("We couldn’t find that lesson.");
    if (!meta.ready) return comingSoon();
    return fetch("writing-content/" + stage.file).then(function (x) { return x.json(); }).then(function (d) {
      stageData = d; lesson = d.lessons[lessonId];
      if (!lesson) return fail("This lesson isn’t available yet.");
      document.title = meta.title + " — Writing Center";
      var crumb = document.getElementById("wcCrumb"); if (crumb) crumb.textContent = "Stage " + stage.n + " · " + meta.title;
      // Lessons in the newer "session" format (warm-up, adaptive help, writing studio) have their own player.
      if (lesson.format === "v2" && window.WV2) return window.WV2.run({ lessonId: lessonId, lesson: lesson, meta: meta, stage: stage, idx: idx, stageData: stageData });
      showSpot();
    });
  }).catch(function () { fail("Couldn’t load the lesson. Check your connection and reload."); });

  function fail(msg) { clear(); root.appendChild(h("div", "wc-card", "<p>" + esc(msg) + '</p><p><a class="wc-btn ghost" href="writing.html">Back to the path</a></p>')); }
  function comingSoon() {
    clear();
    root.appendChild(h("div", "wc-card", "<p class=\"wc-eyebrow\">Stage " + stage.n + " · " + esc(stage.title) + "</p><h1 class=\"wc-h1\">" + esc(meta.title) + "</h1><p>This lesson is still being written. Nothing is locked: you can open any lesson, in any order.</p>" +
      '<p><a class="wc-btn" id="soonNext" href="writing.html">Back to the path</a> <a class="wc-btn ghost" href="writing.html">See all lessons</a></p>'));
    // Offer the next lesson that is ready, so the learner always has somewhere to go.
    var nx = WC.nextLesson(idx, WC.read());
    if (nx) { var a = document.getElementById("soonNext"); a.href = "wlesson.html?id=" + encodeURIComponent(nx.lesson.id); a.textContent = "Open Lesson " + nx.lesson.id + ": " + nx.lesson.title; }
  }

  // ---------- circle steps: a tick for each part finished, a ring on the current one ----------
  var STEPS = ["Learn", "Practise", "Write"];
  // The circle on the current step fills as that step is worked through (questions answered, sentences explained);
  // a finished step becomes a tick; a step not reached yet is an empty circle.
  var RING_C = 2 * Math.PI * 10;
  function dotHtml(i, active, frac) {
    if (i < active) return "✓";
    if (i > active) return String(i + 1);
    return '<svg viewBox="0 0 26 26" aria-hidden="true"><circle class="bg" cx="13" cy="13" r="10"/><circle class="fg" cx="13" cy="13" r="10" stroke-dasharray="' + RING_C.toFixed(1) + '" stroke-dashoffset="' + (RING_C * (1 - (frac || 0))).toFixed(1) + '" transform="rotate(-90 13 13)"/></svg><b>' + (i + 1) + "</b>";
  }
  function stepper(active, frac) {
    if (active < STEPS.length && !practiceOnly) WC.setProgress(lessonId, active, STEPS.length, STEPS[active]);
    var n = h("ol", "wc-stepper"); n.setAttribute("aria-label", "Lesson progress");
    STEPS.forEach(function (name, i) {
      var st = i < active ? "done" : i === active ? "cur" : "";
      var li = h("li", st, '<span class="wc-sdot" aria-hidden="true">' + dotHtml(i, active, frac) + "</span><span>" + esc(name) + "</span>");
      if (i < active) li.setAttribute("aria-label", name + " (done)"); else if (i === active) li.setAttribute("aria-current", "step");
      n.appendChild(li);
    });
    return n;
  }

  // ---------- progress strip (no longer shown; the circle steps above replace it) ----------
  function strip(label, n, i) {
    var s = h("div", "wc-strip");
    s.innerHTML = "<span class=\"wc-strip-l\">" + esc(label) + "</span><span class=\"wc-dots\" aria-hidden=\"true\">" +
      Array.apply(null, Array(n)).map(function (_, k) { return '<i class="' + (k < i ? "on" : k === i ? "cur" : "") + '"></i>'; }).join("") + "</span>";
    return s;
  }

  // ---------- 1. Spot It ----------
  function showSpot() {
    clear(); root.appendChild(stepper(0, 0));
    var c = h("div", "wc-card wc-spot");
    c.appendChild(h("p", "wc-eyebrow", "Stage " + stage.n + " · " + esc(stage.title) + " · Lesson " + esc(meta.id)));
    c.appendChild(h("h1", "wc-h1", esc(meta.title)));
    c.appendChild(h("p", "wc-step", "Learn"));
    c.appendChild(h("p", "wc-lead", md(lesson.spot.intro)));
    if (lesson.spot.legend) c.appendChild(h("p", "wc-legend", md(lesson.spot.legend)));
    (lesson.spot.examples || []).forEach(function (ex) {
      var b = h("div", "wc-ex");
      b.appendChild(h("p", "wc-ex-t", md(ex.t)));
      if (ex.note) b.appendChild(h("p", "wc-ex-n", md(ex.note)));
      c.appendChild(b);
    });
    var go = h("button", "wc-btn", lesson.review ? "Start the review" : "Practise"); go.type = "button";
    go.addEventListener("click", function () { startTry(); });
    var act = h("div", "wc-actions"); act.appendChild(go); c.appendChild(act);
    root.appendChild(c); go.focus();
  }

  // ---------- 2. Try It ----------
  function lessonItems() {
    if (!lesson.review) return lesson.try.slice();
    var pool = [];
    lesson.from.forEach(function (id) { (stageData.lessons[id].try || []).forEach(function (it) { pool.push(it); }); });
    var byLesson = lesson.from.map(function (id) { return shuffle(stageData.lessons[id].try.slice()); });
    var out = [], r = 0;
    while (out.length < lesson.count && r < 10) { byLesson.forEach(function (arr) { if (out.length < lesson.count && arr[r]) out.push(arr[r]); }); r++; }
    return shuffle(out);
  }
  function startTry(list) {
    items = list || shuffle(lessonItems());
    pos = 0; earned = 0; possible = 0; missed = []; skillStats = {};
    showItem();
  }

  function showItem() {
    if (pos >= items.length) return afterTry();
    clear();
    var it = items[pos];
    root.appendChild(stepper(1, pos / items.length));
    var c = h("div", "wc-card wc-q");
    c.appendChild(h("p", "wc-step", "Practise · Question " + (pos + 1) + " of " + items.length));
    c.appendChild(h("p", "wc-q-t", md(it.q)));
    var built = BUILDERS[it.type](it);
    c.appendChild(built.node);
    var fb = h("div", "wc-fb"); fb.setAttribute("aria-live", "polite"); fb.hidden = true;
    c.appendChild(fb);
    var act = h("div", "wc-actions");
    var chk = h("button", "wc-btn", "Check"); chk.type = "button"; chk.disabled = true;
    act.appendChild(chk); c.appendChild(act);
    root.appendChild(c);
    var checked = false;
    built.onChange = function () { if (!checked) chk.disabled = !built.ready(); if (built.auto && built.ready() && !checked) doCheck(); };
    function doCheck() {
      if (checked || !built.ready()) return;
      checked = true;
      var res = built.check();
      earned += res.earned; possible += res.possible;
      var sk = it.skill || "other"; skillStats[sk] = skillStats[sk] || { e: 0, p: 0 };
      skillStats[sk].e += res.earned; skillStats[sk].p += res.possible;
      if (res.earned < res.possible) missed.push(it);
      var ok = res.earned === res.possible;
      if (!practiceOnly && it.skill) WC.skillResult(it.skill, ok ? "first" : "miss");
      fb.className = "wc-fb " + (ok ? "ok" : res.earned > 0 ? "part" : "bad");
      fb.innerHTML = "<b>" + (ok ? "Nice! " : res.earned > 0 ? "Almost. " : "Not quite. ") + "</b>" + (it.why ? md(it.why) : "") + (!ok && res.answer ? '<span class="wc-ans">' + res.answer + "</span>" : "");
      fb.hidden = false;
      var last = pos === items.length - 1;
      chk.textContent = last ? "See results →" : "Next →"; chk.disabled = false;
      chk.onclick = function () { pos++; showItem(); };
      chk.focus();
    }
    chk.onclick = doCheck;
    var firstFocus = c.querySelector("input, button.wc-opt, button.wc-tok, button.wc-tile, select");
    if (firstFocus) firstFocus.focus();
  }

  var BUILDERS = {
    choose: function (it) {
      var node = h("div", "wc-opts"), btns = [], done = false, api = { node: node, auto: true, picked: -1 };
      it.options.forEach(function (o, i) {
        var b = h("button", "wc-opt", md(o)); b.type = "button";
        b.addEventListener("click", function () { if (done) return; api.picked = i; done = true; btns.forEach(function (x) { x.disabled = true; }); api.onChange(); });
        btns.push(b); node.appendChild(b);
      });
      api.ready = function () { return api.picked >= 0; };
      api.check = function () {
        var ok = it.answers.indexOf(api.picked) !== -1;
        btns.forEach(function (b, i) { if (it.answers.indexOf(i) !== -1) b.classList.add("right"); else if (i === api.picked) b.classList.add("wrong"); });
        return { earned: ok ? 1 : 0, possible: 1 };
      };
      return api;
    },
    tap: function (it) {
      var node = h("div", "wc-toks"), toks = it.text.split(" "), sel = [], btns = [], api = { node: node };
      toks.forEach(function (w, i) {
        var b = h("button", "wc-tok", esc(w)); b.type = "button"; b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function () {
          var at = sel.indexOf(i);
          if (at === -1) sel.push(i); else sel.splice(at, 1);
          b.setAttribute("aria-pressed", at === -1 ? "true" : "false"); b.classList.toggle("sel", at === -1);
          api.onChange();
        });
        btns.push(b); node.appendChild(b);
      });
      api.ready = function () { return sel.length > 0; };
      api.check = function () {
        var ok = it.answers.some(function (a) { return sameSet(a, sel); });
        btns.forEach(function (b) { b.disabled = true; });
        if (!ok) it.answers[0].forEach(function (i) { btns[i].classList.add("right"); });
        sel.forEach(function (i) { if (!it.answers.some(function (a) { return a.indexOf(i) !== -1; })) btns[i].classList.add("wrong"); else btns[i].classList.add("right"); });
        return { earned: ok ? 1 : 0, possible: 1 };
      };
      return api;
    },
    sort: function (it) {
      var node = h("div", "wc-rows"), picks = [], api = { node: node }, rows = [];
      it.items.forEach(function (row, i) {
        var r = h("div", "wc-row"); r.appendChild(h("span", "wc-row-t", esc(row.t)));
        var g = h("span", "wc-seg"); g.setAttribute("role", "group"); g.setAttribute("aria-label", row.t);
        var bs = it.cats.map(function (cat, k) {
          var b = h("button", "wc-segb", esc(cat)); b.type = "button"; b.setAttribute("aria-pressed", "false");
          b.addEventListener("click", function () { picks[i] = k; bs.forEach(function (x, kk) { x.classList.toggle("sel", kk === k); x.setAttribute("aria-pressed", kk === k ? "true" : "false"); }); api.onChange(); });
          g.appendChild(b); return b;
        });
        r.appendChild(g); node.appendChild(r); rows.push({ r: r, bs: bs });
      });
      api.ready = function () { for (var i = 0; i < it.items.length; i++) if (picks[i] == null) return false; return true; };
      api.check = function () {
        var e = 0;
        it.items.forEach(function (row, i) {
          var ok = picks[i] === row.c; if (ok) e++;
          rows[i].r.classList.add(ok ? "right" : "wrong");
          rows[i].bs.forEach(function (b) { b.disabled = true; });
          if (!ok) rows[i].r.appendChild(h("span", "wc-row-a", "→ " + esc(it.cats[row.c])));
        });
        return { earned: e, possible: it.items.length };
      };
      return api;
    },
    label: function (it) {
      var node = h("div", "wc-rows"), api = { node: node }, sels = [], rows = [];
      it.parts.forEach(function (p, i) {
        var r = h("div", "wc-row"); r.appendChild(h("span", "wc-row-t wc-part", esc(p.t)));
        var s = h("select", "wc-sel"); s.setAttribute("aria-label", "Label for " + p.t);
        s.appendChild(new Option("Choose…", ""));
        it.labels.forEach(function (l, k) { s.appendChild(new Option(l, k)); });
        s.addEventListener("change", function () { api.onChange(); });
        r.appendChild(s); node.appendChild(r); sels.push(s); rows.push(r);
      });
      api.ready = function () { return sels.every(function (s) { return s.value !== ""; }); };
      api.check = function () {
        var e = 0;
        it.parts.forEach(function (p, i) {
          var ok = +sels[i].value === p.a; if (ok) e++;
          rows[i].classList.add(ok ? "right" : "wrong"); sels[i].disabled = true;
          if (!ok) rows[i].appendChild(h("span", "wc-row-a", "→ " + esc(it.labels[p.a])));
        });
        return { earned: e, possible: it.parts.length };
      };
      return api;
    },
    order: function (it) {
      var node = h("div", "wc-order"), api = { node: node, onChange: function () {} }, placed = [];
      var line = h("div", "wc-line"); line.setAttribute("aria-label", "Your sentence"); line.setAttribute("aria-live", "polite");
      var bank = h("div", "wc-bank");
      var order = shuffle(it.pieces.map(function (p, i) { return i; }));
      // Never start with the tiles already in the answer order.
      while (order.every(function (v, i) { return v === i; })) order = shuffle(order);
      function paint() {
        line.innerHTML = ""; bank.innerHTML = "";
        if (!placed.length) line.appendChild(h("span", "wc-line-ph", "Tap the words in order…"));
        placed.forEach(function (i) { var b = tile(i); b.classList.add("in"); b.setAttribute("aria-label", it.pieces[i] + " (placed — press to remove)"); line.appendChild(b); });
        order.forEach(function (i) { if (placed.indexOf(i) === -1) bank.appendChild(tile(i)); });
        api.onChange();
      }
      function tile(i) {
        var b = h("button", "wc-tile", esc(it.pieces[i])); b.type = "button"; b.dataset.i = i;
        b.addEventListener("click", function () {
          var at = placed.indexOf(i);
          if (at === -1) placed.push(i); else placed.splice(at, 1);
          paint();
          var t = node.querySelector('.wc-tile[data-i="' + i + '"]');
          if (t) t.focus();
        });
        return b;
      }
      node.appendChild(line); node.appendChild(bank);
      var reset = h("button", "wc-link", "Start over"); reset.type = "button";
      reset.addEventListener("click", function () { placed = []; paint(); });
      node.appendChild(reset);
      api.ready = function () { return placed.length === it.pieces.length; };
      api.check = function () {
        var s = norm(placed.map(function (i) { return it.pieces[i]; }).join(" "));
        var ok = it.answers.some(function (a) { return norm(a) === s; });
        line.classList.add(ok ? "right" : "wrong");
        Array.prototype.forEach.call(node.querySelectorAll("button"), function (b) { b.disabled = true; });
        return { earned: ok ? 1 : 0, possible: 1, answer: ok ? "" : "Correct order: <b>" + esc(it.answers[0]) + "</b>" };
      };
      paint();
      return api;
    },
    fix: function (it) {
      var node = h("div", "wc-fix"), api = { node: node };
      if (it.show) node.appendChild(h("p", "wc-show", esc(it.show)));
      var inp = h("input", "wc-input"); inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false; inp.setAttribute("aria-label", "Your answer");
      inp.placeholder = "Type your answer…";
      inp.addEventListener("input", function () { api.onChange(); });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { var b = root.querySelector(".wc-actions .wc-btn"); if (b && !b.disabled) b.click(); } });
      node.appendChild(inp);
      api.ready = function () { return inp.value.trim().length > 0; };
      api.check = function () {
        var v = norm(inp.value), ok = (it.accept || []).some(function (a) { return norm(a) === v; }) ||
          (it.patterns || []).some(function (p) { return new RegExp(p).test(v); });
        inp.disabled = true; inp.classList.add(ok ? "right" : "wrong");
        var sample = (it.accept && it.accept[0]) || it.example || "";
        return { earned: ok ? 1 : 0, possible: 1, answer: ok ? "" : (sample ? "One correct answer: <b>" + esc(sample) + "</b>" : "") };
      };
      return api;
    }
  };

  // ---------- after Try It ----------
  function afterTry() {
    if (practiceOnly) return reward();
    if (lesson.build) return showBuild();
    reward();
  }

  // ---------- 3. Build It: write a draft, check it, revise it ----------
  // The automatic checks are honest hints, never a verdict: they only look for the *presence* of a pattern
  // (they can't judge whether it is used correctly), so they say "Hint: found…" / "I can’t see…" and the
  // learner still ticks each box themselves.
  function hintOf(ok, found, missing) { return { ok: ok, msg: "Hint: " + (ok ? found : missing) }; }
  var AUTO = {
    capsAndEnd: function (t) {
      var s = t.trim(); if (!s) return null;
      var parts = s.split(/(?<=[.!?])\s+/);
      var ok = parts.every(function (p) { return /^["“]?[A-Z]/.test(p); }) && /[.!?]["”]?$/.test(s);
      return hintOf(ok, "every sentence starts with a capital and the text ends with punctuation (names aren’t checked).", "check the capital letters and end punctuation.");
    },
    commaJoin: function (t) { return t.trim() ? hintOf(/,\s+(and|but|so|or|yet|nor|for)\b/i.test(t), "found a comma followed by a joining word.", "I can’t see a comma + a joining word (and, but, so, or, yet…) yet.") : null; },
    // Distinct linking words found. Presence only: it can't tell whether they are used well.
    linkers: function (t) {
      if (!t.trim()) return null;
      var L = ["also", "in addition", "moreover", "furthermore", "besides", "additionally", "however", "but", "although", "whereas", "on the other hand", "in contrast", "nevertheless", "yet", "because", "since", "so", "therefore", "as a result", "consequently", "for example", "for instance", "such as", "first", "second", "third", "next", "then", "after that", "finally", "meanwhile", "in conclusion", "to sum up", "overall", "in short", "for these reasons", "first of all", "last"];
      var low = t.toLowerCase(), found = L.filter(function (w) { return new RegExp("(^|[^a-z])" + w + "([^a-z]|$)").test(low); });
      return hintOf(found.length >= 2, "found " + found.length + " linking word" + (found.length === 1 ? "" : "s") + " (" + found.slice(0, 4).join(", ") + "). Check each one fits its meaning.", "I can’t see two different linking words yet.");
    },
    // Roughly the right length for a paragraph: 4 to 8 sentences.
    paragraphLen: function (t) {
      if (!t.trim()) return null;
      var n = (t.trim().match(/[^.!?]+[.!?]+/g) || [t.trim()]).length;
      return hintOf(n >= 4 && n <= 8, "found " + n + " sentences, a good paragraph length.", "I count " + n + " sentence" + (n === 1 ? "" : "s") + ". A paragraph usually has 4 to 8.");
    },
    // a semicolon between two parts, with no joining word straight after it
    semicolon: function (t) {
      if (!t.trim()) return null;
      var has = /\w;\s+\S/.test(t), bad = /;\s+(and|but|so|or|yet|nor|for)\b/i.test(t);
      return hintOf(has && !bad, "found a semicolon with no joining word after it.", has ? "check there is no and / but / so straight after the semicolon." : "I can’t see a semicolon yet.");
    },
    listComma: function (t) { return t.trim() ? hintOf(/\b\w+,\s+\w+,?\s+(and|or)\s+\w+/i.test(t), "found a list with commas.", "I can’t see a list of three with commas yet.") : null; },
    // A frequency word followed by another word (before the verb), or right after am / is / are.
    freqWord: function (t) {
      if (!t.trim()) return null;
      var ok = /\b(always|usually|often|sometimes|never)\s+[a-z]+/i.test(t) || /\b(am|is|are|was|were)\s+(always|usually|often|sometimes|never)\b/i.test(t);
      return hintOf(ok, "found a frequency word before another word. Check it sits before the main verb (or after am / is / are).", "I can’t see a frequency word in the usual position yet.");
    },
    // Two sentences that end in "?" AND start like a question.
    twoQuestions: function (t) {
      if (!t.trim()) return null;
      var qs = t.trim().split(/(?<=[.!?])\s+/).filter(function (p) {
        return /\?$/.test(p) && /^(do|does|did|is|are|am|was|were|can|could|will|would|where|what|when|why|how|who|which)\b/i.test(p);
      });
      return hintOf(qs.length >= 2, "found two questions that start like questions.", "I can’t find two questions yet.");
    }
  };
  function wordCount(t) { var m = t.trim().match(/\S+/g); return m ? m.length : 0; }

  // Word-level comparison: marks the words in the revision that weren't in the draft.
  function diffHtml(draft, revision) {
    var a = draft.trim().split(/\s+/), b = revision.trim().split(/\s+/), n = a.length, m = b.length, i, j;
    var L = []; for (i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (j < m) {
      if (i < n && a[i] === b[j]) { out.push(esc(b[j])); i++; j++; }
      else if (i < n && L[i + 1][j] >= L[i][j + 1]) i++;
      else { out.push("<mark>" + esc(b[j]) + "</mark>"); j++; }
    }
    return out.join(" ");
  }

  function showBuild() {
    clear();
    var b = lesson.build;
    root.appendChild(stepper(2, 0));
    var c = h("div", "wc-card wc-build");
    c.appendChild(h("p", "wc-step", "Write"));
    c.appendChild(h("p", "wc-lead", md(b.prompt)));
    var ta = h("textarea", "wc-ta"); ta.rows = 5; ta.placeholder = b.placeholder || "Write here…"; ta.setAttribute("aria-label", "Your writing");
    ta.value = buildText; c.appendChild(ta);
    var wc = h("p", "wc-wc"); c.appendChild(wc);
    c.appendChild(h("p", "wc-sub", "Check yourself. Tick each box that is true for your writing."));
    var list = h("div", "wc-checks"), boxes = [], hints = [];
    b.checks.forEach(function (ck) {
      var l = h("label", "wc-check"), cb = h("input"); cb.type = "checkbox";
      var t = h("span", "wc-check-t", md(ck.t)), hint = h("span", "wc-hint");
      l.appendChild(cb); l.appendChild(t); l.appendChild(hint); list.appendChild(l); boxes.push(cb); hints.push(hint);
    });
    c.appendChild(list);
    var fb = h("div", "wc-fb"); fb.hidden = true; fb.setAttribute("aria-live", "polite"); c.appendChild(fb);
    var act = h("div", "wc-actions");
    var fin = h("button", "wc-btn", "Finish my draft"); fin.type = "button"; fin.disabled = true;
    var skip = h("button", "wc-link", "Skip the writing"); skip.type = "button";
    act.appendChild(fin); act.appendChild(skip); c.appendChild(act);
    root.appendChild(c);

    function refresh() {
      var n = wordCount(ta.value), need = b.minWords || 1;
      wc.textContent = n + (n === 1 ? " word" : " words") + (n < need ? " · write at least " + need : "");
      fin.disabled = n < need;
      b.checks.forEach(function (ck, i) {
        if (!ck.auto || !AUTO[ck.auto]) { hints[i].textContent = ""; return; }
        var r = AUTO[ck.auto](ta.value);
        hints[i].textContent = r ? r.msg : "";
        hints[i].className = "wc-hint " + (r ? (r.ok ? "found" : "no") : "");
      });
    }
    ta.addEventListener("input", refresh); refresh();
    fin.addEventListener("click", function () {
      buildText = ta.value; buildDone = true;
      ta.disabled = true; fin.hidden = true; skip.hidden = true;
      var unticked = [];
      boxes.forEach(function (x, i) { x.disabled = true; if (!x.checked) unticked.push(b.checks[i].t); });
      fb.className = "wc-fb ok";
      fb.innerHTML = "<b>Draft saved. Well done for writing!</b> You ticked " + (boxes.length - unticked.length) + " of " + boxes.length + " checks." +
        (unticked.length ? "<br>Still to look at:<ul>" + unticked.map(function (u) { return "<li>" + md(u) + "</li>"; }).join("") + "</ul>" : " Even so, good writers revise: try making one thing better.") +
        '<details class="wc-sample"><summary>Show one possible answer</summary><span>One possible answer. Yours can be completely different:</span> ' + esc(b.sample) + "</details>";
      fb.hidden = false;
      var go = h("button", "wc-btn", "Revise my draft →"); go.type = "button";
      go.addEventListener("click", function () { showRevise(unticked); });
      var no = h("button", "wc-link", "Skip revising"); no.type = "button";
      no.addEventListener("click", reward);
      act.appendChild(go); act.appendChild(no); go.focus();
    });
    skip.addEventListener("click", function () { buildDone = false; buildText = ""; reward(); });
    ta.focus();
  }

  var CHANGES = ["Fixed a capital letter or punctuation", "Made a sentence complete", "Joined ideas or added a linking word", "Changed the word order", "Added more detail", "Something else"];
  function showRevise(unticked) {
    clear();
    root.appendChild(stepper(2, 0.5));
    var c = h("div", "wc-card wc-build");
    c.appendChild(h("p", "wc-step", "Write · revise"));
    c.appendChild(h("p", "wc-lead", "Read your draft again. Pick **one or two things** to improve, then rewrite it below. Keep your own ideas and voice."));
    var q = h("blockquote", "wc-draft"); q.textContent = buildText; c.appendChild(q);
    if (unticked && unticked.length) c.appendChild(h("p", "wc-sub", "<b>Look at:</b> " + unticked.map(function (u) { return md(u); }).join(" · ")));
    var ta = h("textarea", "wc-ta"); ta.rows = 5; ta.value = buildText; ta.setAttribute("aria-label", "Your revision"); c.appendChild(ta);
    c.appendChild(h("p", "wc-sub", "What did you change? (tick all that apply)"));
    var list = h("div", "wc-checks"), boxes = [];
    CHANGES.forEach(function (t) { var l = h("label", "wc-check"), cb = h("input"); cb.type = "checkbox"; l.appendChild(cb); l.appendChild(h("span", "wc-check-t", esc(t))); list.appendChild(l); boxes.push(cb); });
    c.appendChild(list);
    var out = h("div", "wc-fb"); out.hidden = true; out.setAttribute("aria-live", "polite"); c.appendChild(out);
    var act = h("div", "wc-actions");
    var done = h("button", "wc-btn", "Done revising"); done.type = "button"; done.disabled = true;
    var skip = h("button", "wc-link", "Skip revising"); skip.type = "button";
    act.appendChild(done); act.appendChild(skip); c.appendChild(act);
    root.appendChild(c);
    function refresh() { done.disabled = ta.value.trim() === buildText.trim() || !ta.value.trim() || !boxes.some(function (x) { return x.checked; }); }
    ta.addEventListener("input", refresh); boxes.forEach(function (x) { x.addEventListener("change", refresh); }); refresh();
    done.addEventListener("click", function () {
      revisionText = ta.value; revised = true;
      ta.disabled = true; done.hidden = true; skip.hidden = true; boxes.forEach(function (x) { x.disabled = true; });
      out.className = "wc-fb ok";
      out.innerHTML = "<b>Nice revision!</b> New words are highlighted:<div class=\"wc-diff\">" + diffHtml(buildText, revisionText) + "</div>";
      out.hidden = false;
      var go = h("button", "wc-btn", "See my reward →"); go.type = "button"; go.addEventListener("click", reward);
      act.appendChild(go); go.focus();
    });
    skip.addEventListener("click", reward);
    ta.focus();
  }

  // ---------- 4. Reward ----------
  function reward() {
    clear();
    var pct = possible ? Math.round(earned / possible * 100) : 100;
    var c = h("div", "wc-card wc-reward");
    var more = h("details", "wc-more"); more.appendChild(h("summary", "", "See details"));
    var stars = WC.starsFor(pct, buildDone), res = null, next = nextAfter();
    if (practiceOnly) {
      c.appendChild(h("h2", "wc-h2", pct === 100 ? "All fixed!" : "Good practice"));
      c.appendChild(h("p", "wc-lead", "You got " + earned + " of " + possible + " right. Practice rounds don’t change your stars or XP."));
    } else {
      var skippedNow = [];
      if (!completed) {
        if (lesson.review && pct >= 80) {
          var before = WC.read();
          skippedNow = stage.lessons.filter(function (l) { return l.ready && !l.review && !(before.lessons[l.id] && before.lessons[l.id].done); }).map(function (l) { return l.id; });
          if (skippedNow.length) WC.markSkipped(skippedNow);
        }
        completed = WC.complete(lessonId, { pct: pct, built: buildDone, draft: buildText, revised: revised, revision: revisionText });
        completed.skippedNow = skippedNow;
      }
      res = completed; stars = res.stars;
      root.appendChild(stepper(STEPS.length));
      var st = h("div", "wc-stars"); st.setAttribute("aria-label", stars + " of 3 stars");
      for (var i = 1; i <= 3; i++) st.appendChild(h("span", "wc-star" + (i <= stars ? " on" : ""), "★"));
      c.appendChild(st);
      c.appendChild(h("h2", "wc-h2", pct === 100 ? "Perfect!" : pct >= 70 ? "Great work!" : "Lesson complete"));
      c.appendChild(h("p", "wc-lead", earned + " of " + possible + " correct" + (res.gained > 0 ? " · +" + res.gained + " XP" : "")));
      if (res.capped) c.appendChild(h("p", "wc-quiet", "Write the Build It to earn the third star."));
      // celebrations only when there is something to celebrate
      if (res.levelUp) c.appendChild(h("p", "wc-badge-new", "🎉 Level up! You are now a <b>" + esc(res.level.name) + "</b>."));
      (window.IEPBadges ? window.IEPBadges.check() : []).forEach(function (d) { var p = h("p", "wc-badge-new"); p.innerHTML = '<img class="wc-badge-img" src="' + window.IEPBadges.src(d) + '" alt=""> New badge: <b>' + esc(d.name) + "</b>"; c.appendChild(p); });
      var skipped = res.skippedNow || [];
      if (skipped.length) c.appendChild(h("p", "wc-badge-new", "✅ Stage check passed. " + skipped.length + " lesson" + (skipped.length === 1 ? "" : "s") + " marked as skipped."));
      if (pct === 100 || stars === 3) E && E.confetti();
      // details, tucked away
      var xp = h("div", "wc-xp");
      xp.innerHTML = (res.gained > 0 ? "<b>+" + res.gained + " XP</b>" : "<b>No new XP this time</b>") + " · Level " + res.level.n + ": " + esc(res.level.name) +
        '<div class="wc-bar"><i style="width:' + res.level.pct + '%"></i></div>' +
        (res.gained === 0 && !res.first ? "<small>Replays earn XP only when they improve your stars or add your first writing or revision.</small><br>" : "") +
        (res.level.need ? "<small>" + esc(res.level.need) + "</small>" : res.level.next ? "<small>" + (res.level.next.min - res.record.xp) + " XP to " + esc(res.level.next.name) + "</small>" : "<small>Top level reached</small>");
      more.appendChild(xp);
      if (stars < 3 && !res.capped) more.appendChild(h("p", "wc-quiet", "Replay any time to earn more stars. Your best result is always kept."));
    }

    // What worked and what to work on, from the skills the missed questions belonged to.
    var skills = stageData.skills || {}, good = [], improve = [];
    Object.keys(skillStats).forEach(function (k) {
      var s = skillStats[k], info = skills[k]; if (!info) return;
      (s.e / s.p >= 0.8 ? good : improve).push(info);
    });
    if (good.length || improve.length) {
      var f = h("div", "wc-skills");
      if (good.length) f.appendChild(h("p", "", "<b>What’s working:</b> " + good.map(function (s) { return esc(s.good); }).join(" ")));
      if (improve.length) f.appendChild(h("p", "", "<b>Next step:</b> " + improve.map(function (s) { return esc(s.improve); }).join(" ")));
      more.appendChild(f);
    }

    // One main button; everything else is a quiet link.
    var act = h("div", "wc-actions");
    if (next) { var n = h("a", "wc-btn", "Next lesson: " + esc(next.title) + " →"); n.href = "wlesson.html?id=" + next.id; act.appendChild(n); }
    else { var d = h("a", "wc-btn", "Back to the path"); d.href = "writing.html"; act.appendChild(d); }
    c.appendChild(act);
    var links = h("div", "wc-links");
    if (missed.length) {
      var m = h("button", "wc-link", "Practise the " + missed.length + " I missed"); m.type = "button";
      m.addEventListener("click", function () { practiceOnly = true; startTry(shuffle(missed.slice())); });
      links.appendChild(m);
    }
    var again = h("button", "wc-link", "Try again"); again.type = "button";
    again.addEventListener("click", function () { practiceOnly = false; completed = null; buildDone = false; buildText = ""; revisionText = ""; revised = false; startTry(); });
    links.appendChild(again);
    if (next) { var back = h("a", "wc-link", "Back to the path"); back.href = "writing.html"; links.appendChild(back); }
    c.appendChild(links);
    if (more.children.length > 1) c.appendChild(more);
    root.appendChild(c);
    var focus = c.querySelector(".wc-actions a, .wc-actions button"); if (focus) focus.focus();
  }

  // The next ready lesson after this one in path order.
  function nextAfter() {
    var flat = [];
    idx.stages.forEach(function (s) { s.lessons.forEach(function (l) { if (l.ready) flat.push(l); }); });
    for (var i = 0; i < flat.length; i++) if (flat[i].id === lessonId) return flat[i + 1] || null;
    return null;
  }

  // Shared with wv2.js (the session player) so both players build questions and hints the same way.
  window.WCQ = { BUILDERS: BUILDERS, AUTO: AUTO, md: md, h: h, esc: esc, shuffle: shuffle, norm: norm, clear: clear, root: root, wordCount: wordCount, diffHtml: diffHtml };
})();
