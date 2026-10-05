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
    var st = B.state(), earned = st.filter(function (b) { return b.earned; }).length, pctAll = Math.round(earned / st.length * 100);
    var C = 2 * Math.PI * 26;
    $("bdSummary").innerHTML = '<div class="bd-top"><span class="bd-ring" role="img" aria-label="' + earned + " of " + st.length + ' badges earned"><svg viewBox="0 0 60 60" aria-hidden="true"><circle class="bg" cx="30" cy="30" r="26"/><circle class="fg" cx="30" cy="30" r="26" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - Math.max(earned ? 0.06 : 0, earned / st.length))).toFixed(1) + '" transform="rotate(-90 30 30)"/></svg><b>' + earned + "</b></span>" +
      "<div><strong>" + earned + " of " + st.length + " badges</strong><small>" + (earned === st.length ? "You have them all." : earned ? (st.length - earned) + " still to unlock. Tap any badge to see how." : "Every badge starts locked. Tap one to see how to unlock it.") + "</small></div></div>";

    function pctOf(b) { return b.need ? Math.min(1, b.have / b.need) : 0; }
    function tile(b) {
      var d = b.def, p = pctOf(b);
      var t = document.createElement("button"); t.type = "button"; t.className = "bd-tile" + (b.earned ? " got" : " locked");
      t.setAttribute("aria-label", d.name + (b.earned ? ", earned" : ", locked, " + b.have + " of " + b.need));
      t.innerHTML = '<span class="bd-img"><img src="' + B.src(d) + '" alt="" loading="lazy">' + (b.earned ? '<i class="bd-check" aria-hidden="true">✓</i>' : '<i class="bd-lock" aria-hidden="true">🔒</i>') + "</span>" +
        "<b>" + esc(d.name) + "</b>" + (b.earned ? "" : '<span class="bd-prog"><i style="width:' + Math.round(p * 100) + '%"></i></span>');
      t.addEventListener("click", function () { openSheet(b); });
      return t;
    }
    // inside each group the badges closest to unlocking come right after the earned ones
    function fill(el, kind, titleEl) {
      var list = st.filter(function (b) { return b.def.kind === kind; });
      list.sort(function (x, y) { return (y.earned - x.earned) || (pctOf(y) - pctOf(x)); });
      el.innerHTML = ""; list.forEach(function (b) { el.appendChild(tile(b)); });
      var n = list.filter(function (b) { return b.earned; }).length;
      if (titleEl) titleEl.innerHTML = titleEl.getAttribute("data-t") + " <span>" + n + "/" + list.length + "</span>";
    }
    fill($("bdW"), "w", $("bdWt")); fill($("bdP"), "p", $("bdPt"));
  }

  // tap a badge: a larger view with how to unlock it and how far along you are
  function openSheet(b) {
    var d = b.def, s = $("bdSheet"), p = b.need ? Math.min(100, Math.round(b.have / b.need * 100)) : 0;
    s.innerHTML = '<div class="bd-card-big' + (b.earned ? " got" : " locked") + '" role="dialog" aria-modal="true" aria-label="' + esc(d.name) + '"><button type="button" class="bd-x" aria-label="Close">×</button>' +
      '<span class="bd-img"><img src="' + B.src(d) + '" alt="">' + (b.earned ? "" : '<i class="bd-lock" aria-hidden="true">🔒</i>') + "</span><h3>" + esc(d.name) + "</h3><p>" + esc(d.how) + "</p>" +
      (b.earned ? '<small class="bd-when">Earned' + (b.when ? " " + when(b.when) : "") + "</small>" : '<span class="bd-prog"><i style="width:' + p + '%"></i></span><small>' + b.have + " of " + b.need + "</small>") + "</div>";
    s.hidden = false; var x = s.querySelector(".bd-x"); x.focus();
    function close() { s.hidden = true; document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") close(); }
    x.addEventListener("click", close); s.addEventListener("click", function (e) { if (e.target === s) close(); }); document.addEventListener("keydown", key);
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
  // ---------- sending a piece to the instructor ----------
  var F = window.IEPFeedback;
  function studentName() { try { return localStorage.getItem("iep099-student-name") || ""; } catch (e) { return ""; } }
  function sendBox(p) {
    var v = p.versions[p.versions.length - 1], wrap = document.createElement("div"); wrap.className = "fb-box";
    var b = document.createElement("button"); b.type = "button"; b.className = "fb-btn"; b.textContent = "Send to my instructor";
    var out = document.createElement("div");
    b.addEventListener("click", function () {
      var msg = (studentName() ? studentName() + "\n" : "") + p.title + (v.kind === "revision" ? " (revision)" : " (draft)") + "\n" + (p.prompt ? "Task: " + p.prompt + "\n" : "") + "\n" + v.text;
      var who = (studentName() || "my").replace(/[^A-Za-z0-9]+/g, "-");
      F.actions(out, { text: msg, body: v.text, title: "My writing: " + p.title, file: "writing-" + who + "-" + p.id + ".txt",
        pdf: function () { F.pdf({ title: p.title, sub: studentName(), prompt: p.prompt, text: v.text, file: "writing-" + who + "-" + p.id }); } });
    });
    wrap.appendChild(b); wrap.appendChild(out); return wrap;
  }
  function renderFolio() {
    var r = WC.read(), el = $("wcFolio");
    if (!r.portfolio.length) { el.innerHTML = '<p class="wc-note">Everything you write is saved here, with each version.</p>'; return; }
    el.innerHTML = r.portfolio.slice().reverse().map(function (p) {
      return '<details class="wc-piece"><summary>' + (p.fav ? "★ " : "") + esc(p.title) + "<small>" + p.versions.length + (p.versions.length > 1 ? " versions" : " version") + "</small></summary>" +
        p.versions.map(function (v) { return '<div class="v">' + (v.kind === "revision" ? "Revision" : "Draft") + " · " + new Date(v.at).toLocaleDateString() + "</div><blockquote>" + esc(v.text) + "</blockquote>"; }).join("") +
        '<button type="button" data-copy="' + esc(p.id) + '">Copy latest</button><button type="button" data-fav="' + esc(p.id) + '">' + (p.fav ? "Remove star" : "Star this piece") + '</button><div data-fb="' + esc(p.id) + '"></div></details>';
    }).join("");
    r.portfolio.forEach(function (p) {
      var slot = el.querySelector('[data-fb="' + p.id.replace(/"/g, "") + '"]'); if (!slot) return;
      slot.appendChild(sendBox(p));
    });
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
