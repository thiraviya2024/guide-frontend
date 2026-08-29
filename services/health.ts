import { apiClient } from "./api"

export interface HealthInput { systolic_bp?: number; diastolic_bp?: number; spo2?: number; blood_glucose?: number; heart_rate?: number; temperature_c?: number; height_cm?: number; weight_kg?: number; recorded_at?: string }
export const healthService = {
  list: () => apiClient.get<unknown>("/patients/me/health"),
  add: (reading: HealthInput) => apiClient.post<Record<string, unknown>>("/patients/me/health", reading),
  bmi: (height_cm: number, weight_kg: number) => apiClient.post<Record<string, unknown>>("/patients/me/bmi", { height_cm, weight_kg }),
  dietGuidance: () => apiClient.post<Record<string, unknown>>("/patients/me/diet-guidance", {}),
}
