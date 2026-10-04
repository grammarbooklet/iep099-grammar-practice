/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// Sending a piece of writing to the instructor. The student shares plain, readable text (Share, Copy, a .txt file, or a
// PDF for longer writing) through whatever platform the course uses. Nothing is stored online and no address is built in.
(function () {
  "use strict";
  function words(t) { var m = String(t || "").trim().match(/\S+/g); return m ? m.length : 0; }

  // Share / Copy text / Download file / Download PDF (PDF only for longer writing, a paragraph and up).
  function actions(host, o) {
    host.innerHTML = ""; host.className = "fb-actions";
    function btn(t, fn) { var b = document.createElement("button"); b.type = "button"; b.className = "fb-btn"; b.textContent = t; b.addEventListener("click", fn); host.appendChild(b); return b; }
    var msg = document.createElement("p"); msg.className = "fb-msg"; msg.setAttribute("aria-live", "polite");
    function say(t) { msg.textContent = t; }
    if (navigator.share) btn("Share", function () { navigator.share({ title: o.title, text: o.text }).catch(function () {}); });
    btn("Copy text", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(o.text).then(function () { say("Copied. Paste it into your message or assignment."); }, function () { say("Couldn’t copy. Use Download file instead."); });
      else say("Couldn’t copy. Use Download file instead.");
    });
    btn("Download file", function () {
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([o.text], { type: "text/plain" })); a.download = o.file || "writing.txt";
      document.body.appendChild(a); a.click(); a.remove(); say("File saved.");
    });
    if (o.pdf && words(o.body) >= 60) btn("Download PDF", function () { try { o.pdf(); say("PDF saved."); } catch (e) { say("Couldn’t make the PDF. Check your connection and try again."); } });
    host.appendChild(msg);
  }

  function latin(s) { return String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ""); }
  function pdf(o) {
    if (typeof jspdf === "undefined") throw new Error("no pdf lib");
    var doc = new jspdf.jsPDF(), W = 180, y = 20;
    doc.setProperties({ title: latin(o.title || "Writing"), author: "IEP099", subject: "Student writing" });
    function line(t, size, bold) {
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
      doc.splitTextToSize(latin(t), W).forEach(function (l) { if (y > 280) { doc.addPage(); y = 20; } doc.text(l, 15, y); y += size * 0.5 + 1.6; });
    }
    line(o.title || "Writing", 16, true);
    if (o.sub) line(o.sub, 10, false);
    y += 4; if (o.prompt) { line("Task: " + o.prompt, 10, false); y += 2; }
    line(o.text, 12, false);
    doc.save((o.file || "writing").replace(/\.[a-z]+$/, "") + ".pdf");
  }

  window.IEPFeedback = { actions: actions, pdf: pdf, words: words };
})();
