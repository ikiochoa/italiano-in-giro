// Italiano in giro — the alphabet: letter names and sounds, tricky spellings, and three games
// (letter match, "spell it to me" and "hear it, write it"). Points go to the weekly race like any other session.
(function () {
  const M = window.IIG, UI = window.UI, esc = M.esc, I = UI.ICON;
  const app = document.getElementById("app");
  const $ = s => app.querySelector(s);
  const es = () => M.S.set.lang === "es";
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const PRAISE = ["Bravo!", "Brava!", "Perfetto!", "Esatto!", "Benissimo!", "Ottimo!"];

  // letter, its Italian name, "say it like" (EN, ES), a note (EN, ES), an example word (it, en, es),
  // and the word Italians use to spell it on the phone ("B come Bologna")
  const LETTERS = [
    ["a", "a", "ah", "a", "", "", ["ape", "bee", "abeja"], "Ancona"],
    ["b", "bi", "bee", "bi", "", "", ["barca", "boat", "barca"], "Bologna"],
    ["c", "ci", "chee", "chi", "Hard k before a, o, u and h (casa, che). Like “ch” in “church” before e and i (cena, ciao).",
      "Suena k delante de a, o, u y h (casa, che), y “ch” delante de e, i (cena, ciao).", ["casa", "house", "casa"], "Como"],
    ["d", "di", "dee", "di", "", "", ["dente", "tooth", "diente"], "Domodossola"],
    ["e", "e", "eh", "e", "Open in some words (bello), closed in others (sera).", "Abierta en unas palabras (bello), cerrada en otras (sera).", ["erba", "grass", "hierba"], "Empoli"],
    ["f", "effe", "EF-feh", "éf-fe", "", "", ["fiore", "flower", "flor"], "Firenze"],
    ["g", "gi", "jee", "yi (con la j inglesa)", "Hard g before a, o, u and h (gatto, spaghetti). Like “j” in “jam” before e and i (gelato, giorno).",
      "Suena g de “gato” delante de a, o, u y h (gatto, spaghetti), y como la j inglesa delante de e, i (gelato, giorno).", ["gatto", "cat", "gato"], "Genova"],
    ["h", "acca", "AHK-kah", "ác-ca", "Always silent. It keeps c and g hard: chi, ghe.", "Siempre muda. Hace que la c y la g suenen duras: chi, ghe.", ["hotel", "hotel", "hotel"], "hotel"],
    ["i", "i", "ee", "i", "", "", ["isola", "island", "isla"], "Imola"],
    ["l", "elle", "EL-leh", "él-le", "", "", ["luna", "moon", "luna"], "Livorno"],
    ["m", "emme", "EM-meh", "ém-me", "", "", ["mare", "sea", "mar"], "Milano"],
    ["n", "enne", "EN-neh", "én-ne", "", "", ["naso", "nose", "nariz"], "Napoli"],
    ["o", "o", "oh", "o", "Open in some words (cosa), closed in others (sole).", "Abierta en unas palabras (cosa), cerrada en otras (sole).", ["occhio", "eye", "ojo"], "Otranto"],
    ["p", "pi", "pee", "pi", "", "", ["pane", "bread", "pan"], "Palermo"],
    ["q", "cu", "koo", "cu", "Always followed by u, and sounds “kw”: quando, questo.", "Siempre va con u y suena “cu”: quando, questo.", ["quadro", "painting", "cuadro"], "quarto"],
    ["r", "erre", "EHR-reh", "ér-re", "Rolled, like the Spanish r.", "Vibrante, como en español.", ["rosa", "rose", "rosa"], "Roma"],
    ["s", "esse", "ES-seh", "és-se", "Like “s” in “sun” (sole), or like “z” in “zoo” before b, d, g, l, m, n, r, v (sbaglio) and often between vowels (rosa).",
      "Como la s española (sole), o sonora, como una s zumbada, delante de b, d, g, l, m, n, r, v (sbaglio) y a menudo entre vocales (rosa).", ["sole", "sun", "sol"], "Savona"],
    ["t", "ti", "tee", "ti", "", "", ["tavolo", "table", "mesa"], "Torino"],
    ["u", "u", "oo", "u", "", "", ["uva", "grapes", "uvas"], "Udine"],
    ["v", "vu", "voo", "vu", "Some people say “vi”. Top teeth on the lower lip, never like b.", "Algunos dicen “vi”. Dientes de arriba sobre el labio de abajo, nunca como b.", ["vino", "wine", "vino"], "Venezia"],
    ["z", "zeta", "DZEH-tah", "dsé-ta", "Sounds “ts” (pizza, grazie) or “dz” (zero, zanzara).", "Suena “ts” (pizza, grazie) o “ds” (zero, zanzara).", ["zucchero", "sugar", "azúcar"], "Zara"],
    // only in words from other languages
    ["j", "i lunga", "ee LOON-gah", "i lún-ga", "Only in foreign words and a few names.", "Solo en palabras extranjeras y algunos nombres.", ["jeans", "jeans", "vaqueros"], ""],
    ["k", "cappa", "KAHP-pah", "cáp-pa", "Only in foreign words.", "Solo en palabras extranjeras.", ["kiwi", "kiwi", "kiwi"], ""],
    ["w", "doppia vu", "DOHP-pyah voo", "dóp-pia vu", "Only in foreign words.", "Solo en palabras extranjeras.", ["wifi", "Wi-Fi", "wifi"], ""],
    ["x", "ics", "eeks", "ics", "Only in foreign words.", "Solo en palabras extranjeras.", ["xilofono", "xylophone", "xilófono"], ""],
    ["y", "ipsilon", "EEP-see-lon", "íp-si-lon", "Also called “i greca”. Only in foreign words.", "También “i greca”. Solo en palabras extranjeras.", ["yogurt", "yogurt", "yogur"], ""]
  ].map(([l, name, en, esSay, noteEn, noteEs, ex, phone], i) => ({ l, name, en, es: esSay, noteEn, noteEs, ex: { it: ex[0], en: ex[1], es: ex[2] }, phone, foreign: i >= 21 }));
  const BY = Object.fromEntries(LETTERS.map(x => [x.l, x]));

  // the sounds where spelling goes wrong
  const TRICKY = [
    { k: "ca co cu · che chi", ex: ["casa", "cuore", "che", "chiave"], en: "Hard k, as in “cat”. Before e and i you need an h to keep it hard.", es: "Suena k, como en “casa”. Delante de e, i hace falta una h para que siga sonando k." },
    { k: "ce ci · cia cio ciu", ex: ["cena", "ciao", "cioccolato"], en: "“ch” as in “church”. In cia, cio, ciu the i isn’t said: it only softens the c.", es: "“ch” como en “chico”. En cia, cio, ciu la i no se pronuncia: solo suaviza la c." },
    { k: "ga go gu · ghe ghi", ex: ["gatto", "gusto", "spaghetti", "ghiaccio"], en: "Hard g, as in “go”. Before e and i you need an h.", es: "g de “gato”. Delante de e, i hace falta una h." },
    { k: "ge gi · gia gio giu", ex: ["gelato", "giorno", "giallo"], en: "“j” as in “jam”. In gia, gio, giu the i isn’t said.", es: "Como la j inglesa de “jam”, un sonido que no existe en español. En gia, gio, giu la i no se pronuncia." },
    { k: "gli", ex: ["figlio", "famiglia", "aglio"], en: "Like “lli” in “million”, said with the tongue flat.", es: "Como la “ll” tradicional (no la de “yo”): famiglia ≈ “familla”." },
    { k: "gn", ex: ["bagno", "gnocchi", "signora"], en: "Like “ny” in “canyon”.", es: "Como la ñ: bagno ≈ “baño”." },
    { k: "sce sci · sca sco scu sch", ex: ["pesce", "scienza", "scuola", "schiena"], en: "sce and sci sound “sh” (pesce = PEH-sheh). sca, sco, scu and sch sound “sk”.", es: "sce y sci suenan “sh” (pesce ≈ “peshe”). sca, sco, scu y sch suenan “sk”." },
    { k: "double letters", ex: ["pala", "palla", "caro", "carro", "sete", "sette"], en: "Hold a double consonant a little longer. It changes the word: pala (shovel), palla (ball).", es: "Las consonantes dobles se alargan un poco y cambian la palabra: pala (pala), palla (pelota)." },
    { k: "h", ex: ["ho", "hai", "hanno"], en: "Never said: ho sounds just like o.", es: "Nunca suena: ho suena igual que o." }
  ];

  // "cassa" → ["ci", "a", "doppia esse", "a"]; "città" → [..., "a accentata"]
  const ACC = { "à": "a", "è": "e", "é": "e", "ì": "i", "í": "i", "ò": "o", "ó": "o", "ù": "u", "ú": "u" };
  function spellParts(word) {
    const s = word.toLowerCase(), out = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (ACC[c]) { out.push(BY[ACC[c]].name + " accentata"); continue; }
      const L = BY[c];
      if (!L) continue;
      if (s[i + 1] === c && !"aeiou".includes(c)) { out.push("doppia " + L.name); i++; continue; }
      out.push(L.name);
    }
    return out;
  }
  const spoken = word => spellParts(word).join(", ");
  const shown = word => spellParts(word).join(" · ");

  // ---------- words to spell: single words from your level and your lists ----------
  const ART = /^(il |lo |la |i |gli |le |l['’])/i;
  const TRICK = /c[ei]|g[ei]|ch|gh|gli|gn|sc|h|qu|z|([bcdfglmnprstvz])\1/;
  function spellWords() {
    const seen = new Set();
    return M.wordPool().map(w => Object.assign({}, w, { word: w.it.replace(ART, "").split("/")[0].trim() }))
      .filter(w => /^[a-zàèéìíòóùú]{3,10}$/.test(w.word) && !seen.has(w.word) && seen.add(w.word) && M.tr(w));
  }
  function pickWords(n, tricky) {
    const all = M.shuffle(spellWords());
    const lv = M.S.level, mine = all.filter(w => w.level === lv || w.list), rest = all.filter(w => !(w.level === lv || w.list));
    let pool = mine.concat(rest);
    if (tricky) pool = pool.filter(w => TRICK.test(w.word)).concat(pool.filter(w => !TRICK.test(w.word)));
    return pool.slice(0, n);
  }

  // ---------- the alphabet screen ----------
  let sel = "a";
  function letterCard(x) {
    const say = es() ? x.es : x.en, note = es() ? x.noteEs : x.noteEn;
    return '<div class="abc-big"><span class="it">' + x.l.toUpperCase() + " " + x.l + '</span><span class="abc-name"><span class="it">' + esc(x.name) + "</span>" +
      '<span class="note">' + (es() ? "Se dice " : "Say ") + "“" + esc(say) + "”</span></span></div>" +
      (M.canSpeak ? '<div class="speak-row"><button class="speak" data-say="' + esc(x.name) + '">' + I.speak + esc(x.name) + "</button>" +
        '<button class="speak" data-say="' + esc(x.ex.it) + '">' + I.speak + esc(x.ex.it) + "</button></div>" : "") +
      '<p class="abc-ex"><span class="it">' + esc(x.ex.it) + "</span> · " + esc(M.tr(x.ex)) + "</p>" +
      (note ? '<p class="note">' + esc(note) + "</p>" : "") +
      (x.phone ? '<p class="note">' + (es() ? "Al teléfono: " : "On the phone: ") + "<b>" + x.l.toUpperCase() + " come " + esc(x.phone) + "</b></p>" : "");
  }
  const game = (act, name, meta) => '<li><button class="unit-row" data-act="' + act + '"><span class="t"><span class="name">' + name +
    '</span><br><span class="meta">' + meta + "</span></span>" + I.chev + "</button></li>";

  UI.screens.abc = function () {
    const tile = x => '<button class="abc-tile' + (x.foreign ? " foreign" : "") + '" data-act="letter" data-l="' + x.l + '" data-say="' + esc(x.name) +
      '" aria-pressed="' + (x.l === sel) + '" aria-label="' + x.l.toUpperCase() + ", " + esc(x.name) + '"><b>' + x.l.toUpperCase() + "</b><span>" + esc(x.name) + "</span></button>";
    const words = spellWords().length;
    UI.render(
      UI.backBar() +
      '<div class="unit-head"><p class="kicker">CILS A1</p><h1>L’alfabeto</h1><p class="note">21 letters, plus 5 for words from other languages. ' +
        (M.canSpeak ? "Tap a letter to hear its name." : "Your browser has no Italian voice, so the games show the letters instead of saying them.") + "</p></div>" +

      '<section class="sec"><div class="sec-head"><h2>Games</h2></div><ul class="unit-list">' +
      game("match", "Letter match", (M.canSpeak ? "Hear a letter and find it, or name the letter you see" : "Name the letter you see") + " · 10 letters") +
      (words >= 4 ? game("spell", "Spell it to me", (M.canSpeak ? "Listen to a word spelled out" : "Read a word spelled out") + " and write it · 8 words") +
        (M.canSpeak ? game("dict", "Hear it, write it", "Listen to a word and write how it’s spelled · 8 words") : "") : "") +
      "</ul></section>" +

      '<section class="sec"><div class="sec-head"><h2>The letters</h2></div>' +
      '<div class="card-box abc-card" id="abc-card" aria-live="polite">' + letterCard(BY[sel]) + "</div>" +
      '<div class="abc-grid">' + LETTERS.filter(x => !x.foreign).map(tile).join("") + "</div>" +
      '<p class="label abc-sub">From other languages</p><div class="abc-grid">' + LETTERS.filter(x => x.foreign).map(tile).join("") + "</div></section>" +

      '<section class="sec"><div class="sec-head"><h2>Tricky sounds</h2></div><ul class="words tricky">' + TRICKY.map(t =>
        '<li><div class="w"><span class="it">' + esc(t.k) + '</span><p class="note">' + esc(es() ? t.es : t.en) + '</p><p class="tricky-ex">' +
        t.ex.map(e => M.canSpeak ? '<button class="speak chip" data-say="' + esc(e) + '">' + I.speak + esc(e) + "</button>" : '<span class="chip">' + esc(e) + "</span>").join("") +
        "</p></div></li>").join("") + "</ul></section>",
      {
        home: () => UI.go("home"),
        letter: t => {
          sel = t.dataset.l;
          app.querySelectorAll(".abc-tile").forEach(b => b.setAttribute("aria-pressed", b === t));
          $("#abc-card").innerHTML = letterCard(BY[sel]);
        },
        match: () => startMatch(),
        spell: () => startSpell("spell"),
        dict: () => startSpell("dict")
      }
    );
  };

  // ---------- the games ----------
  // letter match: hear a name and pick the letter, or see a letter and pick its name.
  // Wrong answers are letters whose names sound alike (bi, ci, di…; effe, elle, emme…).
  const GROUPS = ["bcdgptv", "flmnrs", "aeiou", "hkq", "zxyjw"];
  function lookAlikes(l) {
    const g = GROUPS.find(s => s.includes(l)) || "";
    const near = M.shuffle(g.split("").filter(c => c !== l));
    const far = M.shuffle(LETTERS.map(x => x.l).filter(c => c !== l && !near.includes(c)));
    return M.shuffle([l].concat(near.slice(0, 2), far).slice(0, 4));
  }
  function startMatch() {
    const main = M.shuffle(LETTERS.filter(x => !x.foreign)).slice(0, 8), foreign = M.shuffle(LETTERS.filter(x => x.foreign)).slice(0, 2);
    const items = M.shuffle(main.concat(foreign)).map(x => ({ type: M.canSpeak && Math.random() < 0.6 ? "hear" : "name", key: x.l, x }));
    run(items, "letters");
  }
  function startSpell(type) {
    const words = pickWords(8, type === "dict");
    run(words.map(w => ({ type, key: w.word, w })), type === "spell" ? "spelling" : "dictation");
  }

  let G = null;
  function run(items, kind) {
    if (!items.length) return UI.go("abc");
    UI.current = "abc-game";
    G = { items, i: 0, kind, missed: new Set(), graded: new Set(), again: {}, answered: 0, correct: 0, started: new Date().toISOString() };
    show();
  }
  function bar() {
    const n = G.items.length;
    return '<div class="bar"><button class="icon-btn" data-act="quit" aria-label="Stop">' + I.close + '</button>' +
      '<span class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + G.i + '"><i style="width:' + (G.i / n * 100) + '%"></i></span>' +
      '<span class="count">' + Math.min(G.i + 1, n) + " / " + n + "</span></div>";
  }
  const listen = (text, label) => '<button class="speak-xl" data-say="' + esc(text) + '" aria-label="' + label + '">' + I.speak + "</button>" +
    '<div class="speak-row"><button class="speak" data-say="' + esc(text) + '" data-slow="1">Piano</button></div>';

  function show() {
    if (G.i >= G.items.length) return finish();
    const it = G.items[G.i];
    let body = "", opts = null, sayNow = null;
    if (it.type === "hear") {
      opts = lookAlikes(it.key);
      sayNow = it.x.name;
      body = '<p class="kicker">Listen. Which letter is it?</p><div class="card quad">' + listen(it.x.name, "Listen again") + "</div>" +
        '<div class="choices abc-choices">' + opts.map((l, k) => '<button class="choice" data-act="pick" data-k="' + k + '">' + l.toUpperCase() + " " + l + "</button>").join("") + "</div>";
    } else if (it.type === "name") {
      opts = lookAlikes(it.key);
      body = '<p class="kicker">What’s this letter called?</p><div class="card quad"><div class="big"><span class="it">' + it.key.toUpperCase() + " " + it.key + "</span></div></div>" +
        '<div class="choices">' + opts.map((l, k) => '<button class="choice it-opt" data-act="pick" data-k="' + k + '">' + esc(BY[l].name) + "</button>").join("") + "</div>";
    } else {
      const spell = it.type === "spell";
      sayNow = spell ? spoken(it.key) : it.key;
      const letters = '<p class="spelled" id="spelled"' + (M.canSpeak ? " hidden" : "") + ">" + esc(shown(it.key)) + "</p>";
      body = '<p class="kicker">' + (spell ? (M.canSpeak ? "Listen to the spelling. Write the word" : "Read the spelling. Write the word") : "Listen. Write the word") + "</p>" +
        '<div class="card quad">' + (M.canSpeak ? listen(sayNow, "Listen again") : "") +
        (spell ? letters + (M.canSpeak ? '<button class="link" data-act="reveal">Show the letters</button>' : "") : '<p class="hint">Means: ' + esc(M.tr(it.w)) + "</p>") +
        UI.typeBox("") + "</div>" + '<button class="btn primary block" data-act="check">Controlla</button>';
    }
    UI.render(bar() + '<div class="ex">' + body + "</div>", {
      quit: () => UI.go("abc"),
      next: () => { G.i++; show(); },
      reveal: t => { $("#spelled").hidden = false; t.remove(); },
      pick: t => {
        const ok = opts[+t.dataset.k] === it.key;
        app.querySelectorAll(".choice").forEach((b, k) => {
          b.disabled = true;
          b.classList.add(opts[k] === it.key ? "is-ok" : b === t ? "is-bad" : "is-dim");
        });
        answer(ok ? "ok" : "bad");
      },
      key: UI.keyAct,
      check: () => {
        const v = $("#ans").value;
        if (!v.trim()) { $("#ans").focus(); return; }
        $("#ans").disabled = true;
        const r = M.check(v, it.key);
        it.typed = v.trim();
        answer(r === "ok" ? "ok" : r === "accent" ? "accent" : "bad");
      },
      enter: () => { if (UI.acts.check) UI.acts.check(); }
    });
    if ($("#ans")) { $("#ans").focus(); app.querySelector(".accents").addEventListener("pointerdown", e => e.preventDefault()); }
    if (sayNow) M.say(sayNow);
  }

  function answer(res) {
    const it = G.items[G.i], ok = res === "ok";
    G.answered++;
    if (ok) G.correct++;
    else {
      G.missed.add(it.key);
      // comes back once more later in this game
      G.again[it.key] = (G.again[it.key] || 0) + 1;
      if (G.again[it.key] <= 1) G.items.splice(Math.min(G.i + 3, G.items.length), 0, Object.assign({}, it, { typed: null }));
    }
    G.graded.add(it.key);
    const verdict = ok ? pick(PRAISE) : res === "accent" ? "Quasi! Check the accents." : "Non ancora…";
    let sol;
    if (it.x) {
      sol = '<div class="sol">' + it.key.toUpperCase() + " " + it.key + " · " + esc(it.x.name) + "</div>";
    } else {
      sol = '<div class="sol"><span class="it">' + esc(it.key) + "</span></div>" + '<p class="spelled">' + esc(shown(it.key)) + "</p>" +
        (!ok && it.typed ? '<p class="note">You wrote: <s>' + esc(it.typed) + "</s></p>" : "") +
        '<dl class="tr"><dt>' + (es() && it.w.es ? "ES" : "EN") + "</dt><dd>" + esc(M.tr(it.w)) + "</dd></dl>" +
        (M.canSpeak ? '<div class="speak-row"><button class="speak" data-say="' + esc(it.key) + '">' + I.speak + "Word</button>" +
          '<button class="speak" data-say="' + esc(spoken(it.key)) + '">' + I.speak + "Spelling</button></div>" : "");
    }
    const el = document.createElement("div");
    el.className = "sheet " + (ok ? "ok" : res === "bad" ? "bad" : "almost");
    el.setAttribute("role", "status");
    el.innerHTML = '<p class="verdict">' + esc(verdict) + "</p>" + sol + '<button class="btn primary block" data-act="next">Continua</button>';
    app.appendChild(el);
    app.classList.add("has-sheet");
    app.querySelector('[data-act="check"]')?.remove();
    el.querySelector(".btn.primary").focus({ preventScroll: true });
    UI.acts.enter = null;
    if (!ok && M.S.set.auto !== false) M.say(it.x ? it.x.name : it.key);
  }

  function finish() {
    M.markStreak();
    const total = G.graded.size, firstOk = [...G.graded].filter(k => !G.missed.has(k)).length;
    const pts = firstOk * 10 + 20; // same as the other practice sessions
    M.logSession({ kind: G.kind, list_id: null, started_at: G.started, answered: G.answered, correct: G.correct, points: pts });
    const letters = G.kind === "letters";
    const missed = [...G.missed];
    UI.render(
      UI.topBar() + '<section class="done"><p class="bravo">' + (firstOk === total ? "Perfetto!" : "Bravo!") + "</p>" +
      '<p class="score">' + firstOk + " of " + UI.plural(total, letters ? "letter" : "word", letters ? "letters" : "words") + " right first time</p>" +
      '<p class="points">+' + pts + " points</p>" +
      (missed.length ? '<p class="note">Go over these once more:</p><ul class="words">' + missed.map(k =>
        '<li><span class="w"><span class="it">' + (letters ? k.toUpperCase() + " · " + esc(BY[k].name) : esc(k)) + "</span>" +
        (letters ? "" : '<br><span class="trs">' + esc(shown(k)) + "</span>") + "</span>" +
        (M.canSpeak ? '<button class="speak-sm" data-say="' + esc(letters ? BY[k].name : spoken(k)) + '" aria-label="Listen">' + I.speak + "</button>" : "") + "</li>").join("") + "</ul>"
        : '<p class="note">Streak: ' + UI.plural(M.streak(), "day", "days") + " in a row.</p>") +
      '<div class="btn-row"><button class="btn" data-act="again">Play again</button><button class="btn primary" data-act="back">Continua</button></div></section>',
      {
        again: () => G.kind === "letters" ? startMatch() : startSpell(G.kind === "spelling" ? "spell" : "dict"),
        back: () => UI.afterPractice("abc")
      }
    );
  }

  // the home tile
  UI.abcTileHTML = function () {
    return '<button class="verb-tile abc-tile-home" data-act="abc"><span class="vt-badge" aria-hidden="true">A b<br>C d</span>' +
      '<span class="t"><span class="name">Alphabet</span><br><span class="meta">Letters, sounds and spelling games</span></span>' + I.chev + "</button>";
  };
  UI.spellParts = spellParts;
})();
