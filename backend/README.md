# Health Management API

FastAPI backend for the Health Management site. Currently provides
signup/login (JWT-based). Stripe checkout and AI report generation will be
added as separate routers as they're built.

## Endpoints

| Method | Path             | Auth required | Description                          |
|--------|------------------|----------------|--------------------------------------|
| GET    | `/`              | no             | Health check                         |
| POST   | `/api/auth/signup` | no           | Create an account, returns a token   |
| POST   | `/api/auth/login`  | no           | Log in, returns a token              |
| GET    | `/api/auth/me`     | yes (Bearer) | Return the current user              |
| POST   | `/api/payments/create-checkout-session` | optional | Create a Stripe Checkout Session for the cart; returns a `checkout_url` to redirect to. Works for guests too — attaches the order to the logged-in user if a token is sent. |
| POST   | `/api/payments/webhook` | no (Stripe-signed) | Stripe calls this when a payment completes; marks the matching order as `paid`. |
| GET    | `/api/payments/orders` | yes (Bearer) | List the current user's past orders. |

`signup` and `login` both return:
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user": { "name": "...", "email": "..." }
}
```
This matches what `js/auth.js` in the frontend already expects.

## Local development

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # defaults to a local SQLite file, no Supabase needed yet
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for interactive API docs (Swagger UI) —
useful for testing signup/login without touching the frontend at all.

## Setting up Supabase (Postgres)

1. Create a project at supabase.com (free tier is fine to start).
2. Go to **Project Settings → Database → Connection string → URI**. Copy it —
   this is your `DATABASE_URL`. Use the **Session pooler** connection string
   if deploying to Render (Render's free tier works better with pooled
   connections than a direct connection).
3. Either:
   - Let the backend create the `users` table automatically on first startup
     (it calls `Base.metadata.create_all` in `main.py`), **or**
   - Paste `schema.sql` into the Supabase SQL Editor and run it yourself.
4. Set `DATABASE_URL` as an environment variable wherever you deploy.

## Setting up Stripe

1. Create a Stripe account, grab your **secret key** from the Stripe Dashboard
   (Developers → API keys). Set it as `STRIPE_SECRET_KEY`.
2. Once deployed, register a webhook endpoint in the Stripe Dashboard
   pointing at `https://your-api.onrender.com/api/payments/webhook`,
   listening for the `checkout.session.completed` event. Stripe will give
   you a signing secret — set that as `STRIPE_WEBHOOK_SECRET`.
3. Set `FRONTEND_ORIGINS` to your real site URL (not `*`) — the checkout
   success/cancel redirect URLs are built from the first origin in that
   list.

The frontend's cart drawer currently checks out via per-product **Stripe
Payment Links** (`js/stripe-links.js`), configured with no backend needed.
This API adds a second option — a single combined Checkout Session for the
whole cart — which is generally the better experience for multi-item
orders. Swapping the cart's checkout button to call
`POST /api/payments/create-checkout-session` instead of (or in addition to)
the Payment Links flow is a frontend change, not yet wired up.

## Deploying to Render

1. Push this repo to GitHub (already done — this folder is `backend/` inside
   the same repo as the frontend).
2. In Render: **New → Web Service → connect this GitHub repo**.
3. Set the **Root Directory** to `backend`.
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   (Render sets `$PORT` automatically.)
6. Add environment variables (from `.env.example`):
   - `DATABASE_URL` — your Supabase connection string
   - `JWT_SECRET` — generate one with `openssl rand -hex 32`
   - `FRONTEND_ORIGINS` — your deployed frontend URL(s), comma-separated
     (e.g. `https://yourname.github.io`). Using `*` works for testing but
     should be locked down before going live.
7. Deploy. Render will give you a URL like
   `https://health-management-api.onrender.com`.

## Connecting the frontend

Once deployed, open `js/auth.js` in the frontend repo and update:

```js
const API_BASE = "https://health-management-api.onrender.com/api";
```

That's the only change needed — signup/login on the site should work
immediately after that, since the frontend was already built against this
exact API contract.

Note: Render's free tier spins down after inactivity, so the first request
after a while can take 30–60 seconds to wake up. That's expected.
