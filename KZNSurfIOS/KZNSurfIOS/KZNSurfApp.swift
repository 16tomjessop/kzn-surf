import SwiftUI

@main
struct KZNSurfApp: App {
    var body: some Scene {
        WindowGroup {
            SurfWebView()
                .ignoresSafeArea()
        }
    }
}
