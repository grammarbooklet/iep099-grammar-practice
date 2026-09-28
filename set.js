// IEP099 grammar practice — plays back an instructor-built custom set. Everything needed to render it
// (which activities, title, note) is encoded in this page's own URL, built by builder.html — there's no
// server or database behind this, so the link itself is the whole "shared set".
(function () {
  "use strict";
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  var params = new URLSearchParams(location.search);
  var title = params.get("title") || "Practice Set";
  var note = params.get("note") || "";
  var ids = (params.get("ids") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);

  document.getElementById("setTitle").textContent = title;
  document.title = title + " — IEP099 Grammar Practice";
  if (note) { var n = document.getElementById("setNote"); n.textContent = note; n.hidden = false; }

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
