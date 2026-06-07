# Fit Finder

AI-powered job-fit analysis. Upload a resume, paste a job description, and get a
qualification score, confidence score, career-fit adjustment, and a narrative
breakdown of strengths, gaps, and recommendations.

**One UI codebase** powers the desktop browser, mobile browser, and iOS App Store
app (via Capacitor). All clients share a single Supabase backend and scoring
service, so results are identical everywhere.

```
Next.js + Capacitor (web + iOS)
        │
        ▼
   Supabase Backend  ──►  Edge Functions (shared scoring + AI service)
```

## Monorepo layout

| Path        | What it is                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| `web/`      | **The only frontend** — Next.js 16, Tailwind, shadcn/ui, Capacitor iOS.   |
| `web/ios/`  | Capacitor-generated Xcode project (after `npm run cap:sync`).              |
| `supabase/` | Shared backend: Postgres, Auth, Storage, RLS, Edge Functions.                |
| `supabase/functions/_shared/` | **Shared scoring/AI service** — single source of truth.          |

## Why scoring lives in the backend

All parsing and scoring logic lives in TypeScript inside Supabase Edge Functions.
The UI calls `web/src/lib/api.ts`, which invokes:

- `POST /functions/v1/parse-resume`
- `POST /functions/v1/parse-job`
- `POST /functions/v1/analyze`

**Do not reimplement scoring in the Next.js app.**

## Getting started

### Backend

See [`supabase/README.md`](./supabase/README.md).

### Web (local dev)

```bash
cd web
cp .env.local.example .env.local   # Supabase URL + anon key
npm install
npm run dev                        # http://localhost:3000
```

### iOS (Capacitor → Xcode → App Store)

```bash
cd web
npm install
npm run cap:run                    # build static export, sync, open Xcode
```

In Supabase Dashboard → Authentication → URL Configuration, add redirect URLs:

- `http://localhost:3000/auth/callback`
- `fitfinder://auth-callback`

Enable **Anonymous sign-ins** for guest mode.

After `cap sync`, confirm `fitfinder` URL scheme in `web/ios/App/App/Info.plist`
(under `CFBundleURLTypes`).

## Navigation (one app, responsive chrome)

| Viewport | Navigation |
| -------- | ---------- |
| Desktop  | Centered phone-width column + bottom tab bar |
| Mobile / iOS | Bottom tab bar (Home, Saved, History, Profile) |

**Analyze Fit** is the primary CTA on Home (`/analyze`), not a tab.

Same routes everywhere: `/home`, `/analyze`, `/saved`, `/history`, `/profile`.

## Deploy

| Target | Command / platform |
| ------ | ------------------ |
| Web    | **Vercel** — root directory `web/`, `next build`. Pushes to `main` auto-deploy production. |
| iOS    | Xcode archive from `web/ios/` after `npm run cap:sync` |
| API    | Supabase Cloud — `supabase db push` + `functions deploy` |

### Vercel (web)

1. Connect the GitHub repo in Vercel.
2. Set **Root Directory** to `web` (required — the Next.js app is not at the repo root).
3. Set **Framework Preset** to **Next.js** (not “Other”).
4. Leave **Output Directory** empty (Vercel auto-detects `.next` for Next.js).
5. Add Production env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional; needed for Settings → Delete account)
6. Do **not** set `CAPACITOR_BUILD` on Vercel — that flag is for iOS static export only.
7. Push to `main` — each commit triggers a production deploy.

**OpenAI** (`OPENAI_API_KEY`) is a Supabase Edge Function secret, not a Vercel env var. Copy `supabase/.env.example` to `supabase/.env`, then:

```bash
supabase secrets set --env-file ./supabase/.env
```

Add your Vercel production URL to Supabase Auth redirect URLs (e.g. `https://your-app.vercel.app/auth/callback`).

#### Vercel 404 (`NOT_FOUND` on every route)

If the deploy shows “Ready” but every URL returns Vercel’s `404: NOT_FOUND` box:

- Confirm **Root Directory** = `web` and **Framework Preset** = **Next.js**, then redeploy (clear build cache).
- Open the URL from the latest deployment in the Vercel dashboard, not an old or deleted link.
- If the build log lists routes (`/`, `/home`, `/analyze`, …) but production still 404s, delete and re-import the Vercel project with the same settings.

The app ships `web/vercel.json` and uses `middleware.ts` (not `proxy.ts`) for Supabase session refresh so Vercel’s Next.js builder generates the routing manifest correctly.
