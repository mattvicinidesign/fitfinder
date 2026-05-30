import SwiftUI

struct DashboardView: View {
    @State private var model = DashboardViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if model.isLoading && model.analyses.isEmpty {
                    ProgressView()
                } else if model.analyses.isEmpty {
                    ContentUnavailableView(
                        "No analyses yet",
                        systemImage: "bookmark",
                        description: Text("Run your first analysis from the Analyze tab.")
                    )
                } else {
                    List(model.analyses) { analysis in
                        SavedAnalysisRow(analysis: analysis)
                    }
                }
            }
            .navigationTitle("Saved")
            .task { await model.load() }
            .refreshable { await model.load() }
        }
    }
}

private struct SavedAnalysisRow: View {
    let analysis: SavedAnalysis

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text(analysis.jobTitle ?? "Untitled role")
                    .font(.headline)
                if let company = analysis.companyName {
                    Text(company).font(.subheadline).foregroundStyle(.secondary)
                }
                if let rec = analysis.recommendation {
                    Text(rec.label).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing) {
                Text("\(Int((analysis.fitScore ?? 0).rounded()))")
                    .font(.title.bold())
                    .foregroundStyle(ScoreStyle.color(for: analysis.fitScore ?? 0))
                Text("Fit").font(.caption2).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
