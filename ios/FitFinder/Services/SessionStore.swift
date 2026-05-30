import Foundation
import Observation
import Supabase

/// Observable authentication state. Drives which screen the app shows and
/// exposes the sign-in methods (guest, magic link, Apple).
@Observable
@MainActor
final class SessionStore {
    private(set) var user: User?
    private(set) var isLoading = true

    var isSignedIn: Bool { user != nil }
    var isGuest: Bool { user?.isAnonymous ?? false }

    private var client: SupabaseClient { SupabaseManager.shared.client }
    private var authTask: Task<Void, Never>?

    init() {
        observeAuthChanges()
    }

    private func observeAuthChanges() {
        authTask = Task {
            for await (event, session) in client.auth.authStateChanges {
                switch event {
                case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                    self.user = session?.user
                case .signedOut:
                    self.user = nil
                default:
                    break
                }
                self.isLoading = false
            }
        }
    }

    // MARK: Sign-in methods

    /// Guest Mode — anonymous session with temporary, RLS-scoped storage.
    func continueAsGuest() async throws {
        try await client.auth.signInAnonymously()
    }

    /// Email magic link. Supabase opens the app at `fitfinder://auth-callback`.
    func sendMagicLink(to email: String) async throws {
        try await client.auth.signInWithOTP(
            email: email,
            redirectTo: AppConfig.authCallbackURL
        )
    }

    /// Sign In With Apple. Pass the identity token and nonce from the
    /// ASAuthorization credential.
    func signInWithApple(idToken: String, nonce: String) async throws {
        try await client.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
        )
    }

    func signOut() async {
        try? await client.auth.signOut()
    }

    /// Handle the deep link opened by a magic link.
    func handle(url: URL) async {
        try? await client.auth.session(from: url)
    }
}
