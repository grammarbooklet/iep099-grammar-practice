/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// Instructor page gate. The tool itself is not on this page: it is published only as encrypted data (builder.lock.json).
// One passphrase unlocks every instructor feature. It is turned into a key (slow, salted, as in instructor.json) that
// opens this tool, the Writing Center instructor view and the practice-set time control. After you enter it once in a
// browser tab, the key stays in that tab only (session storage), so the other tools open without asking again.
(function () {
  "use strict";
  var KEY = "iep099-inst";
  var msg = document.getElementById("gateMsg"), btn = document.getElementById("unlockBtn"), input = document.getElementById("pass"), gate = document.getElementById("gate");
  function bytes(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function hexBytes(h) { var u = new Uint8Array(h.length / 2); for (var i = 0; i < u.length; i++) u[i] = parseInt(h.substr(i * 2, 2), 16); return u; }
  function hexOf(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  function json(url) { return fetch(url, { cache: "no-store" }).then(function (r) { return r.json(); }); }

  function open(K, lock) {
    return crypto.subtle.importKey("raw", K, { name: "AES-GCM" }, false, ["decrypt"]).then(function (key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(lock.iv) }, key, bytes(lock.data));
    }).then(function (buf) {
      var p = JSON.parse(new TextDecoder().decode(buf));
      document.getElementById("tool").innerHTML = p.html;
      var s = document.createElement("script"); s.textContent = p.js; document.body.appendChild(s);
      if (input) input.value = ""; msg.textContent = "";
    });
  }

  // already unlocked in this tab (by this page, the Writing Center menu or a practice set)? Open without asking.
  var stored = null; try { stored = sessionStorage.getItem(KEY); } catch (e) {}
  if (stored && /^[0-9a-f]{64}$/.test(stored)) {
    json("builder.lock.json").then(function (lock) { return open(hexBytes(stored), lock); }).catch(function () { try { sessionStorage.removeItem(KEY); } catch (e) {} });
  }

  var busy = false;
  function go() {
    var v = input.value.trim(); if (!v || busy) return;
    busy = true; msg.textContent = "Checking…";
    Promise.all([json("instructor.json"), json("builder.lock.json")]).then(function (a) {
      var cfg = a[0], lock = a[1];
      return crypto.subtle.importKey("raw", new TextEncoder().encode(v), "PBKDF2", false, ["deriveBits"]).then(function (base) {
        return crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexBytes(cfg.salt), iterations: cfg.iter, hash: "SHA-256" }, base, 256);
      }).then(function (K) {
        return crypto.subtle.digest("SHA-256", K).then(function (h) {
          if (hexOf(h) !== cfg.v) throw new Error("wrong");
          try { sessionStorage.setItem(KEY, hexOf(K)); } catch (e) {}
          return open(K, lock);
        });
      });
    }).catch(function () { msg.textContent = "That's not the right passphrase."; }).then(function () { busy = false; });
  }
  btn.addEventListener("click", go);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
})();
