// ============================================================
// Auth service.
// JWT auth is owned by the deployed backend. This module keeps the frontend
// aligned with its documented request contract.
// ============================================================
import { apiClient } from "./api"
import type { Role } from "@/types"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  date_of_birth?: string
  gender?: string
  role?: Role
  specialty?: string
  qualification?: string
  registration_identifier?: string
}

export interface AuthStubResponse {
  message?: string
  access_token?: string
  token?: string
  user?: unknown
  [key: string]: unknown
}

export function responseHasRealToken(res: AuthStubResponse | null): boolean {
  return Boolean(res && (res.access_token || res.token))
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthStubResponse> {
    return apiClient.post<AuthStubResponse>("/auth/login", payload)
  },
  async register(payload: RegisterPayload): Promise<AuthStubResponse> {
    return apiClient.post<AuthStubResponse>("/auth/register", payload)
  },
  async logout(): Promise<AuthStubResponse> {
    return apiClient.post<AuthStubResponse>("/auth/logout", {})
  },
  async firebaseLogin(idToken: string): Promise<AuthStubResponse> {
    return apiClient.post<AuthStubResponse>("/auth/firebase", { id_token: idToken })
  },
}

export function authToken(response: AuthStubResponse): string | null {
  return typeof response.access_token === "string" ? response.access_token : typeof response.token === "string" ? response.token : null
}

export function authUser(response: AuthStubResponse): Record<string, unknown> {
  if (response.user && typeof response.user === "object") return response.user as Record<string, unknown>
  if (response.data && typeof response.data === "object") {
    const data = response.data as Record<string, unknown>
    return data.user && typeof data.user === "object" ? data.user as Record<string, unknown> : data
  }
  return response
}
