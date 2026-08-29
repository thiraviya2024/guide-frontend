import { apiClient } from "./api"
export const appointmentsService = {
  mine: () => apiClient.get<unknown>("/patients/me/appointments"),
  doctorMine: (status?: string) => apiClient.get<unknown>("/doctors/me/appointments", { query: status ? { status } : undefined }),
  create: (doctor_id: string, reason: string, appointment_at: string, appointment_type: "online" | "in-person") => apiClient.post<Record<string, unknown>>("/appointments", { doctor_id, reason, appointment_at, appointment_type }),
  update: (id: string, status: "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED") => apiClient.patch<Record<string, unknown>>(`/appointments/${encodeURIComponent(id)}`, { status }),
}
