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
# Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev                        # http://localhost:3000
```

### iOS (Capacitor → Xcode → App Store)

```bash
cd web
npm install
npm run cap:run                    # build static export, sync, open Xcode
```

Auth redirect URLs (localhost, Vercel `*.vercel.app`, iOS deep link) live in
`supabase/config.toml`. After cloning or editing them, push to the hosted project:

```bash
supabase config push --yes
```

Enable **Anonymous sign-ins** for guest mode.

After `cap sync`, open **`web/ios/App/App.xcworkspace`** in Xcode (not
`App.xcodeproj`), then confirm the `fitfinder` URL scheme in
`web/ios/App/App/Info.plist` (under `CFBundleURLTypes`).

## Navigation (one app, responsive chrome)

| Viewport | Navigation |
| -------- | ---------- |
| Desktop  | Centered phone-width column + bottom tab bar |
| Mobile / iOS | Bottom tab bar (Home, Saved, History, Stats, Profile) |

**Analyze Fit** is the primary CTA on Home (`/analyze`), not a tab.

Same routes everywhere: `/home`, `/analyze`, `/saved`, `/history`, `/stats`, `/profile`.

## Platform parity (web + iOS + Cursor preview)

One codebase in `web/src/` powers every client. Cursor preview and `npm run dev`
behave as **web** (`isNativePlatform()` is false). iOS uses the same bundle after
`npm run cap:sync`.

| Concern | Web / preview / Vercel | iOS (Capacitor) |
| ------- | ---------------------- | --------------- |
| Edge Functions | `/api/functions/*` proxy | Direct Supabase URL |
| Auth session | Cookies + server PKCE callback | localStorage + client callback + `fitfinder://` |
| Backend calls | `web/src/lib/invoke-function.ts` | Same module |

After **any** `web/` UI change, run `npm run cap:sync` before testing in Xcode.
After **backend** changes, deploy Edge Functions (`supabase functions deploy`).

Verify both build targets:

```bash
cd web && npm run build:verify
```

See `.cursor/rules/platform-parity.mdc` for the full checklist agents follow.

## Deploy

| Target | Command / platform |
| ------ | ------------------ |
| Web    | **Vercel** — root directory `web/`, `next build`. Pushes to `main` auto-deploy production. |
| iOS    | Xcode archive from `web/ios/` after `npm run cap:sync` |
| API    | Supabase Cloud — `supabase db push` + `functions deploy` |

### Vercel (web)

**Step-by-step setup:** [`web/VERCEL.md`](./web/VERCEL.md)

Repo: [github.com/mattvicinidesign/fitfinder](https://github.com/mattvicinidesign/fitfinder)

Quick summary:

1. Import repo in Vercel with **Root Directory** = `web` (not `./`), **Framework Preset** = **Next.js**.
2. Add env vars from your local `web/.env.local` (`NEXT_PUBLIC_SUPABASE_*`, optional `SUPABASE_SERVICE_ROLE_KEY`).
3. Do **not** set `CAPACITOR_BUILD` on Vercel.
4. Deploy, then add your production URL to Supabase Auth redirect URLs (`/auth/callback`).
5. Push to `main` for auto-deploys after the project is connected.

**OpenAI** (`OPENAI_API_KEY`) is a Supabase Edge Function secret, not a Vercel env var:

```bash
supabase secrets set --env-file ./supabase/.env
```
