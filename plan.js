// IEP099 grammar practice — the catalog's "your plan" panel: what this week of the syllabus covers, how
// close the next quiz or exam is and how much of it the student has practiced, their weakest topic, and
// shortcuts to the Daily 5 and to their saved mistakes.
//
// The calendar below is the Fall 2026 syllabus's weekly schedule for both courses. It's the one thing in
// here that goes stale — if the program changes the schedule or a new semester starts, update WEEKS and
// PLAN and nothing else.
(function () {
  "use strict";
  var E = window.IEPEngage, D = window.IEP_DATA;
  var panel = document.getElementById("plan");
  if (!E || !D || !panel) return;

  var COURSE_KEY = "iep099-course";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // [first day, last day] of each teaching week, Sunday to Thursday (week 14 is a short last-day week, and
  // week 15 is the whole final-exam period).
  var WEEKS = [
    ["2026-09-20", "2026-09-24"], ["2026-09-27", "2026-10-01"], ["2026-10-04", "2026-10-08"], ["2026-10-11", "2026-10-15"],
    ["2026-10-18", "2026-10-22"], ["2026-10-25", "2026-10-29"], ["2026-11-01", "2026-11-05"], ["2026-11-08", "2026-11-12"],
    ["2026-11-15", "2026-11-19"], ["2026-11-22", "2026-11-26"], ["2026-11-29", "2026-12-03"], ["2026-12-06", "2026-12-10"],
    ["2026-12-13", "2026-12-17"], ["2026-12-20", "2026-12-22"], ["2026-12-23", "2027-01-05"]
  ];
  // Per course: which unit each week teaches ("midterm"/"final" marks a review or exam week for that
  // assessment), and the dated quizzes and exams. Quizzes and assignments are set a few days ahead by the instructor, so only the week is given, never a date. "key" matches the ready-made practice sets.
  var PLAN = {
    ls: {
      name: "Listening & Speaking",
      weeks: { 1: [1], 2: [1], 3: [2], 4: [3], 5: [4], 6: [4], 7: "midterm", 8: [5], 9: [6], 10: [7], 11: [7], 12: [8], 13: [8], 14: "final", 15: "final" },
      events: [
        { key: "quiz1", label: "Listening Quiz 1", week: 4, units: [1] },
        { key: "midterm", label: "Midterm exam", week: 7, units: [1, 2, 3, 4] },
        { key: "quiz2", label: "Listening Quiz 2", week: 10, units: [5] },
        { key: "final", label: "Final exam", week: 15, units: [5, 6, 7, 8] }
      ]
    },
    rw: {
      name: "Reading & Writing",
      weeks: { 1: [1], 2: [1], 3: [2], 4: [3], 5: [4], 6: [4], 7: "midterm", 8: [5], 9: [6], 10: [7], 11: [7], 12: [8], 13: [8], 14: "final", 15: "final" },
      events: [
        { key: "quiz1", label: "Reading Quiz 1", week: 3, units: [1] },
        { key: "midterm", label: "Midterm exam", week: 7, units: [1, 2, 3, 4] },
        { key: "quiz2", label: "Reading Quiz 2", week: 9, units: [5] },
        { key: "final", label: "Final exam", week: 15, units: [5, 6, 7, 8] }
      ]
    }
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function toDate(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function nice(s) { var d = toDate(s); return d.getDate() + " " + MONTHS[d.getMonth()]; }
  function range(a, b) {
    var da = toDate(a), db = toDate(b);
    if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear()) return da.getDate() + "–" + db.getDate() + " " + MONTHS[db.getMonth()];
    return nice(a) + " – " + nice(b);
  }
  function daysUntil(s) { return Math.round((toDate(s) - toDate(E.today())) / 86400000); }
  function unitOf(strand, num) { var k = strand + num, f = null; D.units.forEach(function (u) { if (u.key === k) f = u; }); return f; }
  function unitLine(strand, num) {
    var u = unitOf(strand, num); if (!u) return "Unit " + num;
    return "Unit " + num + " · " + u.title + " — " + u.topics.map(function (t) { return t.title; }).join(", ");
  }

  function weekFor(todayStr) {
    var t = toDate(todayStr), idx = -1;
    for (var i = 0; i < WEEKS.length; i++) if (toDate(WEEKS[i][0]) <= t) idx = i;
    if (idx === -1) return { before: true };
    if (t > toDate(WEEKS[WEEKS.length - 1][1])) return { after: true };
    return { n: idx + 1, start: WEEKS[idx][0], end: WEEKS[idx][1] };
  }

  // The ready-made quiz/midterm/final sets, as practice links the student opens themselves (untimed, and
  // flagged so an instructor's tracking sheet can tell self-practice from an assigned set).
  var sets = null;
  function setLinks(course, eventKey) {
    if (!sets) return "";
    var out = [];
    sets.forEach(function (s) {
      if (s.key.indexOf(course + "-" + eventKey + "-") !== 0) return;
      var n = s.key.slice(s.key.lastIndexOf("-") + 1);
      out.push('<a class="plan-link" href="set.html?ids=' + encodeURIComponent(s.ids.join(",")) + "&title=" + encodeURIComponent(s.title) + '&self=1">Practice set ' + esc(n) + " →</a>");
    });
    return out.join(" &nbsp; ");
  }

  function chips(course) {
    return '<span class="plan-chips" role="group" aria-label="Your course">' +
      ["ls", "rw"].map(function (c) { return '<button type="button" class="chip' + (course === c ? " on" : "") + '" data-course="' + c + '">' + (c === "ls" ? "L&amp;S" : "R&amp;W") + "</button>"; }).join("") + "</span>";
  }

  function render() {
    var course = E.read(COURSE_KEY, null);
    if (course !== "ls" && course !== "rw") course = null;
    var weekEl = document.getElementById("planWeek"), cdEl = document.getElementById("planCountdown"), nudgeEl = document.getElementById("planNudge");

    // ---- this week ----
    var left;
    if (!course) {
      left = '<div><div class="plan-label">This week</div><div class="plan-text">Which course are you in? Pick one to see what this week covers and when your next quiz is.</div></div>';
    } else {
      var P = PLAN[course], w = weekFor(E.today());
      if (w.before) {
        left = '<div><div class="plan-label">Coming up</div><div class="plan-text">Classes start on <b>' + nice(WEEKS[0][0]) + "</b>. Get a head start on Unit 1 below.</div></div>";
      } else if (w.after) {
        left = '<div><div class="plan-label">Semester</div><div class="plan-text">The semester is over — keep practicing whenever you like.</div></div>';
      } else {
        var spec = P.weeks[w.n], head = "Week " + w.n + " · " + range(w.start, w.end), body, link = "";
        if (typeof spec === "string") {
          var ev = P.events.filter(function (e) { return e.key === spec; })[0];
          var span = ev.units[0] + "–" + ev.units[ev.units.length - 1];
          body = spec === "midterm" ? "Midterm exam week — review Units " + span + "."
            : w.n === 15 ? "Final exam period — Units " + span + "."
            : "Last week of classes — review Units " + span + " for the final.";
          link = setLinks(course, ev.key);
        } else {
          body = unitLine(course, spec[0]);
          var u = unitOf(course, spec[0]);
          link = u ? '<a class="plan-link" href="' + u.href + '">Practice Unit ' + spec[0] + " →</a>" : "";
        }
        var bodyHtml = typeof spec === "string" ? esc(body) : esc(body).replace(/ — (.*)$/, ' <span class="plan-topics">— $1</span>');
        left = '<div><div class="plan-label">This week</div><div class="plan-text"><b>' + esc(head) + "</b><br>" + bodyHtml + (link ? '<div class="plan-go">' + link + "</div>" : "") + "</div></div>";
      }
    }
    weekEl.innerHTML = left + chips(course);
    Array.prototype.forEach.call(weekEl.querySelectorAll(".chip"), function (b) {
      b.addEventListener("click", function () { E.write(COURSE_KEY, b.getAttribute("data-course")); render(); });
    });

    // ---- next quiz / exam ----
    cdEl.hidden = true;
    if (course) {
      var next = null, cw = weekFor(E.today()), curWeek = cw.before ? 0 : cw.after ? 99 : cw.n;
      PLAN[course].events.forEach(function (e) { var d = e.week - curWeek; if (d >= 0 && (!next || d < next.d)) next = { e: e, d: d }; });
      if (next && next.d <= 5) {
        var res = E.results(), done = 0, acts = 0, correct = 0, total = 0;
        next.e.units.forEach(function (n) {
          var st = E.unitStats(course + n, res); if (!st) return;
          done += st.done; acts += st.acts; correct += st.correct; total += st.total;
        });
        var span2 = next.e.units.length === 1 ? "Unit " + next.e.units[0] : "Units " + next.e.units[0] + "–" + next.e.units[next.e.units.length - 1];
        var when = next.d === 0 ? "<b>this week</b> (Week " + next.e.week + ")" : next.d === 1 ? "<b>next week</b> (Week " + next.e.week + ")" : "in <b>Week " + next.e.week + "</b>, " + next.d + " weeks away";
        var pct = total ? Math.round(correct / total * 100) : 0;
        cdEl.innerHTML = '<div><div class="plan-label">Coming up</div><div class="plan-text">' + esc(next.e.label) + " is " + when + ". " +
          esc(span2) + " so far: <b>" + pct + "%</b> (" + done + " of " + acts + " activities done).</div></div><div>" + setLinks(course, next.e.key) + "</div>";
        cdEl.hidden = false;
      }
    }

    // ---- weakest topic ----
    var weak = E.weakestTopic();
    nudgeEl.hidden = !weak;
    if (weak) {
      nudgeEl.innerHTML = '<div><div class="plan-label">Needs work</div><div class="plan-text">Your weakest topic is <b>' + esc(weak.title) + "</b> (" + Math.round(weak.pct * 100) + '%).</div></div><a class="plan-link" href="' + weak.href + '">Practice it now →</a>';
    }

    // ---- streak encouragement + (phone only) a toggle for the longer rows ----
    var sEl = document.getElementById("planStreak");
    if (!sEl) { sEl = document.createElement("p"); sEl.id = "planStreak"; sEl.className = "plan-streak"; panel.querySelector(".plan-actions").insertAdjacentElement("beforebegin", sEl); }
    var sn = E.streak();
    sEl.hidden = sn < 1;
    sEl.textContent = sn < 1 ? "" : E.practicedToday() ? "Nice — " + sn + (sn === 1 ? " day" : " days") + " in a row. Come back tomorrow to keep it going." : "Practice today to keep your " + sn + "-day streak alive.";
    var more = document.getElementById("planMore");
    if (!more) {
      more = document.createElement("button"); more.id = "planMore"; more.type = "button"; more.className = "plan-more";
      more.addEventListener("click", function () { var open = panel.classList.toggle("open"); more.textContent = open ? "Show less ▴" : "Show more ▾"; });
      panel.insertBefore(more, panel.querySelector(".plan-actions"));
      more.textContent = "Show more ▾";
    }

    // ---- buttons ----
    document.getElementById("dailyLabel").textContent = E.dailyDoneToday() ? "Daily 5 — done today, go again" : "Daily 5";
    var mc = E.mistakeCount();
    document.getElementById("mistakesLabel").textContent = mc > 0 ? "Fix my mistakes (" + mc + ")" : "Fix my mistakes";
    panel.hidden = false;
  }

  render();
  fetch("readymade.json").then(function (r) { return r.json(); }).then(function (s) { sets = s; render(); }).catch(function () {});
})();
