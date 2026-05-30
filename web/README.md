# Fit Finder — Frontend (Next.js + Capacitor)

Single UI for **desktop web**, **mobile web**, and **iOS (App Store)**. Built
with Next.js 16, TypeScript, Tailwind v4, and shadcn/ui. Wrapped for iOS with
[Capacitor](https://capacitorjs.com/).

## Architecture

```
src/
├── app/
│   ├── page.tsx              # marketing landing
│   ├── login/
│   ├── auth/callback/        # magic link + deep link (web + fitfinder://)
│   └── (app)/                # authenticated shell
│       ├── layout.tsx        # AppShell (sidebar + bottom tabs)
│       ├── analyze/
│       ├── saved/
│       ├── history/
│       ├── compare/
│       └── profile/
├── components/
│   ├── app-shell/            # shared navigation (desktop + mobile)
│   ├── analysis-result.tsx
│   ├── resume-file-picker.tsx
│   └── capacitor-bridge.tsx  # fitfinder:// deep links
└── lib/
    ├── api.ts                # shared Edge Function client (no scoring in UI)
    ├── navigation.ts         # single nav config
    ├── platform.ts           # Capacitor detection
    └── resume-upload.ts      # Storage + parse-resume
```

### Responsive navigation

- **md and up:** left sidebar (`AppSidebar`)
- **below md / Capacitor iOS:** bottom tab bar (`AppBottomNav`)

Both use `APP_NAV` from `lib/navigation.ts` — no duplicate route lists.

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
cp .env.local.example .env.local
npm install
npm run dev
```

## iOS deployment checklist

1. `npm run cap:run` — opens Xcode.
2. Set your Apple team + bundle ID (`com.fitfinder.app`) in Xcode.
3. Add `fitfinder://auth-callback` to Supabase Auth redirect URLs.
4. Enable Anonymous sign-ins in Supabase for guest mode.
5. Product → Archive → Distribute to App Store.

### File uploads on iOS

`ResumeFilePicker` uses standard HTML file inputs, which work in the iOS WebView
for **Files** and **camera roll** (`accept` for documents and `image/*`).

## Deploy web (Vercel)

Root directory: `web/`. Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
