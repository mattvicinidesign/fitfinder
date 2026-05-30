import Foundation

/// Reads Supabase configuration from Info.plist. The anon key is publishable
/// and safe to ship in the client (it is gated by Row Level Security), exactly
/// like the web app's `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
enum AppConfig {
    static let supabaseURL: URL = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: raw)
        else {
            fatalError("SUPABASE_URL is missing or invalid in Info.plist")
        }
        return url
    }()

    static let supabaseAnonKey: String = {
        guard
            let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
            !key.isEmpty
        else {
            fatalError("SUPABASE_ANON_KEY is missing in Info.plist")
        }
        return key
    }()

    /// Deep-link scheme used for the auth callback (matches CFBundleURLSchemes).
    static let urlScheme = "fitfinder"
    static let authCallbackURL = URL(string: "\(urlScheme)://auth-callback")!
}
