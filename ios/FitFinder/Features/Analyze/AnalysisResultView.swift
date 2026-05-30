import SwiftUI

/// Renders the scores and narrative from an `AnalysisResult`.
struct AnalysisResultView: View {
    let result: AnalysisResult

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(result.score.recommendation.label)
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(ScoreStyle.color(for: result.score.fitScore).opacity(0.15))
                    .foregroundStyle(ScoreStyle.color(for: result.score.fitScore))
                    .clipShape(Capsule())
                Spacer()
                Text(adjustmentText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ScoreStatView(label: "Fit score", value: result.score.fitScore)
            ScoreStatView(label: "Qualification", value: result.score.qualificationScore)
            ScoreStatView(label: "Confidence", value: result.score.confidenceScore)

            NarrativeSection(title: "Strengths", items: result.narrative.strengths)
            NarrativeSection(title: "Gaps", items: result.narrative.gaps)
            NarrativeSection(title: "Recommendations", items: result.narrative.recommendations)
            NarrativeSection(title: "Positive signals", items: result.narrative.positiveSignals)
            NarrativeSection(title: "Negative signals", items: result.narrative.negativeSignals)
        }
        .padding(.vertical, 4)
    }

    private var adjustmentText: String {
        let adj = result.score.careerFitAdjustment
        return "Career fit \(adj >= 0 ? "+" : "")\(Int(adj.rounded()))"
    }
}

private struct NarrativeSection: View {
    let title: String
    let items: [String]

    var body: some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                Text(title).font(.subheadline.bold())
                ForEach(items, id: \.self) { item in
                    HStack(alignment: .top, spacing: 6) {
                        Text("•")
                        Text(item)
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
            }
        }
    }
}
