# Deployment Guide

This is the final step: getting everything live. Everything below is
already built and tested — this is account setup + a few clicks, not code.

## Where things stand right now

| Piece                          | Status                                                          |
|---------------------------------|------------------------------------------------------------------|
| Frontend (this repo, root)      | ✅ **Already live** via GitHub Pages: `https://hsingfitness.github.io/health-management/` |
| Backend API (`backend/`)        | ✅ Built and tested locally. ⬜ Not deployed yet.                |
| Database                        | ⬜ No Supabase project created yet.                              |
| Stripe (combined checkout)      | ⬜ No Stripe keys set. (Note: the site's cart *already* works today via a separate, simpler method — per-product Stripe Payment Links in `js/stripe-links.js`. This backend's combined-cart checkout is an upgrade path, not a blocker.) |
| AI health reports                | ⬜ No Anthropic API key set.                                     |

So the only thing standing between "code complete" and "fully live" is
deploying `backend/` and filling in a handful of API keys. About 15–20
minutes, most of it waiting for accounts to provision.

## Step 1 — Supabase (database)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **Project Settings → Database → Connection string → URI.** Copy it. Use
   the **Session pooler** version if given a choice — it behaves better with
   Render's free tier.
3. Keep this tab open, you'll paste it into Render in Step 2.

(You don't need to run `backend/schema.sql` yourself — the backend creates
its tables automatically on first startup. Run it manually later only if
you want Row Level Security locked down for production.)

## Step 2 — Render (backend API)

1. Go to [render.com](https://render.com) → **New → Web Service** → connect
   this GitHub repo.
2. Set **Root Directory** to `backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add these environment variables:
   - `DATABASE_URL` — the Supabase connection string from Step 1
   - `JWT_SECRET` — run `openssl rand -hex 32` locally and paste the output
   - `FRONTEND_ORIGINS` — `https://hsingfitness.github.io`
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com) (needed for AI health reports)
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — see Step 3 (optional — skip for now if you just want login/reports working first)
6. Deploy. You'll get a URL like `https://health-management-api.onrender.com`.
7. Visit `https://health-management-api.onrender.com/` — you should see
   `{"status": "ok"}`. If so, the backend is live.

Render's free tier spins down after inactivity — the first request after a
while can take 30–60 seconds. Normal, not a bug.

## Step 3 — Stripe (optional, for the combined-cart checkout endpoint)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API
   keys → copy the **secret key** → set as `STRIPE_SECRET_KEY` on Render.
2. Developers → Webhooks → **Add endpoint**:
   `https://health-management-api.onrender.com/api/payments/webhook`,
   listening for `checkout.session.completed`. Copy the signing secret it
   gives you → set as `STRIPE_WEBHOOK_SECRET` on Render.

This is separate from the Payment Links checkout already live on the site
today — see the note in the status table above.

## Step 4 — Connect the frontend to the live backend

Open `js/auth.js` in this repo and change:

```js
const API_BASE = "https://YOUR-BACKEND.onrender.com/api";
```

to your actual Render URL from Step 2, e.g.:

```js
const API_BASE = "https://health-management-api.onrender.com/api";
```

Commit and push. Since GitHub Pages is already serving this repo live,
that's the only change needed — signup, login, the fitness-page gating,
and the AI assessment report should all start working within a minute or
two of the push (GitHub Pages rebuilds automatically).

## Step 5 — Test it end to end

On the live site:
1. Sign up for an account → should succeed and show the account menu in
   the nav.
2. Visit a Fitness page while logged out (in an incognito window) → should
   redirect to login, then land back on that page after signing in.
3. Go to Assessment, describe a symptom, click **Get Free Basic Analysis**
   → should return a real AI-generated summary within a few seconds.
4. If Stripe is configured: add items to the cart and test checkout.

If anything fails, check the Render service's **Logs** tab first — most
issues at this stage are a missing/mistyped environment variable.

## That's it

Once Step 4 is pushed and Step 5 passes, every item from the original
roadmap is live:

1. ✅ 前端页面 — GitHub Pages
2. ✅ GitHub保存
3. ✅ 后端API — Render
4. ✅ Database — Supabase
5. ✅ 用户登录系统
6. ✅ Stripe付款
7. ✅ AI生成健康报告
8. ✅ 正式部署
