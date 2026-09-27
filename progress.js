// IEP099 grammar practice — "My Progress" page. Reads results that practice.js already saved to this
// browser's own localStorage (nothing is ever sent anywhere on its own) and lets a student download a
// report or email a summary to their instructor via a mailto: link, since a static site can't send mail.
(function () {
  "use strict";
  var NAME_KEY = "iep099-student-name", EMAIL_KEY = "iep099-instructor-email", RESULTS_KEY = "iep099-results";
  function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function results() { try { return JSON.parse(localStorage.getItem(RESULTS_KEY) || "{}"); } catch (e) { return {}; } }

  var nameEl = document.getElementById("pName"), emailEl = document.getElementById("pEmail");
  nameEl.value = get(NAME_KEY); emailEl.value = get(EMAIL_KEY);
  nameEl.addEventListener("input", function () { set(NAME_KEY, nameEl.value.trim()); });
  emailEl.addEventListener("input", function () { set(EMAIL_KEY, emailEl.value.trim()); });

  var all = results();
  var ids = Object.keys(all).sort(function (a, b) { return new Date(all[b].date) - new Date(all[a].date); });
  var list = document.getElementById("progressList");
  var totalCorrect = 0, totalItems = 0;
  ids.forEach(function (id) { totalCorrect += all[id].correct; totalItems += all[id].total; });

  if (!ids.length) {
    list.innerHTML = '<p class="note">You haven’t checked any activities on this device yet. Once you check one, it will show up here.</p>';
  } else {
    var rows = ids.map(function (id) {
      var r = all[id];
      var pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
      return '<div class="progress-row"><span class="pr-title"><b>' + esc(r.activityTitle || id) + '</b><span>Unit ' + esc(r.unit != null ? r.unit : "?") + (r.topicTitle ? " · " + esc(r.topicTitle) : "") + '</span></span><span class="pr-score' + (pct === 100 ? " full" : "") + '">' + r.correct + " / " + r.total + "</span></div>";
    });
    list.innerHTML = '<div class="progress-row progress-total"><span class="pr-title"><b>Total</b><span>' + ids.length + " activit" + (ids.length === 1 ? "y" : "ies") + ' checked</span></span><span class="pr-score">' + totalCorrect + " / " + totalItems + "</span></div>" + rows.join("");
  }

  function buildReport() {
    var name = nameEl.value.trim() || "(name not entered)";
    var lines = ["IEP099 Grammar Practice — Progress report", "Student: " + name, "Date: " + new Date().toLocaleString(), ""];
    ids.forEach(function (id) {
      var r = all[id];
      lines.push("Unit " + (r.unit != null ? r.unit : "?") + (r.topicTitle ? " · " + r.topicTitle : "") + " — " + (r.activityTitle || id) + ": " + r.correct + "/" + r.total);
    });
    lines.push("", "Total: " + totalCorrect + " / " + totalItems);
    return lines.join("\n");
  }

  document.getElementById("pDownloadBtn").addEventListener("click", function () {
    if (!ids.length) { alert("No completed activities to download yet."); return; }
    var blob = new Blob([buildReport()], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "iep099-progress-" + (nameEl.value.trim() || "student").replace(/\s+/g, "-").toLowerCase() + ".txt";
    document.body.appendChild(a); a.click(); a.remove();
  });

  document.getElementById("pEmailBtn").addEventListener("click", function () {
    if (!ids.length) { alert("No completed activities to email yet."); return; }
    var email = emailEl.value.trim();
    if (!email) { alert("Enter your instructor's email address first."); emailEl.focus(); return; }
    var name = nameEl.value.trim();
    if (!name) { alert("Enter your name first, so your instructor knows whose progress this is."); nameEl.focus(); return; }
    var subject = "IEP099 Grammar Practice — Progress — " + name;
    var body = buildReport();
    if (body.length > 1500) {
      document.getElementById("pDownloadBtn").click();
      alert("Your progress report is long, so it's been downloaded as a file instead — attach it to the email that's about to open.");
      location.href = "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent("Hi, please see my attached IEP099 progress report (" + ids.length + " activities). Don't forget to attach the file you just downloaded.");
    } else {
      location.href = "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }
  });
})();
