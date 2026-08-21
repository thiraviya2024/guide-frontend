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

  /** POST /analyze/file (multipart, field name: file) — backend extracts the report. */
  async analyzeFile(file: File): Promise<AnalysisResult> {
    const fd = new FormData()
    fd.append("file", file)
    const result = await apiClient.postForm<AnalysisResult & {
      extracted_text_preview?: string
      file_info?: { module?: string; filename?: string; size?: number }
      patient_info?: Record<string, unknown>
      food_recommendations?: unknown[]
      exercise_recommendations?: unknown[]
      follow_up?: unknown
      raw_report?: unknown
    }>("/analyze/file", fd, { timeout: 180_000 })
    const preview = result.extracted_text_preview || ""
    const reportHint = `${file.name} ${preview}`
    const looksLikeLipid = /total cholesterol|\bldl\b|\bhdl\b|triglycerides|\bvldl\b|non[- ]?hdl/i.test(reportHint)
    const backendReturnedClinicalResults = result.results && Object.keys(result.results).length > 0
    if (backendReturnedClinicalResults) return result
    if (!looksLikeLipid) {
      throw new Error("The backend did not return clinical results for this report.")
    }

    // The deployed file detector can label a lipid text file as CBC and return
    // success:false, but it still returns the backend-extracted preview. Feed
    // those extracted values into the real lipid rule-engine endpoint; never
    // classify them in the browser.
    const values: Record<string, number> = {}
    const keyMap: Record<string, string> = {
      "total cholesterol": "total_cholesterol",
      ldl: "ldl",
      hdl: "hdl",
      triglycerides: "triglycerides",
      vldl: "vldl",
      "non-hdl": "non_hdl",
      "non hdl": "non_hdl",
    }
    for (const line of preview.split(/\r?\n/)) {
      const match = line.match(/^\s*([^:]+):\s*(-?\d+(?:\.\d+)?)/)
      if (!match) continue
      const key = keyMap[match[1].trim().toLowerCase()]
      if (key) values[key] = Number(match[2])
    }
    if (!Object.keys(values).length) {
      throw new Error("The backend did not return clinical results for this report.")
    }
    const analyzed = await this.analyzeManual("lipid", values)
    console.log("EXTRACTED REPORT RESULTS:", analyzed.results)
    return {
      ...analyzed,
      patient_info: result.patient_info,
      food_recommendations: result.food_recommendations,
      exercise_recommendations: result.exercise_recommendations,
      follow_up: result.follow_up,
      raw_report: result.raw_report,
      extracted_text_preview: preview,
      file_info: result.file_info,
    }
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
