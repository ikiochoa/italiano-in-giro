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
      const st = M.state(w);
      return '<li><span class="dot ' + st + '"></span><span class="w">' + UI.itHTML(w) + '<br><span class="trs">' + esc([w.en, w.es].filter(Boolean).join(" · ")) + "</span></span>" +
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
        edit: () => UI.go("editlist", { id: l.id, title: l.title, group_id: l.group_id, words: l.words.map(w => ({ ...w })) }),
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

  // ---------- add words: paste or type ----------
  UI.screens.addlist = function (arg) {
    const text = (arg && arg.text) || "";
    UI.render(
      UI.backBar() +
      '<div class="unit-head"><h1>Add words</h1><p class="note">A topic you need, like a flat renovation or your job. You can check everything before saving.</p></div>' +
      '<div class="form"><label class="field"><span class="label">One word per line</span><textarea id="w" lang="it" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="' +
      esc("il muro = wall = la pared\nla piastrella = tile\nverniciare = to paint = pintar") + '">' + esc(text) + "</textarea></label>" +
      '<p class="note">Italian first, then the English and/or Spanish after an <b>=</b>. Put the article on nouns (il, la, l’…) so the gender is learnt too.</p>' +
      '<button class="btn primary block" data-act="next" disabled>Check the words</button></div>',
      {
        home: () => UI.go("home"),
        input: () => { app.querySelector('[data-act="next"]').disabled = !app.querySelector("#w").value.trim(); },
        next: () => UI.go("editlist", { title: "", words: M.parseList(app.querySelector("#w").value) })
      });
    if (text) UI.acts.input();
  };

  // ---------- review and edit a list ----------
  UI.screens.editlist = function (arg) {
    const id = arg.id || null;
    const words = (arg.words || []).map(w => ({ it: w.it || "", g: w.g || "", en: w.en || "", es: w.es || "" }));
    let title = arg.title || "", groupId = arg.group_id || "";
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
      '<div class="unit-head"><h1>' + (id ? "Edit list" : "Check your words") + '</h1><p class="note">Tap <b class="a-m">il</b> or <b class="a-f">la</b> to fix a noun’s gender.</p></div>' +
      '<label class="field"><span class="label">List name</span><input id="e-title" value="' + esc(title) + '" placeholder="Ristrutturare casa" autocomplete="off"></label>' +
      (teaching.length ? '<label class="field"><span class="label">Who gets it</span><select id="e-group"><option value="">Only me</option>' +
        teaching.map(g => '<option value="' + esc(g.id) + '"' + (g.id === groupId ? " selected" : "") + ">Everyone in " + esc(g.name) + "</option>").join("") + "</select></label>" : "") +
      '<ul class="wed-list" id="e-list"></ul>' +
      '<button class="btn" data-act="addrow">+ Add a word</button>' +
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
        save: () => UI.go("list", M.saveList(id, title.trim() || "My words", words, { group_id: groupId || null }))
      });
    list();
  };
})();
