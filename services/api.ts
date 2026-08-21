// ============================================================
// Centralized API client for the LIFE SAVER FastAPI backend.
// The ONLY frontend config is the public base URL — no secrets.
// ============================================================
import type { ApiError } from "@/types"

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")

export const API_BASE_URL = configuredApiUrl
  ? `${configuredApiUrl.replace(/\/api\/v1$/, "")}/api/v1`
  : "https://medi-guide-project.onrender.com/api/v1"

const DEFAULT_TIMEOUT = 90_000 // backend on Render can cold-start slowly

export class ApiRequestError extends Error {
  status: number
  detail?: unknown
  isNetwork?: boolean
  isTimeout?: boolean

  constructor(err: ApiError) {
    super(err.message)
    this.name = "ApiRequestError"
    this.status = err.status
    this.detail = err.detail
    this.isNetwork = err.isNetwork
    this.isTimeout = err.isTimeout
  }
}

/** Human-friendly message for any failure, safe to show patients. */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.isTimeout) return "The medical service took too long to respond. Please try again."
    if (err.isNetwork) return "Unable to connect to the medical analysis service. Check your connection and try again."
    switch (err.status) {
      case 401:
        return "You are not authorized. Please sign in again."
      case 403:
        return "You do not have permission to access this resource."
      case 404:
        return "The requested medical resource could not be found."
      case 422:
        return "Some of the submitted values were invalid. Please review and try again."
      case 500:
      case 502:
      case 503:
        return "The medical analysis service is temporarily unavailable. Please try again shortly."
      default:
        return err.message || "Something went wrong. Please try again."
    }
  }
  return err instanceof Error && err.message ? err.message : "Something went wrong. Please try again."
}

interface RequestOptions {
  method?: string
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  formData?: FormData
  timeout?: number
  signal?: AbortSignal
  headers?: Record<string, string>
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(API_BASE_URL + (path.startsWith("/") ? path : `/${path}`))
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, formData, timeout = DEFAULT_TIMEOUT, signal, headers = {} } = opts

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  if (signal) signal.addEventListener("abort", () => controller.abort())

  const init: RequestInit = { method, signal: controller.signal, headers: { ...headers } }

  if (formData) {
    init.body = formData // browser sets multipart boundary automatically
  } else if (body !== undefined) {
    ;(init.headers as Record<string, string>)["Content-Type"] = "application/json"
    init.body = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), init)
  } catch (e) {
    clearTimeout(timer)
    const aborted = e instanceof DOMException && e.name === "AbortError"
    throw new ApiRequestError({
      status: 0,
      message: aborted ? "Request timed out" : "Network request failed",
      isTimeout: aborted,
      isNetwork: !aborted,
    })
  }
  clearTimeout(timer)

  const contentType = res.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

  if (!res.ok) {
    const detailMsg =
      isJson && payload && typeof payload === "object" && "detail" in payload
        ? typeof (payload as { detail: unknown }).detail === "string"
          ? (payload as { detail: string }).detail
          : undefined
        : undefined
    throw new ApiRequestError({
      status: res.status,
      message: detailMsg || `Request failed with status ${res.status}`,
      detail: isJson ? payload : undefined,
    })
  }

  return payload as T
}

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body" | "formData">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  postForm: <T>(path: string, formData: FormData, opts?: Omit<RequestOptions, "method" | "formData">) =>
    request<T>(path, { ...opts, method: "POST", formData }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  del: <T>(path: string, opts?: Omit<RequestOptions, "method">) => request<T>(path, { ...opts, method: "DELETE" }),
}
