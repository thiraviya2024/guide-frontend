import { apiClient } from "./api"
export const hospitalsService = { search: (latitude: number, longitude: number, specialty?: string) => apiClient.get<unknown>("/hospitals/search", { query: { latitude, longitude, specialty } }) }
