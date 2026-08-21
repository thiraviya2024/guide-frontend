// ============================================================
// Doctor dataset portal service — real backend endpoints.
// ============================================================
import { apiClient } from "./api"
import type {
  DatasetCategoriesResponse,
  DatasetUploadResponse,
  DatasetVersionsResponse,
} from "@/types"

export const datasetsService = {
  /** GET /doctor/datasets/categories */
  async categories(): Promise<DatasetCategoriesResponse> {
    return apiClient.get<DatasetCategoriesResponse>("/doctor/datasets/categories")
  },

  /** GET /doctor/datasets/versions */
  async versions(): Promise<DatasetVersionsResponse> {
    return apiClient.get<DatasetVersionsResponse>("/doctor/datasets/versions")
  },

  /** POST /doctor/datasets/upload (multipart, field: file) */
  async upload(file: File): Promise<DatasetUploadResponse> {
    const fd = new FormData()
    fd.append("file", file)
    return apiClient.postForm<DatasetUploadResponse>("/doctor/datasets/upload", fd, { timeout: 120_000 })
  },

  /** POST /doctor/datasets/confirm */
  async confirm(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>("/doctor/datasets/confirm", payload)
  },

  /** POST /doctor/datasets/activate/{version_id} */
  async activate(versionId: number | string): Promise<Record<string, unknown>> {
    return apiClient.post<Record<string, unknown>>(`/doctor/datasets/activate/${versionId}`, {})
  },
}
