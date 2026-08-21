// ============================================================
// System / admin / patient services — real backend endpoints.
// ============================================================
import { apiClient } from "./api"
import type { AdminStats, ApiStatus, Patient } from "@/types"

export const systemService = {
  /** GET /status — full module health snapshot */
  async status(): Promise<ApiStatus> {
    return apiClient.get<ApiStatus>("/status")
  },
}

export const adminService = {
  /** GET /admin/stats — clinical rule counts */
  async stats(): Promise<AdminStats> {
    return apiClient.get<AdminStats>("/admin/stats")
  },
  /** GET /admin/rules */
  async rules(): Promise<unknown> {
    return apiClient.get<unknown>("/admin/rules")
  },
}

export const patientService = {
  /** GET /patient/ */
  async list(): Promise<Patient[]> {
    const res = await apiClient.get<Patient[] | { patients?: Patient[] }>("/patient/")
    if (Array.isArray(res)) return res
    return res.patients ?? []
  },
  /** GET /patient/{id} */
  async get(id: number | string): Promise<Patient> {
    return apiClient.get<Patient>(`/patient/${id}`)
  },
  /** POST /patient/ */
  async create(payload: Record<string, unknown>): Promise<Patient> {
    return apiClient.post<Patient>("/patient/", payload)
  },
}
