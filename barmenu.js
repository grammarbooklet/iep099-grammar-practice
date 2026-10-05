/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// IEP099: one small menu for the top bar. Everything that used to crowd the bar (the day streak, the student's name,
// the link to the grammar progress report, display settings) lives in a dropdown behind a single icon. The bar itself
// keeps only the back link, the page title and the badge progress.
(function () {
  "use strict";
  function build() {
    var bar = document.querySelector(".bar");
    if (!bar || bar.querySelector(".bar-menu")) return;

    var wrap = document.createElement("div"); wrap.className = "bar-menu";
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "bar-menu-btn";
    btn.setAttribute("aria-label", "Menu"); btn.setAttribute("aria-haspopup", "true"); btn.setAttribute("aria-expanded", "false"); btn.title = "Menu";
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    var panel = document.createElement("div"); panel.className = "bar-menu-panel"; panel.hidden = true;
    wrap.appendChild(btn); wrap.appendChild(panel);

    // things that were in the bar move into the menu (same elements, so their scripts keep working)
    ["streakBadge", "studentNameBadge"].forEach(function (id) { var el = document.getElementById(id); if (el) panel.appendChild(el); });
    // The old "My progress" links are replaced by two clearly named entries, on every student page.
    Array.prototype.slice.call(bar.children).forEach(function (el) {
      if (el.classList && el.classList.contains("bar-link") && el.id !== "barBadges") el.remove();
    });
    var instructor = /builder\.html/.test(location.pathname);
    function entry(href, label, svg) {
      var a = document.createElement("a"); a.href = href; a.className = "bar-menu-link";
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + svg + "</svg>" + label;
      if (location.pathname.split("/").pop() === href.split("#")[0]) a.setAttribute("aria-current", "page");
      return a;
    }
    if (!instructor) {
      panel.appendChild(entry("progress.html", "Grammar Booklet progress", '<path d="M4 19V10"/><path d="M11 19V5"/><path d="M18 19v-7"/>'));
      panel.appendChild(entry("my-writing.html#badges", "Writing Center progress", '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'));
    }

    // Instructor access lives in this menu (Writing Center pages only): it opens a small passphrase box.
    if (!instructor && window.WC && WC.instructorUnlock) {
      var ib = document.createElement("button"); ib.type = "button";
      ib.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg><span>Instructor access</span>';
      panel.appendChild(ib);
      var active = false;
      WC.index().then(function (idx) { active = !!idx.instructor; if (active) ib.querySelector("span").textContent = "Exit instructor view"; });
      ib.addEventListener("click", function (e) {
        e.stopPropagation(); close(false);
        if (active) { WC.instructorLock(); location.reload(); return; }
        openInstructorBox();
      });
    }
    function openInstructorBox() {
      var old = document.getElementById("instSheet"); if (old) old.remove();
      var s = document.createElement("div"); s.id = "instSheet"; s.className = "inst-sheet";
      s.innerHTML = '<form class="inst-card" role="dialog" aria-modal="true" aria-label="Instructor access"><button type="button" class="inst-x" aria-label="Close">×</button><h3>Instructor access</h3><p>Enter the passphrase to open every stage in this tab.</p><input type="password" autocomplete="off" aria-label="Passphrase"><button type="submit" class="inst-go">Open all stages</button><p class="inst-msg" aria-live="polite"></p></form>';
      document.body.appendChild(s);
      var f = s.querySelector("form"), inp = s.querySelector("input"), msg = s.querySelector(".inst-msg");
      function shut() { s.remove(); document.removeEventListener("keydown", key); }
      function key(ev) { if (ev.key === "Escape") shut(); }
      document.addEventListener("keydown", key);
      s.querySelector(".inst-x").addEventListener("click", shut);
      s.addEventListener("click", function (ev) { if (ev.target === s) shut(); });
      f.addEventListener("submit", function (ev) {
        ev.preventDefault(); if (!inp.value) return; msg.textContent = "Checking…";
        WC.instructorUnlock(inp.value).then(function (ok) {
          if (ok) location.reload(); else setTimeout(function () { msg.textContent = "That passphrase isn’t right."; }, 1200);
        });
      });
      inp.focus();
    }

    function close(focusBtn) { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); if (focusBtn) btn.focus(); }
    var openedAt = 0;
    function open() { openedAt = Date.now(); panel.hidden = false; btn.setAttribute("aria-expanded", "true"); var f = panel.querySelector("a, button"); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }

    // display settings: the existing settings button stays in the page but out of sight; this row opens its panel
    var ghost = bar.querySelector(".a11y-btn");
    if (ghost) {
      ghost.classList.add("a11y-ghost"); ghost.tabIndex = -1; ghost.setAttribute("aria-hidden", "true");
      var row = document.createElement("button"); row.type = "button";
      row.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="16" cy="17" r="2" fill="currentColor" stroke="none"/></svg>Display settings';
      row.addEventListener("click", function (e) { e.stopPropagation(); close(false); ghost.click(); });
      panel.appendChild(row);
    }

    btn.addEventListener("click", function (e) { e.stopPropagation(); if (panel.hidden) open(); else close(false); });
    document.addEventListener("click", function (e) { if (!panel.hidden && !wrap.contains(e.target)) close(false); });
    // On a phone the menu also closes as soon as you touch the screen anywhere else, or scroll the page.
    document.addEventListener("touchstart", function (e) { if (!panel.hidden && !wrap.contains(e.target)) close(false); }, { passive: true });
    window.addEventListener("scroll", function () { if (!panel.hidden && Date.now() - openedAt > 350) close(false); }, { passive: true });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(true); });

    // order in the bar: ... title · badges · menu
    var badges = document.getElementById("barBadges"); if (badges) bar.appendChild(badges);
    bar.appendChild(wrap);
  }
  function keepOrder() {
    var bar = document.querySelector(".bar"), wrap = bar && bar.querySelector(".bar-menu"), badges = document.getElementById("barBadges");
    if (wrap && badges && badges.nextElementSibling !== wrap) bar.insertBefore(badges, wrap);
  }
  function init() { build(); keepOrder(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.addEventListener("load", init);
})();
