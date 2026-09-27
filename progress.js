// IEP099 grammar practice — "My Progress" page. Reads results that practice.js already saved to this
// browser's own localStorage (nothing is ever sent anywhere) and lets a student download a PDF report
// carrying their name, instructor's name, and section number.
(function () {
  "use strict";
  var NAME_KEY = "iep099-student-name", INSTRUCTOR_KEY = "iep099-instructor-name", SECTION_KEY = "iep099-section", RESULTS_KEY = "iep099-results";
  function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function results() { try { return JSON.parse(localStorage.getItem(RESULTS_KEY) || "{}"); } catch (e) { return {}; } }

  var nameEl = document.getElementById("pName"), instructorEl = document.getElementById("pInstructor"), sectionEl = document.getElementById("pSection");
  var statusEl = document.getElementById("pStatus");
  function status(msg) { if (statusEl) statusEl.textContent = msg; }

  nameEl.value = get(NAME_KEY); instructorEl.value = get(INSTRUCTOR_KEY); sectionEl.value = get(SECTION_KEY);
  nameEl.addEventListener("input", function () { set(NAME_KEY, nameEl.value.trim()); });
  instructorEl.addEventListener("input", function () { set(INSTRUCTOR_KEY, instructorEl.value.trim()); });
  sectionEl.addEventListener("input", function () { set(SECTION_KEY, sectionEl.value.trim()); });

  var all = results();
  var ids = Object.keys(all).sort(function (a, b) { return new Date(all[b].date) - new Date(all[a].date); });
  var list = document.getElementById("progressList");
  var totalCorrect = 0, totalItems = 0;
  ids.forEach(function (id) { totalCorrect += all[id].correct; totalItems += all[id].total; });

  if (!ids.length) {
    list.innerHTML = '<p class="note">You haven’t checked any activities on this device yet. Once you check one, it will show up here.</p>';
  } else {
    var rows = ids.map(function (id) {
      var r = all[id];
      var pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
      return '<div class="progress-row"><span class="pr-title"><b>' + esc(r.activityTitle || id) + '</b><span>Unit ' + esc(r.unit != null ? r.unit : "?") + (r.topicTitle ? " · " + esc(r.topicTitle) : "") + '</span></span><span class="pr-score' + (pct === 100 ? " full" : "") + '">' + r.correct + " / " + r.total + "</span></div>";
    });
    list.innerHTML = '<div class="progress-row progress-total"><span class="pr-title"><b>Total</b><span>' + ids.length + " activit" + (ids.length === 1 ? "y" : "ies") + ' checked</span></span><span class="pr-score">' + totalCorrect + " / " + totalItems + "</span></div>" + rows.join("");
  }

  // Builds the PDF report with jsPDF (loaded above this script).
  // Colors lifted straight from the site's own light-mode palette (practice.css :root), so the report
  // reads as the same product rather than a generic export.
  var NAVY = [18, 28, 64], INK = [22, 30, 56], MUTE = [110, 119, 145], RULE = [213, 218, 230], TINT = [243, 244, 248];
  var TEAL_D = [0, 122, 110], TEAL_T = [230, 246, 243], AMBER = [252, 173, 27], AMBER_D = [143, 91, 0], AMBER_T = [255, 244, 216];
  var RED = [179, 55, 47], RED_T = [252, 238, 236];

  function buildPdf() {
    var name = nameEl.value.trim() || "(name not entered)";
    var instructor = instructorEl.value.trim();
    var section = sectionEl.value.trim();
    var doc = new jspdf.jsPDF();
    var pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    var marginL = 16, marginR = 16, maxW = pageW - marginL - marginR;

    function header() {
      doc.setFillColor.apply(doc, NAVY); doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text("IEP099 Grammar Practice", marginL, 13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
      doc.text("Progress Report · Grammar Booklet, Second Edition", marginL, 21);
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

    // info card — bordered so it reads as a defined block rather than a flat tint
    var lines = [["STUDENT", name]];
    if (instructor) lines.push(["INSTRUCTOR", instructor]);
    if (section) lines.push(["SECTION", section]);
    lines.push(["DATE", new Date().toLocaleString()]);
    var cardH = 8 + lines.length * 7;
    doc.setFillColor.apply(doc, TINT); doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.4);
    doc.roundedRect(marginL, y, maxW, cardH, 2.5, 2.5, "FD");
    var ly = y + 8;
    lines.forEach(function (row) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor.apply(doc, MUTE);
      doc.text(row[0], marginL + 6, ly);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor.apply(doc, INK);
      doc.text(row[1], marginL + 38, ly);
      ly += 7;
    });
    y += cardH + 8;

    // total score banner, with a filled progress bar instead of just a number
    var pctAll = totalItems ? Math.round((totalCorrect / totalItems) * 100) : 0;
    var bannerH = 24;
    doc.setFillColor.apply(doc, TEAL_T); doc.setDrawColor(159, 220, 210);
    doc.roundedRect(marginL, y, maxW, bannerH, 2.5, 2.5, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor.apply(doc, TEAL_D);
    doc.text("Total: " + totalCorrect + " / " + totalItems + " correct", marginL + 6, y + 9.5);
    doc.setFontSize(13);
    doc.text(pctAll + "%", pageW - marginR - 6, y + 9.5, { align: "right" });
    var barX = marginL + 6, barY = y + 14, barW = maxW - 12, barH = 4;
    doc.setFillColor(255, 255, 255); doc.roundedRect(barX, barY, barW, barH, 2, 2, "F");
    if (pctAll > 0) { doc.setFillColor.apply(doc, TEAL_D); doc.roundedRect(barX, barY, Math.max(barW * pctAll / 100, barH), barH, 2, 2, "F"); }
    doc.setTextColor.apply(doc, INK);
    y += bannerH + 9;

    doc.setFillColor.apply(doc, AMBER); doc.rect(marginL, y - 3.2, 2.6, 2.6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor.apply(doc, MUTE);
    doc.text("ACTIVITIES CHECKED (" + ids.length + ")", marginL + 5.5, y);
    y += 6;

    ids.forEach(function (id, idx) {
      var r = all[id];
      var title = r.activityTitle || id;
      var sub = "Unit " + (r.unit != null ? r.unit : "?") + (r.topicTitle ? " · " + r.topicTitle : "");
      var titleLines = doc.splitTextToSize(title, maxW - 34);
      var rowH = Math.max(14, titleLines.length * 5 + 9);
      if (y + rowH > pageH - 16) { doc.addPage(); header(); y = 40; }
      var pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
      var pillBg = pct === 100 ? TEAL_T : pct >= 50 ? AMBER_T : RED_T;
      var pillFg = pct === 100 ? TEAL_D : pct >= 50 ? AMBER_D : RED;
      doc.setFillColor.apply(doc, idx % 2 === 0 ? TINT : [255, 255, 255]);
      doc.rect(marginL, y, maxW, rowH, "F");
      doc.setFillColor.apply(doc, pillFg); doc.rect(marginL, y, 1.6, rowH, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor.apply(doc, INK);
      doc.text(titleLines, marginL + 6, y + 6.5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor.apply(doc, MUTE);
      doc.text(sub, marginL + 6, y + 6.5 + titleLines.length * 4.6);
      var pillW = 24, pillH = Math.min(9, rowH - 5);
      doc.setFillColor.apply(doc, pillBg);
      doc.roundedRect(pageW - marginR - pillW, y + (rowH - pillH) / 2, pillW, pillH, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor.apply(doc, pillFg);
      doc.text(r.correct + "/" + r.total, pageW - marginR - pillW / 2, y + rowH / 2 + 1.6, { align: "center" });
      doc.setTextColor.apply(doc, INK);
      y += rowH;
    });
    doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.4);
    doc.line(marginL, y, pageW - marginR, y);

    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) { doc.setPage(p); footer(p, pageCount); }
    return doc;
  }

  document.getElementById("pDownloadBtn").addEventListener("click", function () {
    if (!ids.length) { status("No completed activities to download yet — check an activity first."); return; }
    if (typeof jspdf === "undefined") { status("Couldn't load the PDF tool — check your internet connection and try again."); return; }
    buildPdf().save("iep099-progress-" + (nameEl.value.trim() || "student").replace(/\s+/g, "-").toLowerCase() + ".pdf");
    status("PDF downloaded.");
  });
})();
