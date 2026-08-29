"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Role, Session } from "@/types"
import { setApiAccessToken, setApiUnauthorizedHandler } from "@/services/api"
import { isFirebaseConfigured, observeFirebaseAuth, signOutFromFirebase } from "@/lib/firebase"

interface SessionContextValue {
  session: Session | null
  ready: boolean
  startAuthenticatedSession: (role: Role, displayName: string, email: string | undefined, firebaseUid: string, token: string) => void
  endSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

const SESSION_KEY = "life-saver-auth-session"
const authDebug = (message: string) => { if (process.env.NODE_ENV !== "production") console.info(`[LIFE SAVER auth] ${message}`) }

/** Stores the backend-issued session that authorizes protected API requests. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const clearApplicationSession = useCallback(() => {
    setApiAccessToken(null)
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as { token?: string; session?: Session }
        if (parsed.session && parsed.token) {
          authDebug("Restoring existing LIFE SAVER session")
          setApiAccessToken(parsed.token); setSession(parsed.session)
        }
      }
    } finally {
      if (!isFirebaseConfigured) setReady(true)
    }
  }, [])
  useEffect(() => {
    if (!isFirebaseConfigured) return
    return observeFirebaseAuth((firebaseUser) => {
      if (firebaseUser) authDebug("Firebase user authenticated")
      if (!firebaseUser) {
        try {
          const stored = sessionStorage.getItem(SESSION_KEY)
          const parsed = stored ? JSON.parse(stored) as { session?: Session } : null
          if (parsed?.session?.authProvider === "firebase") {
            authDebug("Firebase session signed out")
            clearApplicationSession()
          }
        } catch { clearApplicationSession() }
      }
      setReady(true)
    })
  }, [clearApplicationSession])
  const startAuthenticatedSession = useCallback((role: Role, displayName: string, email: string | undefined, firebaseUid: string, _token: string) => {
    setApiAccessToken(_token)
    const next: Session = { role, displayName: displayName || "Patient", email, firebaseUid, authenticated: true, authProvider: "firebase", createdAt: new Date().toISOString() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: _token, session: next }))
    setSession(next)
    authDebug("LIFE SAVER session established")
  }, [])
  const endSession = useCallback(async () => {
    clearApplicationSession()
    authDebug("Firebase session signed out")
    if (isFirebaseConfigured) await signOutFromFirebase()
  }, [clearApplicationSession])
  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      if (!session?.authenticated) return
      authDebug("LIFE SAVER session unauthorized; signing out")
      void endSession()
      window.location.assign("/auth")
    })
    return () => setApiUnauthorizedHandler(null)
  }, [endSession, session?.authenticated])
  const value = useMemo(() => ({ session, ready, startAuthenticatedSession, endSession }), [session, ready, startAuthenticatedSession, endSession])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
