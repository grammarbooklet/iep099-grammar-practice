// IEP099 grammar practice — instructor tool: build a custom link combining any activities from across the
// booklet. Not real security — a static site can't keep a secret from anyone who reads its source — this
// passphrase is only friction so a student who stumbles on this unlisted page can't immediately use it.
// Change PASSPHRASE below (and tell your instructors the new one) whenever you want.
(function () {
  "use strict";
  var PASSPHRASE = "iep099grammar";
  var UNLOCK_KEY = "iep099-builder-unlocked";

  var gate = document.getElementById("gate"), tool = document.getElementById("tool");
  function isUnlocked() { try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch (e) { return false; } }
  function unlock() {
    try { localStorage.setItem(UNLOCK_KEY, "1"); } catch (e) {}
    gate.hidden = true; tool.hidden = false;
    loadCatalog();
  }

  if (isUnlocked()) {
    unlock();
  } else {
    document.getElementById("unlockBtn").addEventListener("click", function () {
      var v = document.getElementById("pass").value.trim();
      if (v.toLowerCase() === PASSPHRASE.toLowerCase()) unlock();
      else document.getElementById("gateMsg").textContent = "That's not the right passphrase.";
    });
    document.getElementById("pass").addEventListener("keydown", function (e) { if (e.key === "Enter") document.getElementById("unlockBtn").click(); });
  }

  var ALL = null;
  var checked = {}; // activity id -> true, in the order the instructor picked them

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function loadCatalog() {
    fetch("activities.json").then(function (r) { return r.json(); }).then(function (data) {
      ALL = data;
      renderCatalog();
    }).catch(function () {
      document.getElementById("catalog").innerHTML = '<p class="note">Couldn’t load the activity list. Check your connection and reload.</p>';
    });
  }

  var STRAND_LABEL = { ls: "Listening, Speaking & Critical Thinking", rw: "Reading, Writing & Critical Thinking" };
  var STRAND_ORDER = ["ls", "rw"];

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
    STRAND_ORDER.forEach(function (strandKey) {
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

  document.getElementById("genBtn").addEventListener("click", function () {
    var url = buildUrl();
    if (!url) return;
    document.getElementById("linkField").value = url.toString();
    document.getElementById("linkOut").hidden = false;
  });

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

  document.getElementById("genQrBtn").addEventListener("click", function () {
    var url = buildUrl();
    if (!url) return;
    if (typeof QRCode === "undefined") { alert("Couldn't load the QR code tool — check your internet connection and try again."); return; }
    QRCode.toDataURL(url.toString(), { margin: 1, width: 320 }, function (err, dataUrl) {
      if (err) { alert("Couldn't generate the QR code."); return; }
      document.getElementById("qrImg").src = dataUrl;
      document.getElementById("qrOut").hidden = false;
    });
  });

  document.getElementById("qrDownloadBtn").addEventListener("click", function () {
    var img = document.getElementById("qrImg");
    if (!img.src) return;
    var a = document.createElement("a");
    a.href = img.src;
    a.download = (document.getElementById("setTitleInput").value.trim() || "practice-set").replace(/\s+/g, "-").toLowerCase() + "-qr.png";
    document.body.appendChild(a); a.click(); a.remove();
  });

  function buildUrl() {
    var ids = Object.keys(checked).filter(function (id) { return checked[id]; });
    if (!ids.length) { alert("Pick at least one activity first."); return null; }
    var title = document.getElementById("setTitleInput").value.trim() || "Practice Set";
    var note = document.getElementById("setNoteInput").value.trim();
    var url = new URL("set.html", location.href);
    url.searchParams.set("ids", ids.join(","));
    url.searchParams.set("title", title);
    if (note) url.searchParams.set("note", note);
    return url;
  }
})();
