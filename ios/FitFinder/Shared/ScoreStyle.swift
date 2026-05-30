import SwiftUI

enum ScoreStyle {
    /// Color for a 0–100 score, matching the web app's palette intent.
    static func color(for score: Double) -> Color {
        switch score {
        case 80...: .green
        case 60..<80: .yellow
        case 40..<60: .orange
        default: .red
        }
    }
}

/// A labeled score with a progress bar.
struct ScoreStatView: View {
    let label: String
    let value: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(Int(value.rounded()))")
                    .font(.title2.bold())
                    .foregroundStyle(ScoreStyle.color(for: value))
            }
            ProgressView(value: max(0, min(value, 100)), total: 100)
                .tint(ScoreStyle.color(for: value))
        }
    }
}
