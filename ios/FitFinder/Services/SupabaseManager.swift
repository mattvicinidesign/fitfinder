import Foundation
import Supabase

/// Single shared Supabase client for the app.
/// Immutable and holding only the `Sendable` `SupabaseClient`, so it is safe
/// to share across actors under Swift 6 strict concurrency.
final class SupabaseManager: Sendable {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey
        )
    }
}
