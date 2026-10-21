// Italiano in giro — Google sign-in and sync with Supabase.
// Every change (M.on) goes into a queue saved on the device and is sent in batches;
// without a connection it's retried later, so nothing is lost.
(function () {
  const M = window.IIG;
  const C = window.IIG_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(C.supabaseUrl || "") && C.supabaseKey && !/YOUR/.test(C.supabaseKey);
  const sb = configured ? window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
  }) : null;

  const CLOUD = { sb, configured, user: null, profile: null, status: "ok" };
  let uid = null, qKey = null, queue = [], timer = null, flushing = false;

  function loadQueue() { try { queue = JSON.parse(localStorage.getItem(qKey) || "[]"); } catch (e) { queue = []; } }
  function saveQueue() { try { localStorage.setItem(qKey, JSON.stringify(queue)); } catch (e) {} }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(flush, ms == null ? 1200 : ms); }
  function setStatus(s) { CLOUD.status = s; document.documentElement.dataset.sync = s; }
  function saveProfile() { try { localStorage.setItem("iig.profile." + uid, JSON.stringify(CLOUD.profile)); } catch (e) {} }

  M.on((t, d) => {
    if (!uid) return;
    if (t === "profile" && CLOUD.profile) { Object.assign(CLOUD.profile, d); saveProfile(); }
    queue.push({ t, d, at: new Date().toISOString() });
    saveQueue();
    schedule();
  });

  async function flush() {
    if (!uid || flushing || !queue.length) return;
    if (!navigator.onLine) { setStatus("offline"); return; }
    flushing = true;
    const batch = queue.slice();
    try {
      const prog = new Map(), lists = new Map(), listDel = [], answers = [], sessions = [];
      let profile = null;
      for (const op of batch) {
        const d = op.d;
        if (op.t === "progress") prog.set(d.word_id, { ...d, user_id: uid, updated_at: op.at });
        else if (op.t === "answer") answers.push({ ...d, user_id: uid, created_at: op.at });
        else if (op.t === "session") sessions.push({ ...d, user_id: uid, ended_at: op.at });
        else if (op.t === "profile") profile = { ...(profile || {}), ...d };
        else if (op.t === "list-upsert") lists.set(d.id, { ...d, owner_id: uid, updated_at: op.at });
        else if (op.t === "list-delete") {
          lists.delete(d.id); listDel.push(d.id);
          for (const k of [...prog.keys()]) if (k.startsWith(d.id + ":")) prog.delete(k);
        }
      }
      const ok = r => { if (r.error) throw r.error; };
      if (lists.size) ok(await sb.from("lists").upsert([...lists.values()]));
      for (const id of listDel) {
        ok(await sb.from("lists").delete().eq("id", id));
        ok(await sb.from("progress").delete().eq("user_id", uid).like("word_id", id.replace(/[\\%_]/g, "\\$&") + ":%"));
      }
      if (prog.size) ok(await sb.from("progress").upsert([...prog.values()], { onConflict: "user_id,word_id" }));
      if (answers.length) ok(await sb.from("answers").insert(answers));
      if (sessions.length) ok(await sb.from("sessions").insert(sessions));
      ok(await sb.from("profiles").update({ ...(profile || {}), last_seen: new Date().toISOString() }).eq("id", uid));
      queue = queue.slice(batch.length);
      saveQueue();
      setStatus("ok");
    } catch (e) {
      console.warn("Could not sync", e);
      setStatus("offline");
      schedule(20000);
    } finally {
      flushing = false;
      if (queue.length && CLOUD.status === "ok") schedule(300);
    }
  }
  window.addEventListener("online", () => schedule(0));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  async function fetchAll(table, cols, mine) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      let q = sb.from(table).select(cols);
      if (mine) q = q.eq(mine, uid);
      const { data, error } = await q.range(from, from + 999);
      if (error) throw error;
      out.push(...data);
      if (data.length < 1000) return out;
    }
  }

  // my groups, each with its members (group mates' profiles are readable through row level security)
  async function fetchGroups() {
    const mine = await sb.from("group_members").select("role, group:groups(id, name, join_code, teacher_id, created_at)").eq("user_id", uid);
    if (mine.error) throw mine.error;
    const ids = mine.data.map(r => r.group.id);
    if (!ids.length) return [];
    const all = await sb.from("group_members")
      .select("group_id, role, joined_at, profile:profiles(id, display_name, avatar_url, level, streak_n, streak_last, stats)")
      .in("group_id", ids).order("joined_at");
    if (all.error) throw all.error;
    return mine.data
      .sort((a, b) => a.group.created_at < b.group.created_at ? -1 : 1)
      .map(r => ({
        ...r.group, role: r.role,
        members: all.data.filter(m => m.group_id === r.group.id && m.profile).map(m => ({ ...m.profile, role: m.role }))
      }));
  }
  async function refreshGroups() { M.setGroups(await fetchGroups()); }

  // after signing in (or when the app opens with a saved session)
  async function begin(user) {
    if (uid === user.id) return;
    uid = user.id;
    qKey = "iig.queue." + uid;
    CLOUD.user = user;
    loadQueue();
    const hasCache = M.useUser(uid);
    try { CLOUD.profile = JSON.parse(localStorage.getItem("iig.profile." + uid) || "null"); } catch (e) {}
    if (hasCache && CLOUD.profile) UI.go("home"); else UI.go("loading");
    try {
      await flush();
      if (queue.length) throw new Error("pending");
      const [p, progress, lists, groups] = await Promise.all([
        sb.from("profiles").select("*").eq("id", uid).single(),
        fetchAll("progress", "word_id,box,due,ok,ko", "user_id"),
        fetchAll("lists", "id,owner_id,group_id,kind,title,level,topic,words,created_at"),
        fetchGroups()
      ]);
      if (p.error) throw p.error;
      lists.sort((a, b) => a.created_at < b.created_at ? -1 : 1);
      CLOUD.profile = p.data;
      saveProfile();
      M.applyServer({ profile: p.data, progress, lists, groups });
      M.publishStats();
      setStatus("ok");
      if (UI.current === "home" || UI.current === "loading") UI.go("home");
    } catch (e) {
      console.warn("No connection to the server", e);
      setStatus("offline");
      if (!hasCache || !CLOUD.profile) UI.go("loading", { error: true });
    }
  }

  CLOUD.start = async function () {
    if (!configured) return UI.go("setup");
    // coming back from Google: the error is in the address
    const q = new URLSearchParams(location.search);
    if (q.get("error")) { history.replaceState(null, "", location.pathname); return UI.go("signin", { error: "google" }); }
    const { data } = await sb.auth.getSession();
    if (data.session) return begin(data.session.user);
    UI.go("signin");
  };

  CLOUD.google = async function () {
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } }
    });
    return error ? "google" : null;
  };

  CLOUD.signOut = async function () {
    await flush();
    await sb.auth.signOut();
    uid = null;
    CLOUD.user = CLOUD.profile = null;
    UI.go("signin");
  };

  // ---------- groups ----------
  // → { error } with a short code the screens turn into a message
  const rpcErr = e => /no_such_group/.test(e.message) ? "no_such_group" : /name required/.test(e.message) ? "name" : "network";
  CLOUD.createGroup = async function (name) {
    const { error } = await sb.rpc("create_group", { group_name: name });
    if (error) return { error: rpcErr(error) };
    await refreshGroups();
    return {};
  };
  CLOUD.joinGroup = async function (code) {
    const { data, error } = await sb.rpc("join_group", { code });
    if (error) return { error: rpcErr(error) };
    await refreshGroups();
    return { group: data };
  };
  CLOUD.leaveGroup = async function (groupId, userId) {
    const { error } = await sb.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId || uid);
    if (error) return { error: "network" };
    await refreshGroups();
    return {};
  };
  CLOUD.deleteGroup = async function (groupId) {
    const { error } = await sb.from("groups").delete().eq("id", groupId);
    if (error) return { error: "network" };
    await refreshGroups();
    return {};
  };
  CLOUD.refreshGroups = refreshGroups;

  // ---------- the weekly race ----------
  // this week's and last week's points for everyone in the group, plus the teacher's challenge
  CLOUD.board = async function (groupId) {
    try {
      await flush();
      const now = M.weekStart(0), prev = M.weekStart(-1);
      const ch = await sb.from("challenges").select("title, target, list_id, week").eq("group_id", groupId).eq("week", M.isoDay(now)).maybeSingle();
      if (ch.error) throw ch.error;
      const [week, last] = await Promise.all([
        sb.rpc("group_week", { g: groupId, since: now.toISOString(), list: ch.data ? ch.data.list_id : null }),
        sb.rpc("group_week", { g: groupId, since: prev.toISOString(), until: now.toISOString() })
      ]);
      if (week.error) throw week.error;
      if (last.error) throw last.error;
      const board = { week: M.isoDay(now), rows: week.data, last: last.data, challenge: ch.data, at: new Date().toISOString() };
      M.setBoard(groupId, board);
      return board;
    } catch (e) {
      console.warn("Could not load the race", e);
      return null;
    }
  };
  CLOUD.setChallenge = async function (groupId, c) {
    await flush();   // the list it points to must be on the server first
    const row = { group_id: groupId, week: M.isoDay(M.weekStart(0)), title: c.title, target: c.target, list_id: c.list_id || null };
    const { error } = await sb.from("challenges").upsert(row, { onConflict: "group_id,week" });
    return error ? { error: "network" } : {};
  };
  CLOUD.clearChallenge = async function (groupId) {
    const { error } = await sb.from("challenges").delete().eq("group_id", groupId).eq("week", M.isoDay(M.weekStart(0)));
    return error ? { error: "network" } : {};
  };

  // ---------- words for any topic, written by Claude (netlify/functions/topic-words.mjs) ----------
  // → { words: [{ it, g, en, es }] } or { error: signed_out | no_group | not_configured | failed | no_words | network }
  CLOUD.topicWords = async function (topic, level, have) {
    try {
      const { data } = await sb.auth.getSession();
      if (!data.session) return { error: "signed_out" };
      const r = await fetch("/api/topic-words", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + data.session.access_token },
        body: JSON.stringify({ topic, level, have })
      });
      const body = await r.json().catch(() => ({}));
      return body.words || body.error ? body : { error: r.status === 404 ? "not_configured" : "failed" };
    } catch (e) {
      return { error: "network" };
    }
  };

  if (sb) sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session && !uid) begin(session.user);
  });

  window.CLOUD = CLOUD;
})();
