// IEP099 grammar practice — plays back an instructor-built custom set. Everything needed to render it
// (which activities, title, note) is encoded in this page's own URL, built by builder.html — there's no
// server or database behind this, so the link itself is the whole "shared set".
(function () {
  "use strict";
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  var params = new URLSearchParams(location.search);
  var title = params.get("title") || "Practice Set";
  var note = params.get("note") || "";
  var minutes = parseInt(params.get("minutes"), 10);
  var ids = (params.get("ids") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);

  document.getElementById("setTitle").textContent = title;
  document.title = title + " — IEP099 Grammar Practice";
  if (note) { var n = document.getElementById("setNote"); n.textContent = note; n.hidden = false; }

  // A time limit is a countdown and, once it runs out, checks and locks every activity so the score is
  // final — a reasonable honor-system limit, not real enforcement, since nothing client-side truly can be
  // on a static site (a student could always just ignore the page and keep typing).
  var timesUp = false;
  if (minutes > 0) {
    var timerBadge = document.getElementById("timerBadge");
    timerBadge.hidden = false;
    var deadline = Date.now() + minutes * 60000;
    var tick = function () {
      var left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      var m = Math.floor(left / 60), s = left % 60;
      timerBadge.textContent = "⏱ " + m + ":" + (s < 10 ? "0" : "") + s;
      if (left <= 60) timerBadge.classList.add("timer-urgent");
      if (left <= 0 && !timesUp) { timesUp = true; clearInterval(timerId); onTimeUp(); }
    };
    var timerId = setInterval(tick, 1000);
    tick();
  }
  function onTimeUp() {
    document.getElementById("timerBadge").textContent = "⏱ Time's up";
    // Click each "Check answers" button first, while it's still enabled — a disabled button ignores even a
    // scripted .click(), so disabling everything before checking would leave every exercise unscored.
    document.querySelectorAll("#setList button.btn:not(.ghost)").forEach(function (btn) { btn.click(); });
    document.querySelectorAll("#setList input, #setList select, #setList button").forEach(function (el) { el.disabled = true; });
    var banner = document.createElement("p");
    banner.className = "note";
    banner.style.cssText = "color:var(--bad-ink);font-weight:700;margin-top:4px";
    banner.textContent = "Time's up — your answers have been checked and locked in.";
    document.getElementById("setTitle").insertAdjacentElement("afterend", banner);
  }

  var list = document.getElementById("setList");
  if (!ids.length) { list.innerHTML = '<p class="note">This link doesn’t include any activities.</p>'; return; }

  fetch("activities.json").then(function (r) { return r.json(); }).then(function (all) {
    var results = [];
    var missing = 0;
    ids.forEach(function (id) {
      var item = all[id];
      if (!item) { missing++; return; }
      var wrap = document.createElement("div");
      var eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.style.margin = "22px 0 6px";
      eyebrow.textContent = "Unit " + item.meta.unit + (item.meta.topicTitle ? " · " + item.meta.topicTitle : "");
      wrap.appendChild(eyebrow);
      var card = document.createElement("div");
      card.className = "ex";
      wrap.appendChild(card);
      list.appendChild(wrap);
      results.push(window.IEPPractice.buildExercise(card, item.exercise, item.rules, item.meta, updateTotal));
    });

    if (missing) {
      var warn = document.createElement("p");
      warn.className = "note";
      warn.textContent = missing + " activit" + (missing === 1 ? "y" : "ies") + " in this set could not be found — the booklet may have changed since this link was created.";
      list.parentNode.insertBefore(warn, list);
    }

    function updateTotal() {
      var total = 0, correct = 0, anyChecked = false;
      results.forEach(function (r) { total += r.total; correct += r.correct; if (r.checked) anyChecked = true; });
      var bar = document.getElementById("barScore");
      if (!anyChecked) { bar.textContent = "Not checked yet"; bar.classList.add("zero"); }
      else { bar.textContent = correct + " / " + total + " correct"; bar.classList.remove("zero"); }
    }
    updateTotal();
  }).catch(function () {
    list.innerHTML = '<p class="note">Couldn’t load this practice set. Check your connection and try again.</p>';
  });
})();
