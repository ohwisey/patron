# Setup — get your own copy running

Everything below is one-time. Most of the app works instantly; API keys are
optional and only needed for fitness-band sync.

## 1. Fork the repo
On the GitHub page, click **Fork** (top-right). This makes your own copy.

## 2. Deploy to Vercel
- Go to [vercel.com](https://vercel.com) and sign in with GitHub.
- Click **Add New → Project**, pick your forked repo, and click **Deploy**.
- Done — you get a live link like `https://your-app.vercel.app`.

At this point the whole dashboard already works: finance, water, gym,
supplements, goals, progress — all of it. Your data is saved in your browser.

## 3. (Optional) Fitness-band sync — Whoop / Fitbit
Only do this if you want the "Connect Whoop" or "Connect Fitbit" buttons to work.

In Vercel → **your Project → Settings → Environment Variables**, add the keys
for whichever you want:

```
WHOOP_CLIENT_ID
WHOOP_CLIENT_SECRET
FITBIT_CLIENT_ID
FITBIT_CLIENT_SECRET
```

Where to get them is written step-by-step in **`.env.example`** and
**`WHOOP_SETUP.md`** (both ship with the repo). After adding the keys,
hit **Redeploy** in Vercel.

> No Supabase, no database, no other keys needed.

---

## Want to add your own feature (e.g. a macros tracker)?
1. Install **Claude Code** (free): [claude.com/claude-code](https://claude.com/claude-code)
2. Open this project folder in Claude Code.
3. Type one sentence:

   > "Add a new page called macros.html using theme.css, and add it to the dashboard."

Claude builds it, matching the existing design automatically. Push the change
to GitHub and Vercel redeploys it for you.

Full details for builders: see **`HOW_TO_ADD_A_PAGE.md`**.
