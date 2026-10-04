/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// Instructor page gate. The tool itself is not on this page: it is published only as encrypted data (builder.lock.json).
// The passphrase turns that data back into the tool inside the browser. Nothing is remembered between visits.
(function () {
  "use strict";
  var msg = document.getElementById("gateMsg"), btn = document.getElementById("unlockBtn"), input = document.getElementById("pass");
  function bytes(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  var busy = false;
  function go() {
    var v = input.value.trim(); if (!v || busy) return;
    busy = true; msg.textContent = "Checking…";
    fetch("builder.lock.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (L) {
      return crypto.subtle.importKey("raw", new TextEncoder().encode(v), "PBKDF2", false, ["deriveKey"]).then(function (base) {
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(L.salt), iterations: L.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      }).then(function (key) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(L.iv) }, key, bytes(L.data)); });
    }).then(function (buf) {
      var p = JSON.parse(new TextDecoder().decode(buf));
      document.getElementById("tool").innerHTML = p.html;
      var s = document.createElement("script"); s.textContent = p.js; document.body.appendChild(s);
      input.value = ""; msg.textContent = "";
    }).catch(function () { msg.textContent = "That's not the right passphrase."; }).then(function () { busy = false; });
  }
  btn.addEventListener("click", go);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
})();
