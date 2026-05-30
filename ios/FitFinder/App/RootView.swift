import SwiftUI

/// Top-level router: shows the sign-in screen until there is a session, then
/// the main tabbed experience. Guest (anonymous) sessions count as signed in.
struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        Group {
            if session.isLoading {
                ProgressView().controlSize(.large)
            } else if session.isSignedIn {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.default, value: session.isSignedIn)
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            AnalyzeView()
                .tabItem { Label("Analyze", systemImage: "wand.and.stars") }
            DashboardView()
                .tabItem { Label("Saved", systemImage: "bookmark") }
            AccountView()
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
    }
}
