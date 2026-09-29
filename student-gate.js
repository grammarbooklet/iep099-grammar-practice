// Asks a student for their name and section number the first time they land anywhere on the site (the
// catalog, or a unit/topic/activity page reached straight from a QR code) and remembers it in this
// browser's own localStorage so they aren't asked again on later visits. Uses the same keys progress.js
// already reads/writes, so a name entered here also pre-fills "My Progress", and nothing is ever sent
// anywhere. Also fills in the little name badge next to "My progress" in the top bar, on every page that
// has one.
(function () {
  "use strict";
  var NAME_KEY = "iep099-student-name", SECTION_KEY = "iep099-section";
  function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function showNameBadge() {
    var name = get(NAME_KEY);
    var badge = document.getElementById("studentNameBadge"), text = document.getElementById("studentNameText");
    if (!name || !badge || !text) return;
    text.textContent = name;
    badge.hidden = false;
  }

  if (get(NAME_KEY) && get(SECTION_KEY)) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showNameBadge);
    else showNameBadge();
    return;
  }

  function init() {
    var overlay = document.createElement("div");
    overlay.id = "studentGateOverlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:var(--paper);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto";
    overlay.innerHTML =
      '<div style="max-width:360px;width:100%">' +
        '<p style="font:700 11px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:0 0 8px">IEP099 &middot; Grammar Booklet</p>' +
        '<h1 style="font:700 26px/1.2 var(--serif);color:var(--ink);margin:0 0 6px">Before you start</h1>' +
        '<p style="font:400 14px/1.5 var(--sans);color:var(--ink-2);margin:0 0 16px">Enter your name and section number.</p>' +
        '<div class="progress-settings">' +
          '<label>Your name<input type="text" id="gateName" placeholder="Full name" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore="true" data-form-type="other"></label>' +
          '<label class="narrow">Section number<input type="text" id="gateSection" placeholder="e.g. 09A" autocomplete="off" maxlength="3" data-lpignore="true" data-1p-ignore data-bwignore="true" data-form-type="other"></label>' +
        '</div>' +
        '<p class="note" style="margin-top:8px">This isn&rsquo;t a login &mdash; never type a password here, even if your browser offers to fill one in. Just your name and section number.</p>' +
        '<div class="ex-actions" style="margin-top:14px"><button class="btn" id="gateContinueBtn" type="button">Continue</button></div>' +
        '<p class="note" id="gateMsg" style="margin-top:8px;min-height:1.2em"></p>' +
      '</div>';
    document.body.appendChild(overlay);

    var nameEl = overlay.querySelector("#gateName"), sectionEl = overlay.querySelector("#gateSection"), msgEl = overlay.querySelector("#gateMsg");
    function submit() {
      var name = nameEl.value.trim(), section = sectionEl.value.trim();
      if (!name || !section) { msgEl.textContent = "Please enter both your name and section number."; return; }
      set(NAME_KEY, name); set(SECTION_KEY, section);
      overlay.remove();
      showNameBadge();
    }
    overlay.querySelector("#gateContinueBtn").addEventListener("click", submit);
    [nameEl, sectionEl].forEach(function (el) {
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    });
    nameEl.focus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
