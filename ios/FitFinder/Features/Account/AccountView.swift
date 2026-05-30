import SwiftUI

struct AccountView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    if session.isGuest {
                        Text("Guest session")
                        Text("Sign in with email or Apple to keep your analyses across devices.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    } else {
                        LabeledContent("Email", value: session.user?.email ?? "—")
                    }
                }

                Section {
                    Button(session.isGuest ? "Sign out of guest session" : "Sign out", role: .destructive) {
                        Task { await session.signOut() }
                    }
                }
            }
            .navigationTitle("Account")
        }
    }
}
