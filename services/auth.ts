// ============================================================
// Auth service.
// IMPORTANT: the backend /auth endpoints are currently stubs that
// return { message: "..." } with NO token and NO user object.
// We call them for real, but we NEVER treat the call as a successful
// login. `backendAuthAvailable()` lets the UI show an honest state.
// ============================================================
import { apiClient } from "./api"
import type { Role } from "@/types"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  full_name: string
  email: string
  password: string
  phone?: string
  date_of_birth?: string
  gender?: string
  role?: Role
}

/** Raw stub response shape currently returned by the backend. */
export interface AuthStubResponse {
  message?: string
  access_token?: string
  token?: string
  user?: unknown
  [key: string]: unknown
}

/** Returns true only if the response actually contains a usable token. */
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
}
