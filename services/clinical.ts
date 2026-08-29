// ============================================================
// Clinical analysis service — real, functional backend endpoints.
// ============================================================
import { apiClient } from "./api"
import type { AnalysisResult, ClinicalModule, ReferenceRanges } from "@/types"

// Maps a clinical module to the JSON key expected by /analyze/manual
const MANUAL_VALUE_KEY: Record<ClinicalModule, string> = {
  lipid: "lipid_values",
  cbc: "cbc_values",
  lft: "lft_values",
  kft: "kft_values",
  thyroid: "thyroid_values",
  diabetes: "diabetes_values",
  vitamins: "vitamins_values",
  electrolytes: "electrolytes_values",
}

export const clinicalService = {
  /** POST /analyze/manual?module=lipid  { lipid_values: {...} } */
  async analyzeManual(
    module: ClinicalModule,
    values: Record<string, number>,
    patientInfo?: Record<string, unknown>,
  ): Promise<AnalysisResult> {
    const body: Record<string, unknown> = { [MANUAL_VALUE_KEY[module]]: values }
    if (patientInfo) body.patient_info = patientInfo
    return apiClient.post<AnalysisResult>("/analyze/manual", body, { query: { module } })
  },

  /** POST /analyze/file?report_id=<persisted ID>; the backend loads the stored file. */
  async analyzeFile(reportId: string, signal?: AbortSignal): Promise<AnalysisResult> {
    if (!reportId.trim()) throw new Error("A persisted report_id is required for analysis.")
    return apiClient.post<AnalysisResult>("/analyze/file", undefined, {
      query: { report_id: reportId },
      timeout: 180_000,
      signal,
    })
  },

  /** GET /{module}/reference-ranges */
  async referenceRanges(module: ClinicalModule): Promise<ReferenceRanges> {
    return apiClient.get<ReferenceRanges>(`/${module}/reference-ranges`)
  },

  /** POST /{module}/analyze-values */
  async analyzeValues(module: ClinicalModule, values: Record<string, number>): Promise<AnalysisResult> {
    return apiClient.post<AnalysisResult>(`/${module}/analyze-values`, values)
  },
}
