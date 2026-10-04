/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// Writing Center — the "session" player. A session is: Warm-up review → Learn it → Practise (with adaptive help)
// → Writing studio (draft, revise, see what changed) → Reward. It reuses the question builders from wlesson.js
// (window.WCQ) and the rules, skills and portfolio in writing.js (window.WC).
//
// Help after a mistake comes in steps, never the answer straight away:
//   1. a nudge (a hint in the margin) and another try;
//   2. a short rule card plus a worked example;
//   3. a NEW similar question (a variant), so the learner proves they understood, not just saw the answer.
// Skills that were missed come back later through the review schedule in writing.js.
(function () {
  "use strict";
  var WC = window.WC, E = window.IEPEngage;
  var Q, S; // Q = shared builders (WCQ); S = this session

  var CHANGES = ["Fixed a capital letter or punctuation", "Made a sentence complete", "Joined ideas or added a linking word", "Changed the word order", "Added more detail", "Something else"];

  function run(ctx) {
    Q = window.WCQ; CUR = ctx.lesson.review ? ["Practise", "Write"] : STEPS;
    S = { ctx: ctx, lesson: ctx.lesson, id: ctx.lessonId, kinds: [], warm: [], draft: "", revision: "", revised: false, before: null };
    S.before = JSON.parse(JSON.stringify(WC.read()));
    // Readable names for earlier skills (shown in "due for review"), then the opening screen.
    loadEarlier().then(opening);
  }
  // Questions and skill names from every earlier stage (so a Stage 4 warm-up can review Stage 2 and 3 skills).
  function loadEarlier() {
    var st = S.ctx.stage.n, files = S.ctx.idx.stages.filter(function (s) { return s.n < st && s.lessons.some(function (l) { return l.ready; }); });
    S.pool = []; S.labels = {};
    return Promise.all(files.map(function (s) {
      return fetch("writing-content/" + s.file).then(function (x) { return x.json(); }).then(function (d) {
        Object.keys(d.skills || {}).forEach(function (k) { S.labels[k] = d.skills[k]; });
        Object.keys(d.lessons).forEach(function (id) {
          var L = d.lessons[id];
          (L.try || []).forEach(function (it) { S.pool.push(it); });
          if (!L.review) (L.practice || []).forEach(function (it) { S.pool.push(it); });
        });
      }).catch(function () {});
    }));
  }

  var h = function () { return Q.h.apply(null, arguments); };
  function strip(label, i, n) {
    var s = h("div", "wc-strip");
    s.innerHTML = '<span class="wc-strip-l">' + Q.esc(label) + '</span><span class="wc-dots" aria-hidden="true">' +
      Array.apply(null, Array(n)).map(function (_, k) { return '<i class="' + (k < i ? "on" : k === i ? "cur" : "") + '"></i>'; }).join("") + "</span>";
    return s;
  }
  // Steps of a session: a tick for each part finished, a ring on the current one.
  var STEPS = ["Warm-up", "Learn", "Practise", "Write"], CUR = STEPS;
  function stepFor(name, frac) { return stepper(CUR.indexOf(name), frac); }
  // The circle on the current step fills as that step is worked through (questions answered, sentences explained);
  // a finished step becomes a tick; a step not reached yet is an empty circle.
  var RING_C = 2 * Math.PI * 10;
  function dotHtml(i, active, frac) {
    if (i < active) return "✓";
    if (i > active) return String(i + 1);
    return '<svg viewBox="0 0 26 26" aria-hidden="true"><circle class="bg" cx="13" cy="13" r="10"/><circle class="fg" cx="13" cy="13" r="10" stroke-dasharray="' + RING_C.toFixed(1) + '" stroke-dashoffset="' + (RING_C * (1 - (frac || 0))).toFixed(1) + '" transform="rotate(-90 13 13)"/></svg><b>' + (i + 1) + "</b>";
  }
  function stepper(active, frac) {
    if (active < CUR.length) WC.setProgress(S.id, active, CUR.length, CUR[active]);
    var n = h("ol", "wc-stepper"); n.setAttribute("aria-label", "Session progress");
    CUR.forEach(function (name, i) {
      var st = i < active ? "done" : i === active ? "cur" : "";
      var li = h("li", st, '<span class="wc-sdot" aria-hidden="true">' + dotHtml(i, active, frac) + "</span><span>" + Q.esc(name) + "</span>");
      if (i < active) li.setAttribute("aria-label", name + " (done)"); else if (i === active) li.setAttribute("aria-current", "step");
      n.appendChild(li);
    });
    var fg = n.querySelector(".cur .fg");
    n.set = function (f) { if (fg) fg.setAttribute("stroke-dashoffset", (RING_C * (1 - Math.max(0, Math.min(1, f)))).toFixed(1)); };
    return n;
  }
  function wait(host, label, cls) {
    return new Promise(function (resolve) {
      var b = h("button", "wc-btn" + (cls ? " " + cls : ""), label); b.type = "button";
      b.addEventListener("click", function () { b.remove(); resolve(); });
      host.actions.appendChild(b); b.focus();
    });
  }
  function card(stepLabel) {
    var c = h("div", "wc-card wc-session");
    if (stepLabel) c.appendChild(h("p", "wc-step", stepLabel));
    var host = { card: c, q: h("p", "wc-q-t"), body: h("div"), help: h("div", "wc-helpzone"), fb: h("div", "wc-fb"), actions: h("div", "wc-actions") };
    host.fb.hidden = true; host.fb.setAttribute("aria-live", "polite");
    c.appendChild(host.q); c.appendChild(host.body); c.appendChild(host.help); c.appendChild(host.fb); c.appendChild(host.actions);
    return host;
  }
  function note(host, text) {
    var n = h("div", "wc-margin-note"); n.innerHTML = '<span class="wc-pen" aria-hidden="true">✎</span><span class="wc-note-t">' + Q.md(text) + "</span>";
    host.help.appendChild(n);
  }
  function stamp(host, text) {
    var s = h("div", "wc-stamp", Q.esc(text)); s.setAttribute("aria-hidden", "true");
    host.card.appendChild(s); setTimeout(function () { s.classList.add("gone"); }, 1500);
  }

  // ---------- opening ----------
  function opening() {
    Q.clear();
    var L = S.lesson, r = WC.read(), due = WC.dueSkills(r).filter(function (k) { return ((L.warmup && L.warmup.skills) || []).indexOf(k) !== -1; });
    var c = h("div", "wc-card wc-open");
    c.appendChild(h("p", "wc-eyebrow", "Stage " + S.ctx.stage.n + " · " + Q.esc(S.ctx.stage.title) + " · Lesson " + Q.esc(S.id)));
    c.appendChild(h("h1", "wc-h1", Q.esc(S.ctx.meta.title)));
    c.appendChild(h("p", "wc-goal", "<span>Today’s goal</span>" + Q.esc(L.goal)));
    var plan = h("ol", "wc-plan");
    plan.innerHTML = '<li><b>Warm-up</b><small>2 quick questions to refresh earlier skills · 2 min</small></li>' +
      '<li><b>Learn</b><small>See how it works, then practise with help when you need it · 4 min</small></li>' +
      '<li><b>Write</b><small>A real sentence in your writing studio, then improve it · 3 min</small></li>';
    if (L.review) plan.innerHTML = '<li><b>Practise</b><small>Mixed questions from the whole stage, with help when you need it · 6 min</small></li>' +
      '<li><b>Write</b><small>A short piece that brings the stage together, then improve it · 4 min</small></li>';
    c.appendChild(plan);
    if (due.length && !L.review) c.appendChild(h("p", "wc-due", "Due for review today: " + due.map(function (k) { return Q.esc(skillName(k)); }).join(", ") + "."));
    var act = h("div", "wc-actions"), go = h("button", "wc-btn", "Start today’s session"); go.type = "button";
    go.addEventListener("click", L.review ? practice : warmup); act.appendChild(go); c.appendChild(act);
    Q.root.appendChild(c); go.focus();
  }
  var stage1Skills = {};
  function skillName(k) {
    var all = {}; [S.labels || {}, S.ctx.stageData.skills || {}].forEach(function (m) { Object.keys(m).forEach(function (x) { all[x] = m[x]; }); });
    return all[k] ? all[k].label : k;
  }

  // ---------- warm-up: review of earlier skills ----------
  function pickWarm(pool) {
    var L = S.lesson, r = WC.read(), skills = (L.warmup.skills || []).slice();
    var due = WC.dueSkills(r).filter(function (k) { return skills.indexOf(k) !== -1; });
    var order = due.concat(skills.filter(function (k) { return due.indexOf(k) === -1; }).sort(function (a, b) { return ((r.skills[a] || {}).s || 0) - ((r.skills[b] || {}).s || 0); }));
    var out = [];
    order.forEach(function (k) {
      if (out.length >= L.warmup.count) return;
      var items = pool.filter(function (it) { return it.skill === k && /^(choose|fix|tap|order)$/.test(it.type); });
      if (items.length) out.push(Q.shuffle(items)[0]);
    });
    return out;
  }
  function warmup() {
    Promise.resolve().then(function () {
      var pool = (S.pool || []).slice();
      // ...and the practice questions from earlier lessons in THIS stage (so Stage 2 lessons review Stage 2 skills)
      var here = S.ctx.stageData.lessons;
      Object.keys(here).forEach(function (id) { if (id !== S.id && !here[id].review) (here[id].practice || []).forEach(function (it) { pool.push(it); }); });
      var items = pickWarm(pool);
      (function next(i) {
        if (i >= items.length) return learn();
        var host = card("Warm-up · review · " + (i + 1) + " of " + items.length);
        Q.clear(); Q.root.appendChild(stepFor("Warm-up", i / items.length)); Q.root.appendChild(host.card);
        simple(items[i], host).then(function () { next(i + 1); });
      })(0);
    }).catch(learn);
  }
  // One attempt, honest feedback, then on to the next. Used for the warm-up.
  function simple(it, host) {
    return attempt(it, host).then(function (r) {
      WC.skillResult(it.skill, r.ok ? "first" : "miss");
      if (r.ok) { stamp(host, "Nice!"); feedback(host, "ok", "Nice! ", it.why); } else feedback(host, "bad", "Not quite. ", it.why, r.res.answer);
      return wait(host, "Next →");
    });
  }
  function feedback(host, kind, lead, why, answer) {
    host.fb.className = "wc-fb " + kind;
    host.fb.innerHTML = "<b>" + Q.esc(lead) + "</b>" + (why ? Q.md(why) : "") + (answer ? '<span class="wc-ans">' + answer + "</span>" : "");
    host.fb.hidden = false;
  }

  // ---------- one attempt at one question ----------
  function attempt(it, host) {
    return new Promise(function (resolve) {
      host.q.innerHTML = Q.md(it.q); host.body.innerHTML = ""; host.actions.innerHTML = "";
      if (it.extra) host.body.appendChild(h("p", "wc-extra", Q.md(it.extra)));
      var b = (it.type === "porder" ? porder : Q.BUILDERS[it.type])(it);
      host.body.appendChild(b.node);
      var chk = h("button", "wc-btn", "Check"); chk.type = "button"; chk.disabled = true; host.actions.appendChild(chk);
      var done = false;
      function go() { if (done || !b.ready()) return; done = true; var res = b.check(); chk.hidden = true; resolve({ ok: res.earned === res.possible, res: res }); }
      b.onChange = function () { if (done) return; chk.disabled = !b.ready(); if (b.auto && b.ready()) go(); };
      chk.addEventListener("click", go);
      var f = host.body.querySelector("button.wc-opt, button.wc-tok, button.wc-tile, button.wc-pcard, input, select"); if (f) f.focus();
    });
  }

  // Paragraph ordering: tap the sentences in order. Tapping a placed sentence takes it back out.
  function porder(it) {
    var n = it.sentences.length, api = { onChange: function () {} }, placed = [];
    var node = h("div", "wc-porder"), line = h("ol", "wc-pline"), bank = h("div", "wc-pbank");
    var order = it.shuffled ? it.shuffled.slice() : Q.shuffle(it.sentences.map(function (_, i) { return i; }));
    function isAnswer(arr) { return it.answers.some(function (a) { return a.join() === arr.join(); }); }
    while (isAnswer(order)) order = Q.shuffle(order);
    function btn(i, placedNow) {
      var b = h("button", "wc-pcard" + (placedNow ? " in" : ""), Q.esc(it.sentences[i])); b.type = "button"; b.dataset.i = i;
      b.addEventListener("click", function () {
        var at = placed.indexOf(i); if (at === -1) placed.push(i); else placed.splice(at, 1);
        paint(); var t = node.querySelector('.wc-pcard[data-i="' + i + '"]'); if (t) { t.classList.add("snap"); t.focus(); }
      });
      return b;
    }
    function paint() {
      line.innerHTML = ""; bank.innerHTML = "";
      if (!placed.length) line.appendChild(h("li", "wc-line-ph", "Tap the sentences in order…"));
      placed.forEach(function (i) { var li = h("li"); li.appendChild(btn(i, true)); line.appendChild(li); });
      order.forEach(function (i) { if (placed.indexOf(i) === -1) bank.appendChild(btn(i, false)); });
      api.onChange();
    }
    node.appendChild(line); node.appendChild(bank);
    var reset = h("button", "wc-link", "Start over"); reset.type = "button"; reset.addEventListener("click", function () { placed = []; paint(); }); node.appendChild(reset);
    api.node = node;
    api.ready = function () { return placed.length === n; };
    api.check = function () {
      var ok = isAnswer(placed); line.classList.add(ok ? "right" : "wrong");
      Array.prototype.forEach.call(node.querySelectorAll("button"), function (b) { b.disabled = true; });
      var ans = it.answers[0].map(function (i, k) { return (k + 1) + ". " + Q.esc(it.sentences[i]); }).join("<br>");
      return { earned: ok ? 1 : 0, possible: 1, answer: ok ? "" : "One correct order:<br><b>" + ans + "</b>" };
    };
    paint(); return api;
  }

  // ---------- learn it: tap each sentence to see its job ----------
  var ROLE = { topic: "Topic sentence", support: "Supporting sentence", concluding: "Concluding sentence" };
  function learn() {
    Q.clear(); S.stp = stepFor("Learn", 0); Q.root.appendChild(S.stp);
    var sp = S.lesson.spot, c = h("div", "wc-card wc-learn");
    c.appendChild(h("p", "wc-step", "Learn it"));
    c.appendChild(h("p", "wc-lead", Q.md(sp.intro)));
    var para = h("div", "wc-paragraph"), notes = h("div", "wc-notes"), seen = 0, total = sp.sentences.length;
    var counter = h("p", "wc-counter");
    var take = h("div", "wc-takeaway"); take.hidden = true; take.innerHTML = Q.md(sp.takeaway);
    var act = h("div", "wc-actions"), go = h("button", "wc-btn", "Practise"); go.type = "button"; go.disabled = true; go.addEventListener("click", practice);
    act.appendChild(go);
    function upd() { counter.textContent = seen + " of " + total + " sentences explained"; if (S.stp) S.stp.set(seen / total); if (seen === total) { take.hidden = false; go.disabled = false; go.focus(); } }
    sp.sentences.forEach(function (s) {
      var b = h("span", "wc-sent", Q.md(s.t)); b.setAttribute("role", "button"); b.tabIndex = 0;
      function reveal() {
        if (b.classList.contains("on")) return;
        b.classList.add("on", "role-" + s.role); b.setAttribute("aria-label", s.t.replace(/==|\*\*|\+\+/g, "") + " (" + (s.label || ROLE[s.role]) + ")"); seen++;
        var n = h("div", "wc-margin-note role-" + s.role);
        n.innerHTML = '<span class="wc-pen" aria-hidden="true">✎</span><span class="wc-note-t"><b>' + Q.esc(s.label || ROLE[s.role]) + ".</b> " + Q.md(s.note) + "</span>";
        notes.appendChild(n); upd();
      }
      b.addEventListener("click", reveal);
      b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reveal(); } });
      para.appendChild(b); para.appendChild(document.createTextNode(" "));
    });
    c.appendChild(para); c.appendChild(counter); c.appendChild(notes); c.appendChild(take); c.appendChild(act);
    Q.root.appendChild(c); upd(); var f = para.querySelector(".wc-sent"); if (f) f.focus();
  }

  // ---------- practise with adaptive help ----------
  function practice() {
    var items = S.lesson.review ? reviewItems() : S.lesson.practice;
    (function next(i) {
      if (i >= items.length) return write();
      var host = card("Practise · Question " + (i + 1) + " of " + items.length);
      Q.clear(); Q.root.appendChild(stepFor("Practise", i / items.length)); Q.root.appendChild(host.card);
      adaptive(items[i], host, i === items.length - 1).then(function (kind) {
        WC.skillResult(items[i].skill, kind); // the review schedule is built from these
        S.kinds.push({ skill: items[i].skill, kind: kind }); next(i + 1);
      });
    })(0);
  }
  // A review mixes questions from every lesson in the stage, one from each in turn.
  function reviewItems() {
    var L = S.lesson, lessons = S.ctx.stageData.lessons;
    var lists = (L.from || []).map(function (id) { return Q.shuffle((lessons[id] && lessons[id].practice || []).slice()); });
    var out = [], round = 0;
    while (out.length < (L.count || 8) && round < 10) { lists.forEach(function (arr) { if (out.length < (L.count || 8) && arr[round]) out.push(arr[round]); }); round++; }
    return Q.shuffle(out);
  }
  function correct(host, it, kind) {
    stamp(host, kind === "first" ? "Nice!" : "Got it!");
    feedback(host, "ok", kind === "first" ? "Nice! " : "Got it, well done. ", it.why);
  }
  function wrong(host, it, r) { feedback(host, "bad", "Not quite. ", it.why, r.res.answer); }
  function adaptive(it, host, last) {
    var hp = it.help || {}, kind = "miss";
    return attempt(it, host).then(function (r) {
      if (r.ok) { kind = "first"; correct(host, it, kind); return null; }
      // step 1: a nudge in the margin, then another go
      if (hp.nudge) {
        host.fb.hidden = true; note(host, hp.nudge);
        return wait(host, "Try again").then(function () { host.help.innerHTML = ""; return attempt(it, host); }).then(function (r2) {
          if (r2.ok) { kind = "helped"; correct(host, it, kind); return null; }
          return stepTwo(r2);
        });
      }
      return stepTwo(r);
    }).then(function () { return wait(host, last ? "Go to the writing studio →" : "Next →"); }).then(function () { return kind; });

    // step 2: rule card + worked example, then a NEW similar question
    function stepTwo(r) {
      host.fb.hidden = true;
      if (hp.rule) { var rc = h("div", "wc-rule"); rc.innerHTML = "<b>The rule</b><p>" + Q.md(hp.rule) + "</p>" + (hp.worked ? "<b>Worked example</b><p>" + Q.md(hp.worked) + "</p>" : ""); host.help.appendChild(rc); }
      var v = hp.variants && hp.variants[0];
      if (!v) { wrong(host, it, r); return null; }
      return wait(host, "Try a new one").then(function () { host.help.innerHTML = ""; return attempt(v, host); }).then(function (r3) {
        if (r3.ok) { kind = "helped"; correct(host, v, kind); } else wrong(host, v, r3);
      });
    }
  }

  // ---------- writing studio ----------
  var KEY = function () { return "iep099-wc-draft-" + S.id; };
  function loadDraft() { try { return localStorage.getItem(KEY()) || ""; } catch (e) { return ""; } }
  function saveDraft(t) { try { localStorage.setItem(KEY(), t); } catch (e) {} }
  function write() {
    Q.clear(); Q.root.appendChild(stepFor("Write", 0));
    var W = S.lesson.write, c = h("div", "wc-card wc-studio");
    c.appendChild(h("p", "wc-step", "Writing studio · draft"));
    c.appendChild(h("p", "wc-lead", Q.md(W.prompt)));
    var ta = h("textarea", "wc-ta"); ta.rows = (W.minWords || 0) > 30 ? 9 : (W.minWords || 0) > 15 ? 6 : 4; ta.placeholder = W.placeholder || "Write here…"; ta.setAttribute("aria-label", "Your draft");
    ta.value = loadDraft(); c.appendChild(ta);
    var meta = h("p", "wc-wc"), saved = h("span", "wc-saved"); c.appendChild(meta);
    c.appendChild(h("p", "wc-sub", "Focus checklist. Tick each box that is true for your writing."));
    var list = h("div", "wc-checks"), boxes = [], hints = [];
    W.checks.forEach(function (ck) {
      var l = h("label", "wc-check"), cb = h("input"); cb.type = "checkbox";
      var t = h("span", "wc-check-t", Q.md(ck.t)), hint = h("span", "wc-hint");
      l.appendChild(cb); l.appendChild(t); l.appendChild(hint); list.appendChild(l); boxes.push(cb); hints.push(hint);
    });
    c.appendChild(list);
    var act = h("div", "wc-actions"), save = h("button", "wc-btn", "Save my draft"); save.type = "button"; save.disabled = true;
    act.appendChild(save); act.appendChild(saved); c.appendChild(act);
    Q.root.appendChild(c);
    var t0 = null;
    function refresh() {
      var n = Q.wordCount(ta.value), need = W.minWords || 1;
      meta.textContent = n + (n === 1 ? " word" : " words") + (n < need ? " · write at least " + need : "");
      save.disabled = n < need;
      W.checks.forEach(function (ck, i) {
        if (!ck.auto || !Q.AUTO[ck.auto]) { hints[i].textContent = ""; return; }
        var r = Q.AUTO[ck.auto](ta.value); hints[i].textContent = r ? r.msg : ""; hints[i].className = "wc-hint " + (r ? (r.ok ? "found" : "no") : "");
      });
    }
    ta.addEventListener("input", function () { refresh(); clearTimeout(t0); t0 = setTimeout(function () { saveDraft(ta.value); saved.textContent = "Draft autosaved on this device"; }, 400); });
    refresh();
    save.addEventListener("click", function () {
      S.draft = ta.value.trim(); saveDraft(S.draft);
      S.unticked = []; boxes.forEach(function (x, i) { if (!x.checked) S.unticked.push(W.checks[i].t); });
      WC.savePiece({ id: S.id, lesson: S.id, title: S.ctx.meta.title, prompt: W.prompt, text: S.draft, kind: "draft" });
      revise();
    });
    ta.focus();
  }

  function metrics(t) {
    var words = Q.wordCount(t), sentences = (t.trim().match(/[^.!?]+[.!?]+/g) || (t.trim() ? [t.trim()] : [])).length;
    var caps = Q.AUTO.capsAndEnd(t);
    return { words: words, sentences: sentences, caps: caps ? caps.ok : false };
  }
  function revise() {
    Q.clear(); Q.root.appendChild(stepFor("Write", 0.5));
    var W = S.lesson.write, c = h("div", "wc-card wc-studio");
    c.appendChild(h("p", "wc-step", "Writing studio · revise"));
    c.appendChild(h("p", "wc-lead", "Draft saved to your portfolio. Now make it **better**. Pick one thing to improve, then rewrite. Keep your own ideas and voice."));
    var q = h("blockquote", "wc-draft"); q.textContent = S.draft; c.appendChild(q);
    var focus = h("div", "wc-focus"); focus.setAttribute("role", "group"); focus.setAttribute("aria-label", "What will you improve?");
    (W.focus || []).forEach(function (f) {
      var b = h("button", "wc-chip", Q.esc(f)); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { Array.prototype.forEach.call(focus.children, function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); }); b.classList.add("on"); b.setAttribute("aria-pressed", "true"); });
      focus.appendChild(b);
    });
    c.appendChild(focus);
    if (S.unticked && S.unticked.length) c.appendChild(h("p", "wc-sub", "<b>Look at:</b> " + S.unticked.map(function (u) { return Q.md(u); }).join(" · ")));
    var ta = h("textarea", "wc-ta"); ta.rows = (S.draft.split(/\s+/).length > 30) ? 9 : (S.draft.split(/\s+/).length > 15 ? 6 : 4); ta.value = S.draft; ta.setAttribute("aria-label", "Your revision"); c.appendChild(ta);
    c.appendChild(h("p", "wc-sub", "What did you change? (tick all that apply)"));
    var list = h("div", "wc-checks"), boxes = [];
    CHANGES.forEach(function (t) { var l = h("label", "wc-check"), cb = h("input"); cb.type = "checkbox"; l.appendChild(cb); l.appendChild(h("span", "wc-check-t", Q.esc(t))); list.appendChild(l); boxes.push(cb); });
    c.appendChild(list);
    var out = h("div", "wc-fb"); out.hidden = true; out.setAttribute("aria-live", "polite"); c.appendChild(out);
    var act = h("div", "wc-actions"), done = h("button", "wc-btn", "Save my revision"); done.type = "button"; done.disabled = true;
    var skip = h("button", "wc-link", "Skip revising"); skip.type = "button"; act.appendChild(done); act.appendChild(skip); c.appendChild(act);
    Q.root.appendChild(c);
    function refresh() { done.disabled = ta.value.trim() === S.draft || !ta.value.trim() || !boxes.some(function (x) { return x.checked; }); }
    ta.addEventListener("input", refresh); boxes.forEach(function (x) { x.addEventListener("change", refresh); }); refresh();
    done.addEventListener("click", function () {
      S.revision = ta.value.trim(); S.revised = true;
      WC.savePiece({ id: S.id, lesson: S.id, title: S.ctx.meta.title, prompt: W.prompt, text: S.revision, kind: "revision" });
      ta.disabled = true; done.hidden = true; skip.hidden = true; boxes.forEach(function (x) { x.disabled = true; });
      var a = metrics(S.draft), b = metrics(S.revision);
      var yn = function (v) { return v ? "yes" : "not yet"; };
      out.className = "wc-fb ok";
      out.innerHTML = "<b>Nice revision!</b> New words are highlighted:<div class=\"wc-diff\">" + Q.diffHtml(S.draft, S.revision) + "</div>" +
        '<table class="wc-compare"><caption>What changed (a guide, not a mark)</caption><tr><th></th><th>Draft</th><th>Revision</th></tr>' +
        "<tr><td>Words</td><td>" + a.words + "</td><td>" + b.words + "</td></tr>" +
        "<tr><td>Sentences</td><td>" + a.sentences + "</td><td>" + b.sentences + "</td></tr>" +
        "<tr><td>Capital + end punctuation</td><td>" + yn(a.caps) + "</td><td>" + yn(b.caps) + "</td></tr></table>" +
        '<details class="wc-sample"><summary>Show one possible answer</summary><span>One possible answer. Yours can be completely different:</span> ' + Q.esc(W.sample) + "</details>";
      out.hidden = false;
      var go = h("button", "wc-btn", "See my reward →"); go.type = "button"; go.addEventListener("click", reward); act.appendChild(go); go.focus();
    });
    skip.addEventListener("click", reward);
    ta.focus();
  }

  // ---------- reward ----------
  function nextAfter() {
    var flat = []; S.ctx.idx.stages.forEach(function (s) { s.lessons.forEach(function (l) { if (l.ready) flat.push(l); }); });
    for (var i = 0; i < flat.length; i++) if (flat[i].id === S.id) return flat[i + 1] || null;
    return null;
  }
  function inDays(d) { var n = WC.daysBetween(WC.today(), d); return n <= 0 ? "today" : n === 1 ? "tomorrow" : "in " + n + " days"; }
  function reward() {
    Q.clear();
    var n = S.kinds.length, first = S.kinds.filter(function (k) { return k.kind === "first"; }).length, helped = S.kinds.filter(function (k) { return k.kind === "helped"; }).length;
    var pct = n ? Math.round((first + helped * 0.6) / n * 100) : 100;
    var b = S.before.lessons[S.id] || {};
    var res = WC.complete(S.id, { pct: pct, built: !!S.draft, draft: S.draft, revised: S.revised, revision: S.revision });
    Q.root.appendChild(stepper(CUR.length));
    var r = res.record, c = h("div", "wc-card wc-reward"), more = h("details", "wc-more");
    more.appendChild(h("summary", "", "See details"));
    var st = h("div", "wc-stars"); st.setAttribute("aria-label", res.stars + " of 3 stars");
    for (var i = 1; i <= 3; i++) st.appendChild(h("span", "wc-star" + (i <= res.stars ? " on" : ""), "★"));
    c.appendChild(st);
    c.appendChild(h("h2", "wc-h2", res.stars === 3 ? "Excellent session!" : res.stars === 2 ? "Great work!" : "Session complete"));
    c.appendChild(h("p", "wc-lead", first + " of " + n + " right first time" + (helped ? " · " + helped + " after a hint" : "") + (res.gained > 0 ? " · +" + res.gained + " XP" : "")));
    // celebrations only when there is something to celebrate
    if (res.levelUp) c.appendChild(h("p", "wc-badge-new", "🎉 Level up! You are now a <b>" + Q.esc(res.level.name) + "</b>."));
    (window.IEPBadges ? window.IEPBadges.check() : []).forEach(function (d) { var p = h("p", "wc-badge-new"); p.innerHTML = '<img class="wc-badge-img" src="' + window.IEPBadges.src(d) + '" alt=""> New badge: <b>' + Q.esc(d.name) + "</b>"; c.appendChild(p); });

    // one main button; everything else is a quiet link
    var act = h("div", "wc-actions"), next = nextAfter();
    if (next) { var a1 = h("a", "wc-btn", "Next: " + Q.esc(next.title) + " →"); a1.href = "wlesson.html?id=" + next.id; act.appendChild(a1); }
    else { var a0 = h("a", "wc-btn", "Back to the path"); a0.href = "writing.html"; act.appendChild(a0); }
    c.appendChild(act);
    var links = h("div", "wc-links");
    if (next) { var a2 = h("a", "wc-link", "Back to the path"); a2.href = "writing.html"; links.appendChild(a2); }
    var again = h("button", "wc-link", "Do the session again"); again.type = "button"; again.addEventListener("click", function () { S.kinds = []; S.draft = ""; S.revision = ""; S.revised = false; S.before = JSON.parse(JSON.stringify(WC.read())); opening(); });
    links.appendChild(again);
    c.appendChild(links);

    // details, tucked away
    var key = S.lesson.skill, was = (S.before.skills[key] || { s: 0 }).s, now = (r.skills[key] || { s: 0 }).s;
    var meter = h("div", "wc-meter");
    meter.innerHTML = "<b>" + Q.esc(skillName(key)) + "</b>" +
      '<span class="wc-ink" role="img" aria-label="Skill strength ' + Math.floor(now) + ' of 5">' + [1, 2, 3, 4, 5].map(function (k) { return '<i class="' + (k <= Math.floor(was) ? "was" : k <= Math.floor(now) ? "gain" : "") + '"></i>'; }).join("") + "</span>" +
      "<small>" + (now > was ? "Stronger today! " : "") + "This skill returns " + (r.skills[key] ? inDays(r.skills[key].due) : "soon") + " so it sticks.</small>";
    more.appendChild(meter);
    var why = [];
    if (res.first) why.push("finishing the lesson"); if (res.stars > (b.stars || 0)) why.push("a better star rating");
    if (S.draft && !b.built) why.push("your writing"); if (S.revised && !b.revised) why.push("your revision");
    var xp = h("div", "wc-xp");
    xp.innerHTML = (res.gained > 0 ? "<b>+" + res.gained + " XP</b> for " + why.join(", ") : "<b>No new XP this time</b><br><small>Replays earn XP only when they improve your stars, writing or revision.</small>") +
      "<br>Level " + res.level.n + ": " + Q.esc(res.level.name) + '<div class="wc-bar"><i style="width:' + res.level.pct + '%"></i></div>' +
      (res.level.need ? "<small>" + Q.esc(res.level.need) + "</small>" : res.level.next ? "<small>" + (res.level.next.min - r.xp) + " XP to " + Q.esc(res.level.next.name) + "</small>" : "");
    more.appendChild(xp);
    if (S.draft) {
      var piece = r.portfolio.filter(function (p) { return p.id === S.id; })[0];
      var pc = h("div", "wc-pcard-saved");
      pc.innerHTML = "<span>📓</span><div><b>Saved to your portfolio</b><small>" + Q.esc(S.ctx.meta.title) + " · " + (piece ? piece.versions.length : 1) + (piece && piece.versions.length > 1 ? " versions" : " version") + "</small></div>";
      more.appendChild(pc);
    }
    var back = Object.keys(r.skills).filter(function (k) { return r.skills[k].due; }).sort(function (a, b2) { return r.skills[a].due < r.skills[b2].due ? -1 : 1; }).slice(0, 4);
    if (back.length) more.appendChild(h("p", "wc-back", "<b>Coming back:</b> " + back.map(function (k) { return Q.esc(skillName(k)) + " (" + inDays(r.skills[k].due) + ")"; }).join(" · ")));
    more.appendChild(h("p", "wc-backup", 'Your progress is saved on this device only. <a href="my-writing.html#backup">Save a backup</a> so you can restore it on a new phone.'));
    c.appendChild(more);
    Q.root.appendChild(c);
    if (res.stars === 3 && E) E.confetti();
    var f = c.querySelector(".wc-actions a, .wc-actions button"); if (f) f.focus();
  }

  window.WV2 = { run: run };
})();
