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
- `POST /functions/v1/review-resume` — resume-only health score (Score tab)
- `POST /functions/v1/generate-proposal` — tailored Application Assistant proposals on fit reports

`parse-resume` and `review-resume` accept `{ resumeId, textOnly: true }` to extract plain text from Storage without an OpenAI call (used when native session cache is cleared).

**Do not reimplement scoring in the Next.js app.** Job postings are normalized in
`supabase/functions/_shared/normalize_parsed_job.ts` inside `analyze` and
`parse-job` before scoring (skills, tools, Upwork tags, posting details).

## Getting started

### Backend

See [`supabase/README.md`](./supabase/README.md).

### Web (local dev)

```bash
cd web
# Create .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and MUSE_API_KEY
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

The iOS target is **iPhone-only** (portrait, no iPad): `TARGETED_DEVICE_FAMILY = 1`
in `App.xcodeproj`, `LSRequiresIPhoneOS` in Info.plist, no `UISupportedInterfaceOrientations~ipad`.

## Navigation (one app, responsive chrome)

| Viewport | Navigation |
| -------- | ---------- |
| Desktop  | Centered phone-width column + bottom tab bar |
| Mobile / iOS | Bottom tab bar (Home, Score, Analyze, Stats, Profile) |

**Analyze Fit** is the primary CTA on Home (`/analyze`), not a tab.

Same routes everywhere: `/home`, `/analyze`, `/saved`, `/stats`, `/profile`, `/resume-review`.

## Platform parity (web + iOS + Cursor preview)

One codebase in `web/src/` powers every client. Cursor preview and `npm run dev`
behave as **web** (`isNativePlatform()` is false). iOS uses the same bundle after
`npm run cap:sync`.

| Concern | Web / preview / Vercel | iOS (Capacitor) |
| ------- | ---------------------- | --------------- |
| Edge Functions | `/api/functions/*` proxy | Direct Supabase URL |
| Recommended jobs | `GET /api/jobs/recommended` (The Muse, 5m revalidate) | Jobs baked into JS at `cap:sync`; live refresh from Vercel; `@capacitor/browser` for external links |
| Auth session | Cookies + server PKCE callback | localStorage + client callback + `fitfinder://` |
| Backend calls | `web/src/lib/invoke-function.ts` | Same module |
| Modals / sheets | Portal to `#app-overlay-root` in AppFrame | Same — never `document.body` + `position: fixed` |
| Touch / scroll | Standard browser scrolling | `data-capacitor="native"` locks horizontal pan; vertical scroll on screen shells only; carousel uses `pan-x` |

After **any** `web/` UI change, run `cd web && npm run cap:sync` before testing in Xcode, then commit and push to `main` for Vercel.
After **backend** changes, deploy Edge Functions (`supabase functions deploy analyze review-resume parse-resume generate-proposal`) and apply new migrations (`supabase db push`). Redeploy `analyze` after edits to `_shared/normalize_parsed_job.ts` or the analyze orchestrator.

**Resume Score & ATS optimize:** `/resume-review` (Score tab) uploads a resume for a health breakdown (content, structure, ATS, completeness). **Optimize** proposes keyword swaps; approved edits patch the **original file** (PDF → PDF, DOCX → DOCX) with layout-preserving line redraws via pdf-lib — not a plain-text rebuild. On iOS, resume text is rehydrated from IndexedDB, Storage, or `review-resume` with `textOnly: true` when session cache is empty. Capacitor builds copy `pdf.worker.min.mjs` into `public/` at build time (`scripts/copy-pdf-worker.mjs`) so PDF parsing works in WKWebView.

**Application Assistant:** On a fit report, generate a tailored proposal from resume + job data. Portfolio URL is extracted from the stored resume (not project URLs), inserted between intro paragraphs, and included in PDF export. Regenerate from the proposal modal.

**Recommended jobs (Home):** Horizontal carousel — **two cards visible** on web, preview, and native (inside the 480px column; not viewport `lg`). Product-design listings from [The Muse API](https://www.themuse.com/developers/api/v2). Server route `GET /api/jobs/recommended` filters Design and UX, prioritizes product-design titles, validates live Muse URLs (skips expired 404 listings), and enriches cards with company logos. Tapping a card opens the posting on themuse.com (new tab on web; in-app browser on iOS). Requires `MUSE_API_KEY` in `web/.env.local` and Vercel for live refreshes; a bundled snapshot in `src/generated/recommended-jobs-bundled.ts` is used when the API is unavailable. Smoke test: `GET /api/jobs/test` in dev.

**Profile preferences on reports:** Onboarding collects pay floor, employer type, minimum client rating, project type (Ongoing / One-Time), and regions. These drive green/red pills on the fit report when a posting value can be compared:

| Card | Compared fields |
| ---- | ---------------- |
| About Client | Employer type, client origin, rating, avg hourly pay |
| Preferences | Location, timezone, English level, AI emphasis |
| Role Alignment | Title, industry, pay, project type |

Migrations: `0009_profile_preferred_employer_rating.sql`, `0010_profile_preferred_project_types.sql`.

**Report UI:** Missing posting values show as **blue** “Not Specified” pills (not scored). Green = match, red = mismatch.

**Splash QA** (web): top-right **QA** floater — simulate first launch, returning user, replay splash, or **Hard refresh** (clears Fit Finder session keys). Enabled on web by default; iOS requires `NEXT_PUBLIC_ENABLE_SPLASH_QA=true` at `cap:sync` time.

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
2. Add env vars from your local `web/.env.local` (`NEXT_PUBLIC_SUPABASE_*`, `MUSE_API_KEY`, optional `SUPABASE_SERVICE_ROLE_KEY`).
3. Do **not** set `CAPACITOR_BUILD` on Vercel.
4. Deploy, then add your production URL to Supabase Auth redirect URLs (`/auth/callback`).
5. Push to `main` for auto-deploys after the project is connected.

**OpenAI** (`OPENAI_API_KEY`) is a Supabase Edge Function secret, not a Vercel env var:

```bash
supabase secrets set --env-file ./supabase/.env
```
