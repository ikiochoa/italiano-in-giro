// Italiano in giro — navigation, sign-in, home, groups and settings
(function () {
  const M = window.IIG, esc = M.esc;
  const app = document.getElementById("app");

  const ICON = {
    speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>',
    google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7H2.1a11 11 0 0 0 0 9.9l3.7-2.7z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z"/></svg>',
    chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/></svg>'
  };

  // ---------- small pieces ----------
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const profile = () => (window.CLOUD && CLOUD.profile) || {};
  const firstName = () => { const p = profile(); return p.display_name ? p.display_name.split(" ")[0] : ""; };
  function avatar(p) {
    if (p.avatar_url) return '<img class="avatar" src="' + esc(p.avatar_url) + '" alt="" referrerpolicy="no-referrer">';
    return '<span class="avatar" aria-hidden="true">' + esc((p.display_name || "?").charAt(0).toUpperCase()) + "</span>";
  }
  const italianDate = () => new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  // ---------- navigation ----------
  const UI = { acts: {}, timer: null, screens: {}, current: null, ICON, plural, avatar };
  UI.render = function (html, acts) {
    app.classList.remove("has-sheet");
    app.innerHTML = html;
    UI.acts = acts || {};
  };
  UI.go = function (name, arg) {
    if (UI.timer) { clearInterval(UI.timer); UI.timer = null; }
    if (M.canSpeak) speechSynthesis.cancel();
    UI.current = name;
    UI.screens[name](arg);
    window.scrollTo(0, 0);
  };
  app.addEventListener("click", e => {
    const sp = e.target.closest("[data-say]");
    if (sp) M.say(sp.dataset.say, !!sp.dataset.slow);
    const t = e.target.closest("[data-act]");
    if (!t || t.disabled) return;
    const f = UI.acts[t.dataset.act];
    if (f) f(t, e);
  });
  app.addEventListener("input", e => { if (UI.acts.input) UI.acts.input(e.target, e); });
  app.addEventListener("change", e => { if (UI.acts.change) UI.acts.change(e.target, e); });
  app.addEventListener("keydown", e => { if (e.key === "Enter" && UI.acts.enter && e.target.matches("input")) { e.preventDefault(); UI.acts.enter(e.target); } });

  const logo = '<span class="logo">Italiano <b>in</b> <i>giro</i></span>';
  const topBar = right => '<header class="top">' + logo + (right || "") + "</header>";
  const backBar = label => '<header class="top"><button class="icon-btn" data-act="home" aria-label="Back to home">' + ICON.back + "</button>" + (label || "") + "</header>";
  UI.topBar = topBar; UI.backBar = backBar;

  // ---------- access ----------
  UI.screens.setup = function () {
    UI.render(topBar() + '<section class="auth quad"><h1>One more step</h1><p class="note">Copy your Supabase project URL and publishable key into <b>config.js</b>. The README has the full setup.</p></section>');
  };

  UI.screens.loading = function (arg) {
    const err = arg && arg.error;
    UI.render(topBar() + '<section class="auth quad"><p class="date">' + esc(italianDate()) + "</p>" +
      (err ? '<h1>No connection</h1><p class="note">Check that you are online and try again.</p><button class="btn primary block" data-act="retry">Try again</button>'
           : "<h1>Un attimo…</h1><p class=\"note\">Loading your words.</p>") + "</section>",
      { retry: () => location.reload() });
  };

  UI.screens.signin = function (arg) {
    const err = arg && arg.error ? '<p class="form-err" role="alert">Google sign-in didn’t work. Please try again.</p>' : "";
    UI.render(topBar() +
      '<section class="auth quad"><p class="date">Benvenuti!</p><h1>Learn Italian, one word at a time</h1>' +
      '<p class="note">Vocabulary and verbs for every CILS level, your own topic lists, and a weekly race with your friends.</p>' +
      err + '<button class="btn primary block" data-act="google">' + ICON.google + "Continue with Google</button></section>",
      {
        google: async t => {
          t.disabled = true;
          const e = await CLOUD.google();
          if (e) UI.go("signin", { error: e });
        }
      });
  };

  // ---------- home ----------
  function groupCard(g) {
    const me = CLOUD.user && CLOUD.user.id;
    const teacher = g.role === "teacher";
    const members = g.members.map(m =>
      "<li>" + avatar(m) + '<span class="who">' + esc(m.display_name || "Someone") + (m.id === me ? " (you)" : "") +
      '<br><span class="meta">' + (m.role === "teacher" ? '<span class="tag teacher">Teacher</span>' :
        "Level " + esc(m.level) + " · streak " + plural(M.streakOf(m.streak_n, m.streak_last), "day", "days")) + "</span></span></li>").join("");
    const students = g.members.filter(m => m.role === "student").length;
    return '<div class="card-box"><h3>' + esc(g.name) + "</h3>" +
      '<ul class="members">' + members + "</ul>" +
      (teacher ? '<div class="sec"><span class="label">Join code for your students</span><span class="code">' + esc(g.join_code) + "</span>" +
        '<p class="note">' + (students ? plural(students, "student has", "students have") + " joined. " : "No students yet. ") +
        "They sign in, tap <b>Join a group</b> and type this code.</p>" +
        '<button class="btn" data-act="share" data-code="' + esc(g.join_code) + '" data-name="' + esc(g.name) + '">' + ICON.share + "Send the code</button></div>" : "") +
      '<button class="danger" data-act="' + (teacher ? "delgroup" : "leave") + '" data-id="' + esc(g.id) + '">' + (teacher ? "Delete this group" : "Leave this group") + "</button></div>";
  }

  // progress towards the next level
  function levelHTML(level) {
    const P = M.levelProgress(level), last = level === M.LEVELS[M.LEVELS.length - 1];
    const pct = Math.min(100, Math.round(P.share / M.LEVEL_UP * 100));
    const next = M.LEVELS[M.LEVELS.indexOf(level) + 1];
    return '<p class="sub">You’re at level <b>' + esc(level) + "</b>. " + (last ? "That’s the top: keep your words fresh." :
      "Learn the words and verbs of " + esc(level) + " to move up to " + esc(next) + ".") + "</p>" +
      '<div class="lvl"><span class="lvl-tag">' + esc(level) + '</span><span class="lvl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Progress to the next level"><i style="width:' + pct + '%"></i></span>' +
      '<span class="lvl-tag next">' + esc(last ? "★" : next) + "</span></div>" +
      '<p class="note">' + P.words + " of " + P.totalWords + " words · " + P.drills + " of " + P.totalDrills + " verb forms</p>" +
      (P.words === 0 && M.LEVELS.indexOf(level) === 0 ? '<button class="link" data-act="placement">Already know some Italian? Take the 5-minute placement quiz →</button>' : "");
  }
  function mastery(items) {
    const n = items.length || 1;
    const learn = items.filter(w => M.state(w) === "learn").length, know = items.filter(w => M.state(w) === "know").length;
    return '<span class="mastery" role="img" aria-label="' + know + " of " + items.length + ' known"><i class="m-know" style="width:' + (know / n * 100) + '%"></i><i class="m-learn" style="width:' + (learn / n * 100) + '%"></i></span>';
  }
  function topicsHTML(shown, mine) {
    const L = window.IIG_CONTENT().levels[shown];
    return '<section class="sec" id="topics"><div class="sec-head"><h2>Words for ' + esc(shown) + "</h2></div>" +
      '<span class="seg levels" role="group" aria-label="Level">' + M.LEVELS.map(l =>
        '<button data-act="browse" data-v="' + l + '" aria-pressed="' + (l === shown) + '">' + l + (l === mine ? " •" : "") + "</button>").join("") + "</span>" +
      '<ul class="unit-list">' + L.topics.map((t, i) =>
        '<li><button class="unit-row" data-act="topic" data-level="' + shown + '" data-i="' + i + '"><span class="t"><span class="name">' + esc(t.name) + '</span><br><span class="meta">' +
        plural(t.words.length, t.name === "Verbs" ? "verb" : "word", t.name === "Verbs" ? "verbs" : "words") + "</span></span>" + mastery(t.words) + ICON.chev + "</button></li>").join("") + "</ul></section>";
  }

  // today's plan: words, then verb forms
  let pl = null, dp = null;
  function todayHTML(name) {
    pl = M.plan(); dp = M.drillPlan();
    const n = pl.words.length, parts = [];
    if (pl.due.length) parts.push(pl.due.length + " to review");
    if (pl.fresh.length) parts.push(pl.fresh.length + " new");
    const mins = Math.max(2, Math.round(n * 0.4));
    return "<h1>" + (n ? plural(n, "word", "words") + " for today" : (name ? "Ciao, " + esc(name) + "!" : "Ciao!")) + "</h1>" +
      (n ? '<p class="sub">' + parts.join(" · ") + " · about " + mins + " min</p>" +
           '<button class="btn primary block" data-act="start">Inizia</button>'
         : '<p class="sub">All caught up. Words come back just as you’re about to forget them. A domani!</p>' +
           '<button class="btn block" data-act="extra">Practise a bit more</button>') +
      (dp.items.length ? '<button class="btn block" data-act="verbs">Verbs · ' + plural(dp.items.length, "form", "forms") + "</button>" : "");
  }
  function listsHTML() {
    const me = CLOUD.user && CLOUD.user.id;
    const lists = M.S.lists.filter(l => l.kind !== "verbs");
    const row = l => {
      const words = M.listWords(l), group = l.group_id && M.S.groups.find(g => g.id === l.group_id);
      const tag = l.owner_id && l.owner_id !== me ? '<span class="tag teacher">From ' + esc(group ? group.name : "your teacher") + "</span>" : group ? '<span class="tag">Shared</span>' : "";
      return '<li><button class="unit-row" data-act="list" data-id="' + esc(l.id) + '"><span class="t"><span class="name">' + esc(l.title) + '</span><br><span class="meta">' +
        plural(words.length, "word", "words") + " " + tag + "</span></span>" + mastery(words) + ICON.chev + "</button></li>";
    };
    return '<section class="sec"><div class="sec-head"><h2>Your lists</h2><button class="link" data-act="addlist">+ Add words</button></div>' +
      (lists.length ? '<ul class="unit-list">' + lists.map(row).join("") + "</ul>"
        : '<div class="card-box"><p>Learning words for something specific, like a flat renovation? Add your own list and it joins your daily plan.</p></div>') + "</section>";
  }

  UI.screens.home = function () {
    const p = profile(), name = firstName();
    const lang = M.S.set.lang, level = M.S.level;
    const known = Object.values(M.S.p).filter(x => x.b >= 3).length;
    const groups = M.S.groups;

    UI.render(
      topBar(avatar(p)) +
      '<section class="today quad"><p class="date">' + esc(italianDate()) + "</p>" +
      todayHTML(name) +
      '<div class="tricolore" aria-hidden="true"><i></i><i></i><i></i></div></section>' +
      '<p class="sync-note">Offline: your progress is saved on this device and will sync when you’re back online.</p>' +
      '<div class="stats"><div class="stat"><b>' + M.streak() + "</b><span>" + (M.streak() === 1 ? "day in a row" : "days in a row") + "</span></div>" +
      '<div class="stat"><b>' + known + "</b><span>words you know</span></div>" +
      '<div class="stat"><b>' + esc(level) + "</b><span>CILS level</span></div></div>" +

      '<section class="sec"><div class="sec-head"><h2>' + (groups.length > 1 ? "Your groups" : "Your group") + "</h2>" +
      (groups.length ? '<button class="link" data-act="group">+ Join or create</button>' : "") + "</div>" +
      (groups.length ? groups.map(groupCard).join("") :
        '<div class="card-box"><p>Join your teacher’s group to get their word lists and race your classmates. Teachers can create a group and share its code.</p>' +
        '<div class="btn-row"><button class="btn primary" data-act="join">Join a group</button><button class="btn" data-act="create">Create a group</button></div></div>') +
      "</section>" +

      '<section class="sec"><div class="sec-head"><h2>Your level</h2></div><div class="card-box">' + levelHTML(level) + "</div></section>" +

      listsHTML() +

      topicsHTML(UI.browse || level, level) +

      '<section class="sec"><div class="sec-head"><h2>Settings</h2></div><div class="settings">' +
      '<label class="field"><span class="label">Your name</span><input id="name" value="' + esc(p.display_name || "") + '" autocomplete="name" maxlength="40"></label>' +
      '<div class="set-row"><span>Translations in</span><span class="seg"><button data-act="lang" data-v="en" aria-pressed="' + (lang === "en") + '">English</button><button data-act="lang" data-v="es" aria-pressed="' + (lang === "es") + '">Español</button></span></div>' +
      '<div class="set-row"><span>Read words aloud</span><span class="seg"><button data-act="auto" data-v="1" aria-pressed="' + (M.S.set.auto !== false) + '">On</button><button data-act="auto" data-v="0" aria-pressed="' + (M.S.set.auto === false) + '">Off</button></span></div>' +
      '<div class="set-row"><span>Placement quiz</span><button class="btn" data-act="placement">' + (level === "A1" ? "Take it" : "Take it again") + "</button></div>" +
      '<div class="set-row account"><span class="note">' + esc((CLOUD.user && CLOUD.user.email) || "") + '</span><button class="btn" data-act="signout">Sign out</button></div>' +
      "</div></section>",
      {
        join: () => UI.go("group", { mode: "join" }),
        create: () => UI.go("group", { mode: "create" }),
        group: () => UI.go("group", { mode: "join" }),
        share: async t => {
          const text = "Join my Italian group “" + t.dataset.name + "” on Italiano in giro: sign in at " + location.origin + " and use the code " + t.dataset.code;
          try {
            if (navigator.share) await navigator.share({ text });
            else { await navigator.clipboard.writeText(text); t.lastChild.textContent = "Copied!"; }
          } catch (e) {}
        },
        leave: async t => {
          if (!t.dataset.sure) { t.dataset.sure = "1"; t.textContent = "Sure? Tap again to leave"; return; }
          t.disabled = true;
          await CLOUD.leaveGroup(t.dataset.id);
          UI.go("home");
        },
        delgroup: async t => {
          if (!t.dataset.sure) { t.dataset.sure = "1"; t.textContent = "Sure? This removes everyone. Tap again"; return; }
          t.disabled = true;
          await CLOUD.deleteGroup(t.dataset.id);
          UI.go("home");
        },
        input: t => {
          if (t.id !== "name") return;
          clearTimeout(UI.nameTimer);
          UI.nameTimer = setTimeout(() => { const v = t.value.trim(); if (v) M.setName(v); }, 600);
        },
        browse: t => { UI.browse = t.dataset.v; UI.go("home"); document.getElementById("topics").scrollIntoView(); },
        topic: t => UI.go("topic", { level: t.dataset.level, i: +t.dataset.i }),
        placement: () => UI.go("placement"),
        start: () => UI.session(pl.words, { kind: "review" }),
        extra: () => UI.session(M.shuffle(M.wordPool().filter(w => M.prog(w).b > 0)).slice(0, 10), { kind: "review" }),
        verbs: () => UI.drill(dp.items),
        list: t => UI.go("list", t.dataset.id),
        addlist: () => UI.go("addlist"),
        lang: t => { M.setSetting("lang", t.dataset.v); UI.go("home"); },
        auto: t => { M.setSetting("auto", t.dataset.v === "1"); UI.go("home"); },
        signout: t => { t.disabled = true; CLOUD.signOut(); }
      }
    );
  };

  // ---------- join or create a group ----------
  UI.screens.group = function (arg) {
    const mode = (arg && arg.mode) || "join";
    const msg = {
      no_such_group: "There’s no group with that code. Check it with your teacher.",
      name: "Give the group a name.",
      network: "Couldn’t reach the server. Check your connection and try again."
    };
    const err = arg && arg.error ? '<p class="form-err" role="alert">' + msg[arg.error] + "</p>" : "";
    const join = mode === "join";
    UI.render(
      backBar() +
      '<section class="auth quad"><p class="date">' + (join ? "Benvenuto!" : "Buon lavoro!") + "</p>" +
      "<h1>" + (join ? "Join a group" : "Create a group") + "</h1>" +
      '<p class="note">' + (join ? "Type the 6-letter code your teacher gave you." :
        "You’ll be the group’s teacher: you can give word lists to everyone and see how they’re doing.") + "</p>" +
      (join ? '<label class="field"><span class="label">Code</span><input id="v" class="code-in" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123" value="' + esc((arg && arg.value) || "") + '"></label>'
            : '<label class="field"><span class="label">Group name</span><input id="v" maxlength="60" autocomplete="off" placeholder="Italiano con Giulia" value="' + esc((arg && arg.value) || "") + '"></label>') +
      err + '<button class="btn primary block" data-act="go">' + (join ? "Join" : "Create") + "</button>" +
      '<button class="link" data-act="switch">' + (join ? "I’m a teacher: create a group instead" : "I have a code: join a group instead") + "</button></section>",
      {
        home: () => UI.go("home"),
        switch: () => UI.go("group", { mode: join ? "create" : "join" }),
        go: async t => {
          const v = app.querySelector("#v").value.trim();
          if (!v) { app.querySelector("#v").focus(); return; }
          t.disabled = true; t.textContent = join ? "Joining…" : "Creating…";
          const r = join ? await CLOUD.joinGroup(v) : await CLOUD.createGroup(v);
          if (r.error) return UI.go("group", { mode, error: r.error, value: v });
          UI.go("home");
        },
        enter: () => UI.acts.go(app.querySelector('[data-act="go"]'))
      }
    );
    app.querySelector("#v").focus();
  };

  window.UI = UI;
})();
