"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ExplorerSession, Role } from "@/types"

const STORAGE_KEY = "lifesaver.session"

interface SessionContextValue {
  session: ExplorerSession | null
  ready: boolean
  /**
   * Start a local exploration session for a role. This does NOT claim that
   * backend authentication succeeded — `authenticated` stays false because
   * the backend /auth endpoints are non-functional stubs.
   */
  startExplorer: (role: Role, displayName: string, email?: string) => void
  endSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ExplorerSession | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSession(JSON.parse(raw))
    } catch {
      // ignore malformed session
    }
    setReady(true)
  }, [])

  const persist = useCallback((next: ExplorerSession | null) => {
    setSession(next)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // storage may be unavailable; keep in-memory state
    }
  }, [])

  const startExplorer = useCallback(
    (role: Role, displayName: string, email?: string) => {
      persist({
        role,
        displayName: displayName || "Guest",
        email,
        authenticated: false,
        createdAt: new Date().toISOString(),
      })
    },
    [persist],
  )

  const endSession = useCallback(() => persist(null), [persist])

  const value = useMemo(
    () => ({ session, ready, startExplorer, endSession }),
    [session, ready, startExplorer, endSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
