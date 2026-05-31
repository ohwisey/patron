# 📋 Copy-paste — everything for the video

Grab-and-go snippets, in the order the video uses them.
> Replace **`patrontest.vercel.app`** with your real Vercel URL if it's different.

---

## 0) Links

| What | Paste this |
|---|---|
| The repo | `https://github.com/ohwisey/patron` |
| One-click deploy | `https://vercel.com/new/clone?repository-url=https://github.com/ohwisey/patron` |
| VS Code | `https://code.visualstudio.com` |
| Claude Code | `https://claude.com/claude-code` |
| Node.js (for Claude Code) | `https://nodejs.org` |

---

## 1) Supabase — the ONE SQL (data table + photo storage in one run)

In Supabase → **SQL Editor → New query** → paste → **Run**:

```sql
-- 1) DATA — one table holds every page's saved state as JSON.
create table if not exists app_state (
  key        text primary key,
  data       jsonb,
  updated_at timestamptz default now()
);
alter table app_state enable row level security;
drop policy if exists "app_state rw" on app_state;
create policy "app_state rw" on app_state for all using (true) with check (true);

-- 2) PHOTOS — a public Storage bucket for progress pictures.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', true)
on conflict (id) do nothing;

-- 3) PHOTO PERMISSIONS — let the app upload / view / delete in that bucket.
drop policy if exists "progress read"   on storage.objects;
drop policy if exists "progress write"  on storage.objects;
drop policy if exists "progress delete" on storage.objects;
create policy "progress read"   on storage.objects for select using (bucket_id = 'progress-photos');
create policy "progress write"  on storage.objects for insert with check (bucket_id = 'progress-photos');
create policy "progress delete" on storage.objects for delete using (bucket_id = 'progress-photos');
```

**Then:** Supabase → **Settings → API** → copy **Project URL** + **anon public** key → paste into the app's **☁ Cloud sync** button (Progress page). ⚠️ Use the **anon public** key, never `service_role`.

---

## 2) APIs — Vercel Environment Variables (copy-paste the NAMES)

Vercel → your project → **Settings → Environment Variables**. Paste the **name** on the left; the **value** is your own key. All optional — the app works without them.

```
WHOOP_CLIENT_ID
WHOOP_CLIENT_SECRET
FITBIT_CLIENT_ID
FITBIT_CLIENT_SECRET
YOUTUBE_API_KEY
```

**Redirect / callback URLs** (paste these into the Whoop/Fitbit developer app settings):

```
https://patrontest.vercel.app/api/whoop/callback
https://patrontest.vercel.app/api/fitbit/callback
```

After adding keys → hit **Redeploy** in Vercel.

### Where to get each key
| Key | Get it at | Powers |
|---|---|---|
| `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` | `https://developer.whoop.com` | Connect Whoop |
| `FITBIT_CLIENT_ID` / `FITBIT_CLIENT_SECRET` | `https://dev.fitbit.com/apps/new` | Connect Fitbit |
| `YOUTUBE_API_KEY` | `https://console.cloud.google.com` → enable **YouTube Data API v3** | Creator ↻ (YouTube subs) |

**TikTok needs no key** — just type your handle on the Creator page and hit ↻.
**Finnhub** (stock prices) and **Anthropic** (AI statement import) are pasted **in-app** (Finance → ⚙ Settings), not in Vercel:
```
https://finnhub.io/register
https://console.anthropic.com/settings/keys
```

---

## 3) Claude Code — customizing prompts (copy-paste, type one sentence)

```
Remove the Water tab from the dashboard.
```
```
Add a new page called todo.html using theme.css, a simple to-do list, and add it to the dashboard.
```
```
Change the dashboard name and my display name to mine.
```
```
Add my own tab called Journal for daily notes, saved in the browser, and put it on the dashboard.
```
```
Make the Supplements tab optional — hide it unless I turn it on in settings.
```

---

## 4) Pre-film checklist
- [ ] Logged into GitHub + Vercel as the **same** account.
- [ ] Live URL opens on phone → **Add to Home Screen** works.
- [ ] Supabase project made + SQL run.
- [ ] Pasted keys in **☁ Cloud sync** → a progress **photo sticks after refresh**.
- [ ] 🔒 Rotated any key you showed on screen. Never put keys in the code.
