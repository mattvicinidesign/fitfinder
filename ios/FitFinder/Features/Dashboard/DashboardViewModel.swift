import Foundation
import Observation

@Observable
@MainActor
final class DashboardViewModel {
    private(set) var analyses: [SavedAnalysis] = []
    private(set) var isLoading = false
    var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            // RLS guarantees only the current user's rows are returned.
            analyses = try await SupabaseManager.shared.client
                .from("analyses")
                .select(
                    "id, company_name, job_title, qualification_score, fit_score, confidence_score, recommendation, created_at"
                )
                .order("created_at", ascending: false)
                .execute()
                .value
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
