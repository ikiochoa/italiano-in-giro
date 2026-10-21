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

  // ---------- one topic ----------
  UI.screens.topic = function (arg) {
    const L = C().levels[arg.level], t = L && L.topics[arg.i];
    if (!t) return UI.go("home");
    const verbs = t.name === "Verbs";
    const list = t.words.map((w, k) => {
      const st = M.state(w);
      const row = '<span class="dot ' + st + '" title="' + (st === "know" ? "You know it" : st === "learn" ? "Learning" : "New") + '"></span>' +
        '<span class="w">' + itHTML(w) + '<br><span class="trs">' + esc(M.tr(w)) + "</span></span>";
      return verbs ? '<li><button class="word-btn" data-act="verb" data-k="' + k + '">' + row + I.chev + "</button></li>" : "<li>" + row + "</li>";
    }).join("");
    UI.render(
      UI.backBar('<span class="tag">' + esc(arg.level) + "</span>") +
      '<div class="unit-head"><h1>' + esc(t.name) + '</h1><p class="note">' + UI.plural(t.words.length, verbs ? "verb" : "word", verbs ? "verbs" : "words") +
      (verbs ? " · tap one to see how it conjugates" : "") + "</p></div>" +
      '<div class="legend"><span><i class="dot"></i>New</span><span><i class="dot learn"></i>Learning</span><span><i class="dot know"></i>You know it</span>' +
      (verbs ? "" : '<span><b class="a-m">il</b>&nbsp;masculine</span><span><b class="a-f">la</b>&nbsp;feminine</span>') + "</div>" +
      '<ul class="words">' + list + "</ul>",
      {
        home: () => UI.go("home"),
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
  // 8 questions per level, starting at A1: 6 right moves you past that level. Stops at the first level you don't pass.
  const PER_LEVEL = 8, PASS = 6;
  UI.screens.placement = function () {
    UI.render(
      UI.backBar() +
      '<section class="auth quad"><p class="date">Vediamo!</p><h1>Placement quiz</h1>' +
      "<p>We’ll show you Italian words from each level, starting with A1. Pick the right translation; " +
      "if you don’t know, tap <b>I don’t know</b> rather than guessing.</p>" +
      '<p class="note">Get ' + PASS + " of " + PER_LEVEL + " right and you move on to the next level. The words you get right are marked as known, " +
      "so your practice skips them. The quiz can only move you up, never down.</p>" +
      '<button class="btn primary block" data-act="go">Start</button></section>',
      { home: () => UI.go("home"), go: () => quiz() });
  };

  function quiz() {
    const all = C().levels;
    const Q = { li: 0, i: 0, right: 0, words: [], rightWords: [], passed: -1 };
    function pickLevel() {
      Q.words = M.shuffle(all[M.LEVELS[Q.li]].words.filter(w => w.en && w.es && !/\s\/\s/.test(w.it))).slice(0, PER_LEVEL);
      Q.i = 0; Q.right = 0;
    }
    function options(w) {
      const pool = M.shuffle(all[w.level].words.filter(x => x.id !== w.id && M.tr(x) !== M.tr(w) && !!x.verb === !!w.verb));
      return M.shuffle([w].concat(pool.slice(0, 3)));
    }
    function show() {
      if (Q.i >= Q.words.length) return endLevel();
      const w = Q.words[Q.i], opts = options(w);
      const done = Q.li * PER_LEVEL + Q.i, total = M.LEVELS.length * PER_LEVEL;
      UI.render(
        '<div class="bar"><button class="icon-btn" data-act="quit" aria-label="Stop the quiz">' + I.close + '</button>' +
        '<span class="progress"><i style="width:' + (done / total * 100) + '%"></i></span><span class="count">' + M.LEVELS[Q.li] + "</span></div>" +
        '<div class="ex"><p class="kicker">What does it mean?</p><div class="card quad"><div class="big">' + itHTML(w) + "</div></div>" +
        '<div class="choices">' + opts.map((o, k) => '<button class="choice" data-act="pick" data-k="' + k + '">' + esc(M.tr(o)) + "</button>").join("") +
        '<button class="choice idk" data-act="pick" data-k="-1">I don’t know</button></div></div>',
        {
          quit: () => finish(),
          pick: t => {
            const k = +t.dataset.k, ok = k >= 0 && opts[k].id === w.id;
            if (ok) { Q.right++; Q.rightWords.push(w); }
            app.querySelectorAll(".choice").forEach((b, j) => {
              b.disabled = true;
              if (j < opts.length && opts[j].id === w.id) b.classList.add("is-ok");
              else if (b === t && !ok) b.classList.add("is-bad");
              else b.classList.add("is-dim");
            });
            // stop this level early once passing is out of reach, or already certain
            const wrong = Q.i + 1 - Q.right;
            setTimeout(() => {
              if (PER_LEVEL - wrong < PASS || Q.right >= PASS) { Q.i = Q.words.length; }
              else Q.i++;
              show();
            }, ok ? 450 : 900);
          }
        });
    }
    function endLevel() {
      if (Q.right >= PASS) {
        Q.passed = Q.li;
        if (Q.li < M.LEVELS.length - 1) { Q.li++; pickLevel(); return show(); }
      }
      finish();
    }
    function finish() {
      const level = M.LEVELS[Math.min(Q.passed + 1, M.LEVELS.length - 1)];
      const before = M.S.level;
      M.place(level, Q.rightWords);
      const moved = M.LEVELS.indexOf(M.S.level) > M.LEVELS.indexOf(before);
      UI.render(
        UI.topBar() + '<section class="done"><p class="bravo">' + (Q.passed >= 0 ? "Complimenti!" : "Si comincia!") + "</p>" +
        '<p class="score">' + (moved ? "You start at " + esc(M.S.level) : "You’re at " + esc(M.S.level)) + "</p>" +
        '<p class="note">' + (Q.passed >= 0 ? "You passed up to " + M.LEVELS[Q.passed] + ". " : "A1 is the right place to start. ") +
        UI.plural(Q.rightWords.length, "word is", "words are") + " now marked as known.</p>" +
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
