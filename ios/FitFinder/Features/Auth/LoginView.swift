import SwiftUI
import AuthenticationServices
import CryptoKit

struct LoginView: View {
    @Environment(SessionStore.self) private var session

    @State private var email = ""
    @State private var infoMessage: String?
    @State private var errorMessage: String?
    @State private var isWorking = false

    // Nonce for the in-flight Sign In With Apple request.
    @State private var currentNonce: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            VStack(spacing: 8) {
                Image(systemName: "scope")
                    .font(.system(size: 44, weight: .semibold))
                    .foregroundStyle(.tint)
                Text("Fit Finder")
                    .font(.largeTitle.bold())
                Text("Know if you fit the job before you apply.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 12) {
                TextField("you@example.com", text: $email)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()

                Button(action: { Task { await sendMagicLink() } }) {
                    Text("Send magic link")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(email.isEmpty || isWorking)

                SignInWithAppleButton(.signIn) { request in
                    let nonce = Self.randomNonce()
                    currentNonce = nonce
                    request.requestedScopes = [.fullName, .email]
                    request.nonce = Self.sha256(nonce)
                } onCompletion: { result in
                    Task { await handleApple(result) }
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 48)

                Button("Continue as guest") {
                    Task { await continueAsGuest() }
                }
                .disabled(isWorking)
            }
            .padding(.horizontal)

            if let infoMessage {
                Text(infoMessage).font(.footnote).foregroundStyle(.green)
            }
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(.red)
            }
            Spacer()
        }
        .padding()
    }

    // MARK: Actions

    private func sendMagicLink() async {
        isWorking = true
        defer { isWorking = false }
        do {
            try await session.sendMagicLink(to: email)
            infoMessage = "Check your email for a sign-in link."
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func continueAsGuest() async {
        isWorking = true
        defer { isWorking = false }
        do {
            try await session.continueAsGuest()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let auth):
            guard
                let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let idToken = String(data: tokenData, encoding: .utf8),
                let nonce = currentNonce
            else {
                errorMessage = "Apple sign-in failed."
                return
            }
            do {
                try await session.signInWithApple(idToken: idToken, nonce: nonce)
            } catch {
                errorMessage = error.localizedDescription
            }
        case .failure(let error):
            errorMessage = error.localizedDescription
        }
    }

    // MARK: Nonce helpers (Apple requires a hashed nonce)

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            var random: UInt8 = 0
            _ = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            if random < charset.count {
                result.append(charset[Int(random)])
                remaining -= 1
            }
        }
        return result
    }

    private static func sha256(_ input: String) -> String {
        let hashed = SHA256.hash(data: Data(input.utf8))
        return hashed.map { String(format: "%02x", $0) }.joined()
    }
}
