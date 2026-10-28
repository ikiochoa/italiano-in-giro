// Italiano in giro — built-in CILS content: word lists (levels/*.js) and verbs (verbs.js).
// Loaded before the level files, which call IIG_LEVEL("A1", `...`).
(function () {
  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const levels = {};   // A1: { topics: [{ name, words }], words: [...] }

  // "la casa | house / home | la casa", or "l'acqua (f) | water | el agua"
  const ART = /^(il |lo |la |i |gli |le |l['’]|un |uno |una |un['’])/i;
  function gender(it, mark) {
    if (mark) return mark;
    const a = (it.match(ART) || [""])[0].trim().toLowerCase();
    if (/^(il|lo|i|gli|un|uno)$/.test(a)) return "m";
    if (/^(la|le|una|un'|un’)$/.test(a)) return "f";
    return null;
  }
  window.IIG_LEVEL = function (level, text) {
    const L = levels[level] = { topics: [], words: [] };
    let topic = null;
    text.split("\n").forEach(line => {
      line = line.trim();
      if (!line) return;
      if (line.startsWith("## ")) { topic = { name: line.slice(3), words: [] }; L.topics.push(topic); return; }
      const [raw, en, es] = line.split("|").map(s => s.trim());
      const m = raw.match(/^(.*?)\s*\((m|f)\)$/);
      const it = m ? m[1] : raw;
      const w = { id: level + ":" + it, it, en, es, level, topic: topic ? topic.name : "" };
      const g = gender(it, m && m[2]);
      if (g) w.g = g;
      topic.words.push(w);
      L.words.push(w);
    });
  };

  // ready-made topic packs (topics.js): "## Name | keyword, keyword" then words as above, without ids
  const packs = [];
  window.IIG_TOPICS = function (text) {
    let pack = null;
    text.split("\n").forEach(line => {
      line = line.trim();
      if (!line) return;
      if (line.startsWith("## ")) {
        const [name, keys] = line.slice(3).split("|").map(s => s.trim());
        pack = { name, keys: (keys || "").split(",").map(s => s.trim()).filter(Boolean), words: [] };
        packs.push(pack);
        return;
      }
      const [raw, en, es] = line.split("|").map(s => s.trim());
      const m = raw.match(/^(.*?)\s*\((m|f|m\/f)\)$/);
      const it = m ? m[1] : raw;
      const w = { it, en, es };
      const g = gender(it, m && m[2] !== "m/f" && m[2]);
      if (g && !(m && m[2] === "m/f")) w.g = g;
      pack.words.push(w);
    });
  };

  // verbs: the meaning of each verb is a word of its level; each verb × tense is a drill
  function verbItems() {
    const V = window.IIG_VERBS;
    if (!V) return;
    const tlevel = {};
    V.tenses.forEach(t => { tlevel[t.key] = t.level; });
    V.verbs.forEach(v => {
      v.id = "v:" + v.it;
      const L = levels[v.level];
      let topic = L.topics.find(t => t.name === "Verbs");
      if (!topic) { topic = { name: "Verbs", words: [] }; L.topics.push(topic); }
      const w = { id: v.id, it: v.it, en: v.en, es: v.es, level: v.level, topic: "Verbs", verb: v };
      topic.words.push(w);
      L.words.push(w);
    });
    // a drill belongs to the later of: the level the verb is taught, the level the tense is taught
    LEVELS.forEach(l => { levels[l].drills = []; });
    V.verbs.forEach(v => {
      V.tenses.forEach(t => {
        const at = LEVELS.indexOf(v.level) > LEVELS.indexOf(t.level) ? v.level : t.level;
        // some verbs have no forms in a tense (potere, dovere: no imperative); that's shown once, never drilled
        const none = !(v.t[t.key] || []).some(Boolean);
        levels[at].drills.push({ id: "c:" + v.it + ":" + t.key, verb: v, tense: t.key, level: at, none });
      });
    });
  }

  let ready = false;
  function content() {
    if (!ready) { verbItems(); ready = true; }
    return { LEVELS, levels, packs, tenses: (window.IIG_VERBS || {}).tenses || [] };
  }
  window.IIG_CONTENT = content;
})();
