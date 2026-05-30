# Fit Finder — Web

Desktop companion built with Next.js 16 (App Router), TypeScript, Tailwind v4,
and shadcn/ui. It consumes the shared Supabase backend and the scoring Edge
Functions — it never computes scores locally.

## Setup

```bash
cp .env.local.example .env.local   # add your Supabase URL + anon key
npm install
npm run dev                        # http://localhost:3000
```

## Structure

```
src/
├── app/
│   ├── page.tsx              # landing
│   ├── login/                # magic link + guest (anonymous) sign-in
│   ├── auth/callback/        # OAuth/magic-link code exchange
│   ├── analyze/              # run an analysis
│   └── dashboard/            # saved analyses (RLS-scoped)
├── components/
│   ├── site-header.tsx       # nav + auth state
│   ├── auth-menu.tsx
│   ├── analysis-result.tsx   # score + narrative display
│   └── ui/                   # shadcn primitives
├── lib/
│   ├── api.ts                # calls the shared Edge Functions
│   ├── types.ts              # mirror of supabase/functions/_shared/types.ts
│   ├── score.ts              # presentation helpers
│   └── supabase/             # browser + server + middleware clients
└── proxy.ts                  # session refresh + route protection (Next 16 proxy convention)
```

## How scoring works here

`src/lib/api.ts` calls `supabase.functions.invoke("analyze", …)`. All scoring
logic lives in `supabase/functions/_shared/scoring.ts`. If scoring behavior
needs to change, change it there — not in this app.

## Deploy (Vercel)

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as project
environment variables, then connect the repo (root directory `web/`).
