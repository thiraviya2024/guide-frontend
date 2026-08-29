import { apiClient } from "./api"
export const consultationsService = {
  mine: () => apiClient.get<unknown>("/patients/me/consultations"),
  doctorMine: () => apiClient.get<unknown>("/doctors/me/consultations"),
  create: (doctor_id: string, appointment_id?: string) => apiClient.post<Record<string, unknown>>("/consultations", { doctor_id, ...(appointment_id ? { appointment_id } : {}) }),
  get: (id: string) => apiClient.get<Record<string, unknown>>(`/consultations/${encodeURIComponent(id)}`),
  messages: (id: string) => apiClient.get<unknown>(`/consultations/${encodeURIComponent(id)}/messages`),
  send: (id: string, body: string) => apiClient.post<Record<string, unknown>>(`/consultations/${encodeURIComponent(id)}/messages`, { body }),
  update: (id: string, status: "REQUESTED" | "ACTIVE" | "CLOSED" | "REJECTED") => apiClient.patch<Record<string, unknown>>(`/consultations/${encodeURIComponent(id)}`, { status }),
}
