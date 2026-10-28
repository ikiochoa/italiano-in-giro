// Italiano in giro — practice session (words) and conjugation drill
(function () {
  const M = window.IIG, UI = window.UI, esc = M.esc, I = UI.ICON;
  const app = document.getElementById("app");
  const PRAISE = ["Bravo!", "Brava!", "Perfetto!", "Esatto!", "Benissimo!", "Ottimo!"];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const $ = s => app.querySelector(s);
  const KEYS = ["à", "è", "é", "ì", "ò", "ù", "’"];
  // points for the weekly race: 10 for each answer right first time, plus 20 for finishing
  const points = (firstOk) => firstOk * 10 + 20;

  function speakBtns(text) {
    if (!M.canSpeak) return "";
    return '<div class="speak-row"><button class="speak" data-say="' + esc(text) + '">' + I.speak + 'Ascolta</button>' +
      '<button class="speak" data-say="' + esc(text) + '" data-slow="1">Piano</button></div>';
  }
  const trHTML = w => '<dl class="tr"><dt>' + (M.S.set.lang === "es" && w.es ? "ES" : "EN") + "</dt><dd>" + esc(M.tr(w)) + "</dd></dl>";
  function typeBox(hint) {
    return '<div class="type-box"><input class="type-in" id="ans" lang="it" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Your answer in Italian">' +
      '<div class="accents">' + KEYS.map(k => '<button data-act="key" data-k="' + k + '" tabindex="-1">' + k + "</button>").join("") + "</div>" +
      (hint ? '<p class="hint">' + hint + "</p>" : "") + "</div>";
  }
  function keyAct(t) {
    const inp = $("#ans"), s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? s;
    const ch = t.dataset.k === "’" ? "'" : t.dataset.k;
    inp.value = inp.value.slice(0, s) + ch + inp.value.slice(e);
    inp.focus(); inp.setSelectionRange(s + ch.length, s + ch.length);
  }
  UI.typeBox = typeBox; UI.keyAct = keyAct;
  function bar(Q) {
    const n = Q.items.length;
    return '<div class="bar"><button class="icon-btn" data-act="quit" aria-label="Stop">' + I.close + '</button>' +
      '<span class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + Q.i + '"><i style="width:' + (Q.i / n * 100) + '%"></i></span>' +
      '<span class="count">' + Math.min(Q.i + 1, n) + " / " + n + "</span></div>";
  }
  // feedback sheet sliding up from the bottom
  function sheet(cls, verdict, body) {
    const el = document.createElement("div");
    el.className = "sheet " + cls;
    el.setAttribute("role", "status");
    el.innerHTML = '<p class="verdict">' + esc(verdict) + "</p>" + body + '<button class="btn primary block" data-act="next">Continua</button>';
    app.appendChild(el);
    app.classList.add("has-sheet");
    app.querySelector('[data-act="check"]')?.remove();
    el.querySelector("button").focus({ preventScroll: true });
    UI.acts.enter = null;
  }

  // ---------- words ----------
  let Q = null;
  function typeFor(w) {
    const b = M.prog(w).b;
    if (b === 0) return "intro";
    const opts = b === 1 ? ["mc", "mc", "listen"] : b === 2 ? ["rev", "listen", "mc"] : ["type", "type", "rev"];
    const t = pick(opts);
    return t === "listen" && !M.canSpeak ? "mc" : t;
  }

  UI.session = function (words, opts) {
    opts = opts || {};
    if (!words.length) return UI.go("home");
    UI.current = "session";
    const items = [], later = [];
    words.forEach(w => {
      const t = typeFor(w);
      items.push({ w, type: t });
      if (t === "intro") later.push({ at: items.length + 3, item: { w, type: "mc" } });
    });
    later.reverse().forEach(l => items.splice(Math.min(l.at, items.length), 0, l.item));
    Q = { items, i: 0, missed: new Set(), graded: new Set(), again: {}, opts, started: new Date().toISOString(), answered: 0, correct: 0,
      pool: opts.pool && opts.pool.length >= 4 ? opts.pool : M.wordPool() };
    show();
  };

  // wrong answers that make you think: the same kind of word (and gender and number, for nouns), from the same
  // topic and level, that looks alike; never one that could also be right (a meaning they share)
  const ARTS = /^(il |lo |la |i |gli |le |l['’])/i;
  const bare = x => x.it.replace(ARTS, "");
  const kind = x => x.verb || /^to /i.test(x.en || "") ? "verb" : x.g ? "noun" : /\s/.test(bare(x)) ? "phrase" : "word";
  const plural = x => /^(i|gli|le) /i.test(x.it);
  const meanings = x => new Set([x.en, x.es].filter(Boolean).join("/").toLowerCase()
    .replace(/\([^)]*\)/g, "").split(/[\/,;]/).map(m => m.replace(/^(to|the|a|an) /, "").trim()).filter(Boolean));
  function options(w, field) {
    const val = x => field === "it" ? x.it : M.tr(x);
    const mine = meanings(w), k = kind(w);
    const score = x => {
      let n = kind(x) === k ? 4 : 0;
      if (k === "noun" && x.g === w.g) n += 2;
      if (k === "noun" && plural(x) === plural(w)) n += 1;
      if ((x.topic && x.topic === w.topic) || (x.list && x.list === w.list)) n += 2;
      if (x.level && x.level === w.level) n += 1;
      n += 3 * M.alike(bare(x), bare(w)) + (field === "it" ? 1 : 0.5) * M.alike(val(x), val(w));
      if (M.prog(x).b > 0) n += 0.5;
      return n + Math.random() * 1.5;
    };
    const cands = Q.pool.filter(x => x.id !== w.id && val(x) && val(x) !== val(w) && bare(x) !== bare(w) && ![...meanings(x)].some(m => mine.has(m)))
      .map(x => ({ x, n: score(x) })).sort((a, b) => b.n - a.n).map(c => c.x);
    const seen = new Set([val(w)]), out = [];
    for (const x of cands) { if (out.length === 3) break; if (!seen.has(val(x))) { seen.add(val(x)); out.push(x); } }
    return M.shuffle([w].concat(out));
  }

  function show() {
    if (Q.i >= Q.items.length) return finish();
    const it = Q.items[Q.i], w = it.w;
    let body = "", opts = null;
    if (it.type === "intro") {
      body = '<p class="kicker">New word</p><div class="card quad"><div class="big">' + UI.itHTML(w) + "</div>" + speakBtns(w.it) + trHTML(w) + "</div>" +
        '<button class="btn primary block" data-act="next">Capito</button>';
    } else if (it.type === "mc" || it.type === "listen") {
      opts = options(w, "tr");
      const top = it.type === "mc" ? '<div class="big">' + UI.itHTML(w) + "</div>" + speakBtns(w.it)
        : '<button class="speak-xl" data-say="' + esc(w.it) + '" aria-label="Listen again">' + I.speak + '</button><div class="speak-row"><button class="speak" data-say="' + esc(w.it) + '" data-slow="1">Piano</button></div>';
      body = '<p class="kicker">' + (it.type === "mc" ? "What does it mean?" : "Listen. Which word is it?") + '</p><div class="card quad">' + top + "</div>" +
        '<div class="choices">' + opts.map((o, k) => '<button class="choice" data-act="pick" data-k="' + k + '">' + esc(M.tr(o)) + "</button>").join("") + "</div>";
    } else if (it.type === "rev") {
      opts = options(w, "it");
      body = '<p class="kicker">How do you say it in Italian?</p><div class="card quad"><div class="prompt">' + esc(M.tr(w)) + "</div></div>" +
        '<div class="choices">' + opts.map((o, k) => '<button class="choice it-opt" data-act="pick" data-k="' + k + '">' + UI.itHTML(o) + "</button>").join("") + "</div>";
    } else {
      body = '<p class="kicker">Write it in Italian</p><div class="card quad"><div class="prompt">' + esc(M.tr(w)) + "</div>" +
        typeBox(w.g ? "With the article: il, lo, la, l’…" : "") + "</div>" +
        '<button class="btn primary block" data-act="check">Controlla</button>';
    }
    UI.render(bar(Q) + '<div class="ex">' + body + "</div>", {
      quit: () => UI.go(Q.opts.back || "home", Q.opts.backArg),
      next: () => { Q.i++; show(); },
      pick: t => {
        const ok = opts[+t.dataset.k].id === w.id;
        app.querySelectorAll(".choice").forEach((b, k) => {
          b.disabled = true;
          if (opts[k].id === w.id) b.classList.add("is-ok");
          else if (b === t) b.classList.add("is-bad");
          else b.classList.add("is-dim");
        });
        answer(ok ? "ok" : "bad");
      },
      key: keyAct,
      check: () => { const v = $("#ans").value; if (!v.trim()) { $("#ans").focus(); return; } $("#ans").disabled = true; answer(M.check(v, w.it)); },
      enter: () => { if (UI.acts.check) UI.acts.check(); }
    });
    if (it.type === "type") { $("#ans").focus(); app.querySelector(".accents").addEventListener("pointerdown", e => e.preventDefault()); }
    if (M.S.set.auto !== false && (it.type === "intro" || it.type === "mc" || it.type === "listen")) M.say(w.it);
  }

  function answer(res) {
    const it = Q.items[Q.i], w = it.w, ok = res === "ok";
    M.logAnswer(w, ok, it.type);
    Q.answered++;
    if (ok) { Q.correct++; M.grade(w, true, !Q.missed.has(w.id)); }
    else {
      if (res === "bad" && !Q.missed.has(w.id)) M.grade(w, false);
      Q.missed.add(w.id);
      // comes back later in this session (twice at most; after that, tomorrow)
      Q.again[w.id] = (Q.again[w.id] || 0) + 1;
      if (Q.again[w.id] <= 2) Q.items.splice(Math.min(Q.i + 4, Q.items.length), 0, { w, type: res === "bad" ? "mc" : "type" });
    }
    Q.graded.add(w.id);
    const verdict = ok ? pick(PRAISE) : res === "accent" ? "Quasi! Check the accents." : res === "article" ? "Quasi! Don’t forget the article." : "Non ancora…";
    sheet(ok ? "ok" : res === "bad" ? "bad" : "almost", verdict, '<div class="sol">' + UI.itHTML(w) + "</div>" + trHTML(w));
    if (M.S.set.auto !== false && (!ok || it.type !== "mc")) M.say(w.it);
  }

  function finish() {
    M.markStreak();
    const total = Q.graded.size, firstOk = [...Q.graded].filter(id => !Q.missed.has(id)).length;
    const pts = points(firstOk);
    M.logSession({ kind: Q.opts.kind || "review", list_id: Q.opts.listId || null, started_at: Q.started, answered: Q.answered, correct: Q.correct, points: pts });
    const missed = Q.items.map(x => x.w).filter((w, i, a) => Q.missed.has(w.id) && a.findIndex(x => x.id === w.id) === i);
    UI.render(
      UI.topBar() + '<section class="done"><p class="bravo">' + (firstOk === total ? "Perfetto!" : "Bravo!") + "</p>" +
      '<p class="score">' + firstOk + " of " + total + " right first time</p>" +
      '<p class="points">+' + pts + " points</p>" +
      '<p class="note">' + (missed.length ? "These will come back tomorrow. Listen to them once more:" : "Streak: " + UI.plural(M.streak(), "day", "days") + " in a row. A domani!") + "</p>" +
      (missed.length ? '<ul class="words">' + missed.map(w => '<li><span class="w">' + UI.itHTML(w) + '<br><span class="trs">' + esc(M.tr(w)) + "</span></span>" +
        (M.canSpeak ? '<button class="speak-sm" data-say="' + esc(w.it) + '" aria-label="Listen">' + I.speak + "</button>" : "") + "</li>").join("") + "</ul>" : "") +
      '<button class="btn primary block" data-act="home">Continua</button></section>',
      { home: () => UI.afterPractice(Q.opts.back, Q.opts.backArg) }
    );
  }

  // ---------- conjugation drill ----------
  // box 0: see the tense's table first; boxes 1–2: pick the right form; 3+: type it
  const PERS = ["io", "tu", "lui / lei", "noi", "voi", "loro"];
  let D = null;
  UI.drill = function (items, opts) {
    opts = opts || {};
    if (!items.length) return UI.go("home");
    UI.current = "drill";
    const list = [];
    items.forEach(d => {
      // a tense this verb doesn't have: show the empty table once, nothing to drill
      if (d.none) { if (M.prog(d).b === 0) list.push({ d, type: "table" }); return; }
      const persons = d.verb.t[d.tense].map((f, i) => f ? i : -1).filter(i => i >= 0);
      if (M.prog(d).b === 0) list.push({ d, type: "table" });
      list.push({ d, type: M.prog(d).b >= 3 ? "type" : "mc", p: pick(persons) });
      if (M.prog(d).b === 0) list.push({ d, type: "type", p: pick(persons) });
    });
    D = { items: list, i: 0, missed: new Set(), graded: new Set(), opts, started: new Date().toISOString(), answered: 0, correct: 0 };
    showDrill();
  };
  const tenseLabel = key => (window.IIG_CONTENT().tenses.find(t => t.key === key) || {}).label || key;
  const first = f => f.split("/")[0];

  // the imperative has only tu, noi, voi; a tense the verb lacks shows those persons with a dash
  const noForms = (v, key) => !(v.t[key] || []).some(Boolean);
  function conjRows(v, key, pers) {
    const fs = v.t[key] || [], none = noForms(v, key), imp = key === "imperativo";
    return fs.map((f, i) => f ? "<tr><th>" + pers[i] + "</th><td>" + esc(first(f)) + "</td></tr>"
      : none && (!imp || [1, 3, 4].includes(i)) ? "<tr><th>" + pers[i] + '</th><td class="none">–</td></tr>' : "").join("");
  }
  UI.noForms = noForms; UI.conjRows = conjRows;
  function tableHTML(v, key) {
    return '<table class="conj-t">' + conjRows(v, key, PERS) + "</table>";
  }

  function showDrill() {
    if (D.i >= D.items.length) return finishDrill();
    const it = D.items[D.i], v = it.d.verb, key = it.d.tense;
    const head = '<div class="drill-head"><span class="it">' + esc(v.it) + '</span><span class="tag">' + esc(tenseLabel(key)) + "</span></div>";
    let body = "", opts = null;
    if (it.type === "table") {
      body = '<p class="kicker">New: ' + esc(tenseLabel(key)) + '</p><div class="card quad">' + head + '<p class="note">' + esc(M.tr(v)) + "</p>" + tableHTML(v, key) +
        (it.d.none ? '<p class="note">There’s no ' + esc(tenseLabel(key)) + " of " + esc(v.it) + ". Nothing to practise here.</p>" : "") +
        (v.aux === "essere" && /passato|trapassato|anteriore/.test(key) ? '<p class="note">With essere the ending agrees: -o / -a, -i / -e.</p>' : "") + "</div>" +
        '<button class="btn primary block" data-act="next">Capito</button>';
    } else {
      const right = first(v.t[key][it.p]);
      const prompt = '<div class="card quad">' + head + '<div class="prompt"><span class="pers">' + PERS[it.p] + "</span> …</div></div>";
      if (it.type === "mc") {
        // two other persons of this tense, and the same person in another tense you've met
        const others = (list, n) => M.shuffle([...new Set(list.filter(Boolean).map(first))].filter(f => f !== right)).slice(0, n);
        const lv = M.LEVELS.indexOf(M.S.level);
        const tenses = window.IIG_CONTENT().tenses.filter(t => t.key !== key && M.LEVELS.indexOf(t.level) <= Math.max(lv, 1)).map(t => v.t[t.key] && v.t[t.key][it.p]);
        const fromTenses = others(tenses, 3), fromTense = others(v.t[key], 3);
        opts = M.shuffle([right].concat([...new Set(fromTenses.slice(0, 1).concat(fromTense, fromTenses.slice(1)))].slice(0, 3)));
        body = '<p class="kicker">Which form?</p>' + prompt +
          '<div class="choices">' + opts.map((o, k) => '<button class="choice it-opt" data-act="pick" data-k="' + k + '">' + esc(o) + "</button>").join("") + "</div>";
      } else {
        body = '<p class="kicker">Write the form</p>' + prompt.replace("</div></div>", "</div>" + typeBox("") + "</div>") +
          '<button class="btn primary block" data-act="check">Controlla</button>';
      }
      it.right = right;
    }
    UI.render(bar(D) + '<div class="ex">' + body + "</div>", {
      quit: () => UI.go(D.opts.back || "home", D.opts.backArg),
      next: () => { if (it.d.none) M.markSeen(it.d); D.i++; showDrill(); },
      pick: t => {
        const ok = opts[+t.dataset.k] === it.right;
        app.querySelectorAll(".choice").forEach((b, k) => {
          b.disabled = true;
          b.classList.add(opts[k] === it.right ? "is-ok" : b === t ? "is-bad" : "is-dim");
        });
        drillAnswer(ok ? "ok" : "bad");
      },
      key: keyAct,
      check: () => {
        const val = $("#ans").value; if (!val.trim()) { $("#ans").focus(); return; }
        $("#ans").disabled = true;
        drillAnswer(M.checkForm(val, v.t[key][it.p], v.aux));
      },
      enter: () => { if (UI.acts.check) UI.acts.check(); }
    });
    if (it.type === "type") { $("#ans").focus(); app.querySelector(".accents").addEventListener("pointerdown", e => e.preventDefault()); }
  }

  function drillAnswer(res) {
    const it = D.items[D.i], d = it.d, ok = res === "ok";
    M.logAnswer(d, ok, "conj");
    D.answered++;
    if (ok) { D.correct++; M.grade(d, true, !D.missed.has(d.id)); }
    else {
      if (res === "bad" && !D.missed.has(d.id)) M.grade(d, false);
      D.missed.add(d.id);
      if ((D.items.filter(x => x.d === d).length) < 4) D.items.splice(Math.min(D.i + 3, D.items.length), 0, { d, type: "mc", p: it.p });
    }
    D.graded.add(d.id);
    const verdict = ok ? pick(PRAISE) : res === "accent" ? "Quasi! Check the accents." : "Non ancora…";
    sheet(ok ? "ok" : res === "bad" ? "bad" : "almost", verdict,
      '<div class="sol"><span class="pers">' + PERS[it.p] + "</span> " + esc(it.right) + "</div>" + tableHTML(d.verb, d.tense));
    if (M.S.set.auto !== false) M.say(it.right);
  }

  function finishDrill() {
    M.markStreak();
    const total = D.graded.size, firstOk = [...D.graded].filter(id => !D.missed.has(id)).length;
    const pts = points(firstOk);
    M.logSession({ kind: "verbs", list_id: null, started_at: D.started, answered: D.answered, correct: D.correct, points: pts });
    UI.render(
      UI.topBar() + '<section class="done"><p class="bravo">' + (firstOk === total ? "Perfetto!" : "Bravo!") + "</p>" +
      (total ? '<p class="score">' + firstOk + " of " + UI.plural(total, "verb form", "verb forms") + " right first time</p>" : "") +
      '<p class="points">+' + pts + " points</p>" +
      '<button class="btn primary block" data-act="home">Continua</button></section>',
      { home: () => UI.afterPractice(D.opts.back, D.opts.backArg) });
  }

  // after a session: show a level-up first if one happened
  UI.afterPractice = function (back, backArg) {
    if (UI.pendingLevel) { const l = UI.pendingLevel; UI.pendingLevel = null; return UI.go("levelup", { level: l }); }
    UI.go(back || "home", backArg);
  };
})();
