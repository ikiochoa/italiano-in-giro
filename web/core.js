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
  function setName(n) { emit("profile", { display_name: n }); }
  function setBest(key, v) { S.best[key] = v; save(); emit("profile", { best: S.best }); }

  // today's plan: due reviews first, then new words
  function plan(pool) {
    const due = pool.filter(isDue).sort((a, b) => prog(a).b - prog(b).b || prog(a).due - prog(b).due);
    const fresh = pool.filter(w => prog(w).b === 0);
    const d = due.slice(0, SESSION_SIZE);
    const n = fresh.slice(0, Math.max(0, Math.min(NEW_PER_SESSION, SESSION_SIZE - d.length)));
    return { due: d, fresh: n, words: shuffle(d).concat(n) };
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
    plan, markStreak, streak, streakOf, setSetting, setLevel, setName, setBest, setGroups, teaching, shuffle, esc
  };
})();
