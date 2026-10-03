// IEP099 grammar practice — shared rendering + checking engine for every topic page.
// Consumes window.PAGE_DATA (set by an inline <script> on each generated page) and builds interactive
// exercises from it: fill-in blanks and click-to-choose forms parsed from the booklet's own markup
// ({=right|wrong} and [[answer]]), plus short-answer, rewrite, multiple-choice and matching exercises.
(function () {
  "use strict";

  // ---------- tiny parser for the booklet's own inline markup ----------
  // {=right|wrong}  -> a choice between options, "=" marks the correct one
  // [[answer]]      -> a fill-in blank; "|" separates acceptable answers, "~" adds alternate spellings
  function parseSegments(raw) {
    var tokens = [];
    var s = raw.replace(/\{([^{}]+)\}/g, function (_, body) {
      var opts = body.split("|").map(function (o) { return o.trim(); });
      var correct = -1;
      var clean = opts.map(function (o, i) { if (o.charAt(0) === "=") { correct = i; return o.slice(1); } return o; });
      tokens.push({ type: "choice", options: clean, correct: correct });
      return "\u0000" + (tokens.length - 1) + "\u0000";
    });
    s = s.replace(/\[\[([^\]]+)\]\]/g, function (_, a) {
      var groups = a.split("|");
      var accepted = [];
      groups.forEach(function (g) { g.split("~").forEach(function (x) { accepted.push(x.trim().toLowerCase()); }); });
      tokens.push({ type: "blank", accepted: accepted, display: groups[0].split("~")[0].trim() });
      return "\u0000" + (tokens.length - 1) + "\u0000";
    });
    var parts = s.split(/\u0000(\d+)\u0000/);
    var out = [];
    parts.forEach(function (p, i) {
      if (i % 2 === 0) { if (p) out.push({ type: "text", value: mdLite(p) }); }
      else out.push(tokens[+p]);
    });
    return out;
  }
  // **bold** and ++underline++ — the booklet's own inline emphasis markup (++ was previously left showing
  // as literal plus signs around the word on the site).
  function mdLite(s) { return String(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\+\+(.+?)\+\+/g, "<u>$1</u>"); }
  function norm(s) { return String(s || "").trim().toLowerCase().replace(/[.!?,;:'"’]/g, "").replace(/\s+/g, " "); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  var uid = 0;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // ---------- saved results, read back by the My Progress page ----------
  // Nothing here ever leaves the browser on its own — it's only read when the student visits My Progress.
  var RESULTS_KEY = "iep099-results";
  function saveResult(id, entry) {
    try {
      var all = JSON.parse(localStorage.getItem(RESULTS_KEY) || "{}");
      all[id] = entry;
      localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  // ---------- renderers per item kind (each returns {node, check(), reset()}) ----------
  function renderInline(text) {
    var body = el("span");
    var segs = parseSegments(text);
    var parts = [];
    segs.forEach(function (seg) {
      if (seg.type === "text") { body.insertAdjacentHTML("beforeend", seg.value); return; }
      if (seg.type === "blank") {
        var inp = el("input", "blank"); inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false;
        inp.id = "f" + (++uid); inp.setAttribute("aria-label", "Answer");
        inp.style.width = Math.max(3.4, seg.display.length * 0.95) + "em";
        body.appendChild(inp); parts.push({ seg: seg, input: inp });
      } else if (seg.type === "choice") {
        var wrap = el("span", "choice");
        var btns = seg.options.map(function (opt, i) {
          var b = el("button", "", esc(opt)); b.type = "button"; b.dataset.i = i;
          b.addEventListener("click", function () { btns.forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); wrap.dataset.sel = i; });
          wrap.appendChild(b); return b;
        });
        body.appendChild(wrap); parts.push({ seg: seg, choiceWrap: wrap, btns: btns });
      }
    });
    return { node: body, check: function () {
      var ok = true;
      parts.forEach(function (p) {
        if (p.input) { if (p.seg.accepted.indexOf(norm(p.input.value)) === -1) ok = false; }
        else {
          var sel = p.choiceWrap.dataset.sel;
          p.btns.forEach(function (b, i) { b.classList.remove("right", "wrong"); if (i === p.seg.correct) b.classList.add("right"); });
          if (sel === undefined || +sel !== p.seg.correct) { ok = false; if (sel !== undefined) p.btns[+sel].classList.add("wrong"); }
        }
      });
      return ok;
    }, reset: function () {
      parts.forEach(function (p) {
        if (p.input) p.input.value = "";
        else { p.btns.forEach(function (b) { b.classList.remove("sel", "right", "wrong"); }); delete p.choiceWrap.dataset.sel; }
      });
    } };
  }

  // Most "short" exercises expect a 1-3 letter code (Z/F/S, a tense label), but some expect a whole word or
  // phrase — those must not be capped at 3 characters or the student can't type the answer at all.
  // longAnswer is decided once for the whole exercise (see caller) so every box in a list matches.
  function renderCode(item, longAnswer) {
    var body = el("span", "q", mdLite(esc(item[0])));
    var inp = el("input", longAnswer ? "code long" : "code"); inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false;
    if (!longAnswer) inp.maxLength = 3;
    inp.setAttribute("aria-label", "Answer");
    var frag = document.createDocumentFragment(); frag.appendChild(body); frag.appendChild(inp);
    return { node: frag, check: function () { return norm(inp.value) === norm(item[1]); }, reset: function () { inp.value = ""; } };
  }

  // withChooser is true for a whole "Correct the Mistake"-style exercise (see caller): the student picks
  // ✗ (has a mistake) or ✓ (already correct) first, and the text box to write the correction only appears
  // after ✗ — nothing to type for a sentence that's already right, and no keyboard has a tick key to press.
  function renderRewrite(item, withChooser) {
    var body = el("div");
    var already = /^\s*✓/.test(String(item[1]));
    var model = el("div", "model", already ? "This sentence needs no change — it's already correct." : "Model answer: <b>" + esc(item[1]) + "</b>");

    if (!withChooser) {
      body.appendChild(el("span", "q", mdLite(esc(item[0]))));
      var plainInp = el("input", "rewrite"); plainInp.type = "text"; plainInp.placeholder = "Type your answer…"; plainInp.autocomplete = "off";
      body.appendChild(plainInp); body.appendChild(model);
      return { node: body, check: function () { return norm(plainInp.value) === norm(item[1]); }, reset: function () { plainInp.value = ""; } };
    }

    var choice = null; // "x" (has a mistake) | "t" (already correct)
    var row = el("div", "rw-row");
    row.appendChild(el("span", "q", mdLite(esc(item[0]))));
    var picker = el("div", "xt-picker");
    var xBtn = el("button", "xt-btn x", "✗"); xBtn.type = "button"; xBtn.title = "This sentence has a mistake";
    var tBtn = el("button", "xt-btn t", "✓"); tBtn.type = "button"; tBtn.title = "This sentence is already correct";
    picker.appendChild(xBtn); picker.appendChild(tBtn);
    row.appendChild(picker);
    var inp = el("input", "rewrite"); inp.type = "text"; inp.placeholder = "Type the correct sentence…"; inp.autocomplete = "off";
    inp.hidden = true;
    function select(which) {
      choice = which;
      xBtn.classList.toggle("sel", which === "x");
      tBtn.classList.toggle("sel", which === "t");
      inp.hidden = which !== "x";
      if (which === "x") inp.focus();
    }
    xBtn.addEventListener("click", function () { select("x"); });
    tBtn.addEventListener("click", function () { select("t"); });
    body.appendChild(row); body.appendChild(inp); body.appendChild(model);
    return {
      node: body,
      check: function () { return already ? choice === "t" : (choice === "x" && norm(inp.value) === norm(item[1])); },
      reset: function () { choice = null; xBtn.classList.remove("sel"); tBtn.classList.remove("sel"); inp.hidden = true; inp.value = ""; }
    };
  }

  function renderMc(item) {
    var body = el("div");
    body.appendChild(el("div", "q", mdLite(esc(item[0]))));
    var wrap = el("div", "choice mc");
    var btns = item[1].map(function (opt, i) {
      var b = el("button", "", esc(opt)); b.type = "button"; b.dataset.i = i;
      b.addEventListener("click", function () { btns.forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); wrap.dataset.sel = i; });
      wrap.appendChild(b); return b;
    });
    body.appendChild(wrap);
    return { node: body, check: function () {
      var sel = wrap.dataset.sel;
      btns.forEach(function (b, i) { b.classList.remove("right", "wrong"); if (i === item[2]) b.classList.add("right"); });
      var ok = sel !== undefined && +sel === item[2];
      if (!ok && sel !== undefined) btns[+sel].classList.add("wrong");
      return ok;
    }, reset: function () { btns.forEach(function (b) { b.classList.remove("sel", "right", "wrong"); }); delete wrap.dataset.sel; } };
  }

  function renderMatch(leftText, rightOptions, correctIndex) {
    var body = el("span", "q", mdLite(esc(leftText)));
    var sel = el("select", "match");
    sel.appendChild(el("option", "", "Choose…")).value = "";
    rightOptions.forEach(function (opt, i) { var o = el("option", "", esc(opt)); o.value = i; sel.appendChild(o); });
    var frag = document.createDocumentFragment(); frag.appendChild(body); frag.appendChild(sel);
    return { node: frag, check: function () { return sel.value !== "" && +sel.value === correctIndex; }, reset: function () { sel.value = ""; } };
  }

  // ---------- rule hint (only ever shown after a mistake, never up front) ----------
  function ruleHintHtml(rules) {
    if (!rules || !rules.length) return "";
    return rules.map(function (r) {
      return "<div class=\"hint-row\"><b>" + esc(r.label) + ":</b> " + esc(r.formula) + (r.eg ? " <span class=\"hint-eg\">" + mdLite(esc(r.eg)) + "</span>" : "") + "</div>";
    }).join("");
  }

  // ---------- build one exercise block from a captured {title, spec} ----------
  function buildExercise(container, ex, rules, meta, onScore) {
    var spec = ex.spec;
    // "Correct the Mistake"-style exercises mix sentences that need fixing with the odd one that's already
    // right. If even one item uses that already-correct marker, every item gets the X / tick chooser so the
    // interaction is consistent — pick one first, then the text box (only for "has a mistake") appears.
    // Plain rewrite/transform/combine exercises never have that marker and keep the ordinary text field.
    var hasTick = spec.type === "write" && (spec.items || []).some(function (it) { return /^\s*✓/.test(String(it[1])); });
    container.innerHTML = "";
    container.appendChild(el("span", "ex-tag", esc(spec.tag || ex.title)));
    if (spec.tag) container.appendChild(el("h4", "ex-title", esc(ex.title)));
    // The booklet's own instruction says to write a tick — correct for pen and paper, but the site uses
    // buttons instead, so the displayed instruction is swapped here without touching the shared source
    // text the print booklet still relies on.
    var instrText = hasTick ? "Each sentence has a tag question. Tap ✗ if it has a mistake and type the correction, or tap ✓ if it's already correct." : spec.instr;
    if (instrText) container.appendChild(el("p", "ex-instr", mdLite(esc(instrText))));
    if (spec.eg) container.appendChild(el("p", "ex-eg", "<b>Example</b>" + parseSegments(spec.eg).map(plainOfSeg).join("")));
    if (spec.bank) { var bank = el("div", "ex-bank"); spec.bank.forEach(function (w) { bank.appendChild(el("span", "", esc(w))); }); container.appendChild(bank); }

    var list = el("div");
    var checks = [];
    if (spec.type === "match") {
      spec.left.forEach(function (leftText, i) {
        var itemEl = el("div", "item"); itemEl.appendChild(el("span", "n", String(i + 1)));
        var bw = el("div", "body"); var built = renderMatch(leftText, spec.right, i);
        bw.appendChild(built.node); itemEl.appendChild(bw); list.appendChild(itemEl);
        checks.push({ el: itemEl, run: built.check, reset: built.reset });
      });
    } else {
      var items = spec.tag === "Notice" ? (spec.items || []).slice(0, 3) : (spec.items || []);
      var shortHasWords = spec.type === "short" && items.some(function (it) { return String(it[1]).length > 3; });
      items.forEach(function (raw, i) {
        var itemEl = el("div", "item"); itemEl.appendChild(el("span", "n", String(i + 1)));
        var bw = el("div", "body");
        var built = spec.type === "short" ? renderCode(raw, shortHasWords)
          : spec.type === "write" ? renderRewrite(raw, hasTick)
          : spec.type === "mc" ? renderMc(raw)
          : renderInline(typeof raw === "string" ? raw : raw[0]);
        bw.appendChild(built.node); itemEl.appendChild(bw); list.appendChild(itemEl);
        checks.push({ el: itemEl, run: built.check, reset: built.reset });
      });
    }
    container.appendChild(list);

    var hint = el("div", "hint", "<div class=\"hint-h\">Remember the rule</div>" + ruleHintHtml(rules));
    hint.hidden = true;
    container.appendChild(hint);

    var actions = el("div", "ex-actions");
    var S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    var checkBtn = el("button", "btn accent", '<svg ' + S + '><path d="M5 13l4 4L19 7"/></svg>Check answers'); checkBtn.type = "button";
    var againBtn = el("button", "btn ghost", '<svg ' + S + '><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>Try again'); againBtn.type = "button";
    var score = el("span", "ex-score", "");
    actions.appendChild(checkBtn); actions.appendChild(againBtn); actions.appendChild(score);
    container.appendChild(actions);

    // itemOk[i] is whether item i was right on the most recent check — the review page needs per-item
    // results (not just a total) to know which individual questions to bring back.
    var result = { total: checks.length, correct: 0, checked: false, itemOk: [] };
    checkBtn.addEventListener("click", function () {
      var right = 0, wrong = [];
      checks.forEach(function (c, i) {
        var ok = c.run();
        c.el.classList.add("checked"); c.el.classList.toggle("correct", ok); c.el.classList.toggle("incorrect", !ok);
        result.itemOk[i] = ok;
        if (ok) right++; else wrong.push(i);
      });
      result.correct = right; result.checked = true;
      score.textContent = right + " / " + checks.length + " correct";
      score.classList.add("done");
      hint.hidden = right === checks.length || !rules || !rules.length;
      // meta.id only exists for a real, individually-numbered activity page (set by initPracticePage below).
      // An instructor-built set (set.html) passes activity meta straight from activities.json with no id,
      // and must never write into the student's whole-site My Progress store — those two are kept separate
      // on purpose, so a one-off quiz-practice link doesn't pollute a student's overall practice history.
      if (meta && meta.id != null) {
        saveResult(meta.id, { unit: meta.unit, unitTitle: meta.unitTitle, topicTitle: meta.topicTitle, activityTitle: meta.activityTitle, correct: right, total: checks.length, wrong: wrong, date: new Date().toISOString() });
        // Streak, unit progress, confetti and the "next activity" button (engage.js) — only ever on a real
        // activity page, for the same reason as the save above.
        if (window.IEPEngage) window.IEPEngage.afterCheck(container, meta.id, right, checks.length);
      }
      onScore && onScore();
    });
    againBtn.addEventListener("click", function () {
      checks.forEach(function (c) { c.reset(); c.el.classList.remove("checked", "correct", "incorrect"); });
      score.textContent = ""; score.classList.remove("done"); result.checked = false; result.correct = 0; result.itemOk = [];
      hint.hidden = true;
      var afterBlock = container.querySelector(".after-check"); if (afterBlock) afterBlock.remove();
      onScore && onScore();
    });
    return result;
  }

  function plainOfSeg(seg) {
    if (seg.type === "text") return seg.value;
    if (seg.type === "blank") return "<b>" + esc(seg.display) + "</b>";
    if (seg.type === "choice") return "<b>" + esc(seg.options[seg.correct] || seg.options[0]) + "</b>";
    return "";
  }

  // ---------- plain-text (no HTML) renderings, for the instructor's printable PDF worksheet ----------
  function stripTags(s) { return String(s).replace(/<[^>]+>/g, ""); }
  function blankOfSeg(seg) {
    if (seg.type === "text") return stripTags(seg.value);
    if (seg.type === "blank") return "_".repeat(Math.max(8, seg.display.length + 3));
    if (seg.type === "choice") return " (" + seg.options.join(" / ") + ") ";
    return "";
  }
  // The sentence as a blank for a student to fill in on paper (blanks -> underscores, choices -> options list).
  function printBlankText(raw) { return parseSegments(String(raw)).map(blankOfSeg).join(""); }
  // The same sentence with the answer already filled in (plain text), for printing a worked example.
  function printAnswerText(raw) { return stripTags(parseSegments(String(raw)).map(plainOfSeg).join("")); }

  // ---------- page bootstrap: each page renders exactly one activity, matching the book one-for-one ----------
  function initPracticePage() {
    var data = window.PAGE_DATA;
    if (!data || !data.exercise) return;
    var box = document.getElementById("exercise");
    if (!box) return;
    var meta = data.meta ? Object.assign({ id: data.id }, data.meta) : null;
    var result = buildExercise(box, data.exercise, data.rules, meta, updateBar);

    function updateBar() {
      var bar = document.getElementById("barScore");
      if (!bar) return;
      if (!result.checked) { bar.textContent = "Not checked yet"; bar.classList.add("zero"); return; }
      bar.textContent = result.correct + " / " + result.total + " correct";
      bar.classList.remove("zero");
    }

    // per-viewer convenience only: remember typed answers in this browser so a refresh doesn't lose work
    try {
      var KEY = "iep099-practice-" + (data.id || location.pathname);
      var inputs = Array.prototype.slice.call(document.querySelectorAll("input,select"));
      inputs.forEach(function (inp, i) { if (!inp.id) inp.id = "auto" + i; });
      var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      inputs.forEach(function (inp) { if (saved[inp.id] != null) inp.value = saved[inp.id]; });
      var save = function () { var d = {}; inputs.forEach(function (inp) { if (inp.value) d[inp.id] = inp.value; }); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
      document.addEventListener("input", function (e) { if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) save(); });
      document.addEventListener("change", function (e) { if (e.target && e.target.tagName === "SELECT") save(); });
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPracticePage);
  else initPracticePage();

  // Public API: the instructor-built "set" player page (set.html/set.js) reuses this exact same rendering
  // and grading engine to show several activities on one page, rather than duplicating any of this logic.
  window.IEPPractice = { buildExercise: buildExercise, printBlankText: printBlankText, printAnswerText: printAnswerText };
})();
