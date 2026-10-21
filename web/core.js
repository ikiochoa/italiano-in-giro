// Italiano in giro — state, progress (spaced repetition), groups and helpers.
// State lives in memory + localStorage (so the app opens instantly and works offline);
// cloud.js listens to changes (M.on) and saves them to Supabase.
(function () {
  const INTERVAL = [0, 1, 2, 4, 8, 16]; // days until the next review, per box (0 = new, 5 = mastered)
  const SESSION_SIZE = 15;
  const NEW_PER_SESSION = 6;
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

  // ---------- state ----------
  const defaults = () => ({ lang: "en", auto: true });
  const blank = () => ({
    p: {}, streak: { last: -1, n: 0 }, set: defaults(), level: "A1", best: {},
    lists: [],     // lists added by this person or shared with their group
    groups: []     // [{ id, name, join_code, teacher_id, role, members: [{ id, display_name, avatar_url, role, level, streak_n, streak_last }] }]
  });
  const S = blank();
  let KEY = null;
  const listeners = [];
  function on(fn) { listeners.push(fn); }
  function emit(type, data) { listeners.forEach(fn => { try { fn(type, data); } catch (e) { console.error(e); } }); }

  function replace(next) { Object.keys(S).forEach(k => delete S[k]); Object.assign(S, blank(), next); }
  function save() { if (KEY) try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // this person's local copy (shown at once while the server copy arrives)
  function useUser(uid) {
    KEY = "iig.v1." + uid;
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    replace(cached || {});
    return !!cached;
  }
  // server data wins over the local copy
  function applyServer({ profile, progress, lists, groups }) {
    const p = {};
    progress.forEach(r => { p[r.word_id] = { b: r.box, due: r.due, ok: r.ok, ko: r.ko }; });
    replace({
      p,
      streak: { last: profile.streak_last, n: profile.streak_n },
      set: Object.assign(defaults(), profile.settings),
      level: profile.level || "A1",
      best: profile.best || {},
      lists: lists.map(l => ({ id: l.id, owner_id: l.owner_id, group_id: l.group_id, kind: l.kind, title: l.title, level: l.level, topic: l.topic, words: l.words || [] })),
      groups
    });
    save();
  }

  const today = () => { const d = new Date(); return Math.floor((d - d.getTimezoneOffset() * 60000) / 86400000); };

  // ---------- progress ----------
  function prog(w) { return S.p[w.id] || { b: 0, due: 0 }; }
  function state(w) { const b = prog(w).b; return b === 0 ? "new" : b <= 2 ? "learn" : "know"; }
  function isDue(w) { const p = prog(w); return p.b > 0 && p.due <= today(); }

  function grade(w, correct, firstTry) {
    const p = Object.assign({ b: 0, due: 0, ok: 0, ko: 0 }, S.p[w.id]);
    if (correct) {
      p.ok++;
      p.b = firstTry ? Math.min(5, Math.max(1, p.b + 1)) : Math.max(1, p.b);
    } else {
      p.ko++;
      p.b = 1;
    }
    p.due = today() + INTERVAL[p.b];
    S.p[w.id] = p;
    save();
    emit("progress", { word_id: w.id, box: p.b, due: p.due, ok: p.ok, ko: p.ko });
    checkLevelUp();
  }
  function logAnswer(w, correct, kind) { emit("answer", { word_id: w.id, correct: !!correct, kind }); }
  function logSession(row) { emit("session", row); }

  function markStreak() {
    const t = today();
    if (S.streak.last === t) return;
    S.streak.n = S.streak.last === t - 1 ? S.streak.n + 1 : 1;
    S.streak.last = t;
    save();
    emit("profile", { streak_n: S.streak.n, streak_last: S.streak.last });
  }
  // a streak counts while the last session was today or yesterday
  function streakOf(n, last) { return last >= today() - 1 ? n : 0; }
  function streak() { return streakOf(S.streak.n, S.streak.last); }

  function setSetting(k, v) { S.set[k] = v; save(); emit("profile", { settings: S.set }); }
  function setLevel(l) { if (!LEVELS.includes(l)) return; S.level = l; save(); emit("profile", { level: l }); }

  // ---------- levels: earned, not chosen ----------
  // A level counts as done at 80%: 70% of the score is its words (verbs' meanings included),
  // 30% its conjugation drills, so the long verb tables of B2 and up don't swamp the words.
  const LEVEL_UP = 0.8;
  const known = it => prog(it).b >= 3;
  function levelProgress(level) {
    const L = window.IIG_CONTENT().levels[level];
    const w = L.words.length ? L.words.filter(known).length / L.words.length : 1;
    const d = L.drills.length ? L.drills.filter(known).length / L.drills.length : 1;
    return { words: L.words.filter(known).length, totalWords: L.words.length, drills: L.drills.filter(known).length,
      totalDrills: L.drills.length, share: 0.7 * w + 0.3 * d };
  }
  let onLevelUp = null;
  function checkLevelUp() {
    let i = LEVELS.indexOf(S.level), moved = false;
    while (i < LEVELS.length - 1 && levelProgress(LEVELS[i]).share >= LEVEL_UP - 1e-9) { i++; moved = true; }
    if (!moved) return;
    setLevel(LEVELS[i]);
    if (onLevelUp) onLevelUp(LEVELS[i]);
  }
  function whenLevelUp(fn) { onLevelUp = fn; }
  // placement quiz: only ever moves up; words answered right are marked as known so they aren't drilled
  function place(level, rightWords) {
    rightWords.forEach(w => {
      if (prog(w).b >= 3) return;
      S.p[w.id] = Object.assign({ ok: 0, ko: 0 }, S.p[w.id], { b: 3, due: today() + INTERVAL[3] });
      emit("progress", { word_id: w.id, box: 3, due: S.p[w.id].due, ok: S.p[w.id].ok, ko: S.p[w.id].ko });
    });
    save();
    if (LEVELS.indexOf(level) > LEVELS.indexOf(S.level)) setLevel(level);
  }
  function tr(w, lang) { lang = lang || S.set.lang; return w[lang] || w.en || w.es || ""; }
  function setName(n) { emit("profile", { display_name: n }); }
  function setBest(key, v) { S.best[key] = v; save(); emit("profile", { best: S.best }); }

  // ---------- what to practise ----------
  const lvIndex = l => LEVELS.indexOf(l);
  // words of your own lists and lists your teacher shared (id "<list id>:<italian>")
  function listWords(list) {
    return list.words.map(w => Object.assign({}, w, { id: list.id + ":" + w.it, list: list.id }));
  }
  function myListWords() { return S.lists.filter(l => l.kind !== "verbs").flatMap(listWords); }
  // every word you could meet: built-in levels up to yours, plus your lists
  function wordPool() {
    const C = window.IIG_CONTENT();
    return LEVELS.filter(l => lvIndex(l) <= lvIndex(S.level)).flatMap(l => C.levels[l].words).concat(myListWords());
  }
  function drillPool() {
    const C = window.IIG_CONTENT();
    return LEVELS.filter(l => lvIndex(l) <= lvIndex(S.level)).flatMap(l => C.levels[l].drills);
  }
  // today's plan: due reviews first, then new words; new ones come half from your lists, half from your level
  function plan(pool) {
    pool = pool || wordPool();
    const due = pool.filter(isDue).sort((a, b) => prog(a).b - prog(b).b || prog(a).due - prog(b).due);
    const d = due.slice(0, SESSION_SIZE);
    const room = Math.max(0, Math.min(NEW_PER_SESSION, SESSION_SIZE - d.length));
    const freshMine = pool.filter(w => w.list && prog(w).b === 0);
    const freshLevel = pool.filter(w => !w.list && prog(w).b === 0 && w.level === S.level);
    const freshOlder = pool.filter(w => !w.list && prog(w).b === 0 && w.level !== S.level);
    const n = [];
    while (n.length < room && (freshMine.length || freshLevel.length || freshOlder.length)) {
      const src = (n.length % 2 === 0 && freshMine.length) ? freshMine : (freshOlder.length ? freshOlder : freshLevel.length ? freshLevel : freshMine);
      n.push(src.shift());
    }
    return { due: d, fresh: n, words: shuffle(d).concat(n) };
  }
  // conjugation: due drills first, then new ones in the order a course would teach them
  // (the present of the common verbs first, then the next tense)
  function drillPlan(size) {
    size = size || 10;
    const pool = drillPool();
    const due = pool.filter(isDue).sort((a, b) => prog(a).b - prog(b).b || prog(a).due - prog(b).due).slice(0, size);
    const C = window.IIG_CONTENT(), tIdx = k => C.tenses.findIndex(t => t.key === k), vIdx = v => window.IIG_VERBS.verbs.indexOf(v);
    const fresh = pool.filter(d => prog(d).b === 0)
      .sort((a, b) => tIdx(a.tense) - tIdx(b.tense) || vIdx(a.verb) - vIdx(b.verb))
      .slice(0, Math.max(0, Math.min(4, size - due.length)));
    return { due, fresh, items: shuffle(due).concat(fresh) };
  }

  // ---------- checking typed answers ----------
  function norm(s) {
    return (s || "").toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, " ").replace(/\s*'\s*/g, "'").replace(/[.!?]+$/, "").trim();
  }
  const strip = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ART = /^(il |lo |la |i |gli |le |l')/;
  // "la casa" → ok | accent (casá) | article (casa) | bad
  function check(input, answer) {
    const a = norm(input);
    if (!a) return "bad";
    const alts = answer.split("/").map(norm);
    if (alts.includes(a)) return "ok";
    if (alts.some(b => strip(a) === strip(b))) return "accent";
    if (alts.some(b => ART.test(b) && (a === b.replace(ART, "") || strip(a) === strip(b.replace(ART, ""))))) return "article";
    return "bad";
  }
  // conjugated forms: also accept the feminine / plural endings of essere verbs (sono andata, siamo andate)
  function checkForm(input, form, aux) {
    const r = check(input, form);
    if (r !== "bad" || aux !== "essere") return r;
    const swap = f => f.split("/").map(x => x.replace(/o$/, "a").replace(/i$/, "e")).join("/");
    return check(input, swap(form)) === "ok" ? "ok" : r;
  }

  // ---------- Italian voice ----------
  let voice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices();
    const it = vs.filter(v => /^it[-_]IT/i.test(v.lang));
    voice = it.find(v => /premium|enhanced|Alice|Federica|Luca|Google/i.test(v.name)) || it[0] || vs.find(v => /^it/i.test(v.lang)) || null;
  }
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  if (canSpeak) { pickVoice(); speechSynthesis.addEventListener("voiceschanged", pickVoice); }
  function say(text, slow) {
    if (!canSpeak || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.split("/")[0]);
    u.lang = "it-IT";
    if (voice) u.voice = voice;
    u.rate = slow ? 0.6 : 0.95;
    speechSynthesis.speak(u);
  }

  // ---------- your own lists ----------
  // pasted text: one word per line, "parola = translation" (or ; or tab); a third column is Spanish
  function parseList(text) {
    const out = [];
    text.split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(/\s*(?:=|;|\t|\|)\s*/).map(x => x.trim());
      let it = parts[0] || "", g = null;
      const gm = it.match(/\s*\((m|f)\.?\)\s*$/i);
      if (gm) { g = gm[1].toLowerCase(); it = it.slice(0, gm.index).trim(); }
      const art = (it.match(/^(il|lo|la|i|gli|le|un|uno|una) /i) || [])[1];
      if (!g && art) g = /^(il|lo|i|gli|un|uno)$/i.test(art) ? "m" : "f";
      if (!it) return;
      const w = { it, en: parts[1] || "", es: parts[2] || "" };
      if (g) w.g = g;
      out.push(w);
    });
    return out;
  }
  function cleanWord(w) {
    const o = { it: (w.it || "").trim() };
    if (w.g === "m" || w.g === "f") o.g = w.g;
    ["en", "es"].forEach(k => { const v = (w[k] || "").trim(); if (v) o[k] = v; });
    return o;
  }
  function saveList(id, title, words, extra) {
    words = words.map(cleanWord).filter(w => w.it && (w.en || w.es));
    const seen = new Set();
    words = words.filter(w => !seen.has(w.it) && seen.add(w.it));
    id = id || "l-" + (crypto.randomUUID ? crypto.randomUUID().slice(0, 13) : Date.now().toString(36));
    const row = Object.assign({ id, title, words, kind: "vocab", group_id: null, topic: null }, extra || {});
    const l = S.lists.find(x => x.id === id);
    if (l) Object.assign(l, row); else S.lists.push(row);
    save();
    emit("list-upsert", { id, title, words, kind: row.kind, group_id: row.group_id, topic: row.topic });
    return id;
  }
  function deleteList(id) {
    if (!S.lists.find(x => x.id === id)) return;
    Object.keys(S.p).forEach(k => { if (k.startsWith(id + ":")) delete S.p[k]; });
    S.lists = S.lists.filter(x => x.id !== id);
    save();
    emit("list-delete", { id });
  }

  // ---------- groups ----------
  // groups are created and joined on the server (cloud.js); this keeps the local copy in step
  function setGroups(groups) { S.groups = groups; save(); }
  function teaching() { return S.groups.filter(g => g.role === "teacher"); }

  // ---------- helpers ----------
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  window.IIG = {
    S, LEVELS, save, on, useUser, applyServer, today, prog, state, isDue, grade, logAnswer, logSession,
    plan, markStreak, streak, streakOf, setSetting, setLevel, setName, setBest, setGroups, teaching, shuffle, esc,
    LEVEL_UP, levelProgress, checkLevelUp, whenLevelUp, place, tr,
    listWords, myListWords, wordPool, drillPool, drillPlan, norm, check, checkForm, say, canSpeak,
    parseList, saveList, deleteList
  };
})();
