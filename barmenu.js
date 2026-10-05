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

    // Instructor access lives in this menu on every student page. One passphrase opens every instructor tool: the key it
    // makes is kept in this tab only, and the Writing Center, practice sets and the set builder all read it from there.
    if (!instructor && window.crypto && crypto.subtle) {
      var IK = "iep099-inst";
      var hexBytes = function (h) { var u = new Uint8Array(h.length / 2); for (var i = 0; i < u.length; i++) u[i] = parseInt(h.substr(i * 2, 2), 16); return u; };
      var hexOf = function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); };
      var cfgJson = function () { return fetch("instructor.json", { cache: "no-store" }).then(function (r) { return r.json(); }); };
      var stored = function () { var k = null; try { k = sessionStorage.getItem(IK); } catch (e) {} return k && /^[0-9a-f]{64}$/.test(k) ? k : null; };
      var ib = document.createElement("button"); ib.type = "button";
      ib.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg><span>Instructor access</span>';
      var active = false;
      if (stored()) cfgJson().then(function (cfg) { return crypto.subtle.digest("SHA-256", hexBytes(stored())).then(function (h) { if (hexOf(h) === cfg.v) { active = true; ib.querySelector("span").textContent = "Exit instructor view"; } }); }).catch(function () {});
      panel.appendChild(ib);
      ib.addEventListener("click", function (e) {
        e.stopPropagation(); close(false);
        if (active) { try { sessionStorage.removeItem(IK); } catch (x) {} location.reload(); return; }
        openInstructorBox();
      });
      var unlockWith = function (phrase) {
        return cfgJson().then(function (cfg) {
          return crypto.subtle.importKey("raw", new TextEncoder().encode(phrase), "PBKDF2", false, ["deriveBits"]).then(function (base) {
            return crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexBytes(cfg.salt), iterations: cfg.iter, hash: "SHA-256" }, base, 256);
          }).then(function (K) {
            return crypto.subtle.digest("SHA-256", K).then(function (h) {
              if (hexOf(h) !== cfg.v) return false;
              try { sessionStorage.setItem(IK, hexOf(K)); } catch (x) { return false; }
              return true;
            });
          });
        }).catch(function () { return false; });
      };
    }
    function openInstructorBox() {
      var old = document.getElementById("instSheet"); if (old) old.remove();
      var sh = document.createElement("div"); sh.id = "instSheet"; sh.className = "inst-sheet";
      sh.innerHTML = '<form class="inst-card" role="dialog" aria-modal="true" aria-label="Instructor access"><button type="button" class="inst-x" aria-label="Close">×</button><h3>Instructor access</h3><p>Enter the passphrase once. It opens every instructor tool in this tab.</p><input type="password" autocomplete="off" aria-label="Passphrase"><button type="submit" class="inst-go">Unlock</button><p class="inst-msg" aria-live="polite"></p></form>';
      document.body.appendChild(sh);
      var f = sh.querySelector("form"), inp = sh.querySelector("input"), msg = sh.querySelector(".inst-msg");
      function shut() { sh.remove(); document.removeEventListener("keydown", key); }
      function key(ev) { if (ev.key === "Escape") shut(); }
      document.addEventListener("keydown", key);
      sh.querySelector(".inst-x").addEventListener("click", shut);
      sh.addEventListener("click", function (ev) { if (ev.target === sh) shut(); });
      f.addEventListener("submit", function (ev) {
        ev.preventDefault(); if (!inp.value) return; msg.textContent = "Checking…";
        unlockWith(inp.value).then(function (ok) {
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
