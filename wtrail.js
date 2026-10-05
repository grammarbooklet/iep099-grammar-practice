/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// Writing Center: the trail map. Just the path: level and XP, the next suggested lesson, and every stage with its
// lessons. Skills, portfolio, badges and the progress backup live on the "My Writing Center" page (the badge icon
// in the top bar), so this page stays calm. Everything here is open: nothing is locked.
(function () {
  "use strict";
  var WC = window.WC;
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function $(id) { return document.getElementById(id); }

  // A circle that fills as lessons are finished, and becomes a tick only when the whole stage is done.
  function ring(done, total, skipped) {
    skipped = skipped || 0;
    var pct = total ? done / total : 0, sp = total ? (done + skipped) / total : 0;
    if (done > 0 && !(total > 0 && done >= total)) pct = Math.max(pct, 0.1);
    var c = 2 * Math.PI * 15, full = total > 0 && done >= total;
    return '<span class="wc-ring' + (full ? " full" : "") + '" role="img" aria-label="' + done + " of " + total + " lessons done" + (skipped ? ", " + skipped + " skipped" : "") + '">' +
      '<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15"/>' +
      (skipped ? '<circle class="sk" cx="18" cy="18" r="15" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - sp)).toFixed(1) + '" transform="rotate(-90 18 18)"/>' : "") +
      '<circle class="fg" cx="18" cy="18" r="15" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - pct)).toFixed(1) + '" transform="rotate(-90 18 18)"/>' +
      (full ? '<path class="tick" d="M11.5 18.5l4.5 4.5 8.5-9.5"/>' : "") + "</svg>" + (full ? "" : "<b>" + done + "</b>") + "</span>";
  }

  WC.index().then(function (idx) {
    var r = WC.read(), lv = WC.level(r.xp, r), nx = WC.nextLesson(idx, r);

    $("wcMe").innerHTML = '<div class="wc-lv"><b>Level ' + lv.n + "</b> · " + esc(lv.name) + '</div>' +
      '<div class="wc-bar"><i style="width:' + lv.pct + '%"></i></div>' +
      "<small>" + r.xp + " XP" + (lv.need ? " · " + esc(lv.need) : lv.next ? " · " + (lv.next.min - r.xp) + " XP to " + esc(lv.next.name) : " · top level") + "</small>";

    var started = Object.keys(r.lessons).length > 0;
    if (nx) {
      $("wcNext").innerHTML = '<div class="wc-next"><div><span class="wc-eyebrow">' + (started ? "Next up" : "Start here") + '</span>' +
        "<b>Lesson " + esc(nx.lesson.id) + " · " + esc(nx.lesson.title) + "</b><small>Stage " + nx.stage.n + ": " + esc(nx.stage.title) + " · about " + (nx.lesson.min || 5) + ' minutes</small></div>' +
        '<a class="wc-btn" href="wlesson.html?id=' + encodeURIComponent(nx.lesson.id) + '">' + (started ? "Continue" : "Start") + "</a></div>";
    }

    $("wcPath").innerHTML = idx.stages.map(function (s) {
      var p = WC.stageProgress(s, r), gate = WC.stageState(idx, s, r), locked = !gate.open;
      var lessons = s.lessons.map(function (l) {
        var rec = r.lessons[l.id], isDone = rec && rec.done, skipped = isDone && rec.skipped, finished = isDone && !skipped, prog = !isDone && r.progress[l.id];
        var stars = finished ? "★".repeat(rec.stars || 1) + '<span class="off">' + "★".repeat(3 - (rec.stars || 1)) + "</span>" : "";
        var cls = "wc-node" + (locked ? " locked" : "") + (finished ? " done" : "") + (skipped ? " skipped" : "") + (prog ? " started" : "") + (l.ready ? "" : " soon") + (l.review ? " review" : "");
        // A tick only for a lesson that is really finished. Unfinished lessons show how far you have got.
        var dotInner = finished ? "✓" : skipped ? "–" : prog ? '<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15"/><circle class="fg" cx="18" cy="18" r="15" stroke-dasharray="94.2" stroke-dashoffset="' + (94.2 * (1 - prog.n / prog.of)).toFixed(1) + '" transform="rotate(-90 18 18)"/></svg><b>' + prog.n + "</b>" : l.review ? "★" : esc(l.id.split(".")[1]);
        var side = !l.ready ? "coming soon" : finished ? stars : skipped ? "skipped (stage check)" : prog ? "In progress · " + esc(prog.label) : "";
        var inner = '<span class="wc-dot">' + dotInner + "</span>" +
          '<span class="wc-node-t"><b>' + esc(l.title) + "</b>" + (l.review ? " <em>stage check</em>" : "") + "</span>" +
          '<span class="wc-node-s">' + side + "</span>";
        // Every lesson is a link: nothing is locked. A lesson still being written opens a short "coming soon" page.
        if (locked) return '<div class="' + cls + '" aria-disabled="true">' + inner.replace(/<span class="wc-dot">.*?<\/span>/, '<span class="wc-dot" aria-hidden="true">🔒</span>') + "</div>";
        return '<a class="' + cls + '" href="wlesson.html?id=' + encodeURIComponent(l.id) + '">' + inner + "</a>";
      }).join("");
      var lockNote = locked ? '<p class="wc-lockline"><span aria-hidden="true">🔒</span> Opens ' + (gate.label ? esc(gate.label) + (gate.week ? " (Week " + gate.week + ")" : "") : "later") + (gate.prev ? ", or as soon as you finish Stage " + gate.prev.n : "") + ".</p>" : "";
      return '<section class="wc-stage' + (p.ready === 0 ? " soon" : "") + (locked ? " locked" : "") + '"><header class="wc-stagehead">' + ring(p.done, p.total, p.skipped) + '<div><span class="wc-stage-n">Stage ' + s.n + "</span><h2>" + esc(s.title) + "</h2><p>" + esc(s.blurb) + "</p>" +
        lockNote + '<small>' + (p.ready || p.total ? p.done + " of " + p.total + " lessons done" + (p.skipped ? " · " + p.skipped + " skipped by stage check" : "") + (p.ready < p.total ? " · " + (p.total - p.ready) + " still being written" : "") : "") + "</small></div></header><div class=\"wc-trail\">" + lessons + "</div></section>";
    }).join("");
  }).catch(function () { $("wcPath").innerHTML = '<p class="wc-card">Couldn’t load the Writing Center. Check your connection and reload.</p>'; });
})();
