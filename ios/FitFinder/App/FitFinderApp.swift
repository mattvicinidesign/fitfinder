import SwiftUI

@main
struct FitFinderApp: App {
    @State private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .onOpenURL { url in
                    // Deep link from a magic-link email.
                    Task { await session.handle(url: url) }
                }
        }
    }
}
