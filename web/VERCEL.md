# Deploy Fit Finder on Vercel

Use this checklist when creating the Vercel project. The app is already configured
for a standard Next.js 16 deploy from the `web/` directory.

## 1. Import the repo

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import **github.com/mattvicinidesign/fitfinder**.
3. Before deploying, confirm these settings:

| Setting | Value |
| ------- | ----- |
| **Root Directory** | `web` |
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | *(leave empty — Vercel uses `.next`)* |
| **Install Command** | `npm install` (default) |

Do **not** set `CAPACITOR_BUILD`. That flag is only for iOS static export.

## 2. Environment variables

Add these in Vercel → Project → Settings → Environment Variables.
Copy values from your local `web/.env.local`.

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same page (`anon` / publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Needed for Profile → Delete account |

Apply to **Production**, **Preview**, and **Development** so preview deploys work.

**Optional (QA on deployed builds):**

| Variable | When to set |
| -------- | ----------- |
| `NEXT_PUBLIC_ENABLE_SPLASH_QA` | `true` on **Production** to show the Splash QA floater (simulate first launch, returning user, replay splash). **Preview** deploys enable this automatically. |

**Do not add** these to Vercel:

- `CAPACITOR_BUILD` — breaks the web build (forces static export)
- `NEXT_PUBLIC_QA_REGISTERED_SCORING` — dev/QA only
- `OPENAI_API_KEY` — lives in Supabase Edge Function secrets, not Vercel

## 3. Deploy

Click **Deploy**. When the build log shows routes like `/`, `/home`, `/analyze`,
the Next.js app built correctly.

If every URL returns Vercel’s `404: NOT_FOUND` box but the build succeeded:

- Re-check **Root Directory** = `web` and **Framework Preset** = **Next.js**
- Redeploy with “Clear build cache”
- As a last resort, delete and re-import the project with the same settings

## 4. Supabase Auth (after first deploy)

In Supabase Dashboard → **Authentication** → **URL Configuration**:

1. **Site URL** — your production URL (e.g. `https://fitfinder.vercel.app`)
2. **Redirect URLs** — add:
   - `https://<your-vercel-domain>/auth/callback`
   - `http://localhost:3000/auth/callback` (local dev)
   - `fitfinder://auth-callback` (iOS)

Enable **Anonymous sign-ins** (Authentication → Providers) for guest mode.

## 5. Supabase Edge Functions (backend)

OpenAI and scoring run in Supabase, not on Vercel. From the repo root:

```bash
supabase secrets set --env-file ./supabase/.env
supabase db push
supabase functions deploy
```

## 6. Verify production

- `/` redirects into the app (`/home`)
- Guest session starts automatically (no login screen)
- Analyze flow calls Edge Functions via `/api/functions/*`
- Magic-link sign-in completes at `/auth/callback`

### Splash QA on Vercel

Local dev always shows the **QA** floater (bottom-right) for first-launch simulation.
On Vercel:

- **Preview** URLs — QA is on automatically after deploy (no env var needed).
- **Production** — add `NEXT_PUBLIC_ENABLE_SPLASH_QA=true`, redeploy, then use **Simulate first launch** / **Simulate returning user** / **Replay splash now**.

Without QA, clear site data or use a private window to approximate a first visit.

## Local parity check

Before connecting Vercel, confirm the production build works locally:

```bash
cd web
npm run build
```

Missing Supabase env vars fail the build with a clear error.
