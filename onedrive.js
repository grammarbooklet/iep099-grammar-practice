// Optional "Save to OneDrive" button on the My Progress page. Uses MSAL.js (Microsoft's own sign-in
// library, loaded from a CDN above this script) so a student can sign in with their own Microsoft or
// institutional account and save their progress report as a file in their own OneDrive — this page never
// sees their password, and the requested permission (Files.ReadWrite.AppFolder) only reaches a single
// hidden app folder in their Drive, never the rest of their account.
// Entirely inert until msal-config.js has a real Client ID; see that file for one-time setup steps.
(function () {
  "use strict";
  var btn = document.getElementById("pOneDriveBtn");
  var CLIENT_ID = window.MSAL_CLIENT_ID;
  if (!btn || typeof msal === "undefined" || !CLIENT_ID || CLIENT_ID.indexOf("REPLACE_") === 0) return;

  var msalInstance = new msal.PublicClientApplication({
    auth: { clientId: CLIENT_ID, authority: "https://login.microsoftonline.com/common", redirectUri: location.href.split("#")[0] }
  });
  var SCOPES = ["Files.ReadWrite.AppFolder"];

  function buildReport() {
    var all; try { all = JSON.parse(localStorage.getItem("iep099-results") || "{}"); } catch (e) { all = {}; }
    var ids = Object.keys(all);
    var nameEl = document.getElementById("pName");
    var name = (nameEl && nameEl.value.trim()) || "(name not entered)";
    var lines = ["IEP099 Grammar Practice — Progress report", "Student: " + name, "Date: " + new Date().toLocaleString(), ""];
    var totalCorrect = 0, totalItems = 0;
    ids.forEach(function (id) {
      var r = all[id];
      totalCorrect += r.correct; totalItems += r.total;
      lines.push("Unit " + (r.unit != null ? r.unit : "?") + (r.topicTitle ? " · " + r.topicTitle : "") + " — " + (r.activityTitle || id) + ": " + r.correct + "/" + r.total);
    });
    lines.push("", "Total: " + totalCorrect + " / " + totalItems);
    return { text: lines.join("\n"), count: ids.length };
  }

  btn.hidden = false;
  // Status text updates go into this label span only, so the icon svg beside it is never wiped out.
  var labelEl = btn.querySelector(".btn-label") || btn;
  var idleLabel = labelEl.textContent;
  btn.addEventListener("click", function () {
    var report = buildReport();
    if (!report.count) { alert("No completed activities to save yet."); return; }
    btn.disabled = true; labelEl.textContent = "Signing in…";
    msalInstance.loginPopup({ scopes: SCOPES }).then(function (result) {
      labelEl.textContent = "Saving…";
      var nameEl = document.getElementById("pName");
      var fileBase = ((nameEl && nameEl.value.trim()) || "student").replace(/\s+/g, "-").toLowerCase();
      return fetch("https://graph.microsoft.com/v1.0/me/drive/special/approot:/iep099-progress-" + encodeURIComponent(fileBase) + ".txt:/content", {
        method: "PUT",
        headers: { Authorization: "Bearer " + result.accessToken, "Content-Type": "text/plain" },
        body: report.text
      });
    }).then(function (res) {
      if (!res.ok) throw new Error("OneDrive save failed (HTTP " + res.status + ")");
      labelEl.textContent = "Saved to OneDrive ✓";
      setTimeout(function () { labelEl.textContent = idleLabel; btn.disabled = false; }, 2500);
    }).catch(function (err) {
      console.error(err);
      alert("Couldn't save to OneDrive: " + (err && err.message ? err.message : "unknown error") + "\n\nYou can still use Download or Email above.");
      labelEl.textContent = idleLabel; btn.disabled = false;
    });
  });
})();
