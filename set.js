// IEP099 grammar practice — plays back an instructor-built custom set. Everything needed to render it
// (which activities, title, note, time limit) is encoded in this page's own URL, built by builder.html —
// there's no server or database behind this, so the link itself is the whole "shared set".
//
// Flow: student scans/opens the link -> asked for name + section right away (before seeing any activity) ->
// works through every activity with no per-activity checking -> one Submit at the end reveals every result
// at once and locks the set -> then downloads a PDF report. A time limit (if set) does the same finish
// sequence automatically when it runs out, whether or not the student has clicked Submit.
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

  var list = document.getElementById("setList");
  var rows = []; // this set's own results, for its own PDF report only — see buildSetPdf below
  var finished = false;
  var timerId = null;
  var deadline = null; // null = untimed
  var timerBadge = document.getElementById("timerBadge");

  // ---------- name/section gate: shown immediately, before any activity is visible ----------
  document.getElementById("setStartBtn").addEventListener("click", function () {
    if (!document.getElementById("setStudentName").value.trim()) {
      document.getElementById("setGateMsg").textContent = "Enter your name first.";
      return;
    }
    document.getElementById("setGate").hidden = true;
    document.getElementById("setMain").hidden = false;
    if (minutes > 0) setTimeLimit(minutes);
    loadSet();
  });

  // Sets, extends, shortens or removes the time limit — used both for the link's own ?minutes= value at
  // start, and by the on-page instructor control below, so a teacher physically present can adjust it for
  // a device without needing any server (a static site has no way to push a change to a tab it doesn't
  // control, so this only ever affects the device it's actually touched on).
  function setTimeLimit(mins) {
    if (timerId) clearInterval(timerId);
    if (!(mins > 0)) { deadline = null; timerBadge.hidden = true; timerBadge.classList.remove("timer-urgent"); return; }
    deadline = Date.now() + mins * 60000;
    timerBadge.hidden = false;
    timerBadge.classList.remove("timer-urgent");
    var tick = function () {
      var left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      var m = Math.floor(left / 60), s = left % 60;
      timerBadge.textContent = "⏱ " + m + ":" + (s < 10 ? "0" : "") + s;
      if (left <= 60) timerBadge.classList.add("timer-urgent");
      if (left <= 0 && !finished) { clearInterval(timerId); finishSet("Time's up — your answers have been checked and locked in."); }
    };
    timerId = setInterval(tick, 1000);
    tick();
  }

  // ---------- instructor-only, on-device time adjustment (same passphrase as the builder tool) ----------
  (function () {
    var PASSPHRASE_HASH = "0db7bbf4badf215a1ec84b3adf234a84017596d8e52ea8d855616fd10aa761ab"; // "iep099grammar"
    function sha256Hex(text) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      });
    }
    var btn = document.getElementById("timeAdjustBtn"), panel = document.getElementById("timeAdjustPanel");
    var unlocked = false;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        var r = btn.getBoundingClientRect();
        panel.style.top = (r.bottom + window.scrollY + 8) + "px";
        panel.style.right = Math.max(16, window.innerWidth - r.right) + "px";
        if (unlocked) document.getElementById("timeAdjustMinutes").value = deadline ? Math.ceil((deadline - Date.now()) / 60000) : 0;
      }
    });
    document.addEventListener("click", function (e) { if (!panel.hidden && e.target !== btn && !panel.contains(e.target)) panel.hidden = true; });
    document.getElementById("timeAdjustUnlockBtn").addEventListener("click", function () {
      var v = document.getElementById("timeAdjustPass").value.trim();
      if (!v) return;
      sha256Hex(v).then(function (hash) {
        if (hash !== PASSPHRASE_HASH) { document.getElementById("timeAdjustMsg").textContent = "That's not the right passphrase."; return; }
        unlocked = true;
        document.getElementById("timeAdjustGateRow").hidden = true;
        document.getElementById("timeAdjustControls").hidden = false;
        document.getElementById("timeAdjustMsg").textContent = "";
        document.getElementById("timeAdjustMinutes").value = deadline ? Math.ceil((deadline - Date.now()) / 60000) : 0;
      });
    });
    document.getElementById("timeAdjustApplyBtn").addEventListener("click", function () {
      var mins = parseInt(document.getElementById("timeAdjustMinutes").value, 10) || 0;
      setTimeLimit(mins);
      document.getElementById("timeAdjustMsg").textContent = mins > 0 ? "Time limit set to " + mins + " min." : "Time limit removed.";
    });
  })();

  // ---------- one Submit locks and reveals everything; a time-out calls the same sequence ----------
  function finishSet(message) {
    if (finished) return;
    finished = true;
    if (timerId) clearInterval(timerId);
    document.getElementById("setMain").classList.add("submitted");
    // Click each "Check answers" button first, while it's still enabled — a disabled button ignores even a
    // scripted .click(), so disabling everything before checking would leave every exercise unscored.
    document.querySelectorAll("#setList button.btn:not(.ghost)").forEach(function (btn) { btn.click(); });
    document.querySelectorAll("#setList input, #setList select, #setList button").forEach(function (el) { el.disabled = true; });
    var submitBtn = document.getElementById("setSubmitBtn");
    submitBtn.hidden = true;
    document.getElementById("setSubmitStatus").textContent = message || "Submitted — here are your results.";
    document.getElementById("setDownloadSection").hidden = false;
    document.getElementById("setDownloadSection").scrollIntoView({ behavior: "smooth", block: "start" });
    reportToInstructor();
  }

  // Optional, dormant until sheets-config.js has a real URL: lets an instructor see who has completed which
  // set and their score, since a static site has no other way to "track" a QR/link. Fire-and-forget — the
  // student never sees this happen, and it never blocks or delays showing their own results.
  function reportToInstructor() {
    if (!window.SHEETS_WEBHOOK_URL) return;
    var t = computeTotals();
    var name = document.getElementById("setStudentName").value.trim();
    var section = document.getElementById("setSection").value.trim();
    try {
      fetch(window.SHEETS_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ name: name, section: section, set: title, correct: t.correct, total: t.total, percent: t.pct })
      }).catch(function () {});
    } catch (e) {}
  }

  function computeTotals() {
    var correct = 0, total = 0;
    rows.forEach(function (r) { correct += r.result.correct; total += r.result.total; });
    return { correct: correct, total: total, pct: total ? Math.round((correct / total) * 100) : 0 };
  }
  document.getElementById("setSubmitBtn").addEventListener("click", function () { finishSet("Submitted — here are your results."); });

  function loadSet() {
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
        var result = window.IEPPractice.buildExercise(card, item.exercise, item.rules, item.meta, updateTotal);
        results.push(result);
        rows.push({ unit: item.meta.unit, topicTitle: item.meta.topicTitle, activityTitle: item.meta.activityTitle, result: result });
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
  }

  // ---------- this set's own downloadable PDF report ----------
  // Deliberately separate from the site-wide "My Progress" store (practice.js only writes there for a real,
  // individually-numbered activity page) — an instructor's one-off quiz-practice link never mixes into a
  // student's overall practice history.
  var NAVY = [18, 28, 64], INK = [22, 30, 56], MUTE = [110, 119, 145], RULE = [213, 218, 230], TINT = [243, 244, 248];
  var TEAL_D = [0, 122, 110], TEAL_T = [230, 246, 243], AMBER = [252, 173, 27], AMBER_T = [255, 244, 216], AMBER_D = [143, 91, 0];
  var RED = [179, 55, 47], RED_T = [252, 238, 236];

  function buildSetPdf() {
    var name = document.getElementById("setStudentName").value.trim() || "(name not entered)";
    var section = document.getElementById("setSection").value.trim();
    var doc = new jspdf.jsPDF();
    var pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    var marginL = 16, marginR = 16, maxW = pageW - marginL - marginR;

    function header() {
      doc.setFillColor.apply(doc, NAVY); doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text(title, marginL, 13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
      doc.text("IEP099 Grammar Practice — Set Report", marginL, 21);
      doc.setFillColor.apply(doc, AMBER); doc.rect(0, 28, pageW, 1.4, "F");
      doc.setTextColor.apply(doc, INK);
    }
    function footer(n, total) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor.apply(doc, MUTE);
      doc.text("IEP099 Grammar Booklet, Second Edition", marginL, pageH - 9);
      doc.text("Page " + n + " of " + total, pageW - marginR, pageH - 9, { align: "right" });
      doc.setTextColor.apply(doc, INK);
    }

    header();
    var y = 40;

    var infoLines = [["STUDENT", name]];
    if (section) infoLines.push(["SECTION", section]);
    infoLines.push(["DATE", new Date().toLocaleString()]);
    var cardH = 8 + infoLines.length * 7;
    doc.setFillColor.apply(doc, TINT); doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.4);
    doc.roundedRect(marginL, y, maxW, cardH, 2.5, 2.5, "FD");
    var ly = y + 8;
    infoLines.forEach(function (row) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor.apply(doc, MUTE);
      doc.text(row[0], marginL + 6, ly);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor.apply(doc, INK);
      doc.text(row[1], marginL + 38, ly);
      ly += 7;
    });
    y += cardH + 8;

    var t = computeTotals(); var totalCorrect = t.correct, totalItems = t.total, pctAll = t.pct;
    var bannerH = 24;
    doc.setFillColor.apply(doc, TEAL_T); doc.setDrawColor(159, 220, 210);
    doc.roundedRect(marginL, y, maxW, bannerH, 2.5, 2.5, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor.apply(doc, TEAL_D);
    doc.text("Total: " + totalCorrect + " / " + totalItems + " correct", marginL + 6, y + 9.5);
    doc.text(pctAll + "%", pageW - marginR - 6, y + 9.5, { align: "right" });
    var barX = marginL + 6, barY = y + 14, barW = maxW - 12, barH = 4;
    doc.setFillColor(255, 255, 255); doc.roundedRect(barX, barY, barW, barH, 2, 2, "F");
    if (pctAll > 0) { doc.setFillColor.apply(doc, TEAL_D); doc.roundedRect(barX, barY, Math.max(barW * pctAll / 100, barH), barH, 2, 2, "F"); }
    doc.setTextColor.apply(doc, INK);
    y += bannerH + 9;

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor.apply(doc, MUTE);
    doc.text("ACTIVITIES (" + rows.length + ")", marginL, y);
    y += 6;

    rows.forEach(function (r, idx) {
      var titleLines = doc.splitTextToSize(r.activityTitle, maxW - 34);
      var rowH = Math.max(14, titleLines.length * 5 + 9);
      if (y + rowH > pageH - 16) { doc.addPage(); header(); y = 40; }
      var checked = r.result.checked;
      var pct = checked && r.result.total ? Math.round((r.result.correct / r.result.total) * 100) : -1;
      var pillBg = pct === 100 ? TEAL_T : pct >= 50 ? AMBER_T : pct >= 0 ? RED_T : TINT;
      var pillFg = pct === 100 ? TEAL_D : pct >= 50 ? AMBER_D : pct >= 0 ? RED : MUTE;
      doc.setFillColor.apply(doc, idx % 2 === 0 ? TINT : [255, 255, 255]);
      doc.rect(marginL, y, maxW, rowH, "F");
      doc.setFillColor.apply(doc, pillFg); doc.rect(marginL, y, 1.6, rowH, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor.apply(doc, INK);
      doc.text(titleLines, marginL + 6, y + 6.5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor.apply(doc, MUTE);
      doc.text("Unit " + r.unit + (r.topicTitle ? " · " + r.topicTitle : ""), marginL + 6, y + 6.5 + titleLines.length * 4.6);
      var pillW = 26, pillH = Math.min(9, rowH - 5);
      doc.setFillColor.apply(doc, pillBg);
      doc.roundedRect(pageW - marginR - pillW, y + (rowH - pillH) / 2, pillW, pillH, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor.apply(doc, pillFg);
      doc.text(checked ? r.result.correct + "/" + r.result.total : "—", pageW - marginR - pillW / 2, y + rowH / 2 + 1.6, { align: "center" });
      doc.setTextColor.apply(doc, INK);
      y += rowH;
    });
    doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.4);
    doc.line(marginL, y, pageW - marginR, y);

    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) { doc.setPage(p); footer(p, pageCount); }
    return doc;
  }

  document.getElementById("setDownloadBtn").addEventListener("click", function () {
    var status = document.getElementById("setDownloadStatus");
    if (!rows.length) { status.textContent = "This set hasn't loaded any activities yet."; return; }
    if (typeof jspdf === "undefined") { status.textContent = "Couldn't load the PDF tool — check your internet connection and try again."; return; }
    var name = (document.getElementById("setStudentName").value.trim() || "student").replace(/\s+/g, "-").toLowerCase();
    var setSlug = title.replace(/\s+/g, "-").toLowerCase();
    buildSetPdf().save("iep099-" + setSlug + "-" + name + ".pdf");
    status.textContent = "PDF downloaded.";
  });
})();
