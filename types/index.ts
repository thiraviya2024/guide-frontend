// ============================================================
// LIFE SAVER — shared types
// All shapes are derived from the real FastAPI backend at
// https://lipidai-backend-docker.onrender.com/api/v1
// Never invent fields that the backend does not return.
// ============================================================

export type Role = "patient" | "doctor" | "admin"

// ---------- Session (transparent role explorer) ----------
// The backend /auth endpoints are currently non-functional stubs
// (they return { message: "Login endpoint" } with no token/user).
// We therefore never claim authentication succeeded. Instead we
// store a clearly-labelled local exploration session.
export interface ExplorerSession {
  role: Role
  displayName: string
  email?: string
  // true only if a real backend token was ever issued (currently never)
  authenticated: boolean
  createdAt: string
}

// ---------- Clinical modules ----------
export type ClinicalModule =
  | "lipid"
  | "cbc"
  | "lft"
  | "kft"
  | "thyroid"
  | "diabetes"
  | "vitamins"
  | "electrolytes"

export const CLINICAL_MODULES: ClinicalModule[] = [
  "lipid",
  "cbc",
  "lft",
  "kft",
  "thyroid",
  "diabetes",
  "vitamins",
  "electrolytes",
]

// ---------- /status ----------
export interface ApiStatus {
  status: string
  version: string
  modules: Record<string, string>
  total_modules: number
  endpoints_count: number
  docs: string
  message: string
}

// ---------- /admin/stats ----------
export interface AdminStats {
  lipid_rules?: number
  combination_rules?: number
  food_rules?: number
  exercise_rules?: number
  mimic_mapping?: number
  [key: string]: number | undefined
}

// ---------- /analyze/manual & /analyze/file ----------
export interface ParameterResult {
  value: number
  status: string // "Normal" | "High" | "Low" | "Borderline High" | ...
  recommendation?: string
  category?: string
  unit?: string
  reference?: string
}

export interface DiseaseRisk {
  disease: string
  confidence: string // "High" | "Moderate" | "Low"
  reason?: string
  recommendation?: string
}

export interface AnalysisResult {
  success: boolean
  message: string
  overall_status?: string
  status_color?: string // "red" | "green" | "yellow" ...
  total_parameters?: number
  abnormal_count?: number
  normal_count?: number
  results: Record<string, ParameterResult>
  disease_risks?: DiseaseRisk[]
  category?: string
  // file analysis may include the detected type / extracted values
  detected_category?: string
  report_type?: string
  [key: string]: unknown
}

// ---------- /report/ai-explain ----------
export interface AiExplainResponse {
  success?: boolean
  // AI provider fields are only rendered when actually present
  explanation?: string
  groq?: unknown
  gemini?: unknown
  consensus?: unknown
  confidence?: string
  agreement?: string | number
  physician_review_required?: boolean
  [key: string]: unknown
}

// ---------- Reference ranges ----------
export interface ReferenceRangeBand {
  level: string
  min: number
  max: number
  status: string
}
export type ReferenceRanges = Record<string, ReferenceRangeBand[]>

// ---------- Datasets ----------
export interface DatasetCategoryInfo {
  display_name: string
  parameters: string[]
  icon?: string
}
export interface DatasetCategoriesResponse {
  success: boolean
  categories: Record<string, DatasetCategoryInfo>
}

export interface DatasetVersion {
  id: number
  version: string
  category: string
  status: string // "draft" | "active" | ...
  uploaded_by: string
  source_file: string
  change_summary: string
  is_active: boolean
  created_at: string
  activated_at: string | null
}
export interface DatasetVersionsResponse {
  success: boolean
  versions: DatasetVersion[]
}

export interface ColumnMapping {
  original: string
  mapped: string
  confidence: number
}

export interface DatasetUploadResponse {
  success: boolean
  message?: string
  file_name?: string
  file_size?: number
  rows?: number
  columns?: number
  detected_category?: string
  category?: string
  column_mappings?: ColumnMapping[]
  mappings?: Record<string, string>
  preview?: Record<string, unknown>[]
  upload_id?: string | number
  [key: string]: unknown
}

// ---------- Patients ----------
export interface Patient {
  id?: number | string
  name?: string
  full_name?: string
  age?: number
  gender?: string
  [key: string]: unknown
}

// ---------- API error envelope ----------
export interface ApiError {
  status: number
  message: string
  detail?: unknown
  isNetwork?: boolean
  isTimeout?: boolean
}
