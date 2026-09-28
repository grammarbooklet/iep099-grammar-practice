// IEP099 grammar practice — instructor tool: grab a syllabus-aligned ready-made set, or build a custom link
// combining any activities from across the booklet. Not real security — a static site can't keep a secret
// from anyone who reads its source — the passphrase (checked as a SHA-256 hash, not stored in plain text)
// is only friction so a student who stumbles on this unlisted page can't immediately use it.
//
// To change the passphrase: open a browser console anywhere and run
//   crypto.subtle.digest("SHA-256", new TextEncoder().encode("your new phrase")).then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("")))
// then paste the printed hash in place of PASSPHRASE_HASH below.
(function () {
  "use strict";
  var PASSPHRASE_HASH = "0db7bbf4badf215a1ec84b3adf234a84017596d8e52ea8d855616fd10aa761ab"; // "iep099grammar"
  var UNLOCK_KEY = "iep099-builder-unlocked";

  function sha256Hex(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  var gate = document.getElementById("gate"), tool = document.getElementById("tool");
  function isUnlocked() { try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch (e) { return false; } }
  function unlock() {
    try { localStorage.setItem(UNLOCK_KEY, "1"); } catch (e) {}
    gate.hidden = true; tool.hidden = false;
    loadCatalog();
    loadReadymade();
  }

  if (isUnlocked()) {
    unlock();
  } else {
    document.getElementById("unlockBtn").addEventListener("click", function () {
      var v = document.getElementById("pass").value.trim();
      if (!v) return;
      sha256Hex(v).then(function (hash) {
        if (hash === PASSPHRASE_HASH) unlock();
        else document.getElementById("gateMsg").textContent = "That's not the right passphrase.";
      });
    });
    document.getElementById("pass").addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("unlockBtn").click(); });
  }

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
    var url = new URL("set.html", location.href);
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
          row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding:14px 18px";
          var left = document.createElement("div");
          left.innerHTML = "<b style=\"font:600 15px var(--serif);color:var(--ink)\">" + esc(s.title.replace(STRAND_LABEL[strandKey] + " — ", "")) + "</b>" +
            "<div style=\"font:400 12.5px var(--sans);color:var(--mute);margin-top:3px\">" + s.ids.length + " activities · " + s.minutes + " min time limit</div>";
          row.appendChild(left);
          var btn = document.createElement("button");
          btn.type = "button"; btn.className = "btn ghost";
          btn.textContent = "Get link & QR";
          btn.addEventListener("click", function () {
            var url = outputSet(s.ids, s.title, "", s.minutes);
            if (url) generateQr(url);
          });
          row.appendChild(btn);
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
})();
