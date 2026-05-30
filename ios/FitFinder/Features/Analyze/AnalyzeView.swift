import SwiftUI

struct AnalyzeView: View {
    @State private var model = AnalyzeViewModel()

    var body: some View {
        NavigationStack {
            Form {
                Section("Job") {
                    TextField("Company", text: $model.companyName)
                    TextField("Job title", text: $model.jobTitle)
                    TextField(
                        "Paste the job description…",
                        text: $model.jobText,
                        axis: .vertical
                    )
                    .lineLimit(4...10)
                }

                Section {
                    TextField(
                        "Paste your resume…",
                        text: $model.resumeText,
                        axis: .vertical
                    )
                    .lineLimit(4...10)
                } header: {
                    Text("Resume (optional)")
                } footer: {
                    Text("A resume greatly improves accuracy. Scoring runs on the shared backend, so results match the web app exactly.")
                }

                Section {
                    Button(action: { Task { await model.run() } }) {
                        if model.isBusy {
                            HStack {
                                ProgressView()
                                Text(model.statusMessage ?? "Working…")
                            }
                        } else {
                            Text("Analyze fit")
                        }
                    }
                    .disabled(!model.canSubmit || model.isBusy)
                }

                if let result = model.result {
                    Section("Result") {
                        AnalysisResultView(result: result)
                    }
                }
            }
            .navigationTitle("Analyze")
            .alert("Analysis failed", isPresented: .constant(model.errorMessage != nil)) {
                Button("OK") { model.errorMessage = nil }
            } message: {
                Text(model.errorMessage ?? "")
            }
        }
    }
}
