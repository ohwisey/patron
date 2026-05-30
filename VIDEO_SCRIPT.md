# 🎬 Patron — video run of show

> Read straight off this. Phases keep it simple: **get it live → make it yours → sync it.**

## 0. Hook (10s)
"By the end of this, you'll have your own personal dashboard — live on the internet *and* on your phone — built around your life, not mine."

## 1. Intro + demo
- Tour the live app. Show it on your phone (home-screen icon, full-screen).
- The point: **it's a template, not a finished app.** Keep what you want, delete what you don't, add your own.
- "Don't track water? Delete it. Want a to-do list? I'll show you how."

## 2. What you'll need — two phases
- **Phase 1 — get it live (no coding):** GitHub account + Vercel account.
- **Phase 2 — make it yours:** VS Code + Claude Code + (optional) Supabase.
- Say it: **everything here is free.**

## 3. Deploy it live (Phase 1)
- Click **Deploy with Vercel** on the repo → it copies to your GitHub *and* deploys → live link in ~1 min.
- Open the link on your phone → **Share → Add to Home Screen.**
- ✅ Fully working now. Data saves in your browser.

## 4. Make it yours (Phase 2)
- Install **VS Code + Claude Code**, open the project folder.
- **Remove a tab:** "Claude, remove the water tab."
- **Add a tab:** "Claude, add a to-do list page and put it on the dashboard."
- Push → Vercel auto-redeploys.

## 5. Cloud sync + photos (Supabase)
- supabase.com → **New project**.
- **SQL Editor** → paste `supabase-schema.sql` → **Run** (one run = data table **+** photo storage).
- **Settings → API** → copy **Project URL** + **anon public** key.
- In the app: **Settings → Cloud sync** → paste both. Now it syncs across devices, and progress photos stick.

## 6. Optional power-ups
- Whoop / Fitbit / YouTube live sync = add keys in Vercel.
- **TikTok needs nothing** — just type your handle and hit ↻.

## 7. Outro
- It's yours, free, on your phone. → Patreon to go deeper / build together.

---

## 🔒 Don't forget on camera
- API keys go **only** in Vercel env vars or in-app settings — **never in code.**
- **Do not show your real `.env`** on screen. **Rotate any key you've already shown.**
- Deploy with the **same GitHub account** you're logged into.
- Data is in your browser by default (clear it = gone) → that's *why* Supabase sync exists.

## ✅ Pre-film checklist
- [ ] Rotated the exposed keys (Supabase / Anthropic / Whoop / Stripe).
- [ ] Live URL loads on phone + added to home screen.
- [ ] Supabase project created, `supabase-schema.sql` run.
- [ ] Pasted keys → confirmed a value syncs phone↔laptop.
- [ ] Uploaded a progress photo → confirmed it sticks after refresh.
