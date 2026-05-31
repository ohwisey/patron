/* ============================================================
 * db.js — shared cloud sync for the Patron / Vitality suite.
 *
 * Matches the pattern the Gym page already uses: one Supabase
 * table called `app_state` holding { key, data, updated_at }.
 * Each page saves its blob under its own key (e.g. 'po-coach' for
 * Gym, 'patron-profile', 'patron-macros'). NO login — the user's
 * own Supabase keys (saved once in Settings) are the identity, so
 * their phone + laptop sync just by using the same project.
 *
 * Include once per page, AFTER the Supabase library:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="db.js"></script>
 *
 * If no Supabase keys are saved, everything falls back to
 * localStorage (this device only) so the app never breaks.
 *
 * Setup SQL + the "paste your keys" flow live in README.md
 * (Gym → ⚙ Settings → Cloud sync).
 * ============================================================ */
window.PatronDB = (function () {
  // Key resolution order (first non-empty wins):
  //   1. localStorage override (user pasted their own keys via ☁ panel)
  //   2. /api/config         (this deploy's Vercel env vars — keys live there,
  //                           NOT in this repo, so nothing is committed publicly)
  // No keys are hardcoded here. A fresh deploy with no env vars set stays
  // local-only until the user adds keys (env var or the ☁ panel).
  const _ovUrl = (localStorage.getItem('po_supabase_url') || '').trim();
  const _ovKey = (localStorage.getItem('po_supabase_key') || '').trim();

  let URL = _ovUrl;
  let KEY = _ovKey;
  let ready = false;
  let sb = null;
  let _syncStarted = false;

  function _connect(u, k) {
    ready = !!(u && k && window.supabase && u.indexOf('PASTE-') !== 0);
    sb = ready ? window.supabase.createClient(u, k) : null;
  }
  // _startSync is a hoisted declaration; it's only ever CALLED after _keys exists
  // (at the bottom of this IIFE, or inside the async config loader after a fetch).
  function _startSync() {
    if (_syncStarted || !ready || !_keys || !_keys.length) return;
    _syncStarted = true;
    _autoSync(_keys);
  }
  _connect(URL, KEY); // synchronous boot — identical behavior to before

  // If the user hasn't pasted their own keys, fetch this deploy's config from the
  // server (Vercel env vars) and connect. Forkers with no env vars set get
  // {url:'',key:''} → app stays local-only until they add their own keys.
  (async function _loadConfig() {
    if (_ovUrl && _ovKey) return; // user override already wins
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      if (!r.ok) return;
      const cfg = await r.json();
      const u = (cfg && cfg.url || '').trim(), k = (cfg && cfg.key || '').trim();
      if (u && k && (u !== URL || k !== KEY)) { URL = u; KEY = k; _connect(u, k); _startSync(); }
    } catch (_) {}
  })();

  function isCloud() { return ready; }
  function cfgUrl() { return URL || ''; }
  function cfgKey() { return KEY || ''; }

  /* ---- read a blob by key (cloud if configured, else this browser) ---- */
  async function get(key) {
    if (!sb) return _local(key);
    try {
      const { data, error } = await sb.from('app_state').select('data').eq('key', key).maybeSingle();
      if (!error && data && data.data) return data.data;
    } catch (_) {}
    return _local(key); // fall back if the network/row is missing
  }

  /* ---- write a blob by key (saves to cloud AND this browser) ---- */
  async function set(key, value) {
    _saveLocal(key, value); // always keep a local copy
    if (!sb) return;
    try {
      await sb.from('app_state').upsert(
        { key, data: value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (_) {}
  }

  /* ---- live updates from other devices ---- */
  function subscribe(key, cb) {
    if (!sb) return function () {};
    const ch = sb.channel('app_state_' + key)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'app_state', filter: 'key=eq.' + key },
        payload => { if (payload.new && payload.new.data) cb(payload.new.data); })
      .subscribe();
    return function () { try { sb.removeChannel(ch); } catch (_) {} };
  }

  /* ---- image upload to Supabase Storage (for progress photos) ----
   * Returns a public URL on success, or null (caller falls back to base64).
   * This is the fix for "photos never stick": files go to a Storage bucket,
   * and only the small URL is saved in app_state — never giant base64 blobs. */
  async function uploadImage(bucket, path, dataUrl, contentType) {
    if (!sb) return null;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: contentType || 'image/jpeg', upsert: true });
      if (error) return null;
      const { data } = sb.storage.from(bucket).getPublicUrl(path);
      return (data && data.publicUrl) ? data.publicUrl : null;
    } catch (_) { return null; }
  }
  async function deleteImage(bucket, path) {
    if (!sb || !path) return;
    try { await sb.storage.from(bucket).remove([path]); } catch (_) {}
  }

  /* ---- localStorage fallback helpers ---- */
  function _local(key) { try { return JSON.parse(localStorage.getItem('patron_db_' + key) || 'null'); } catch (_) { return null; } }
  function _saveLocal(key, v) { try { localStorage.setItem('patron_db_' + key, JSON.stringify(v)); } catch (_) {} }

  /* ============================================================
   * AUTO-SYNC — makes the WHOLE suite sync with no per-page code.
   * Each page keeps saving to localStorage exactly as before; we just
   * (a) mirror its registered keys up to the cloud on every save, and
   * (b) once per session, pull the cloud copy down (reloading only if a
   * DIFFERENT device's data came in). Cloud off → none of this runs.
   * Progress + Gym are intentionally absent (they sync themselves).
   * ============================================================ */
  const PAGE_KEYS = {
    'index.html':       ['patron_profile_v1', 'patron_health_v1'],
    'finance.html':     ['finance_standalone_v1', 'finance_settings_v1'],
    'supplements.html': ['supplements_standalone_v1', 'supplements_standalone_profile_v1', 'patron_profile_v1', 'patron_health_v1'],
    'water.html':       ['water_standalone_v1', 'patron_profile_v1'],
    'creator.html':     ['creator_standalone_v1', 'patron_profile_v1'],
    'goals.html':       ['goal_streak_v1', 'goals:dayWindow', 'patron_health_v1', 'patron_profile_v1'],
    'whoop.html':       ['whoop_standalone_connected_v1'],
  };
  async function _cloudGet(key) {
    if (!sb) return undefined;
    try { const { data, error } = await sb.from('app_state').select('data').eq('key', key).maybeSingle(); if (!error && data) return data.data; } catch (_) {}
    return undefined;
  }
  function _cloudSet(key, value) {
    if (!sb) return;
    try { sb.from('app_state').upsert({ key, data: value, updated_at: new Date().toISOString() }, { onConflict: 'key' }); } catch (_) {}
  }
  // Canonicalize a JSON string so key-order differences don't look like edits.
  function _canon(s) { if (s == null) return s; try { return JSON.stringify(JSON.parse(s)); } catch (_) { return s; } }

  function _autoSync(keys) {
    const flag = 'patron_hydrated_' + location.pathname;
    const last = {}; // canonical string we believe is synced with cloud, per key

    // Push local edits up. We only push a key whose value differs from the last
    // value we synced (pushed or pulled), so we never spam the network.
    function pushChanged() {
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i], v = localStorage.getItem(k);
        if (v == null) continue;
        const c = _canon(v);
        if (c !== last[k]) {
          last[k] = c;
          let val; try { val = JSON.parse(v); } catch (_) { val = v; }
          _cloudSet(k, val);
        }
      }
    }

    // Pull cloud → local. Skips any key with unpushed local edits (so we never
    // clobber what you just changed). Returns true if a local value changed.
    async function pull(seedIfMissing) {
      let changed = false;
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const localStr = localStorage.getItem(k);
        const localCanon = localStr == null ? undefined : _canon(localStr);
        const pendingEdit = (last[k] !== undefined && localCanon !== last[k]);
        if (pendingEdit) continue; // local has unsynced edits — leave it for pushChanged
        const remote = await _cloudGet(k);
        if (remote !== undefined && remote !== null) {
          const rstr = (typeof remote === 'string') ? remote : JSON.stringify(remote);
          const rcanon = _canon(rstr);
          if (rcanon !== localCanon) { try { localStorage.setItem(k, rstr); } catch (_) {} changed = true; }
          last[k] = rcanon;
        } else if (seedIfMissing && localStr != null) {
          let val; try { val = JSON.parse(localStr); } catch (_) { val = localStr; }
          _cloudSet(k, val); // nothing in cloud yet — seed it from this device
          last[k] = localCanon;
        }
      }
      return changed;
    }

    (async function () {
      // Baseline = whatever is on this device right now, so pull() can tell a
      // real local edit apart from data we just adopted from the cloud.
      for (let i = 0; i < keys.length; i++) {
        const ls = localStorage.getItem(keys[i]);
        last[keys[i]] = ls == null ? undefined : _canon(ls);
      }
      try {
        if (!sessionStorage.getItem(flag)) {
          const changed = await pull(true); // first load this session: cloud wins, seed if empty
          sessionStorage.setItem(flag, '1');
          if (changed) { location.reload(); return; } // a different device's data arrived → show it
        }
      } catch (_) {}
      // Poll for saves instead of overriding localStorage.setItem (which Safari blocks).
      setInterval(pushChanged, 2000);
      // When you switch back to this tab/device, grab any edits made elsewhere.
      let pulling = false;
      async function refresh() {
        if (pulling || document.hidden) return;
        pulling = true;
        try { pushChanged(); if (await pull(false)) location.reload(); } catch (_) {}
        pulling = false;
      }
      document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
      window.addEventListener('focus', refresh);
    })();
  }
  // Normalize the page name so it matches PAGE_KEYS whether the URL is "/",
  // "/finance" (Vercel clean URL) or "/finance.html".
  let _page = (location.pathname.split('/').pop() || '').toLowerCase();
  if (!_page) _page = 'index.html';                 // "/" → the hub
  if (_page.indexOf('.') === -1) _page += '.html';  // "/finance" → "finance.html"
  const _keys = PAGE_KEYS[_page] || [];
  _startSync(); // synchronous case (owner host / pasted keys); async loader covers env-var case

  /* ---- MANUAL sync — explicit, can't-miss buttons (used by cloud-sync.js) ----
   * pushAll(): force every key on THIS page up to the cloud right now.
   * pullAll(): force every key on THIS page down from the cloud, then reload. */
  async function pushAll() {
    if (!sb) return { ok: false, n: 0 };
    let n = 0;
    for (let i = 0; i < _keys.length; i++) {
      const k = _keys[i], v = localStorage.getItem(k);
      if (v == null) continue;
      let val; try { val = JSON.parse(v); } catch (_) { val = v; }
      try { await sb.from('app_state').upsert({ key: k, data: val, updated_at: new Date().toISOString() }, { onConflict: 'key' }); n++; } catch (_) {}
    }
    return { ok: true, n: n };
  }
  async function pullAll() {
    if (!sb) return { ok: false, n: 0 };
    let n = 0;
    for (let i = 0; i < _keys.length; i++) {
      const k = _keys[i];
      const remote = await _cloudGet(k);
      if (remote !== undefined && remote !== null) {
        const rstr = (typeof remote === 'string') ? remote : JSON.stringify(remote);
        try { localStorage.setItem(k, rstr); n++; } catch (_) {}
      }
    }
    try { sessionStorage.setItem('patron_hydrated_' + location.pathname, '1'); } catch (_) {}
    return { ok: true, n: n };
  }

  return { isCloud, cfgUrl, cfgKey, get, set, subscribe, uploadImage, deleteImage, pushAll, pullAll, _page, _keys };
})();
