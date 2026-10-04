/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// "My progress" page of the Writing Center: badges (locked until earned, with progress), skills, portfolio and the
// progress backup. These used to crowd the trail map; now they sit behind the badge icon in the top bar.
(function () {
  "use strict";
  var WC = window.WC, B = window.IEPBadges;
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function $(id) { return document.getElementById(id); }

  // ---------- tabs ----------
  var TABS = ["badges", "skills", "portfolio", "backup"];
  function show(name) {
    if (TABS.indexOf(name) === -1) name = "badges";
    TABS.forEach(function (t) {
      var on = t === name;
      $("p-" + t).hidden = !on; $("t-" + t).classList.toggle("on", on); $("t-" + t).setAttribute("aria-selected", on ? "true" : "false");
    });
    try { history.replaceState(null, "", "#" + name); } catch (e) {}
  }
  TABS.forEach(function (t) { $("t-" + t).addEventListener("click", function () { show(t); }); });
  window.addEventListener("hashchange", function () { show(location.hash.slice(1)); });
  show(location.hash.slice(1));

  // ---------- badges ----------
  function when(iso) { try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch (e) { return ""; } }
  function renderBadges() {
    if (!B) return;
    var st = B.state(), earned = st.filter(function (b) { return b.earned; }).length;
    $("bdSummary").innerHTML = "<b>" + earned + " of " + st.length + "</b> badges earned" +
      '<div class="wc-bar"><i style="width:' + Math.round(earned / st.length * 100) + '%"></i></div>' +
      "<small>Every badge starts locked. You unlock one by doing what it says.</small>";
    function card(b) {
      var d = b.def, pct = b.need ? Math.round(b.have / b.need * 100) : 0;
      return '<article class="bd-card' + (b.earned ? " got" : " locked") + '" aria-label="' + esc(d.name) + (b.earned ? ", earned" : ", locked") + '">' +
        '<div class="bd-img"><img src="' + B.src(d) + '" alt="" loading="lazy">' + (b.earned ? "" : '<span class="bd-lock" aria-hidden="true">🔒</span>') + "</div>" +
        "<b>" + esc(d.name) + "</b><p>" + esc(d.how) + "</p>" +
        (b.earned ? '<small class="bd-when">Earned' + (b.when ? " " + when(b.when) : "") + "</small>"
          : '<div class="bd-prog"><i style="width:' + pct + '%"></i></div><small>' + b.have + " of " + b.need + "</small>") + "</article>";
    }
    $("bdW").innerHTML = st.filter(function (b) { return b.def.kind === "w"; }).map(card).join("");
    $("bdP").innerHTML = st.filter(function (b) { return b.def.kind === "p"; }).map(card).join("");
  }

  // ---------- skills ----------
  var NAMES = {};
  function renderSkills() {
    var r = WC.read(), keys = Object.keys(r.skills);
    if (!keys.length) { $("wcSkills").innerHTML = '<p class="wc-note">Your skills will appear here after your first lesson.</p>'; return; }
    keys.sort(function (a, b) { return r.skills[b].s - r.skills[a].s; });
    $("wcSkills").innerHTML = '<div class="wc-skillgrid">' + keys.map(function (k) {
      var s = r.skills[k], full = Math.floor(s.s), n = WC.daysBetween(WC.today(), s.due || WC.today());
      return '<div class="wc-skill"><b>' + esc(NAMES[k] || k) + '</b><span class="wc-ink" role="img" aria-label="Strength ' + full + ' of 5">' +
        [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= full ? "was" : "") + '"></i>'; }).join("") + "</span><small>" +
        (n <= 0 ? "Review due today" : n === 1 ? "Review tomorrow" : "Review in " + n + " days") + "</small></div>";
    }).join("") + "</div>";
  }

  // ---------- portfolio ----------
  function renderFolio() {
    var r = WC.read(), el = $("wcFolio");
    if (!r.portfolio.length) { el.innerHTML = '<p class="wc-note">Everything you write is saved here, with each version.</p>'; return; }
    el.innerHTML = r.portfolio.slice().reverse().map(function (p) {
      return '<details class="wc-piece"><summary>' + (p.fav ? "★ " : "") + esc(p.title) + "<small>" + p.versions.length + (p.versions.length > 1 ? " versions" : " version") + "</small></summary>" +
        p.versions.map(function (v) { return '<div class="v">' + (v.kind === "revision" ? "Revision" : "Draft") + " · " + new Date(v.at).toLocaleDateString() + "</div><blockquote>" + esc(v.text) + "</blockquote>"; }).join("") +
        '<button type="button" data-copy="' + esc(p.id) + '">Copy latest</button><button type="button" data-fav="' + esc(p.id) + '">' + (p.fav ? "Remove star" : "Star this piece") + "</button></details>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll("[data-copy]"), function (b) { b.addEventListener("click", function () {
      var p = r.portfolio.filter(function (x) { return x.id === b.getAttribute("data-copy"); })[0], t = p.versions[p.versions.length - 1].text;
      if (navigator.clipboard) navigator.clipboard.writeText(t); b.textContent = "Copied"; }); });
    Array.prototype.forEach.call(el.querySelectorAll("[data-fav]"), function (b) { b.addEventListener("click", function () { WC.toggleFav(b.getAttribute("data-fav")); renderFolio(); }); });
  }

  // ---------- backup ----------
  function backup() {
    var msg = $("bkMsg"); function say(t, err) { msg.textContent = t; msg.className = "wc-msg" + (err ? " err" : ""); }
    $("bkDownload").addEventListener("click", function () {
      var blob = new Blob([WC.exportCode()], { type: "text/plain" }), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "writing-center-backup.txt"; document.body.appendChild(a); a.click(); a.remove(); say("Backup downloaded. Keep the file somewhere safe.");
    });
    $("bkCopy").addEventListener("click", function () {
      var c = WC.exportCode();
      if (navigator.clipboard) navigator.clipboard.writeText(c).then(function () { say("Backup code copied. Paste it somewhere safe, such as a note to yourself."); }, function () { $("bkText").value = c; say("Copy the code from the box below."); });
      else { $("bkText").value = c; say("Copy the code from the box below."); }
    });
    function restore(text) { try { WC.importCode(text); say("Restored. Reloading your progress…"); setTimeout(function () { location.reload(); }, 700); } catch (e) { say("That doesn’t look like a Writing Center backup. Check the code and try again.", true); } }
    $("bkRestore").addEventListener("click", function () { restore($("bkText").value); });
    $("bkFile").addEventListener("change", function () { var f = this.files[0]; if (!f) return; var fr = new FileReader(); fr.onload = function () { restore(fr.result); }; fr.readAsText(f); });
  }

  renderBadges(); renderFolio(); backup(); renderSkills();
  WC.index().then(function (idx) {
    idx.stages.forEach(function (s) {
      if (!s.lessons.some(function (l) { return l.ready; })) return;
      fetch("writing-content/" + s.file).then(function (x) { return x.json(); }).then(function (d) {
        Object.keys(d.skills || {}).forEach(function (k) { NAMES[k] = d.skills[k].label; }); renderSkills();
      }).catch(function () {});
    });
  });
})();
