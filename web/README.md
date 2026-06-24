# Fit Finder — Frontend (Next.js + Capacitor)

Single UI for **desktop web**, **mobile web**, and **iOS (App Store)**. Built
with Next.js 16, TypeScript, Tailwind v4, and shadcn/ui. Wrapped for iOS with
[Capacitor](https://capacitorjs.com/).

## Architecture

```
src/
├── app/
│   ├── page.tsx              # entry redirect → /home
│   ├── auth/callback/        # magic link + deep link (web + fitfinder://)
│   └── (app)/                # authenticated shell
│       ├── layout.tsx        # AppShell (sidebar + bottom tabs)
│       ├── analyze/
│       ├── saved/
│       ├── compare/
│       └── profile/
├── components/
│   ├── app-shell/            # shared navigation (desktop + mobile)
│   ├── analysis-result.tsx
│   ├── recommended-jobs-section.tsx  # Home carousel — two cards, The Muse
│   ├── resume-file-picker.tsx
│   └── capacitor-bridge.tsx  # fitfinder:// deep links + native scroll lock
└── lib/
    ├── api.ts                # shared Edge Function client (no scoring in UI)
    ├── muse-jobs.ts          # The Muse fetch, transform, live URL validation
    ├── load-recommended-jobs.ts  # Platform-aware loader (API / bundle / Vercel)
    ├── open-external-url.ts  # In-app browser on native, new tab on web
    ├── navigation.ts         # single nav config
    ├── platform.ts           # Capacitor detection
    └── resume-upload.ts      # Storage + parse-resume
```

### Canonical UI (iOS-first everywhere)

- **One layout:** centered `max-w-[480px]` phone column on desktop (letterbox only differs).
- **One navigation:** iOS tab bar on **all** platforms — no sidebar, no desktop header nav.
- **One component set:** screens live in `components/screens/` (Analyze, Saved, Compare, Profile).
- **Fit Finder Preview:** `/preview` — same chrome + `AnalyzeScreen` with sample data (no separate preview modes).

`APP_NAV` in `lib/navigation.ts` is the single source of truth for tabs.

### Builds

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Next dev server (Vercel-style, uses `proxy.ts` for auth) |
| `npm run build` | Production build for **Vercel** (SSR) |
| `npm run build:capacitor` | Static export (`out/`) for **Capacitor iOS** |
| `npm run cap:sync` | Export + `cap sync ios` |
| `npm run cap:open` | Open Xcode |

Capacitor loads the static `out/` bundle in a WKWebView. Auth on iOS uses
client-side session handling in `AppShell` plus `fitfinder://auth-callback`
deep links.

## Setup

```bash
# Create .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and MUSE_API_KEY
npm install
npm run dev
```

## iOS deployment checklist

1. `npm run cap:run` — opens Xcode.
2. Set your Apple team + bundle ID (`com.fitfinder.app`) in Xcode.
3. Confirm **Targeted Device Family** is **iPhone** only (not Universal/iPad).
4. Add `fitfinder://auth-callback` to Supabase Auth redirect URLs.
4. Enable Anonymous sign-ins in Supabase for guest mode.
5. Product → Archive → Distribute to App Store.

### File uploads on iOS

`ResumeFilePicker` uses standard HTML file inputs, which work in the iOS WebView
for **Files** and **camera roll** (`accept` for documents and `image/*`).

**Resume Score exports:** Optimized downloads keep the upload format (PDF stays PDF).
The app caches the original file and PDF text runs in IndexedDB, re-fetches from
Storage when needed, and bundles `pdf.worker.min.mjs` for in-app PDF parsing on
native (`npm run build:capacitor` copies it from `pdfjs-dist`).

## Deploy web (Vercel)

See **[VERCEL.md](./VERCEL.md)** for the full import checklist.

Root directory: `web/`. Required env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `MUSE_API_KEY` — The Muse jobs API for Home recommended jobs (`/api/jobs/recommended`)
- `SUPABASE_SERVICE_ROLE_KEY` (optional; delete account)
