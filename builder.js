// IEP099 grammar practice — instructor tool: grab a syllabus-aligned ready-made set, or build a custom link
// combining any activities from across the booklet. Not real security — a static site can't keep a secret
// from anyone who reads its source — the passphrase (checked as a SHA-256 hash, not stored in plain text)
// is only friction so a student who stumbles on this unlisted page can't immediately use it. Deliberately
// does NOT remember a previous unlock across page loads (no localStorage/sessionStorage flag) — that would
// just be a single value any student could set from the browser console to bypass the check entirely
// without ever knowing the passphrase, which defeats the point more thoroughly than a guessable phrase does.
//
// To change the passphrase: open a browser console anywhere and run
//   crypto.subtle.digest("SHA-256", new TextEncoder().encode("your new phrase")).then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("")))
// then paste the printed hash in place of PASSPHRASE_HASH below.
(function () {
  "use strict";
  var PASSPHRASE_HASH = "0db7bbf4badf215a1ec84b3adf234a84017596d8e52ea8d855616fd10aa761ab";
  // Always build student-facing links against the real, live site — never against wherever this copy of
  // builder.html happens to be open (a local test server, a preview, a stray tab left open from testing).
  // Otherwise a link/QR generated from a non-live copy would only work on that one machine.
  var SITE_BASE = "https://grammarbooklet.github.io/iep099-grammar-practice/";

  function sha256Hex(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  var gate = document.getElementById("gate"), tool = document.getElementById("tool");
  function unlock() {
    gate.hidden = true; tool.hidden = false;
    loadCatalog();
    loadReadymade();
  }

  document.getElementById("unlockBtn").addEventListener("click", function () {
    var v = document.getElementById("pass").value.trim();
    if (!v) return;
    sha256Hex(v).then(function (hash) {
      if (hash === PASSPHRASE_HASH) unlock();
      else document.getElementById("gateMsg").textContent = "That's not the right passphrase.";
    });
  });
  document.getElementById("pass").addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("unlockBtn").click(); });

  // ---------- mode switching ----------
  var modeChoice = document.getElementById("modeChoice"), readymadeView = document.getElementById("readymadeView"), customView = document.getElementById("customView");
  function showMode(which) {
    modeChoice.hidden = which !== "choice";
    readymadeView.hidden = which !== "readymade";
    customView.hidden = which !== "custom";
    document.getElementById("linkOut").hidden = true;
    document.getElementById("qrOut").hidden = true;
  }
  document.getElementById("pickReadymade").addEventListener("click", function (e) { e.preventDefault(); showMode("readymade"); });
  document.getElementById("pickCustom").addEventListener("click", function (e) { e.preventDefault(); showMode("custom"); });
  document.getElementById("backFromReadymade").addEventListener("click", function () { showMode("choice"); });
  document.getElementById("backFromCustom").addEventListener("click", function () { showMode("choice"); });

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  // ---------- shared link/QR output, used by both the ready-made list and the custom builder ----------
  function outputSet(ids, title, note, minutes) {
    if (!ids.length) return;
    var url = new URL("set.html", SITE_BASE);
    url.searchParams.set("ids", ids.join(","));
    url.searchParams.set("title", title);
    if (note) url.searchParams.set("note", note);
    if (minutes) url.searchParams.set("minutes", minutes);
    document.getElementById("linkField").value = url.toString();
    document.getElementById("linkOut").hidden = false;
    document.getElementById("qrOut").hidden = true;
    document.getElementById("linkOut").scrollIntoView({ behavior: "smooth", block: "nearest" });
    return url;
  }

  document.getElementById("copyBtn").addEventListener("click", function () {
    var field = document.getElementById("linkField");
    field.select();
    var btn = document.getElementById("copyBtn");
    var restore = function () { setTimeout(function () { btn.textContent = "Copy link"; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(field.value).then(function () { btn.textContent = "Copied!"; restore(); });
    } else {
      try { document.execCommand("copy"); btn.textContent = "Copied!"; } catch (e) { btn.textContent = "Select and copy manually"; }
      restore();
    }
  });

  document.getElementById("qrDownloadBtn").addEventListener("click", function () {
    var img = document.getElementById("qrImg");
    if (!img.src) return;
    var a = document.createElement("a");
    a.href = img.src;
    a.download = (document.getElementById("linkField").value.match(/title=([^&]+)/) ? decodeURIComponent(document.getElementById("linkField").value.match(/title=([^&]+)/)[1].replace(/\+/g, " ")) : "practice-set").replace(/\s+/g, "-").toLowerCase() + "-qr.png";
    document.body.appendChild(a); a.click(); a.remove();
  });

  function generateQr(url) {
    if (typeof QRCode === "undefined") { alert("Couldn't load the QR code tool — check your internet connection and try again."); return; }
    QRCode.toDataURL(url.toString(), { margin: 1, width: 320 }, function (err, dataUrl) {
      if (err) { alert("Couldn't generate the QR code."); return; }
      document.getElementById("qrImg").src = dataUrl;
      document.getElementById("qrOut").hidden = false;
      document.getElementById("qrOut").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // ---------- ready-made sets ----------
  var STRAND_LABEL = { ls: "Listening & Speaking", rw: "Reading & Writing" };
  function loadReadymade() {
    fetch("readymade.json").then(function (r) { return r.json(); }).then(function (sets) {
      var root = document.getElementById("readymadeList");
      root.innerHTML = "";
      var byStrand = {};
      sets.forEach(function (s) { (byStrand[s.strand] = byStrand[s.strand] || []).push(s); });
      ["ls", "rw"].forEach(function (strandKey) {
        var list = byStrand[strandKey];
        if (!list || !list.length) return;
        var h2 = document.createElement("h2");
        h2.style.cssText = "font:600 18px/1.2 var(--serif);color:var(--ink);margin:18px 0 4px";
        h2.textContent = STRAND_LABEL[strandKey];
        root.appendChild(h2);
        list.forEach(function (s) {
          var row = document.createElement("div");
          row.className = "toc-unit";
          row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding:14px 18px;flex-wrap:wrap";
          var left = document.createElement("div");
          left.innerHTML = "<b style=\"font:600 15px var(--serif);color:var(--ink)\">" + esc(s.title.replace(STRAND_LABEL[strandKey] + " — ", "")) + "</b>" +
            "<div style=\"font:400 12.5px var(--sans);color:var(--mute);margin-top:3px\">" + s.ids.length + " activities · " + s.minutes + " min time limit</div>";
          row.appendChild(left);
          var right = document.createElement("div");
          right.style.cssText = "display:flex;align-items:center;gap:12px";
          var untimedLabel = document.createElement("label");
          untimedLabel.style.cssText = "display:flex;align-items:center;gap:5px;font:400 12.5px var(--sans);color:var(--ink-2);cursor:pointer";
          var untimedCb = document.createElement("input"); untimedCb.type = "checkbox";
          untimedLabel.appendChild(untimedCb); untimedLabel.appendChild(document.createTextNode("No time limit"));
          right.appendChild(untimedLabel);
          var btn = document.createElement("button");
          btn.type = "button"; btn.className = "btn ghost";
          btn.textContent = "Get link & QR";
          btn.addEventListener("click", function () {
            var url = outputSet(s.ids, s.title, "", untimedCb.checked ? 0 : s.minutes);
            if (url) generateQr(url);
          });
          right.appendChild(btn);
          var printBtn = document.createElement("button");
          printBtn.type = "button"; printBtn.className = "btn ghost";
          printBtn.textContent = "Download PDF";
          printBtn.title = "Download a printable PDF worksheet";
          printBtn.addEventListener("click", function () { printWorksheet(s.ids, s.title, document.getElementById("printStatusReadymade")); });
          right.appendChild(printBtn);
          var keyBtn = document.createElement("button");
          keyBtn.type = "button"; keyBtn.className = "btn ghost";
          keyBtn.textContent = "Answer key";
          keyBtn.title = "Download the instructor answer key for this worksheet";
          keyBtn.addEventListener("click", function () { printWorksheet(s.ids, s.title, document.getElementById("printStatusReadymade"), true); });
          right.appendChild(keyBtn);
          row.appendChild(right);
          root.appendChild(row);
        });
      });
    }).catch(function () {
      document.getElementById("readymadeList").innerHTML = '<p class="note">Couldn’t load the ready-made sets. Check your connection and reload.</p>';
    });
  }

  // ---------- custom builder ----------
  var ALL = null;
  var checked = {}; // activity id -> true, in the order the instructor picked them

  function loadCatalog() {
    fetch("activities.json").then(function (r) { return r.json(); }).then(function (data) {
      ALL = data;
      renderCatalog();
    }).catch(function () {
      document.getElementById("catalog").innerHTML = '<p class="note">Couldn’t load the activity list. Check your connection and reload.</p>';
    });
  }

  var CATALOG_STRAND_ORDER = ["ls", "rw"];

  // Grouped strand -> unit -> topic. Unit numbers are NOT unique across strands (there's an LS Unit 1 and
  // an RW Unit 1, for example), so the strand has to be part of the grouping key, not just the number.
  function groupByStrand() {
    var strands = {};
    Object.keys(ALL).forEach(function (id) {
      var m = ALL[id].meta;
      var s = strands[m.strand] || (strands[m.strand] = { units: {} });
      var uKey = m.strand + "-" + m.unit;
      var u = s.units[uKey] || (s.units[uKey] = { num: m.unit, title: m.unitTitle, topics: {} });
      var t = u.topics[m.topicTitle] || (u.topics[m.topicTitle] = []);
      t.push({ id: id, title: m.activityTitle });
    });
    return strands;
  }

  var groupBadges = []; // {ids: [...], badge: element} for both unit- and topic-level badges, refreshed together

  function updateCount() {
    var n = Object.keys(checked).filter(function (id) { return checked[id]; }).length;
    document.getElementById("countNote").textContent = n + " activit" + (n === 1 ? "y" : "ies") + " selected";
    groupBadges.forEach(function (g) {
      var count = g.ids.filter(function (id) { return checked[id]; }).length;
      g.badge.textContent = count ? count + " selected" : "";
    });
  }

  function collapsible(cls, labelText, ids) {
    var det = document.createElement("details");
    det.className = cls;
    var sum = document.createElement("summary");
    var chev = document.createElement("span"); chev.className = "builder-chevron";
    chev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
    var label = document.createElement("b"); label.textContent = labelText;
    var badge = document.createElement("span"); badge.className = "builder-badge";
    sum.appendChild(chev); sum.appendChild(label); sum.appendChild(badge);
    det.appendChild(sum);
    groupBadges.push({ ids: ids, badge: badge });
    return det;
  }

  // Three collapsible levels: strand section > unit > grammar rule (topic) > the actual checkboxes. With
  // 14 units and up to a dozen rules each, opening only what's needed keeps this navigable instead of one
  // very long page of checkboxes. Every level's badge stays visible even while collapsed.
  function renderCatalog() {
    var strands = groupByStrand();
    var root = document.getElementById("catalog");
    root.innerHTML = "";
    groupBadges = [];
    CATALOG_STRAND_ORDER.forEach(function (strandKey) {
      var strand = strands[strandKey];
      if (!strand) return;
      var heading = document.createElement("h2");
      heading.style.cssText = "font:600 20px/1.2 var(--serif);color:var(--ink);margin:22px 0 4px";
      heading.textContent = STRAND_LABEL[strandKey] || strandKey;
      root.appendChild(heading);

      var unitKeys = Object.keys(strand.units).sort(function (a, b) { return strand.units[a].num - strand.units[b].num; });
      unitKeys.forEach(function (uKey) {
        var u = strand.units[uKey];
        var unitIds = [];
        Object.keys(u.topics).forEach(function (t) { u.topics[t].forEach(function (a) { unitIds.push(a.id); }); });

        var unitDet = collapsible("builder-unit", "Unit " + u.num + " · " + u.title, unitIds);
        var unitBody = document.createElement("div"); unitBody.className = "builder-body";

        Object.keys(u.topics).forEach(function (topicTitle) {
          var topicIds = u.topics[topicTitle].map(function (a) { return a.id; });
          var topicDet = collapsible("builder-topic", topicTitle, topicIds);
          var topicBody = document.createElement("div"); topicBody.className = "builder-body";
          u.topics[topicTitle].forEach(function (a) {
            var row = document.createElement("label");
            row.style.cssText = "display:flex;align-items:center;gap:9px;padding:6px 4px;cursor:pointer";
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.addEventListener("change", function () { checked[a.id] = cb.checked; updateCount(); });
            row.appendChild(cb);
            var span = document.createElement("span");
            span.textContent = a.title;
            span.style.cssText = "font:400 14px/1.3 var(--sans);color:var(--ink)";
            row.appendChild(span);
            topicBody.appendChild(row);
          });
          topicDet.appendChild(topicBody);
          unitBody.appendChild(topicDet);
        });

        unitDet.appendChild(unitBody);
        root.appendChild(unitDet);
      });
    });
    updateCount();
  }

  function buildCustomUrl() {
    var ids = Object.keys(checked).filter(function (id) { return checked[id]; });
    if (!ids.length) { alert("Pick at least one activity first."); return null; }
    var title = document.getElementById("setTitleInput").value.trim() || "Practice Set";
    var note = document.getElementById("setNoteInput").value.trim();
    var minutes = parseInt(document.getElementById("setMinutesInput").value, 10);
    return outputSet(ids, title, note, minutes > 0 ? minutes : 0);
  }

  document.getElementById("genBtn").addEventListener("click", function () { buildCustomUrl(); });
  document.getElementById("genQrBtn").addEventListener("click", function () {
    var url = buildCustomUrl();
    if (url) generateQr(url);
  });
  document.getElementById("printBtn").addEventListener("click", function () {
    var ids = Object.keys(checked).filter(function (id) { return checked[id]; });
    var title = document.getElementById("setTitleInput").value.trim() || "Practice Set";
    printWorksheet(ids, title);
  });
  document.getElementById("keyBtn").addEventListener("click", function () {
    var ids = Object.keys(checked).filter(function (id) { return checked[id]; });
    printWorksheet(ids, document.getElementById("setTitleInput").value.trim() || "Practice Set", null, true);
  });

  // ---------- printable PDF worksheet — a paper copy of the chosen activities, with blank Name/Section/ID
  // fields, for instructors who want to hand out or post a physical worksheet instead of (or alongside) the
  // link/QR. Reuses the exact same booklet-markup parser as the interactive pages (window.IEPPractice), so
  // blanks and multiple-choice options print exactly as they'd appear on screen, just as blanks to fill in.
  var NAVY = [18, 28, 64], INK = [22, 30, 56], MUTE = [110, 119, 145], RULE = [213, 218, 230];
  var AMBER = [252, 173, 27], TEAL_D = [0, 122, 110];
  // jsPDF's built-in "helvetica" only supports WinAnsi (Windows-1252) — an arrow like "→" isn't in that
  // set and throws its width/spacing calculations off (a garbled, stretched-looking line), so swap any
  // character outside that range for a plain-ASCII stand-in before it ever reaches doc.text().
  function pdfSafe(s) {
    return String(s).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\+\+(.+?)\+\+/g, "$1")
      .replace(/→/g, "->").replace(/←/g, "<-").replace(/↔/g, "<->").replace(/✓/g, "(correct as is)").replace(/✗/g, "x");
  }
  // The answers for one activity as plain lines, in the order the questions print — used by the answer key.
  function answerLines(spec) {
    var P = window.IEPPractice, items = spec.tag === "Notice" ? (spec.items || []).slice(0, 3) : (spec.items || []);
    if (spec.type === "match") return spec.left.map(function (l, i) { return (i + 1) + ".  " + String.fromCharCode(65 + i) + ". " + spec.right[i]; });
    return items.map(function (raw, i) {
      var a;
      if (spec.type === "mc") a = raw[1][raw[2]];
      else if (spec.type === "short") a = String(raw[1]);
      else if (spec.type === "write") a = /^\s*✓/.test(String(raw[1])) ? "already correct" : String(raw[1]);
      else a = P.printAnswerText(typeof raw === "string" ? raw : raw[0]);
      return (i + 1) + ".  " + a;
    });
  }

  function printWorksheet(ids, title, statusEl, key) {
    var status = statusEl || document.getElementById("printStatus");
    if (!ids.length) { status.textContent = "Pick at least one activity first."; return; }
    if (typeof jspdf === "undefined" || !window.IEPPractice) { status.textContent = "Couldn't load the PDF tool — check your internet connection and try again."; return; }
    status.textContent = "Building the PDF…";
    fetch("activities.json").then(function (r) { return r.json(); }).then(function (all) {
      var doc = new jspdf.jsPDF();
      var pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
      var marginL = 16, marginR = 16, maxW = pageW - marginL - marginR;

      function header(withFields) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor.apply(doc, MUTE);
        doc.text("IEP099 · GRAMMAR BOOKLET", marginL, 13);
        doc.setTextColor.apply(doc, NAVY);
        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.text(pdfSafe(title), pageW - marginR, 14, { align: "right", maxWidth: pageW - marginR - 55 });
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor.apply(doc, MUTE);
        doc.text(key ? "IEP099 Grammar Practice — Instructor Answer Key" : "IEP099 Grammar Practice — Printable Worksheet", pageW - marginR, 22, { align: "right" });
        doc.setFillColor.apply(doc, AMBER); doc.rect(0, 30, pageW, 1.4, "F");
        doc.setTextColor.apply(doc, INK);
        var y = 42;
        if (withFields) {
          doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor.apply(doc, MUTE);
          doc.text("NAME", marginL, y);
          doc.text("SECTION", marginL + 108, y);
          doc.text("STUDENT ID", marginL + 148, y);
          doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.5);
          doc.line(marginL, y + 7, marginL + 100, y + 7);
          doc.line(marginL + 108, y + 7, marginL + 138, y + 7);
          doc.line(marginL + 148, y + 7, pageW - marginR, y + 7);
          doc.setTextColor.apply(doc, INK);
          y += 18;
        }
        return y;
      }
      function footer(n, totalPages) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor.apply(doc, MUTE);
        doc.text("IEP099 Grammar Booklet, Second Edition", marginL, pageH - 9);
        doc.text("Page " + n + " of " + totalPages, pageW - marginR, pageH - 9, { align: "right" });
        doc.setTextColor.apply(doc, INK);
      }

      var y = header(!key);
      var missing = 0;
      function ensureSpace(h) { if (y + h > pageH - 16) { doc.addPage(); y = header(false); } }

      ids.forEach(function (id) {
        var item = all[id];
        if (!item) { missing++; return; }
        var ex = item.exercise, spec = ex.spec, meta = item.meta;

        ensureSpace(18);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor.apply(doc, TEAL_D);
        doc.text(("UNIT " + meta.unit + (meta.topicTitle ? " · " + meta.topicTitle : "")).toUpperCase(), marginL, y);
        y += 6; doc.setTextColor.apply(doc, INK);
        if (spec.tag) { doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(pdfSafe(ex.title), marginL, y); y += 7; }

        if (key) {
          doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
          answerLines(spec).forEach(function (line) {
            var aLines = doc.splitTextToSize(pdfSafe(line), maxW - 6);
            ensureSpace(aLines.length * 5.6 + 2);
            doc.text(aLines, marginL + 4, y); y += aLines.length * 5.6 + 1.5;
          });
          y += 4;
          doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.3);
          doc.line(marginL, y, pageW - marginR, y); y += 8;
          return;
        }
        if (spec.instr) {
          doc.setFont("helvetica", "italic"); doc.setFontSize(9.5); doc.setTextColor.apply(doc, MUTE);
          var iLines = doc.splitTextToSize(pdfSafe(spec.instr.replace(/\*\*(.+?)\*\*/g, "$1")), maxW);
          ensureSpace(iLines.length * 5 + 4);
          doc.text(iLines, marginL, y); y += iLines.length * 5 + 3;
          doc.setTextColor.apply(doc, INK);
        }
        if (spec.eg) {
          doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
          var egLines = doc.splitTextToSize(pdfSafe("Example: " + window.IEPPractice.printAnswerText(spec.eg)), maxW);
          ensureSpace(egLines.length * 5 + 4);
          doc.text(egLines, marginL, y); y += egLines.length * 5 + 4;
        }
        if (spec.bank && spec.bank.length) {
          doc.setFont("helvetica", "italic"); doc.setFontSize(9);
          var bankLines = doc.splitTextToSize(pdfSafe("Word bank: " + spec.bank.join(", ")), maxW);
          ensureSpace(bankLines.length * 5 + 4);
          doc.text(bankLines, marginL, y); y += bankLines.length * 5 + 4;
        }

        if (spec.type === "match") {
          doc.setFont("helvetica", "bold"); doc.setFontSize(9);
          var legendLines = doc.splitTextToSize(pdfSafe(spec.right.map(function (r, i) { return String.fromCharCode(65 + i) + ". " + r; }).join("     ")), maxW);
          ensureSpace(legendLines.length * 5 + 6);
          doc.text(legendLines, marginL, y); y += legendLines.length * 5 + 6;
          var matchBoxSize = 5, matchNumW = 12, matchTextIndent = marginL + matchNumW + matchBoxSize + 4;
          spec.left.forEach(function (leftText, i) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
            var lLines = doc.splitTextToSize(pdfSafe(leftText), maxW - (matchTextIndent - marginL));
            ensureSpace(lLines.length * 6 + 4);
            doc.text((i + 1) + ".", marginL, y);
            doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.4);
            doc.rect(marginL + matchNumW, y - matchBoxSize + 1.2, matchBoxSize, matchBoxSize, "D");
            doc.text(lLines, matchTextIndent, y); y += lLines.length * 6 + 4;
          });
        } else if (spec.type === "mc") {
          // Each option gets its own indented line with a drawn checkbox — a real box to tick, not a
          // wrapped paragraph of run-together options.
          var mcItems = spec.tag === "Notice" ? (spec.items || []).slice(0, 3) : (spec.items || []);
          var boxSize = 3.4, boxIndent = marginL + 12, textIndent = boxIndent + boxSize + 3.5;
          mcItems.forEach(function (raw, i) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
            var qLines = doc.splitTextToSize(pdfSafe((i + 1) + ".  " + raw[0]), maxW);
            ensureSpace(qLines.length * 6 + raw[1].length * 6 + 6);
            doc.text(qLines, marginL, y); y += qLines.length * 6 + 3;
            doc.setFontSize(10);
            raw[1].forEach(function (opt) {
              var oLines = doc.splitTextToSize(pdfSafe(opt), maxW - (textIndent - marginL));
              ensureSpace(oLines.length * 5.5 + 2);
              doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.4);
              doc.rect(boxIndent, y - boxSize + 0.8, boxSize, boxSize, "D");
              doc.text(oLines, textIndent, y); y += oLines.length * 5.5 + 2;
            });
            y += 4;
          });
        } else if (spec.type === "short") {
          // A small boxed answer slot at the end of the line — drawn, not typed brackets — sized for a
          // short code like a verb-tense label rather than a full sentence.
          // All boxes line up in one column on the right, regardless of how long each sentence is —
          // trailing the box right after the text (like a ragged edge) looked messy.
          var shortItems = spec.tag === "Notice" ? (spec.items || []).slice(0, 3) : (spec.items || []);
          // Box width follows the expected answer: a narrow box for a 1-3 letter code, a wide one when the
          // answer is a whole word or phrase the student has to handwrite.
          var shortHasWords = shortItems.some(function (it) { return String(it[1]).length > 3; });
          var shortBoxW = shortHasWords ? 48 : 14, shortBoxH = 7, shortColX = pageW - marginR - shortBoxW;
          shortItems.forEach(function (raw, i) {
            doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
            var qText = pdfSafe((i + 1) + ".  " + window.IEPPractice.printBlankText(raw[0]));
            var qLines = doc.splitTextToSize(qText, maxW - shortBoxW - 8);
            ensureSpace(qLines.length * 6 + 5);
            doc.text(qLines, marginL, y);
            doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.4);
            doc.rect(shortColX, y - shortBoxH + 2, shortBoxW, shortBoxH, "D");
            y += qLines.length * 6 + 5;
          });
        } else {
          var items = spec.tag === "Notice" ? (spec.items || []).slice(0, 3) : (spec.items || []);
          items.forEach(function (raw, i) {
            var text;
            if (spec.type === "write") text = (i + 1) + ".  " + raw[0];
            else text = (i + 1) + ".  " + window.IEPPractice.printBlankText(typeof raw === "string" ? raw : raw[0]);
            doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
            var tLines = doc.splitTextToSize(pdfSafe(text), maxW);
            ensureSpace(tLines.length * 6 + (spec.type === "write" ? 11 : 5));
            doc.text(tLines, marginL, y); y += tLines.length * 6;
            if (spec.type === "write") {
              doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.4);
              doc.line(marginL + 6, y + 4, pageW - marginR - 6, y + 4);
              y += 11;
            } else { y += 5; }
          });
        }
        y += 3;
        doc.setDrawColor.apply(doc, RULE); doc.setLineWidth(0.3);
        doc.line(marginL, y, pageW - marginR, y);
        y += 8;
      });

      var pageCount = doc.internal.getNumberOfPages();
      for (var p = 1; p <= pageCount; p++) { doc.setPage(p); footer(p, pageCount); }

      doc.save((key ? "iep099-answer-key-" : "iep099-worksheet-") + title.replace(/\s+/g, "-").toLowerCase() + ".pdf");
      status.textContent = missing ? ("PDF downloaded (" + missing + " activit" + (missing === 1 ? "y" : "ies") + " couldn't be found).") : "PDF downloaded.";
    }).catch(function () {
      status.textContent = "Couldn't build the PDF — check your connection and try again.";
    });
  }
})();
