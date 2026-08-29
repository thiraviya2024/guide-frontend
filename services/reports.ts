// ============================================================
// Reports & AI explanation service — real backend endpoints.
// ============================================================
import { API_BASE_URL, apiClient, downloadApiFile } from "./api"
import type { AiExplainResponse, AnalysisResult, DiseaseRisk, ParameterResult, PersistedReport } from "@/types"

/** The persisted report identity returned by POST /upload/report. */
export interface UploadReportResponse {
  report_id: string
  [key: string]: unknown
}

export interface AiExplainRequest {
  results: Record<string, ParameterResult>
  disease_risks?: DiseaseRisk[]
}

type JsonObject = Record<string, unknown>
const isObject = (value: unknown): value is JsonObject => Boolean(value && typeof value === "object" && !Array.isArray(value))
const asText = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined
const asCount = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined

function isClinicalResults(value: unknown): value is Record<string, ParameterResult> {
  return isObject(value) && Object.values(value).some((entry) => isObject(entry) && ("value" in entry || "status" in entry))
}

/**
 * The report endpoints publish an untyped JSON envelope. Locate the analysis
 * object structurally (rather than treating the envelope itself as analysis),
 * then retain the full original response for fields the backend adds later.
 */
export function normalizePersistedReport(raw: Record<string, unknown>): PersistedReport {
  const queue: JsonObject[] = [raw]
  const seen = new Set<JsonObject>()
  let analysisEnvelope: JsonObject = raw
  while (queue.length) {
    const candidate = queue.shift()!
    if (seen.has(candidate)) continue
    seen.add(candidate)
    if (isClinicalResults(candidate.results)) { analysisEnvelope = candidate; break }
    for (const child of Object.values(candidate)) if (isObject(child)) queue.push(child)
  }
  const analysis: AnalysisResult = {
    success: analysisEnvelope.success !== false,
    message: asText(analysisEnvelope.message) || "",
    results: Object.values(analysisEnvelope).reduce<Record<string, ParameterResult>>((all, value) => isClinicalResults(value) ? { ...all, ...value } : all, {}),
    total_parameters: asCount(analysisEnvelope.total_parameters),
    abnormal_count: asCount(analysisEnvelope.abnormal_count),
    normal_count: asCount(analysisEnvelope.normal_count),
    overall_status: asText(analysisEnvelope.overall_status),
    status_color: asText(analysisEnvelope.status_color),
    category: asText(analysisEnvelope.category),
    detected_category: asText(analysisEnvelope.detected_category),
    report_type: asText(analysisEnvelope.report_type),
    disease_risks: Array.isArray(analysisEnvelope.disease_risks) ? analysisEnvelope.disease_risks as DiseaseRisk[] : undefined,
  }
  const reportId = String(raw.report_id ?? raw.id ?? "")
  return {
    id: reportId,
    filename: asText(raw.filename) || asText(raw.file_name) || asText(raw.report_name) || asText(raw.name),
    module: asText(raw.module) || asText(analysisEnvelope.module) || analysis.detected_category || analysis.category || analysis.report_type,
    status: asText(raw.status) || asText(raw.analysis_status) || asText(analysisEnvelope.status),
    analysis,
    aiExplanation: asText(raw.ai_explanation) || asText(analysisEnvelope.ai_explanation),
    raw,
  }
}

export const reportsService = {
  /** POST /upload/report (multipart field: file). Persists the real uploaded report. */
  async upload(file: File, module?: string, signal?: AbortSignal): Promise<UploadReportResponse> {
    const form = new FormData()
    form.append("file", file)
    const response = await apiClient.postForm<Record<string, unknown>>("/upload/report", form, {
      query: module ? { module } : undefined,
      timeout: 180_000,
      signal,
    })
    if (typeof response.report_id !== "string" || !response.report_id.trim()) {
      throw new Error("The upload service did not return a persisted report_id.")
    }
    return { ...response, report_id: response.report_id }
  },

  /** The backend owns the uploaded file; analyze it by its persisted ID only. */
  analyzeFile: (reportId: string, signal?: AbortSignal) => {
    if (!reportId.trim()) throw new Error("A persisted report_id is required for analysis.")
    return apiClient.post<Record<string, unknown>>("/analyze/file", undefined, {
      // apiClient uses URLSearchParams, which encodes reportId in the final URL.
      query: { report_id: reportId },
      timeout: 180_000,
      signal,
    })
  },

  listMine: () => apiClient.get<unknown>("/patients/me/reports"),
  getMine: (reportId: string) => apiClient.get<Record<string, unknown>>(`/patients/me/reports/${encodeURIComponent(reportId)}`),
  downloadMine: (reportId: string) => downloadApiFile(`/reports/${encodeURIComponent(reportId)}/download`, "medical-report"),

  /** POST /report/ai-explain  { results, disease_risks } -> Groq/Gemini explanation */
  async aiExplain(reportId: string, signal?: AbortSignal,
  ): Promise<AiExplainResponse> {
    try {
      return await apiClient.post<AiExplainResponse>("/report/ai-explain", undefined, { query: { report_id: reportId }, timeout: 180_000, signal })
    } catch (error) {
      if (typeof window !== "undefined") {
        console.error("[v0] AI explanation request failed", { status: (error as { status?: number }).status, detail: (error as { detail?: unknown }).detail, reportId })
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
  async explainAnalysis(reportId: string | AnalysisResult, signal?: AbortSignal): Promise<AiExplainResponse> {
    if (typeof reportId !== "string") throw new Error("A persisted report ID is required for AI explanation.")
    return reportsService.aiExplain(reportId, signal)
  },
}
