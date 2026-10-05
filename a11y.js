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
  var state = Object.assign({ size: "md", contrast: "normal", theme: "dark", sound: "on", v: 2 }, stored);

  function apply() {
    var html = document.documentElement;
    html.setAttribute("data-size", state.size);
    html.setAttribute("data-contrast", state.contrast);
    if (state.theme === "auto") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", state.theme);
  }
  apply(); // runs immediately (this script sits early in <head>) so there's no flash of the wrong setting



  // A tiny star flies from the stamp to the badge star in the top bar, and the badge star lights up as if it filled.
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function glow(tgt) {
    if (!tgt.animate) return;
    var old = { color: tgt.style.color, filter: tgt.style.filter };
    tgt.style.color = "#E0A800"; tgt.style.filter = "drop-shadow(0 0 6px #E0A800)";
    if (!reduce) tgt.animate([{ transform: "scale(1)" }, { transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 480, easing: "ease-out" });
    setTimeout(function () { tgt.style.color = old.color; tgt.style.filter = old.filter; }, 900);
  }
  // One star per activity: each activity (or lesson) sends its star to the badge button only the first time it is passed.
  function starOnce(key, fromEl) {
    var seen = {}; try { seen = JSON.parse(localStorage.getItem("iep099-starred") || "{}") || {}; } catch (e) {}
    if (seen[key] || !fromEl) return false;
    seen[key] = 1; try { localStorage.setItem("iep099-starred", JSON.stringify(seen)); } catch (e) {}
    window.IEPFx.flyStar(fromEl); return true;
  }
  // The big celebration (confetti and the fanfare), shared by every page that needs it.
  function celebrate() {
    window.IEPSound && window.IEPSound.play("fanfare");
    if (reduce) return;
    var c = document.createElement("canvas"); c.width = window.innerWidth; c.height = window.innerHeight;
    c.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998";
    document.body.appendChild(c);
    var g = c.getContext("2d"), colors = ["#07B8A5", "#FCAD1B", "#B3372F", "#6C7BD6", "#FFFFFF"], parts = [];
    for (var i = 0; i < 140; i++) parts.push({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.4, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4, s: 6 + Math.random() * 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, col: colors[i % colors.length] });
    var start = null;
    function frame(t) {
      if (start === null) start = t;
      g.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.col; g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); g.restore(); });
      if (t - start < 2600) requestAnimationFrame(frame); else c.remove();
    }
    requestAnimationFrame(frame);
  }
  window.IEPFx = {
    celebrate: celebrate,
    starOnce: starOnce,
    flyStar: function (fromEl) {
      var tgt = document.querySelector("#barBadges .bb-ring"); if (!tgt || !fromEl) return;
      if (reduce || !document.body.animate) { glow(tgt); return; }
      var a = fromEl.getBoundingClientRect(), b = tgt.getBoundingClientRect();
      var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, dx = b.left + b.width / 2 - x0, dy = b.top + b.height / 2 - y0;
      var s = document.createElement("span"); s.textContent = "★"; s.setAttribute("aria-hidden", "true");
      s.style.cssText = "position:fixed;left:" + x0 + "px;top:" + y0 + "px;z-index:9999;pointer-events:none;font:700 26px/1 sans-serif;color:#F2B600;text-shadow:0 0 10px rgba(242,182,0,.9),0 0 2px #000";
      document.body.appendChild(s);
      var an = s.animate([
        { transform: "translate(-50%,-50%) scale(2.2)", opacity: 1 },
        { transform: "translate(calc(-50% + " + dx * 0.45 + "px),calc(-50% + " + (dy * 0.45 - 46) + "px)) scale(1.2)", opacity: 1, offset: 0.45 },
        { transform: "translate(calc(-50% + " + dx + "px),calc(-50% + " + dy + "px)) scale(0.55)", opacity: 0.95 }
      ], { duration: 1400, easing: "cubic-bezier(.45,.05,.4,1)" });
      an.onfinish = function () { s.remove(); glow(tgt); };
    }
  };

  // Sounds: short, soft tones made in the browser (no audio files). One switch in Display settings turns them all off.
  var ctx = null;
  function audio() {
    if (state.sound === "off") return null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(c, freq, at, dur, type, vol, slideTo) {
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  // Bell-like notes: a soft fundamental with two quick overtones, so every chime sounds clean and a little sparkly.
  function bell(c, f, at, vol, dur) { dur = dur || 0.5; tone(c, f, at, dur, "sine", vol); tone(c, f * 2, at, dur * 0.55, "sine", vol * 0.32); tone(c, f * 3.01, at, dur * 0.28, "sine", vol * 0.1); }
  function glint(c, f, at, vol) { tone(c, f, at, 0.14, "sine", vol || 0.03); }
  // A major pentatonic ladder: every note in it sounds good with the one before, so a run of right answers climbs.
  var PENT = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98, 1760, 2093];
  var streak = 0;
  // Soft piano: a warm triangle note with a quiet octave and fifth above it. Right answers in a row climb the ladder.
  function key(c, f, at, dur, vol) { tone(c, f, at, dur, "triangle", vol || 0.14); tone(c, f * 2, at, dur * 0.7, "sine", (vol || 0.14) * 0.5); tone(c, f * 3, at, dur * 0.35, "sine", (vol || 0.14) * 0.2); }
  var SOUNDS = {
    correct: function (c) {
      var i = Math.min(streak, 7); streak++;
      key(c, PENT[i] / 2, 0, 0.75); key(c, PENT[i + 2] / 2, 0.1, 0.65, 0.12);
    },
    ok: function (c) { key(c, PENT[2] / 2, 0, 0.7); key(c, PENT[4] / 2, 0.1, 0.65, 0.12); },
    perfect: function (c, lvl) {
      var base = Math.min(lvl || 0, 3);
      [0, 2, 3, 5].forEach(function (k, j) { key(c, (PENT[base + k] || PENT[10]) / 2, j * 0.1, 0.9); });
      [0, 2, 3, 5, 7].forEach(function (k) { tone(c, (PENT[Math.min(base + k, 10)] || PENT[10]) / 2, 0.5, 1.4, "triangle", 0.09); });
    },
    badge: function (c) {
      [3, 5, 7, 8, 10].forEach(function (k, j) { key(c, PENT[k] / 2, j * 0.09, 1, 0.11); });
    },
    fanfare: function (c) {
      [0, 2, 3, 5, 7, 8].forEach(function (k, j) { key(c, PENT[k] / 2, j * 0.1, 1, 0.12); });
      [0, 2, 3, 5, 7].forEach(function (k) { tone(c, PENT[k] / 2, 0.7, 1.8, "triangle", 0.09); });
    }
  };
  window.IEPSound = {
    play: function (name, lvl) { var c = audio(), f = SOUNDS[name]; if (!c || !f) return; try { f(c, lvl); } catch (e) {} },
    miss: function () { streak = 0; },
    muted: function () { return state.sound === "off"; }
  };

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
          state[key] = opt.val; save(state); apply(); if (key === "sound" && opt.val === "on" && window.IEPSound) window.IEPSound.play("correct");
          Array.prototype.forEach.call(grp.children, function (x) { x.classList.toggle("on", x === b); });
        });
        grp.appendChild(b);
      });
      r.appendChild(grp);
      return r;
    }
    panel.appendChild(row("Text size", [{ label: "A", val: "md" }, { label: "A+", val: "lg" }, { label: "A++", val: "xl" }], "size"));
    panel.appendChild(row("Contrast", [{ label: "Normal", val: "normal" }, { label: "High", val: "high" }], "contrast"));
    panel.appendChild(row("Sounds", [{ label: "On", val: "on" }, { label: "Off", val: "off" }], "sound"));
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
    // closes when you touch elsewhere or scroll, like the main menu
    document.addEventListener("touchstart", function (e) { if (!panel.hidden && e.target !== btn && !panel.contains(e.target)) panel.hidden = true; }, { passive: true });
    window.addEventListener("scroll", function () { if (!panel.hidden) panel.hidden = true; }, { passive: true });
  });
})();
