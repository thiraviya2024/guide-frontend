import { apiClient } from "./api"
export const doctorsService = { list: () => apiClient.get<unknown>("/doctors") }
