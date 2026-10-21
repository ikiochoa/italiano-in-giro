// Italiano in giro — the weekly race (resets on Monday), progress side by side, and the teacher's weekly challenge
(function () {
  const M = window.IIG, UI = window.UI, esc = M.esc;
  const app = document.getElementById("app");
  const MEDAL = ["🥇", "🥈", "🥉"];
  const TARGETS = [100, 200, 300, 500, 800, 1200];
  const me = () => CLOUD.user && CLOUD.user.id;
  const first = n => (n || "Someone").split(" ")[0];

  // members joined with their points this week (teachers only once they've played)
  function standings(g, board) {
    const pts = {};
    ((board && board.rows) || []).forEach(r => { pts[r.user_id] = r; });
    return g.members
      .map(m => Object.assign({ points: 0, sessions: 0, days: 0, list_started: 0, list_known: 0 }, pts[m.id], m))
      .filter(m => m.role === "student" || m.points > 0)
      .sort((a, b) => b.points - a.points || (a.display_name || "").localeCompare(b.display_name || ""));
  }
  function lastWinner(g, board) {
    const rows = ((board && board.last) || []).filter(r => r.points > 0).sort((a, b) => b.points - a.points);
    if (!rows.length) return null;
    const m = g.members.find(x => x.id === rows[0].user_id);
    return m ? { name: m.display_name, points: rows[0].points, me: m.id === me() } : null;
  }
  const daysLeft = () => Math.max(1, Math.ceil((M.weekStart(1) - new Date()) / 86400000));
  const resets = () => { const d = daysLeft(); return d === 1 ? "Resets tonight at midnight" : "Resets on Monday · " + d + " days left"; };
  const thisBoard = g => { const b = M.S.boards[g.id]; return b && b.week === M.isoDay(M.weekStart(0)) ? b : null; };

  // ---------- the home screen's group card: this week's top three, and you ----------
  UI.raceSummary = function (g) {
    const b = thisBoard(g), rows = standings(g, b);
    if (!rows.length) return "";
    const mine = rows.findIndex(m => m.id === me());
    const shown = rows.slice(0, 3);
    if (mine > 2) shown.push(rows[mine]);
    const row = m => {
      const i = rows.indexOf(m);
      return "<li>" + '<span class="rank">' + (m.points ? MEDAL[i] || i + 1 : "·") + "</span>" + UI.avatar(m) +
        '<span class="who">' + esc(first(m.display_name)) + (m.id === me() ? " (you)" : "") + "</span>" +
        '<span class="pts">' + m.points + "</span></li>";
    };
    return '<div class="race-mini"><div class="race-head"><span class="label">This week</span><span class="note">' + esc(resets()) + "</span></div>" +
      (b && b.challenge ? '<p class="challenge-line">🎯 ' + esc(b.challenge.title) + "</p>" : "") +
      '<ol class="race">' + shown.map(row).join("") + "</ol>" +
      '<button class="btn block" data-act="race" data-id="' + esc(g.id) + '">See the race and progress</button></div>';
  };

  // ---------- the race screen ----------
  UI.screens.race = function (groupId, fetched) {
    const g = M.S.groups.find(x => x.id === groupId);
    if (!g) return UI.go("home");
    const b = thisBoard(g), rows = standings(g, b), ch = b && b.challenge;
    const lead = Math.max(1, ...rows.map(m => m.points));
    const teacher = g.role === "teacher";
    const chList = ch && ch.list_id && M.S.lists.find(l => l.id === ch.list_id);

    const raceRows = rows.map((m, i) => {
      const streak = M.streakOf(m.streak_n, m.streak_last);
      const bits = [UI.plural(m.sessions, "session", "sessions"), UI.plural(m.days, "day", "days")];
      if (streak) bits.push("🔥 " + streak);
      const done = ch && m.points >= ch.target;
      return '<li class="' + (m.id === me() ? "is-me" : "") + '"><span class="rank">' + (m.points ? MEDAL[i] || i + 1 : "·") + "</span>" + UI.avatar(m) +
        '<span class="who"><b>' + esc(m.display_name || "Someone") + (m.id === me() ? " (you)" : "") + "</b>" + (done ? ' <span class="tag ok">Challenge done</span>' : "") +
        '<span class="race-bar"><i style="width:' + (m.points / lead * 100) + '%"></i></span>' +
        '<span class="meta">' + bits.join(" · ") + "</span></span>" +
        '<span class="pts">' + m.points + "<small>pts</small></span></li>";
    }).join("");

    const win = lastWinner(g, b);
    const challenge = ch
      ? '<div class="card-box challenge"><span class="label">🎯 This week’s challenge</span><h3>' + esc(ch.title) + "</h3>" +
        '<p class="note">Reach ' + ch.target + " points by Sunday" + (chList ? " and learn the words of <b>" + esc(chList.title) + "</b>" : "") + ".</p>" +
        '<ul class="members">' + rows.map(m => {
          const pct = Math.min(100, Math.round(m.points / ch.target * 100));
          const words = chList ? " · " + m.list_known + " of " + chList.words.length + " words" : "";
          return "<li>" + UI.avatar(m) + '<span class="who">' + esc(first(m.display_name)) + '<span class="race-bar goal"><i style="width:' + pct + '%"></i></span>' +
            '<span class="meta">' + Math.min(m.points, ch.target) + " of " + ch.target + " points" + words + "</span></span></li>";
        }).join("") + "</ul>" +
        (chList ? '<button class="btn block" data-act="chlist">Practise ' + esc(chList.title) + "</button>" : "") +
        (teacher ? '<div class="btn-row"><button class="btn" data-act="setch">Change</button><button class="danger" data-act="delch">Remove</button></div>' : "") + "</div>"
      : teacher ? '<div class="card-box"><p>Give your students a goal for this week: points to reach, and a word list to learn if you like.</p><button class="btn primary" data-act="setch">Set this week’s challenge</button></div>' : "";

    UI.render(
      UI.backBar() +
      '<div class="unit-head"><p class="date">' + esc(g.name) + '</p><h1>This week’s race</h1><p class="note">' + esc(resets()) +
      ". 10 points for each word right first time, 20 for each practice you finish.</p></div>" +
      (!b ? '<p class="note" id="race-load">Loading…</p>' : "") +
      challenge +
      (rows.length ? '<ol class="race big">' + raceRows + "</ol>" : '<div class="card-box"><p>No students yet. Share the join code from the home screen.</p></div>') +
      (win ? '<p class="last-week">🏆 Last week: ' + (win.me ? "you won" : esc(first(win.name)) + " won") + " with " + win.points + " points.</p>" : "") +
      progressHTML(g) +
      '<p class="note sync-note">Offline: showing the race as it was when you were last online.</p>',
      {
        home: () => UI.go("home"),
        setch: () => UI.go("challenge", g.id),
        delch: async t => {
          if (!t.dataset.sure) { t.dataset.sure = "1"; t.textContent = "Sure? Tap again"; return; }
          t.disabled = true;
          await CLOUD.clearChallenge(g.id);
          await CLOUD.board(g.id);
          UI.go("race", g.id);
        },
        chlist: () => UI.go("list", ch.list_id)
      });
    if (!fetched) refresh(g.id, "race", g.id);
  };

  // fetch the latest race; redraw the screen if the person is still looking at it and something changed
  const loading = {};
  const same = (a, b) => !!a && !!b && JSON.stringify([a.week, a.rows, a.last, a.challenge]) === JSON.stringify([b.week, b.rows, b.last, b.challenge]);
  async function refresh(groupId, screen, arg) {
    if (loading[groupId]) return;
    const before = M.S.boards[groupId];
    // the home screen asks at most once a minute
    if (screen === "home" && before && Date.now() - new Date(before.at) < 60000) return;
    loading[groupId] = true;
    const groupsBefore = JSON.stringify(M.S.groups);
    const [b] = await Promise.all([CLOUD.board(groupId), screen === "race" ? CLOUD.refreshGroups().catch(() => {}) : null]);
    loading[groupId] = false;
    if (UI.current !== screen) return;
    if (!b) {
      const el = app.querySelector("#race-load");
      if (el) el.textContent = "Couldn’t load the race. Check your connection.";
      return;
    }
    const busy = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (busy || (same(before, b) && JSON.stringify(M.S.groups) === groupsBefore)) return;
    const y = window.scrollY;
    UI.screens[screen](arg, true);
    window.scrollTo(0, y);
  }
  UI.refreshRace = groupId => refresh(groupId, "home");

  // ---------- progress side by side: how far along each CILS level everyone is ----------
  function progressHTML(g) {
    const people = g.members.filter(m => m.role === "student" || (m.stats && m.stats.known));
    if (!people.length) return "";
    const recent = up => up && Date.now() - new Date(up.at) < 7 * 86400000;
    const row = m => {
      const st = m.stats || {}, lv = st.lv || {}, level = m.level || "A1";
      const i = M.LEVELS.indexOf(level), last = i === M.LEVELS.length - 1;
      const pct = Math.min(100, Math.round((lv[level] || 0) / M.LEVEL_UP * 100));
      const cells = M.LEVELS.map((l, j) => {
        const v = j < i ? 1 : Math.min(1, (lv[l] || 0) / M.LEVEL_UP);
        return '<span class="cell' + (l === level ? " now" : "") + '" style="--v:' + v.toFixed(2) + '" title="' + l + " " + Math.round(v * 100) + '%">' + l + "</span>";
      }).join("");
      return "<li>" + UI.avatar(m) + '<span class="who"><b>' + esc(first(m.display_name)) + (m.id === me() ? " (you)" : "") + "</b>" +
        (recent(st.up) ? ' <span class="tag ok">🎉 Up to ' + esc(st.up.level) + "</span>" : "") +
        '<span class="lvl sm"><span class="lvl-tag">' + esc(level) + '</span><span class="lvl-bar"><i style="width:' + pct + '%"></i></span><span class="lvl-tag next">' +
        (last ? "★" : esc(M.LEVELS[i + 1])) + "</span></span>" +
        '<span class="cells">' + cells + "</span>" +
        '<span class="meta">' + (st.known != null ? UI.plural(st.known, "word", "words") + " known" : "No practice yet") + "</span></span></li>";
    };
    return '<section class="sec"><div class="sec-head"><h2>Progress side by side</h2></div><div class="card-box">' +
      '<p class="note">Each bar is the way to the next level: 80% of a level’s words and verb forms.</p>' +
      '<ul class="members progress-list">' + people.map(row).join("") + "</ul></div></section>";
  }

  // ---------- the teacher sets this week's challenge ----------
  UI.screens.challenge = function (groupId) {
    const g = M.S.groups.find(x => x.id === groupId);
    if (!g || g.role !== "teacher") return UI.go("home");
    const b = thisBoard(g), ch = (b && b.challenge) || { title: "", target: 300, list_id: null };
    const lists = M.S.lists.filter(l => l.group_id === g.id && l.kind !== "verbs");
    UI.render(
      UI.backBar() +
      '<section class="auth quad"><p class="date">' + esc(g.name) + "</p><h1>This week’s challenge</h1>" +
      '<p class="note">Your students see it on their race screen until Sunday night.</p>' +
      '<label class="field"><span class="label">The challenge</span><input id="c-title" maxlength="120" value="' + esc(ch.title) + '" placeholder="Practise every day and learn the kitchen words"></label>' +
      '<label class="field"><span class="label">Points to reach</span><select id="c-target">' +
      TARGETS.concat(TARGETS.includes(ch.target) ? [] : [ch.target]).map(t => '<option value="' + t + '"' + (t === ch.target ? " selected" : "") + ">" + t + " points (about " + Math.max(1, Math.round(t / 130)) + " practices)</option>").join("") + "</select></label>" +
      '<label class="field"><span class="label">Word list to learn (optional)</span><select id="c-list"><option value="">No list</option>' +
      lists.map(l => '<option value="' + esc(l.id) + '"' + (l.id === ch.list_id ? " selected" : "") + ">" + esc(l.title) + "</option>").join("") + "</select></label>" +
      (lists.length ? "" : '<p class="note">To add a list, create one with <b>+ Add words</b> and choose “Everyone in ' + esc(g.name) + '”.</p>') +
      '<p class="form-err" id="c-err" role="alert"></p>' +
      '<button class="btn primary block" data-act="save">Save the challenge</button></section>',
      {
        home: () => UI.go("race", g.id),
        save: async t => {
          const title = app.querySelector("#c-title").value.trim();
          if (!title) { app.querySelector("#c-title").focus(); return; }
          t.disabled = true; t.textContent = "Saving…";
          const r = await CLOUD.setChallenge(g.id, { title, target: +app.querySelector("#c-target").value, list_id: app.querySelector("#c-list").value });
          if (r.error) {
            t.disabled = false; t.textContent = "Save the challenge";
            app.querySelector("#c-err").textContent = "Couldn’t reach the server. Check your connection and try again.";
            return;
          }
          await CLOUD.board(g.id);
          UI.go("race", g.id);
        }
      });
  };
})();
