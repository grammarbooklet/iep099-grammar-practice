/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// IEP099 grammar practice — display settings (text size, contrast, light/dark), available from every page.
// Offered as an ordinary "Display settings" control rather than a flagged accessibility mode, so any
// student can quietly adjust it without it calling attention to itself. Preferences persist per device.
(function () {
  "use strict";
  var KEY = "iep099-a11y";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  // The dark theme is the site's main look for everyone, whatever their device is set to. Settings saved before this
  // rule (version 1) never meant "I chose auto", so they are moved to dark once; after that the student's own
  // choice (Auto, Light or Dark in Display settings) is respected.
  var stored = load();
  if (stored.v !== 2) { stored.theme = "dark"; stored.v = 2; }
  var state = Object.assign({ size: "md", contrast: "normal", theme: "dark", v: 2 }, stored);

  function apply() {
    var html = document.documentElement;
    html.setAttribute("data-size", state.size);
    html.setAttribute("data-contrast", state.contrast);
    if (state.theme === "auto") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", state.theme);
  }
  apply(); // runs immediately (this script sits early in <head>) so there's no flash of the wrong setting

  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  ready(function () {
    var bar = document.querySelector(".bar");
    if (!bar) return;

    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "a11y-btn"; btn.setAttribute("aria-label", "Display settings"); btn.title = "Display settings";
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/>' +
      '<line x1="4" y1="17" x2="20" y2="17"/><circle cx="16" cy="17" r="2" fill="currentColor" stroke="none"/></svg>';
    var score = bar.querySelector(".bar-score");
    bar.insertBefore(btn, score || null);

    var panel = document.createElement("div"); panel.className = "a11y-panel"; panel.hidden = true;
    function row(label, options, key) {
      var r = document.createElement("div"); r.className = "a11y-row";
      var lab = document.createElement("span"); lab.className = "a11y-label"; lab.textContent = label; r.appendChild(lab);
      var grp = document.createElement("div"); grp.className = "a11y-opts";
      options.forEach(function (opt) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = opt.label;
        if (state[key] === opt.val) b.classList.add("on");
        b.addEventListener("click", function () {
          state[key] = opt.val; save(state); apply();
          Array.prototype.forEach.call(grp.children, function (x) { x.classList.toggle("on", x === b); });
        });
        grp.appendChild(b);
      });
      r.appendChild(grp);
      return r;
    }
    panel.appendChild(row("Text size", [{ label: "A", val: "md" }, { label: "A+", val: "lg" }, { label: "A++", val: "xl" }], "size"));
    panel.appendChild(row("Contrast", [{ label: "Normal", val: "normal" }, { label: "High", val: "high" }], "contrast"));
    panel.appendChild(row("Theme", [{ label: "Auto", val: "auto" }, { label: "Light", val: "light" }, { label: "Dark", val: "dark" }], "theme"));
    document.body.appendChild(panel);

    function position() {
      var r = btn.getBoundingClientRect();
      panel.style.top = (r.bottom + 8) + "px";
      panel.style.right = Math.max(16, window.innerWidth - r.right) + "px";
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      if (!panel.hidden) position();
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && e.target !== btn && !panel.contains(e.target)) panel.hidden = true;
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") panel.hidden = true; });
    window.addEventListener("resize", function () { if (!panel.hidden) position(); });
  });
})();
