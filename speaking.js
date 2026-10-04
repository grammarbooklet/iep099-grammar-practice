/* © Dr. Chadi Chahdi. IEP099 Grammar Booklet, Second Edition, and the Writing Center. Designed and written by Dr. Chadi Chahdi. */
// IEP099 grammar practice — impromptu speaking trainer. A random topic tied to a unit theme, one minute to
// plan, a timed speech, then follow-up questions a partner (or the student) can answer. Nothing is recorded or
// sent anywhere; finishing a speech just counts as a day of practice for the streak.
(function () {
  "use strict";
  var E = window.IEPEngage;
  var PLAN_SECONDS = 60;

  // Each theme matches a grammar focus in the course, with a grammar hint shown under the topic.
  var THEMES = [
    { id: "choices", label: "Choices & possibilities (conditionals)", tip: "Try: If I ..., I would ... / If I had ..., I would have ...", prompts: [
      "If you could live in any city for a year, where would you go and why?",
      "If you won a large prize tomorrow, what would you do with it?",
      "What would you do differently if you could change one decision from the past?",
      "If you could have dinner with anyone, who would it be and what would you ask?"],
      follow: ["What might go wrong with your plan?", "What would your family say?", "Would your answer have been different five years ago?"] },
    { id: "talk", label: "Words & conversations (reported speech)", tip: "Try: She said that ... / He asked me whether ...", prompts: [
      "Tell about a piece of advice someone gave you. What exactly did they say?",
      "Describe a conversation that surprised you recently.",
      "Talk about a time you gave someone important news. How did they react?",
      "Tell about a message or call you received that changed your day."],
      follow: ["What did you answer?", "Did you follow the advice?", "How did you feel afterwards?"] },
    { id: "connect", label: "Connecting ideas (relative clauses)", tip: "Try: ... who ... / ... which ... / ... where ...", prompts: [
      "Describe a person who has influenced you.",
      "Talk about a place where you feel relaxed.",
      "Describe an object that you could not live without.",
      "Talk about a teacher, friend, or relative who taught you something important."],
      follow: ["What do you like most about them?", "How long have you known them?", "Would you recommend this to a friend?"] },
    { id: "actions", label: "Actions & processes (passive voice)", tip: "Try: It is made ... / It was built ... / It has been changed ...", prompts: [
      "Explain how a traditional dish from your country is prepared.",
      "Describe how something you use every day is made.",
      "Talk about a famous building or monument: when was it built and what is it used for?",
      "Explain how an important event is organised in your culture."],
      follow: ["Has it changed over the years?", "Who is it made or done by?", "What would you improve?"] },
    { id: "questions", label: "Questions & enquiries", tip: "Try: Could you tell me ...? / I wonder if ... / Do you know where ...?", prompts: [
      "You are new in town. Ask a stranger for help finding three places.",
      "You are calling a hotel. Ask about rooms, prices, and facilities.",
      "Interview a classmate about their weekend. Ask indirect questions.",
      "You are meeting a famous person. What would you ask them?"],
      follow: ["How would you ask politely if you were in a hurry?", "What is the most useful thing you learned?", "What else would you ask?"] },
    { id: "time", label: "Time & sequence", tip: "Try: before, after, while, as soon as, by the time, until ...", prompts: [
      "Describe your typical weekday from morning to night.",
      "Talk about the story of how you came to study at this university.",
      "Describe what you were doing during an important moment in your life.",
      "Explain what you will have achieved by the end of this year."],
      follow: ["What happened right after that?", "What were you doing at the same time?", "What will you do next?"] },
    { id: "resp", label: "Responsibilities & decisions (modals)", tip: "Try: must, have to, should, ought to, had better, could", prompts: [
      "What are the responsibilities of a good student?",
      "Give advice to a friend who is always late.",
      "What rules should every workplace have?",
      "Talk about something you have to do every week even though you don't enjoy it."],
      follow: ["What happens if people don't follow the rule?", "Is it different for different people?", "What would you advise a new student?"] },
    { id: "reasons", label: "Reasons & purposes", tip: "Try: because, since, so that, in order to, as a result, therefore", prompts: [
      "Explain why you chose your major.",
      "Why do people learn English? Give three reasons.",
      "Talk about something you do so that your life is easier.",
      "Explain why a hobby you enjoy is good for you."],
      follow: ["What is the main reason, and why?", "Has your reason changed over time?", "What is the result of that choice?"] },
    { id: "compare", label: "Comparing & contrasting", tip: "Try: more ... than, as ... as, whereas, while, in contrast", prompts: [
      "Compare living in a city with living in a village.",
      "Compare studying online with studying in a classroom.",
      "Compare two places you have visited.",
      "Compare how your parents' generation lived with how you live now."],
      follow: ["Which do you prefer, and why?", "What is the biggest difference?", "What do they have in common?"] },
    { id: "events", label: "Events & discoveries (simple past)", tip: "Try: went, saw, found, decided, started, learned ...", prompts: [
      "Tell the story of the best day of your last holiday.",
      "Describe the first time you did something difficult.",
      "Talk about something you discovered that surprised you.",
      "Tell about a time something unexpected happened."],
      follow: ["What happened next?", "What did you learn from it?", "Would you do the same again?"] },
    { id: "past-present", label: "Past & present (perfect tenses)", tip: "Try: I have lived ... for ... / I have never ... / I had already ... when ...", prompts: [
      "Talk about things you have achieved so far in your life.",
      "Describe something you have wanted to do for a long time.",
      "How has your city changed since you were a child?",
      "Talk about a skill you have been learning recently."],
      follow: ["How long have you been doing it?", "What has been the hardest part?", "What do you plan to do next?"] },
    { id: "cause", label: "Causes & effects", tip: "Try: because of, due to, as a result, led to, so", prompts: [
      "What are the effects of using phones too much?",
      "Explain the causes of traffic problems in big cities.",
      "Talk about a habit that changed your life, and its results.",
      "What are the effects of a good night's sleep?"],
      follow: ["What is the most serious effect?", "How could the problem be solved?", "Do you think it will get better or worse?"] },
    { id: "evidence", label: "Evidence & certainty", tip: "Try: it seems, probably, definitely, may, might, must be", prompts: [
      "Predict what life will be like in 2050.",
      "Do you think people are happier today than in the past? Give evidence.",
      "Will robots take over most jobs? How certain are you?",
      "Talk about something people believe that you are not sure is true."],
      follow: ["How sure are you, from 1 to 10?", "What evidence supports your view?", "What would change your mind?"] }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var themeSel = $("spTheme"), lenSel = $("spLen"), card = $("spCard");
  var clock = $("spClock"), phaseEl = $("spPhase"), timeEl = $("spTime");
  var startBtn = $("spStart"), skipBtn = $("spSkip"), doneBtn = $("spDone"), newBtn = $("spNew");
  var follow = $("spFollow"), followList = $("spFollowList");
  var timer = null, current = null, last = null, spokeFrom = 0, spokeLen = 0;
  // Badges: a speech counts once it lasted at least 20 seconds. Kept in this browser only.
  function recordSpeech(secs, byTimer) {
    if (secs < 20 || !current) return;
    try {
      var o = JSON.parse(localStorage.getItem("iep099-speak") || "{}");
      o.n = (o.n || 0) + 1; o.themes = o.themes || {}; o.themes[current.theme.id] = 1;
      if (secs >= 90) o.l90 = (o.l90 || 0) + 1;
      if (byTimer && spokeLen >= 120) o.f120 = (o.f120 || 0) + 1;
      localStorage.setItem("iep099-speak", JSON.stringify(o));
    } catch (e) {}
  }

  var all = document.createElement("option"); all.value = ""; all.textContent = "Any theme"; themeSel.appendChild(all);
  THEMES.forEach(function (t) { var o = document.createElement("option"); o.value = t.id; o.textContent = t.label; themeSel.appendChild(o); });
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function newTopic() {
    stop();
    var pool = themeSel.value ? THEMES.filter(function (t) { return t.id === themeSel.value; }) : THEMES;
    var t = pick(pool), p = pick(t.prompts), tries = 0;
    while (p === last && t.prompts.length > 1 && tries++ < 10) p = pick(t.prompts);
    last = p; current = { theme: t, prompt: p };
    $("spThemeLabel").textContent = t.label;
    $("spPrompt").textContent = p;
    $("spTip").textContent = t.tip;
    follow.hidden = true; clock.hidden = true;
    startBtn.hidden = false; startBtn.textContent = "Start planning (1 min)";
    skipBtn.hidden = true; doneBtn.hidden = true;
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  function beep() {
    try {
      var C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = 660; g.gain.value = 0.08;
      o.start(); setTimeout(function () { o.stop(); c.close(); }, 250);
    } catch (e) {}
  }
  function run(seconds, phase, onEnd) {
    stop();
    var end = Date.now() + seconds * 1000;
    phaseEl.textContent = phase; clock.hidden = false;
    clock.className = "spk-clock " + (phase === "Planning" ? "plan" : "speak");
    function tick() {
      var left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      timeEl.textContent = fmt(left);
      if (left <= 10) clock.classList.add("urgent");
      if (left === 0) { stop(); beep(); onEnd(); }
    }
    tick(); timer = setInterval(tick, 250);
  }

  function speak() {
    startBtn.hidden = true; skipBtn.hidden = true; doneBtn.hidden = false;
    spokeFrom = Date.now(); spokeLen = parseInt(lenSel.value, 10);
    run(spokeLen, "Speaking", function () { finish(true); });
  }
  function plan() {
    startBtn.hidden = true; skipBtn.hidden = false;
    run(PLAN_SECONDS, "Planning", speak);
  }
  function finish(byTimer) {
    if (spokeFrom) { recordSpeech((Date.now() - spokeFrom) / 1000, byTimer === true); spokeFrom = 0; }
    stop(); doneBtn.hidden = true; skipBtn.hidden = true;
    phaseEl.textContent = "Time!"; timeEl.textContent = "";
    clock.className = "spk-clock done";
    followList.innerHTML = "";
    current.theme.follow.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (q) {
      var li = document.createElement("li"); li.textContent = q; followList.appendChild(li);
    });
    follow.hidden = false;
    startBtn.hidden = false; startBtn.textContent = "Try the same topic again";
    if (E) { E.recordDay(); E.renderStreak(); }
    if (window.IEPBadges) window.IEPBadges.announce();
  }

  startBtn.addEventListener("click", function () {
    if (startBtn.textContent.indexOf("again") !== -1) { follow.hidden = true; speak(); return; }
    plan();
  });
  skipBtn.addEventListener("click", speak);
  doneBtn.addEventListener("click", finish);
  newBtn.addEventListener("click", newTopic);
  themeSel.addEventListener("change", newTopic);
  newTopic();
})();
