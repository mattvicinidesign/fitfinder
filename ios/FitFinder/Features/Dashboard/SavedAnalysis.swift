import Foundation

/// A persisted `analyses` row, as read from the database.
struct SavedAnalysis: Codable, Identifiable, Hashable {
    let id: String
    let companyName: String?
    let jobTitle: String?
    let qualificationScore: Double?
    let fitScore: Double?
    let confidenceScore: Double?
    let recommendation: Recommendation?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case companyName = "company_name"
        case jobTitle = "job_title"
        case qualificationScore = "qualification_score"
        case fitScore = "fit_score"
        case confidenceScore = "confidence_score"
        case recommendation
        case createdAt = "created_at"
    }
}
