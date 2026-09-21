(() => {
  const CONFIG = window.RADAR_CLOUD_CONFIG || null;
  const LOCAL = {
    shortlist: "dcb_shortlist",
    pipeline: "dcb_pipeline",
    notes: "dcb_market_notes_v1"
  };

  if (!CONFIG || !CONFIG.url || !CONFIG.publishableKey) {
    window.RADAR_CLOUD = { enabled: false };
    return;
  }

  const base = CONFIG.url.replace(/\/$/, "");
  const key = CONFIG.publishableKey;
  const authKey = "dcb_cloud_session_v1";

  function getSession() {
    try { return JSON.parse(localStorage.getItem(authKey) || "null"); }
    catch { return null; }
  }

  function setSession(session) {
    localStorage.setItem(authKey, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(authKey);
  }

  function headers(session, extra = {}) {
    const h = {
      apikey: key,
      "content-type": "application/json",
      ...extra
    };
    if (session?.access_token) h.Authorization = "Bearer " + session.access_token;
    return h;
  }

  async function api(path, options = {}) {
    const session = getSession();
    const response = await fetch(base + path, {
      ...options,
      headers: headers(session, options.headers || {})
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      const error = new Error(payload?.message || payload?.error_description || payload?.error || "Supabase request failed");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function requestMagicLink(email) {
    const redirectTo = location.origin + location.pathname;
    return api("/auth/v1/otp", {
      method: "POST",
      body: JSON.stringify({
        email,
        create_user: true,
        options: { emailRedirectTo: redirectTo }
      })
    });
  }

  function parseSessionFromHash() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const expires_in = Number(hash.get("expires_in") || 0);
    const token_type = hash.get("token_type") || "bearer";
    if (!access_token) return null;
    return {
      access_token,
      refresh_token,
      token_type,
      expires_at: expires_in ? Date.now() + expires_in * 1000 : null
    };
  }

  async function refreshSessionIfNeeded() {
    const session = getSession();
    if (!session?.refresh_token || !session?.expires_at) return session;
    if (session.expires_at - Date.now() > 60000) return session;

    const response = await fetch(base + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: {
        apikey: key,
        "content-type": "application/json"
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!response.ok) {
      clearSession();
      return null;
    }
    const payload = await response.json();
    const next = {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token || session.refresh_token,
      token_type: payload.token_type || "bearer",
      expires_at: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null
    };
    setSession(next);
    return next;
  }

  async function getUser() {
    await refreshSessionIfNeeded();
    const session = getSession();
    if (!session?.access_token) return null;
    try {
      return await api("/auth/v1/user", { method: "GET" });
    } catch (error) {
      if (error.status === 401) clearSession();
      return null;
    }
  }

  function localShortlist() {
    try { return JSON.parse(localStorage.getItem(LOCAL.shortlist) || "[]"); }
    catch { return []; }
  }

  function localPipeline() {
    try { return JSON.parse(localStorage.getItem(LOCAL.pipeline) || "{}"); }
    catch { return {}; }
  }

  function localNotes() {
    try { return JSON.parse(localStorage.getItem(LOCAL.notes) || "{}"); }
    catch { return {}; }
  }

  async function marketMap() {
    const rows = await api("/rest/v1/markets?select=id,slug", { method: "GET" });
    return Object.fromEntries((rows || []).map(row => [row.slug, row.id]));
  }

  async function pushLocalWorkspace() {
    const user = await getUser();
    if (!user?.id) throw new Error("Not signed in");
    const map = await marketMap();

    const shortlistRows = localShortlist()
      .filter(slug => map[slug])
      .map(slug => ({ user_id: user.id, market_id: map[slug] }));

    if (shortlistRows.length) {
      await api("/rest/v1/shortlisted_markets?on_conflict=user_id,market_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(shortlistRows)
      });
    }

    const pipelineRows = Object.values(localPipeline())
      .filter(item => map[item.marketId])
      .map(item => ({
        user_id: user.id,
        market_id: map[item.marketId],
        external_key: item.key,
        entity_type: String(item.type || "").toLowerCase() === "contact" ? "contact" : "company",
        entity_name: item.name,
        company_name: item.company || item.name || null,
        title_or_role: item.title || item.role || null,
        stage: item.status || "New",
        notes: item.notes || null,
        next_follow_up_at: item.nextFollowUp || null
      }));

    if (pipelineRows.length) {
      await api("/rest/v1/pipeline_items?on_conflict=user_id,external_key", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(pipelineRows)
      });
    }

    const notes = localNotes();
    const noteRows = Object.entries(notes)
      .filter(([slug]) => map[slug])
      .map(([slug, value]) => ({
        user_id: user.id,
        market_id: map[slug],
        note: value?.text || ""
      }));

    if (noteRows.length) {
      await api("/rest/v1/market_notes?on_conflict=user_id,market_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(noteRows)
      });
    }

    return {
      shortlist: shortlistRows.length,
      pipeline: pipelineRows.length,
      notes: noteRows.length
    };
  }

  async function pullWorkspace() {
    const user = await getUser();
    if (!user?.id) throw new Error("Not signed in");
    const markets = await api("/rest/v1/markets?select=id,slug", { method: "GET" });
    const slugById = Object.fromEntries((markets || []).map(row => [row.id, row.slug]));

    const [shortlist, pipeline, notes] = await Promise.all([
      api("/rest/v1/shortlisted_markets?select=market_id&user_id=eq." + encodeURIComponent(user.id), { method: "GET" }),
      api("/rest/v1/pipeline_items?select=*&user_id=eq." + encodeURIComponent(user.id), { method: "GET" }),
      api("/rest/v1/market_notes?select=market_id,note,updated_at&user_id=eq." + encodeURIComponent(user.id), { method: "GET" })
    ]);

    localStorage.setItem(LOCAL.shortlist, JSON.stringify(
      (shortlist || []).map(row => slugById[row.market_id]).filter(Boolean)
    ));

    const pipelineMap = {};
    for (const row of pipeline || []) {
      const marketId = slugById[row.market_id];
      if (!marketId) continue;
      pipelineMap[row.external_key] = {
        key: row.external_key,
        type: row.entity_type === "contact" ? "Contact" : "Company",
        marketId,
        name: row.entity_name,
        company: row.company_name,
        title: row.title_or_role,
        role: row.title_or_role,
        status: row.stage,
        notes: row.notes || "",
        nextFollowUp: row.next_follow_up_at ? String(row.next_follow_up_at).slice(0,10) : ""
      };
    }
    localStorage.setItem(LOCAL.pipeline, JSON.stringify(pipelineMap));

    const noteMap = {};
    for (const row of notes || []) {
      const marketId = slugById[row.market_id];
      if (!marketId) continue;
      noteMap[marketId] = { text: row.note || "", updatedAt: row.updated_at || null };
    }
    localStorage.setItem(LOCAL.notes, JSON.stringify(noteMap));

    return {
      shortlist: (shortlist || []).length,
      pipeline: (pipeline || []).length,
      notes: (notes || []).length
    };
  }

  async function signOut() {
    try { await api("/auth/v1/logout", { method: "POST" }); } catch {}
    clearSession();
  }

  const hashSession = parseSessionFromHash();
  if (hashSession) {
    setSession(hashSession);
    history.replaceState(null, "", location.pathname + location.search + "#overview");
  }

  window.RADAR_CLOUD = {
    enabled: true,
    getSession,
    getUser,
    requestMagicLink,
    pushLocalWorkspace,
    pullWorkspace,
    signOut,
    clearSession
  };
})();