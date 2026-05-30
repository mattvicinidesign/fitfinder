import Foundation
import Supabase

/// Typed client for the shared scoring/AI Edge Functions.
///
/// This is the iOS counterpart to the web app's `lib/api.ts`. The app NEVER
/// computes scores locally — every score comes from the `analyze` function so
/// iOS and web stay identical.
struct FitFinderAPI {
    private var functions: FunctionsClient { SupabaseManager.shared.client.functions }

    // MARK: parse-resume

    private struct ParseResumeRequest: Encodable {
        let resumeText: String
        let resumeId: String?
    }
    private struct ParseResumeResponse: Decodable {
        let parsedResume: ParsedResume
    }

    func parseResume(_ text: String, resumeId: String? = nil) async throws -> ParsedResume {
        let response: ParseResumeResponse = try await functions.invoke(
            "parse-resume",
            options: .init(body: ParseResumeRequest(resumeText: text, resumeId: resumeId))
        )
        return response.parsedResume
    }

    // MARK: parse-job

    private struct ParseJobRequest: Encodable { let jobText: String }
    private struct ParseJobResponse: Decodable { let parsedJob: ParsedJob }

    func parseJob(_ text: String) async throws -> ParsedJob {
        let response: ParseJobResponse = try await functions.invoke(
            "parse-job",
            options: .init(body: ParseJobRequest(jobText: text))
        )
        return response.parsedJob
    }

    // MARK: analyze (orchestrator)

    private struct AnalyzeRequest: Encodable {
        let jobText: String
        let companyName: String?
        let jobTitle: String?
        let resumeId: String?
        let parsedResume: ParsedResume?
        let persist: Bool
    }
    private struct AnalyzeResponse: Decodable {
        let analysisId: String?
        let result: AnalysisResult
    }

    func analyze(
        jobText: String,
        companyName: String? = nil,
        jobTitle: String? = nil,
        resumeId: String? = nil,
        parsedResume: ParsedResume? = nil,
        persist: Bool = true
    ) async throws -> (analysisId: String?, result: AnalysisResult) {
        let response: AnalyzeResponse = try await functions.invoke(
            "analyze",
            options: .init(body: AnalyzeRequest(
                jobText: jobText,
                companyName: companyName,
                jobTitle: jobTitle,
                resumeId: resumeId,
                parsedResume: parsedResume,
                persist: persist
            ))
        )
        return (response.analysisId, response.result)
    }
}
