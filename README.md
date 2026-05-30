# Fit Finder

AI-powered job-fit analysis. Upload a resume, paste a job description, and get a
qualification score, confidence score, career-fit adjustment, and a narrative
breakdown of strengths, gaps, and recommendations.

Fit Finder is **iOS-first** with a **desktop web companion**. Both clients share a
single Supabase backend and a single scoring service, so scores are identical
everywhere.

```
Native iOS App (SwiftUI)
        │
        ▼
   Supabase Backend  ──►  Edge Functions (shared scoring + AI service)
        │
        ▼
Responsive Web App (Next.js)
```

## Monorepo layout

| Path        | What it is                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| `supabase/` | Shared backend: Postgres schema, Row Level Security, and Edge Functions.   |
| `supabase/functions/_shared/` | **The shared scoring/AI service.** Single source of truth for scoring. |
| `web/`      | Next.js 16 + TypeScript + Tailwind + shadcn/ui desktop companion.          |
| `ios/`      | SwiftUI (MVVM) app targeting iOS 18+, deployable to the App Store.         |

## Why scoring lives in the backend

The product requires **identical scoring on every platform**. To guarantee that,
all parsing and scoring logic lives in TypeScript inside Supabase Edge Functions
(`supabase/functions/`). The iOS and web clients never compute scores themselves —
they call the same HTTP endpoints:

- `POST /functions/v1/parse-resume`
- `POST /functions/v1/parse-job`
- `POST /functions/v1/analyze`

This is the single most important architectural rule in the repo:
**do not reimplement scoring in Swift or in Next.js.**

## Getting started

Each sub-project has its own README:

- [`supabase/README.md`](./supabase/README.md) — backend, migrations, functions
- [`web/README.md`](./web/README.md) — Next.js web app
- [`ios/README.md`](./ios/README.md) — SwiftUI iOS app

### Quick start

```bash
# 1. Backend
cd supabase
supabase start            # local stack (Postgres, Auth, Storage, Edge runtime)
supabase db reset         # apply migrations + seed

# 2. Web
cd ../web
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm install && npm run dev

# 3. iOS
cd ../ios
xcodegen generate         # produces FitFinder.xcodeproj
open FitFinder.xcodeproj
```

## Environments

| Service  | Provider | Deploy target          |
| -------- | -------- | ---------------------- |
| Backend  | Supabase | Supabase Cloud project |
| Web      | Next.js  | Vercel                 |
| iOS      | SwiftUI  | Apple App Store        |
