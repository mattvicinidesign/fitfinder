import Foundation

// Swift mirror of the backend domain contract.
// Source of truth: supabase/functions/_shared/types.ts. Keep these in sync.
// The Edge Functions return camelCase JSON, so the default decoder works.

struct WorkHistoryItem: Codable, Hashable {
    var title: String
    var company: String
    var startDate: String?
    var endDate: String?
    var summary: String?
}

struct ParsedResume: Codable, Hashable {
    var skills: [String]
    var industries: [String]
    var workHistory: [WorkHistoryItem]
    var aiExperience: [String]
    var tools: [String]
    var archetypes: [String]

    static let empty = ParsedResume(
        skills: [], industries: [], workHistory: [],
        aiExperience: [], tools: [], archetypes: []
    )
}

struct Compensation: Codable, Hashable {
    var min: Double?
    var max: Double?
    var currency: String?
    var period: String?
}

struct ParsedJob: Codable, Hashable {
    var skills: [String]
    var industries: [String]
    var workflows: [String]
    var compensation: Compensation?
    var toolRequirements: [String]
    var aiRequirements: [String]
}

enum Recommendation: String, Codable, Hashable {
    case strongApply = "strong_apply"
    case apply
    case stretch
    case longShot = "long_shot"
    case notRecommended = "not_recommended"

    var label: String {
        switch self {
        case .strongApply: "Strong apply"
        case .apply: "Apply"
        case .stretch: "Stretch"
        case .longShot: "Long shot"
        case .notRecommended: "Not recommended"
        }
    }
}

struct ScoreBreakdown: Codable, Hashable {
    var skillsMatch: Double
    var toolsMatch: Double
    var aiMatch: Double
    var industryAlignment: Double
    var signalCoverage: Double
}

struct ScoreResult: Codable, Hashable {
    var qualificationScore: Double
    var confidenceScore: Double
    var careerFitAdjustment: Double
    var fitScore: Double
    var recommendation: Recommendation
    var breakdown: ScoreBreakdown
}

struct Narrative: Codable, Hashable {
    var strengths: [String]
    var gaps: [String]
    var recommendations: [String]
    var positiveSignals: [String]
    var negativeSignals: [String]
}

struct AnalysisResult: Codable, Hashable {
    var companyName: String?
    var jobTitle: String?
    var parsedJob: ParsedJob
    var score: ScoreResult
    var narrative: Narrative
}
