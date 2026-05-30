# Pre-ship checklist — before handing this to patrons

Work top to bottom. The ⚠️ items are the ones that bite if skipped.

## 1. Actually deploy it once, end-to-end
- [ ] Import the fork into Vercel; confirm `index.html` loads at `/`.
- [ ] Click into every app and back to the hub (the "← Vitality" button).
- [ ] Run the onboarding prompt; confirm the name shows on the hub + Goals, and that
      Supplements / Water pre-fill from it.
- [ ] Flip all three themes (Nocturne / Aurora / Daylight) and confirm they persist + sync across apps.
- [ ] ⚠️ **Whoop:** set `WHOOP_CLIENT_ID/SECRET`, register `https://<your-domain>/api/whoop/callback`
      in the Whoop dev app, then run **Connect Whoop** and confirm real numbers come back.
      (This flow is built but has not been verified on a live deploy yet — do it before relying on it,
      and sanity-check the HRV scale + sleep-hours mapping against your real Whoop data.)

## 2. ✅ Gym / Supabase — resolved (now per-user)
The bundled project/key was removed. Gym is **local-only by default**; each patron
connects *their own* Supabase via **Gym → ⚙ Settings → Cloud sync** (stored per-browser,
empty = no sync). Remaining:
- [ ] Make sure patrons run the SQL setup block (in README.md) in their own project before connecting.
- [ ] (Optional) mention cross-device gym sync as a perk in your patron post.

## 3. Demo / sample data
Several apps ship with sample data to make the empty state look alive:
Whoop (sample vitals), Creator (sample accounts/followers), Progress (sample weight log),
Water (sample 13-day log), and possibly Gym/Goals.
- [ ] Decide per app: keep as a demo, clear to a true empty state, or clearly label "sample".
- [ ] Make sure no sample number can be mistaken for the patron's real data.

## 4. Secrets & repo hygiene
- [ ] `.gitignore` excludes `.env` (added) — never commit real keys.
- [ ] Confirm no real API keys are committed anywhere (search the repo).
- [ ] Keep `.env.example` (documents the vars) but with empty values.

## 5. Disclaimers / liability
- [ ] Supplements renders a disclaimer ✓ — keep it; consider strengthening to "not medical advice."
- [ ] Add a one-line "not financial advice" note to Finance if you want symmetry.
- [ ] README disclaimer present ✓.

## 6. Audience & framing
- [ ] This is a **fork + deploy + paste-keys** product. Confirm your patrons are technical
      enough (devs / quantified-self / builders). If not, this delivery model is wrong —
      a hosted single instance with accounts + a DB is a different (bigger) project.
- [ ] Write a 1-page "how to set up your own" guide (or link this README) in your patron post.
- [ ] Set expectations loudly: **data is per-browser and not synced across devices.**

## 7. Nice-to-haves (optional)
- [ ] Cross-device sync (would require a real backend + accounts — out of scope today).
- [ ] Live per-app stats for Gym / Goals / Creator / Progress on the hub cards (currently
      only Finance / Supplements / Water / Whoop show live numbers).
- [ ] A license / usage terms for what patrons may do with the fork.
