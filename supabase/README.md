# Fit Finder — Backend (Supabase)

The shared backend for both the iOS and web clients. It owns the database, auth,
file storage, Row Level Security, and — most importantly — the **scoring + AI
service** implemented as Edge Functions.

## Contents

```
supabase/
├── config.toml                 # local stack config
├── migrations/                 # SQL schema + RLS (source of truth for the DB)
│   └── 0001_initial_schema.sql
└── functions/
    ├── _shared/                # ← the shared scoring/AI service
    │   ├── types.ts            # domain contract shared with both clients
    │   ├── scoring.ts          # deterministic scoring engine (single source of truth)
    │   ├── scoring_test.ts     # determinism + behavior tests
    │   ├── openai.ts           # OpenAI JSON-mode wrapper
    │   ├── prompts.ts          # resume/job/narrative prompts
    │   ├── cors.ts
    │   └── supabaseClient.ts   # RLS-scoped client per request
    ├── parse-resume/           # POST /functions/v1/parse-resume
    ├── parse-job/              # POST /functions/v1/parse-job
    └── analyze/                # POST /functions/v1/analyze  (orchestrator)
```

## Local development

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker.

```bash
supabase start                 # boots Postgres, Auth, Storage, Edge runtime
supabase db reset              # applies migrations
cp .env.example .env           # add your OPENAI_API_KEY
supabase functions serve --env-file ./.env
```

## API surface

All endpoints require a Supabase auth JWT (`Authorization: Bearer <token>`).
Guest Mode uses anonymous sign-in, which still yields a valid JWT.

| Endpoint              | Body                                                              | Returns                          |
| --------------------- | ----------------------------------------------------------------- | -------------------------------- |
| `POST /parse-resume`  | `{ resumeText, resumeId? }`                                       | `{ parsedResume }`               |
| `POST /parse-job`     | `{ jobText }`                                                     | `{ parsedJob }`                  |
| `POST /analyze`       | `{ jobText, companyName?, jobTitle?, resumeId?, parsedResume?, persist? }` | `{ analysisId, result }` |

`result` is an `AnalysisResult` (`functions/_shared/types.ts`):
`{ companyName, jobTitle, parsedJob, score, narrative }`.

## The scoring rule

`scoring.ts` is pure and deterministic. The scores are:

- **qualificationScore** — weighted coverage of the job's required skills (0.5),
  tools (0.25), and AI requirements (0.25).
- **confidenceScore** — how much signal the resume/job actually provided.
- **careerFitAdjustment** — signed ±15 from industry + archetype alignment.
- **fitScore** — adjusted qualification, blended toward a neutral 50 in
  proportion to low confidence.
- **recommendation** — `strong_apply | apply | stretch | not_recommended` (V1 bands).

> Neither client recomputes any of this. Both call `/analyze`. Run the tests
> with `deno test` inside `functions/` to verify behavior.

## Deploy

```bash
supabase link --project-ref <ref>
supabase db push                         # apply migrations to the cloud DB
supabase functions deploy parse-resume parse-job analyze
supabase secrets set --env-file ./.env   # push OPENAI_API_KEY
```

### Hosted DB setup via Dashboard

If `db push` is not available, run **`supabase/scripts/hosted_bootstrap.sql`**
in the project SQL Editor (one shot). It is idempotent: safe after partial runs
that only created storage policies. Ends with `notify pgrst, 'reload schema'`
so the API picks up new tables immediately.
