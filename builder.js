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

  function groupByUnit() {
    var units = {};
    Object.keys(ALL).forEach(function (id) {
      var m = ALL[id].meta;
      var u = units[m.unit] || (units[m.unit] = { title: m.unitTitle, topics: {} });
      var t = u.topics[m.topicTitle] || (u.topics[m.topicTitle] = []);
      t.push({ id: id, title: m.activityTitle });
    });
    return units;
  }

  function updateCount() {
    var n = Object.keys(checked).filter(function (id) { return checked[id]; }).length;
    document.getElementById("countNote").textContent = n + " activit" + (n === 1 ? "y" : "ies") + " selected";
  }

  function renderCatalog() {
    var units = groupByUnit();
    var root = document.getElementById("catalog");
    root.innerHTML = "";
    Object.keys(units).sort(function (a, b) { return +a - +b; }).forEach(function (unitNum) {
      var u = units[unitNum];
      var block = document.createElement("div");
      block.className = "toc-unit";
      block.style.marginTop = "14px";
      var h = document.createElement("div");
      h.style.cssText = "font:600 16px/1.2 var(--serif);color:var(--ink);margin-bottom:8px";
      h.textContent = "Unit " + unitNum + " · " + u.title;
      block.appendChild(h);
      Object.keys(u.topics).forEach(function (topicTitle) {
        var tHead = document.createElement("div");
        tHead.style.cssText = "font:700 11px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:10px 0 4px";
        tHead.textContent = topicTitle;
        block.appendChild(tHead);
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
          block.appendChild(row);
        });
      });
      root.appendChild(block);
    });
    updateCount();
  }

  document.getElementById("genBtn").addEventListener("click", function () {
    var ids = Object.keys(checked).filter(function (id) { return checked[id]; });
    if (!ids.length) { alert("Pick at least one activity first."); return; }
    var title = document.getElementById("setTitleInput").value.trim() || "Practice Set";
    var note = document.getElementById("setNoteInput").value.trim();
    var url = new URL("set.html", location.href);
    url.searchParams.set("ids", ids.join(","));
    url.searchParams.set("title", title);
    if (note) url.searchParams.set("note", note);
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
})();
