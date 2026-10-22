// Italiano in giro — word lists by topic, verb tables, placement quiz and level-ups
(function () {
  const M = window.IIG, UI = window.UI, esc = M.esc, I = UI.ICON;
  const app = document.getElementById("app");
  const C = () => window.IIG_CONTENT();

  // the article in blue (il / lo / i / gli) or pink (la / le), like a teacher's coloured pen
  const ART = /^(il |lo |la |i |gli |le |l['’])/i;
  function itHTML(w) {
    const m = w.it.match(ART);
    if (!m || !w.g) return '<span class="it">' + esc(w.it) + "</span>";
    return '<span class="it"><span class="a-' + w.g + '">' + esc(m[0]) + "</span>" + esc(w.it.slice(m[0].length)) +
      (/^l['’]/i.test(m[0]) ? '<span class="gtag a-' + w.g + '">' + w.g + ".</span>" : "") + "</span>";
  }
  UI.itHTML = itHTML;

  // the dot fills up a third each time you get the word right first time on a new day, and turns green when full
  UI.dotHTML = function (w) {
    const st = M.state(w), b = M.prog(w).b;
    return '<span class="dot ' + st + (st === "learn" ? " s" + b : "") + '" title="' + esc(M.stepNote(w)) + '" aria-label="' + esc(M.stepNote(w)) + '"></span>';
  };
  UI.howHTML = function () {
    return '<details class="how"><summary>When does a word turn green?</summary><p class="note">When you get it right first time on ' +
      M.KNOWN_BOX + " different days. After a right answer a word waits 1 day, then 2, then 4 before it comes back, so that " +
      "takes about 4 days. Each time, its dot fills up a bit more. A mistake sends it back to the start, and it comes back tomorrow. " +
      "Your level counts the green words and verb forms.</p></details>";
  };

  // ---------- one topic ----------
  UI.screens.topic = function (arg) {
    const L = C().levels[arg.level], t = L && L.topics[arg.i];
    if (!t) return UI.go("home");
    const verbs = t.name === "Verbs";
    // conjugating this level's verbs, in the tenses taught up to this level
    const drills = verbs ? M.LEVELS.slice(0, M.LEVELS.indexOf(arg.level) + 1).flatMap(l => C().levels[l].drills).filter(d => d.verb.level === arg.level) : [];
    const list = t.words.map((w, k) => {
      const row = UI.dotHTML(w) +
        '<span class="w">' + itHTML(w) + '<br><span class="trs">' + esc(M.tr(w)) + "</span></span>";
      return verbs ? '<li><button class="word-btn" data-act="verb" data-k="' + k + '">' + row + I.chev + "</button></li>" : "<li>" + row + "</li>";
    }).join("");
    UI.render(
      UI.backBar('<span class="tag">' + esc(arg.level) + "</span>") +
      '<div class="unit-head"><h1>' + esc(t.name) + '</h1><p class="note">' + UI.plural(t.words.length, verbs ? "verb" : "word", verbs ? "verbs" : "words") +
      (verbs ? " · tap one to see how it conjugates" : "") + "</p></div>" +
      '<div class="legend"><span><i class="dot"></i>New</span><span><i class="dot learn s1"></i><i class="dot learn s2"></i>Learning</span><span><i class="dot know"></i>You know it</span>' +
      (verbs ? "" : '<span><b class="a-m">il</b>&nbsp;masculine</span><span><b class="a-f">la</b>&nbsp;feminine</span>') + "</div>" +
      '<div class="btn-row"><button class="btn' + (verbs ? "" : " primary") + '" data-act="practise">' + (verbs ? "Practise meanings" : "Practise these words") + "</button>" +
      (verbs && drills.length ? '<button class="btn primary" data-act="conj">Practise conjugating</button>' : "") + "</div>" +
      UI.howHTML() +
      '<ul class="words">' + list + "</ul>",
      {
        home: () => UI.go("home"),
        practise: () => UI.session(M.practiceWords(t.words), { kind: "review", pool: t.words.length >= 4 ? t.words : L.words, back: "topic", backArg: arg }),
        conj: () => UI.drill(M.practiceDrills(drills), { back: "topic", backArg: arg }),
        verb: b => UI.go("verb", { verb: t.words[+b.dataset.k].verb, back: arg })
      });
  };

  // ---------- a verb's tables (the tenses up to your level, then the rest greyed out) ----------
  UI.screens.verb = function (arg) {
    const v = arg.verb, lv = M.LEVELS.indexOf(M.S.level);
    const pers = ["io", "tu", "lui / lei", "noi", "voi", "loro"];
    const first = f => f.split("/")[0];
    const table = t => {
      const rows = v.t[t.key].map((f, i) => f ? "<tr><th>" + pers[i] + "</th><td>" + esc(first(f)) + "</td></tr>" : "").join("");
      return '<section class="conj"><h3>' + esc(t.label) + ' <span class="tag">' + t.level + "</span></h3><table>" + rows + "</table></section>";
    };
    const now = C().tenses.filter(t => M.LEVELS.indexOf(t.level) <= lv), later = C().tenses.filter(t => M.LEVELS.indexOf(t.level) > lv);
    const tables = '<div class="conj-grid">' + now.map(table).join("") + "</div>" +
      (later.length ? '<details class="later"><summary>' + UI.plural(later.length, "tense", "tenses") + " for later levels</summary>" +
        '<div class="conj-grid">' + later.map(table).join("") + "</div></details>" : "");
    UI.render(
      '<header class="top"><button class="icon-btn" data-act="back" aria-label="Back">' + I.back + '</button><span class="tag">' + esc(v.level) + "</span></header>" +
      '<div class="unit-head"><h1 class="it">' + esc(v.it) + '</h1><p class="note">' + esc(M.tr(v)) + " · past with <b>" + esc(v.aux) + "</b> · " +
      "participle <b>" + esc(first(v.pp)) + "</b> · gerund <b>" + esc(first(v.ger)) + "</b></p></div>" +
      (v.aux === "essere" ? '<p class="note">With <b>essere</b> the participle agrees: sono andat<b>o</b> / andat<b>a</b>, siamo andat<b>i</b> / andat<b>e</b>.</p>' : "") +
      tables,
      { back: () => UI.go("topic", arg.back) });
  };

  // ---------- placement quiz ----------
  // Per level, 10 questions you answer by typing the Italian: 7 words and 3 verb forms. 8 right passes the level;
  // the first level you don't pass is where you start. Typing (not picking) so nothing can be guessed, and words
  // that look almost the same in English or Spanish are left out, since they test those languages, not Italian.
  const PER_LEVEL = 10, VERB_QS = 3, PASS = 8;
  UI.screens.placement = function () {
    const lv = M.S.level;
    UI.render(
      UI.backBar() +
      '<section class="auth quad"><p class="date">Vediamo!</p><h1>Placement quiz</h1>' +
      "<p>We’ll give you words and verb forms from each level, starting with A1, and you <b>type them in Italian</b>. " +
      "Articles are optional and small accent slips are fine. If you don’t know, tap <b>I don’t know</b>: guessing only puts you somewhere too hard.</p>" +
      '<p class="note">' + PASS + " of " + PER_LEVEL + " right passes a level and you go on to the next; the quiz stops at the first level you don’t pass, and that’s where you start. " +
      "What you get right is marked as known, so practice skips it.</p>" +
      (lv !== "A1" ? '<p class="note"><b>You’re at ' + esc(lv) + " now.</b> Your result replaces it, even if it’s lower, and anything an earlier quiz marked as known (but you never practised) starts fresh.</p>" : "") +
      '<button class="btn primary block" data-act="go">Start</button></section>',
      { home: () => UI.go("home"), go: () => quiz() });
  };

  function quiz() {
    const all = C().levels, lang = M.S.set.lang;
    const bare = s => s.replace(/^(il |lo |la |i |gli |le |l['’])/i, "");
    // looks almost the same in the language of the prompt (or the other one): "la famiglia" / "la familia"
    const cognate = w => [w.en, w.es].some(t => (t || "").split(/[\/,]/).some(m => M.alike(bare(w.it), m.replace(/^(to|the|el|la|los|las|un|una) /i, "").trim()) >= 0.6));
    // any Italian word of the same meaning counts too ("nice" → bello or simpatico)
    const byMeaning = {};
    M.LEVELS.forEach(l => all[l].words.forEach(w => { const k = M.norm(M.tr(w, lang)); (byMeaning[k] = byMeaning[k] || []).push(w.it); }));
    const Q = { li: 0, i: 0, right: 0, items: [], rightItems: [], passed: -1 };
    function pickLevel() {
      const L = all[M.LEVELS[Q.li]];
      const words = M.shuffle(L.words.filter(w => w.en && w.es && M.tr(w, lang) && bare(w.it).split(" ").length <= 2 && !cognate(w)));
      const drills = M.shuffle(L.drills || []).slice(0, VERB_QS).map(d => {
        const persons = d.verb.t[d.tense].map((f, i) => f ? i : -1).filter(i => i >= 0);
        return { drill: d, p: persons[Math.floor(Math.random() * persons.length)] };
      });
      Q.items = M.shuffle(words.slice(0, PER_LEVEL - drills.length).map(w => ({ w })).concat(drills));
      Q.i = 0; Q.right = 0;
    }
    const PERS = ["io", "tu", "lui / lei", "noi", "voi", "loro"];
    const tense = key => (C().tenses.find(t => t.key === key) || {}).label || key;
    function show() {
      if (Q.i >= Q.items.length) return endLevel();
      const it = Q.items[Q.i], done = Q.li * PER_LEVEL + Q.i, total = M.LEVELS.length * PER_LEVEL;
      const card = it.w
        ? '<p class="kicker">Write it in Italian</p><div class="card quad"><div class="prompt">' + esc(M.tr(it.w, lang)) + "</div>"
        : '<p class="kicker">Write the form</p><div class="card quad"><div class="drill-head"><span class="it">' + esc(it.drill.verb.it) + '</span><span class="tag">' + esc(tense(it.drill.tense)) + "</span></div>" +
          '<p class="note">' + esc(M.tr(it.drill.verb, lang)) + '</p><div class="prompt"><span class="pers">' + PERS[it.p] + "</span> …</div>";
      UI.render(
        '<div class="bar"><button class="icon-btn" data-act="quit" aria-label="Stop the quiz">' + I.close + '</button>' +
        '<span class="progress"><i style="width:' + (done / total * 100) + '%"></i></span><span class="count">' + M.LEVELS[Q.li] + " · " + (Q.i + 1) + "/" + Q.items.length + "</span></div>" +
        '<div class="ex">' + card + UI.typeBox("") + "</div>" +
        '<div class="btn-row"><button class="btn" data-act="idk">I don’t know</button><button class="btn primary" data-act="check">Controlla</button></div>' +
        '<p class="pl-fb" aria-live="polite"></p></div>',
        {
          quit: () => finish(),
          key: UI.keyAct,
          idk: () => answer(""),
          check: () => { const v = app.querySelector("#ans").value; if (!v.trim()) return app.querySelector("#ans").focus(); answer(v); },
          enter: () => UI.acts.check()
        });
      app.querySelector("#ans").focus();
      app.querySelector(".accents").addEventListener("pointerdown", e => e.preventDefault());
    }
    function answer(v) {
      const it = Q.items[Q.i];
      let ok, sol;
      if (it.w) {
        const alts = byMeaning[M.norm(M.tr(it.w, lang))] || [it.w.it];
        ok = !!v && alts.concat(it.w.it).some(a => M.check(v, a) !== "bad");
        sol = UI.itHTML(it.w);
      } else {
        const form = it.drill.verb.t[it.drill.tense][it.p];
        ok = !!v && M.checkForm(v, form, it.drill.verb.aux) !== "bad";
        sol = '<span class="it">' + PERS[it.p] + " " + esc(form.split("/")[0]) + "</span>";
      }
      if (ok) { Q.right++; Q.rightItems.push(it.w || it.drill); }
      app.querySelector("#ans").disabled = true;
      app.querySelectorAll(".accents button, [data-act=idk], [data-act=check]").forEach(b => b.disabled = true);
      const fb = app.querySelector(".pl-fb");
      fb.className = "pl-fb " + (ok ? "is-ok" : "is-bad");
      fb.innerHTML = (ok ? "Esatto: " : "It’s ") + sol;
      UI.acts.enter = null;
      // stop the level early once passing is out of reach, or already certain
      const wrong = Q.i + 1 - Q.right;
      setTimeout(() => {
        if (Q.items.length - wrong < PASS || Q.right >= PASS) Q.i = Q.items.length; else Q.i++;
        show();
      }, ok ? 700 : 1600);
    }
    function endLevel() {
      if (Q.right >= Math.min(PASS, Q.items.length)) {
        Q.passed = Q.li;
        if (Q.li < M.LEVELS.length - 1) { Q.li++; pickLevel(); return show(); }
      }
      finish();
    }
    function finish() {
      const level = M.LEVELS[Math.min(Q.passed + 1, M.LEVELS.length - 1)];
      const before = M.S.level;
      M.place(level, Q.rightItems);
      const diff = M.LEVELS.indexOf(M.S.level) - M.LEVELS.indexOf(before);
      UI.render(
        UI.topBar() + '<section class="done"><p class="bravo">' + (Q.passed >= 0 ? "Complimenti!" : "Si comincia!") + "</p>" +
        '<p class="score">' + (diff ? "You start at " : "You stay at ") + esc(M.S.level) + "</p>" +
        '<p class="note">' + (Q.passed >= 0 ? "You passed up to " + M.LEVELS[Q.passed] + ". " : "A1 is the right place to start. ") +
        (diff < 0 ? "That’s lower than before, so practice will feel more manageable. " : "") +
        UI.plural(Q.rightItems.length, "answer is", "answers are") + " now marked as known.</p>" +
        '<button class="btn primary block" data-act="home">Back to home</button></section>',
        { home: () => { UI.browse = null; UI.go("home"); } });
    }
    pickLevel();
    show();
  }

  // ---------- level up ----------
  // during practice the level-up waits until the session's result screen has been seen
  M.whenLevelUp(level => {
    if (UI.current === "session" || UI.current === "drill") UI.pendingLevel = level;
    else UI.go("levelup", { level });
  });
  UI.screens.levelup = function (arg) {
    UI.render(
      UI.topBar() + '<section class="done"><p class="bravo">Evviva!</p><p class="score">You’ve reached ' + esc(arg.level) + "</p>" +
      '<div class="tricolore" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<p class="note">New words, and new tenses for the verbs you already know, are waiting for you. Your group can see it too.</p>' +
      '<button class="btn primary block" data-act="home">Andiamo!</button></section>',
      { home: () => { UI.browse = null; UI.go("home"); } });
  };
})();
