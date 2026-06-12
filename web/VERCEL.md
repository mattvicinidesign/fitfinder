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
| `SUPABASE_SERVICE_ROLE_KEY` | Optional on Vercel | Account delete runs via Supabase Edge Function (`delete-account`); service role lives in Supabase secrets |
| `NEXT_PUBLIC_APP_URL` | Optional | Custom domain only (e.g. `https://fitfinder.vercel.app`). Preview/production URLs are set automatically from `VERCEL_URL` at build time. |

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

## Reset first-time launch (web QA)

Open your deployment with `?firstLaunch=1` to clear Fit Finder browser storage and
sign out, then reload without the query param (splash → welcome flow runs again).

Example: `https://your-app.vercel.app/?firstLaunch=1`

Works on web and iOS (same query param). On iOS, use Splash QA → “Reset first launch (full)” when QA is enabled.

## 4. Supabase Auth (after first deploy)

Auth redirect URLs are defined in `supabase/config.toml` and applied to the hosted
project with:

```bash
supabase config push --yes
```

That sets **Site URL** to `https://fitfinder.vercel.app` and allow-lists localhost,
all `*.vercel.app` preview URLs, and `fitfinder://` for iOS.

If magic links still open `localhost`, re-run `config push` and request a **new**
email (old links keep the old redirect).

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
- Profile → Delete account calls `/api/functions/delete-account` (same Edge Function as iOS)
- Magic-link sign-in completes at `/auth/callback`

### Splash QA on Vercel

Local dev always shows the **QA** floater (bottom-right) for first-launch simulation.
On Vercel:

- **Preview** URLs — QA is on automatically after deploy (no env var needed).
- **Production** — add `NEXT_PUBLIC_ENABLE_SPLASH_QA=true`, redeploy, then use **Simulate first launch** / **Simulate returning user** / **Replay splash now**.

Without QA, clear site data or use a private window to approximate a first visit.

## Local parity check

Before connecting Vercel, confirm **both** build targets work locally:

```bash
cd web
npm run build:verify
```

This runs the Vercel SSR build and the Capacitor static export. Missing Supabase
env vars fail the web build with a clear error.
