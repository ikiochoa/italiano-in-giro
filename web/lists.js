// Italiano in giro — your own word lists: add, edit, share with your group (teachers), practise
(function () {
  const M = window.IIG, UI = window.UI, esc = M.esc, I = UI.ICON;
  const app = document.getElementById("app");
  const mine = l => !l.owner_id || (CLOUD.user && l.owner_id === CLOUD.user.id);
  const byId = id => M.S.lists.find(l => l.id === id);

  // ---------- one list ----------
  UI.screens.list = function (id) {
    const l = byId(id);
    if (!l) return UI.go("home");
    const words = M.listWords(l);
    const group = l.group_id && M.S.groups.find(g => g.id === l.group_id);
    const rows = words.map(w => {
      return '<li>' + UI.dotHTML(w) + '<span class="w">' + UI.itHTML(w) + '<br><span class="trs">' + esc([w.en, w.es].filter(Boolean).join(" · ")) + "</span></span>" +
        (M.canSpeak ? '<button class="speak-sm" data-say="' + esc(w.it) + '" aria-label="Listen to ' + esc(w.it) + '">' + I.speak + "</button>" : "") + "</li>";
    }).join("");
    UI.render(
      UI.backBar(mine(l) ? '<button class="link" data-act="edit">Edit</button>' : "") +
      '<div class="unit-head"><h1>' + esc(l.title) + '</h1><p class="note">' + UI.plural(words.length, "word", "words") +
      (group ? " · shared with " + esc(group.name) : "") + (!mine(l) ? " · from your teacher" : "") + "</p></div>" +
      (words.length ? '<button class="btn primary block" data-act="practice">Practise this list</button>' : "") +
      '<ul class="words">' + rows + "</ul>" +
      (mine(l) ? '<button class="danger" data-act="del">Delete this list</button>' : ""),
      {
        home: () => UI.go("home"),
        edit: () => UI.go("editlist", { id: l.id, title: l.title, topic: l.topic, group_id: l.group_id, words: l.words.map(w => ({ ...w })) }),
        // weakest first, at most 8 new ones and 15 in all
        practice: () => {
          let fresh = 0;
          const set = M.shuffle(words).sort((a, b) => M.prog(a).b - M.prog(b).b).filter(w => M.prog(w).b > 0 || fresh++ < 8).slice(0, 15);
          UI.session(set, { kind: "list", listId: l.id, pool: words, back: "list", backArg: l.id });
        },
        del: t => {
          if (t.dataset.sure) { M.deleteList(l.id); UI.go("home"); return; }
          t.dataset.sure = "1"; t.textContent = "Sure? Tap again to delete it";
        }
      });
  };

  // ---------- add words: from a topic, or pasted ----------
  const AI_ERR = {
    not_configured: "Claude isn’t switched on for this site yet. Pick one of the lists above, or paste your words.",
    no_group: "Join a group first to get lists from Claude.",
    signed_out: "Please sign in again.",
    network: "Couldn’t reach the server. Check your connection and try again.",
    failed: "That didn’t work. Try again, or describe the topic a little differently.",
    no_words: "That didn’t work. Try again, or describe the topic a little differently."
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  UI.screens.addlist = function (arg) {
    const text = (arg && arg.text) || "";
    let found = [];
    function suggestions() {
      const topic = app.querySelector("#topic").value.trim();
      found = M.findTopics(topic);
      app.querySelector("#sugg").innerHTML =
        (found.length ? '<ul class="unit-list">' + found.map((t, i) =>
          '<li><button class="unit-row" data-act="pack" data-i="' + i + '"><span class="t"><span class="name">' + esc(t.name) + "</span>" +
          (t.level ? ' <span class="tag">CILS ' + esc(t.level) + "</span>" : "") + '<br><span class="meta">' +
          UI.plural(t.words.length, "word", "words") + " · " + esc(t.words.slice(0, 4).map(w => w.it).join(", ")) + "…</span></span>" + I.chev + "</button></li>").join("") + "</ul>" : "") +
        (topic.length > 2 ? '<button class="btn block" data-act="claude">✨ ' + (found.length ? "Or ask Claude" : "Ask Claude") + " for words about “" + esc(topic) + "”</button>" +
          '<p class="note" id="ai-msg" role="status"></p>' : "");
    }
    UI.render(
      UI.backBar() +
      '<div class="unit-head"><h1>Add words</h1><p class="note">Type a topic you need, like a flat renovation or your job, and pick the words to learn. Or paste your own below.</p></div>' +
      '<label class="field"><span class="label">Topic</span><input id="topic" autocomplete="off" placeholder="Flat renovation, la cucina, el médico…" maxlength="80"></label>' +
      '<div id="sugg"></div>' +
      '<div class="form"><label class="field"><span class="label">Or paste your own words, one per line</span><textarea id="w" lang="it" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="' +
      esc("il muro = wall = la pared\nla piastrella = tile\nverniciare = to paint = pintar") + '">' + esc(text) + "</textarea></label>" +
      '<p class="note">Italian first, then the English and/or Spanish after an <b>=</b>. Put the article on nouns (il, la, l’…) so the gender is learnt too.</p>' +
      '<button class="btn primary block" data-act="next" disabled>Check the words</button></div>',
      {
        home: () => UI.go("home"),
        input: t => {
          if (t.id === "topic") return suggestions();
          app.querySelector('[data-act="next"]').disabled = !app.querySelector("#w").value.trim();
        },
        enter: t => { if (t.id === "topic" && found.length) UI.acts.pack({ dataset: { i: 0 } }); },
        pack: t => {
          const p = found[+t.dataset.i];
          UI.go("editlist", { title: p.name, topic: p.name, words: p.words.map(w => ({ ...w })), from: "pack" });
        },
        claude: async t => {
          const topic = app.querySelector("#topic").value.trim();
          t.disabled = true; t.textContent = "Writing your list… about 20 seconds";
          const r = await CLOUD.topicWords(topic, M.S.level, []);
          if (UI.current !== "addlist") return;
          if (r.words) return UI.go("editlist", { title: cap(topic), topic, words: r.words, from: "claude" });
          t.disabled = false; t.textContent = "✨ Try again";
          app.querySelector("#ai-msg").textContent = AI_ERR[r.error] || AI_ERR.failed;
        },
        next: () => UI.go("editlist", { title: "", words: M.parseList(app.querySelector("#w").value) })
      });
    if (text) UI.acts.input(app.querySelector("#w"));
    else app.querySelector("#topic").focus();
  };

  // ---------- review and edit a list ----------
  UI.screens.editlist = function (arg) {
    const id = arg.id || null;
    const words = (arg.words || []).map(w => ({ it: w.it || "", g: w.g || "", en: w.en || "", es: w.es || "" }));
    let title = arg.title || "", groupId = arg.group_id || "";
    const topic = arg.topic || "";
    const teaching = M.teaching();
    const valid = w => w.it.trim() && (w.en.trim() || w.es.trim());

    function row(w, i) {
      const miss = w.it.trim() && !valid(w);
      return '<li class="wed' + (miss ? " miss" : "") + '" data-i="' + i + '">' +
        '<div class="wed-top"><input class="wed-it" data-f="it" value="' + esc(w.it) + '" aria-label="Italian" lang="it" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="la parola">' +
        '<span class="seg sm" role="group" aria-label="Gender"><button data-act="g" data-v="m" aria-pressed="' + (w.g === "m") + '" class="a-m">il</button><button data-act="g" data-v="f" aria-pressed="' + (w.g === "f") + '" class="a-f">la</button><button data-act="g" data-v="" aria-pressed="' + (!w.g) + '">–</button></span>' +
        '<button class="icon-btn sm" data-act="rm" aria-label="Remove ' + esc(w.it) + '">' + I.close + "</button></div>" +
        '<div class="wed-tr"><label><span>EN</span><input data-f="en" value="' + esc(w.en) + '" placeholder="English"></label>' +
        '<label><span>ES</span><input data-f="es" value="' + esc(w.es) + '" placeholder="español"></label></div></li>';
    }
    function count() {
      const n = words.filter(valid).length, miss = words.filter(w => w.it.trim() && !valid(w)).length;
      const b = app.querySelector('[data-act="save"]');
      b.disabled = !n;
      b.textContent = n ? "Save " + UI.plural(n, "word", "words") : "Save";
      app.querySelector("#e-miss").textContent = miss ? UI.plural(miss, "word has", "words have") + " no translation yet and won’t be saved." : "";
    }
    function list() { app.querySelector("#e-list").innerHTML = words.map(row).join(""); count(); }

    UI.render(
      UI.backBar() +
      '<div class="unit-head"><h1>' + (id ? "Edit list" : "Check your words") + '</h1><p class="note">' +
      (arg.from ? "Remove the words you don’t need with ×, or add your own. " : "") +
      'Tap <b class="a-m">il</b> or <b class="a-f">la</b> to fix a noun’s gender.</p></div>' +
      '<label class="field"><span class="label">List name</span><input id="e-title" value="' + esc(title) + '" placeholder="Ristrutturare casa" autocomplete="off"></label>' +
      (teaching.length ? '<label class="field"><span class="label">Who gets it</span><select id="e-group"><option value="">Only me</option>' +
        teaching.map(g => '<option value="' + esc(g.id) + '"' + (g.id === groupId ? " selected" : "") + ">Everyone in " + esc(g.name) + "</option>").join("") + "</select></label>" : "") +
      '<ul class="wed-list" id="e-list"></ul>' +
      '<div class="btn-row"><button class="btn" data-act="addrow">+ Add a word</button>' +
      (CLOUD.configured ? '<button class="btn" data-act="more">✨ More words</button>' : "") + "</div>" +
      '<p class="note" id="e-miss" role="status"></p>' +
      '<button class="btn primary block" data-act="save">Save</button>',
      {
        home: () => UI.go(id ? "list" : "home", id || undefined),
        input: t => {
          if (t.id === "e-title") { title = t.value; return; }
          const li = t.closest(".wed"); if (!li || !t.dataset.f) return;
          const w = words[+li.dataset.i];
          w[t.dataset.f] = t.value;
          if (t.dataset.f === "it") {
            const a = (t.value.match(/^(il|lo|la|i|gli|le) /i) || [])[1];
            if (a) { w.g = /^(il|lo|i|gli)$/i.test(a) ? "m" : "f"; li.querySelectorAll('[data-act="g"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === w.g)); }
          }
          li.classList.toggle("miss", !!(w.it.trim() && !valid(w)));
          count();
        },
        change: t => { if (t.id === "e-group") groupId = t.value; },
        g: t => {
          const li = t.closest(".wed"), w = words[+li.dataset.i];
          w.g = t.dataset.v;
          li.querySelectorAll('[data-act="g"]').forEach(b => b.setAttribute("aria-pressed", b === t));
        },
        rm: t => { words.splice(+t.closest(".wed").dataset.i, 1); list(); },
        addrow: () => {
          words.push({ it: "", g: "", en: "", es: "" });
          list();
          app.querySelector("#e-list li:last-child .wed-it").focus();
        },
        // Claude suggests more words on the list's topic, leaving out the ones already there
        more: async t => {
          const about = (topic || title).trim(), msg = app.querySelector("#e-miss");
          if (!about) { msg.textContent = "Give the list a name first, so Claude knows the topic."; app.querySelector("#e-title").focus(); return; }
          t.disabled = true; t.textContent = "Thinking… about 20 seconds";
          const r = await CLOUD.topicWords(about, M.S.level, words.map(w => w.it).filter(Boolean));
          if (UI.current !== "editlist") return;
          t.disabled = false; t.textContent = "✨ More words";
          if (!r.words) { msg.textContent = AI_ERR[r.error] || AI_ERR.failed; return; }
          const n = words.length;
          words.push(...r.words.map(w => ({ it: w.it, g: w.g || "", en: w.en || "", es: w.es || "" })));
          list();
          msg.textContent = "Added " + UI.plural(words.length - n, "word", "words") + " at the end. Remove the ones you don’t need with ×.";
          const first = app.querySelectorAll("#e-list li")[n];
          if (first) first.scrollIntoView({ block: "center" });
        },
        save: () => UI.go("list", M.saveList(id, title.trim() || "My words", words, { group_id: groupId || null, topic: topic || null }))
      });
    list();
  };
})();
