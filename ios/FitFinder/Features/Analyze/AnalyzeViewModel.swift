import Foundation
import Observation

@Observable
@MainActor
final class AnalyzeViewModel {
    var resumeText = ""
    var jobText = ""
    var companyName = ""
    var jobTitle = ""

    private(set) var statusMessage: String?
    private(set) var result: AnalysisResult?
    var errorMessage: String?

    var isBusy: Bool { statusMessage != nil }
    var canSubmit: Bool { !jobText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    private let api = FitFinderAPI()

    func run() async {
        guard canSubmit else {
            errorMessage = "Paste a job description to analyze."
            return
        }
        errorMessage = nil
        result = nil

        do {
            var parsedResume: ParsedResume?
            if !resumeText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                statusMessage = "Parsing resume…"
                parsedResume = try await api.parseResume(resumeText)
            }

            statusMessage = "Scoring fit…"
            let (_, result) = try await api.analyze(
                jobText: jobText,
                companyName: companyName.isEmpty ? nil : companyName,
                jobTitle: jobTitle.isEmpty ? nil : jobTitle,
                parsedResume: parsedResume
            )
            self.result = result
        } catch {
            errorMessage = error.localizedDescription
        }
        statusMessage = nil
    }
}
