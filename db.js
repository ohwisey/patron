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
  const URL = (localStorage.getItem('po_supabase_url') || '').trim();
  const KEY = (localStorage.getItem('po_supabase_key') || '').trim();
  const ready = !!(URL && KEY && window.supabase && URL.indexOf('PASTE-') !== 0);
  const sb = ready ? window.supabase.createClient(URL, KEY) : null;

  function isCloud() { return ready; }

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
  function _autoSync(keys) {
    const flag = 'patron_hydrated_' + location.pathname;
    const last = {}; // last value seen per key, so we only push real changes
    function pushChanged() {
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i], v = localStorage.getItem(k);
        if (v != null && v !== last[k]) {
          last[k] = v;
          let val; try { val = JSON.parse(v); } catch (_) { val = v; }
          _cloudSet(k, val);
        }
      }
    }
    (async function () {
      try {
        if (!sessionStorage.getItem(flag)) {
          let changed = false;
          for (let i = 0; i < keys.length; i++) {
            const k = keys[i], remote = await _cloudGet(k);
            if (remote !== undefined && remote !== null) {
              const rstr = (typeof remote === 'string') ? remote : JSON.stringify(remote);
              if (localStorage.getItem(k) !== rstr) { try { localStorage.setItem(k, rstr); } catch (_) {} changed = true; }
              last[k] = rstr; // already in cloud — don't re-push
            } else {
              const local = localStorage.getItem(k);
              if (local != null) { last[k] = local; let val; try { val = JSON.parse(local); } catch (_) { val = local; } _cloudSet(k, val); } // seed cloud from this device
            }
          }
          sessionStorage.setItem(flag, '1');
          if (changed) { location.reload(); return; } // a different device's data arrived → show it
        } else {
          for (let i = 0; i < keys.length; i++) last[keys[i]] = localStorage.getItem(keys[i]); // baseline: only push future edits
        }
      } catch (_) {}
      // Poll for saves instead of overriding localStorage.setItem (which Safari blocks).
      setInterval(pushChanged, 2000);
    })();
  }
  if (ready) {
    let page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!page) page = 'index.html';
    const keys = PAGE_KEYS[page];
    if (keys && keys.length) _autoSync(keys);
  }

  return { isCloud, get, set, subscribe, uploadImage, deleteImage };
})();
