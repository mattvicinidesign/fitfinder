# Fit Finder — iOS

The primary Fit Finder experience: a SwiftUI app (MVVM) targeting iOS 18+,
built for the App Store. It consumes the shared Supabase backend and the
scoring Edge Functions — it never computes scores locally.

## Generate the Xcode project

The `.xcodeproj` is generated from [`project.yml`](./project.yml) with
[XcodeGen](https://github.com/yonyk/XcodeGen) so the project file stays diff-able.

```bash
brew install xcodegen
cd ios
xcodegen generate
open FitFinder.xcodeproj
```

Then in `FitFinder/Info.plist`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY`
(the anon key is publishable, like the web app's public key).

## Architecture (MVVM)

```
FitFinder/
├── App/
│   ├── FitFinderApp.swift     # entry point + deep-link handling
│   ├── RootView.swift         # auth-gated router + tab bar
│   └── AppConfig.swift        # reads Supabase config from Info.plist
├── Models/
│   └── Domain.swift           # mirror of supabase/functions/_shared/types.ts
├── Services/
│   ├── SupabaseManager.swift  # shared SupabaseClient
│   ├── SessionStore.swift     # observable auth state (guest/magic-link/Apple)
│   └── FitFinderAPI.swift     # calls the shared scoring Edge Functions
├── Features/
│   ├── Auth/LoginView.swift
│   ├── Analyze/               # AnalyzeView + ViewModel + result view
│   ├── Dashboard/             # saved analyses (RLS-scoped)
│   └── Account/AccountView.swift
└── Shared/ScoreStyle.swift
```

## Capabilities

- **Auth**: email magic link, Sign In With Apple, and Guest Mode (anonymous).
- **Deep linking**: `fitfinder://auth-callback` handles magic-link returns.
- **Sign In With Apple**: enabled via `FitFinder.entitlements` (set your team ID
  in `project.yml`).

## How scoring works here

`FitFinderAPI` calls the `analyze` Edge Function via the Supabase Functions
client. All scoring logic lives in `supabase/functions/_shared/scoring.ts`.
Do not reimplement scoring in Swift.

## Deploy (App Store)

Set your `DEVELOPMENT_TEAM` and bundle identifier in `project.yml`, regenerate,
then archive from Xcode (Product → Archive) and upload via the Organizer.
