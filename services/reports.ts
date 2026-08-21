// ============================================================
// Reports & AI explanation service — real backend endpoints.
// ============================================================
import { API_BASE_URL, apiClient } from "./api"
import type { AiExplainResponse, AnalysisResult, DiseaseRisk, ParameterResult } from "@/types"

export interface AiExplainRequest {
  results: Record<string, ParameterResult>
  disease_risks?: DiseaseRisk[]
}

export const reportsService = {
  /** POST /report/ai-explain  { results, disease_risks } -> Groq/Gemini explanation */
  async aiExplain(
    results: Record<string, ParameterResult>,
    diseaseRisks: DiseaseRisk[] = [],
  ): Promise<AiExplainResponse> {
    const payload: AiExplainRequest = { results, disease_risks: diseaseRisks }
    try {
      return await apiClient.post<AiExplainResponse>("/report/ai-explain", payload, { timeout: 180_000 })
    } catch (error) {
      if (typeof window !== "undefined") {
        console.error("[v0] AI explanation request failed", { status: (error as { status?: number }).status, detail: (error as { detail?: unknown }).detail, payload })
      }
      throw error
    }
  },

  /** POST /report/generate -> typically returns a filename or file metadata */
  async generate(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>("/report/generate", payload, { timeout: 180_000 })
  },

  /** POST /report/health-summary */
  async healthSummary(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>("/report/health-summary", payload, { timeout: 180_000 })
  },

  /** POST /report/lifestyle */
  async lifestyle(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>("/report/lifestyle", payload, { timeout: 180_000 })
  },

  /** GET /report/download/{filename} — returns a direct URL for download */
  downloadUrl(filename: string): string {
    return `${API_BASE_URL}/report/download/${encodeURIComponent(filename)}`
  },

  /** Convenience combining an analysis into an AI explanation request */
  async explainAnalysis(analysis: AnalysisResult): Promise<AiExplainResponse> {
    return reportsService.aiExplain(analysis.results, analysis.disease_risks ?? [])
  },
}
