"use client"

import { FormEvent, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { BrandLogo } from "@/components/medical/brand-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSession } from "@/components/providers/session-provider"
import type { Role } from "@/types"
import { ApiRequestError } from "@/services/api"
import { authService, authToken, authUser, type AuthStubResponse } from "@/services/auth"
import { createFirebaseUser, firebaseErrorMessage, getFirebaseIdToken, signInWithFirebaseEmail, signInWithGoogle, signOutFromFirebase } from "@/lib/firebase"
import type { User } from "firebase/auth"

const authDebug = (message: string) => { if (process.env.NODE_ENV !== "production") console.info(`[LIFE SAVER auth] ${message}`) }
const firebaseErrorCode = (error: unknown) => typeof error === "object" && error && "code" in error ? String(error.code) : "unknown"

function backendAuthError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Authentication failed. Please sign in again."
    if (error.status === 500) return "Authentication service is temporarily unavailable."
  }
  return error instanceof Error ? error.message : "Unable to complete authentication. Please try again."
}

function roleFromBackend(response: AuthStubResponse) {
  const user = authUser(response)
  const candidate = String(user.role ?? user.user_role ?? response.role ?? "patient").toLowerCase()
  const role: Role = candidate === "doctor" || candidate === "admin" ? candidate : "patient"
  return { role, displayName: String(user.name ?? user.full_name ?? user.display_name ?? "Patient"), email: typeof user.email === "string" ? user.email : undefined }
}

export default function AuthPage() {
  const { startAuthenticatedSession, endSession } = useSession()
  const router = useRouter()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const exchangingUsers = useRef(new Set<string>())
  const exchangedUsers = useRef(new Set<string>())
  const signingUp = mode === "signup"

  function establish(response: AuthStubResponse, user: User) {
    const token = authToken(response)
    if (!token) throw new Error("The authentication service did not return a LIFE SAVER session token.")
    const identity = roleFromBackend(response)
    startAuthenticatedSession(identity.role, identity.displayName, identity.email ?? user.email ?? undefined, user.uid, token)
    router.replace(`/${identity.role}`)
  }
  async function exchange(user: User) {
    if (exchangedUsers.current.has(user.uid) || exchangingUsers.current.has(user.uid)) {
      authDebug("Skipping duplicate Firebase exchange")
      return
    }
    exchangingUsers.current.add(user.uid)
    try {
      authDebug("Backend session exchange started")
      establish(await authService.firebaseLogin(await getFirebaseIdToken(user)), user)
      exchangedUsers.current.add(user.uid)
      authDebug("Backend session exchange successful")
    } catch (error) {
      authDebug(`Backend session exchange failed: ${error instanceof ApiRequestError ? error.status : "unknown"}`)
      throw error
    } finally { exchangingUsers.current.delete(user.uid) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("")
    try {
      let user: User
      if (signingUp) {
        authDebug("Signup started")
        // A previous development session must not be mistaken for a successful signup.
        await endSession()
        user = await createFirebaseUser(email, password)
        authDebug("Firebase signup successful")
      } else {
        user = await signInWithFirebaseEmail(email, password)
      }
      try { await exchange(user) } catch (backendError) { await signOutFromFirebase(); setError(backendAuthError(backendError)) }
    } catch (firebaseError) { authDebug(`Firebase ${signingUp ? "signup" : "sign-in"} failed: ${firebaseErrorCode(firebaseError)}`); setError(firebaseErrorMessage(firebaseError)) } finally { setBusy(false) }
  }
  async function continueWithGoogle() {
    setBusy(true); setError("")
    try { const user = await signInWithGoogle(); try { await exchange(user) } catch (backendError) { await signOutFromFirebase(); setError(backendAuthError(backendError)) } }
    catch (firebaseError) { setError(firebaseErrorMessage(firebaseError)) } finally { setBusy(false) }
  }
  async function signOutAndStartOver() {
    setBusy(true); setError("")
    try { await endSession() } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-background px-4 py-8 sm:px-6"><div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-3xl border bg-card shadow-xl lg:grid-cols-[.9fr_1.1fr]">
    <section className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><BrandLogo className="text-primary-foreground" /><div><p className="text-sm font-medium text-primary-foreground/70">MEDICAL AI PLATFORM</p><h1 className="mt-4 text-4xl font-semibold">Clearer health decisions start with better understanding.</h1><p className="mt-5 text-primary-foreground/75">AI-assisted medical information to help you prepare for conversations with qualified healthcare professionals.</p></div><p className="flex items-center gap-2 text-sm text-primary-foreground/70"><ShieldCheck className="h-4 w-4" />Information, not a diagnosis</p></section>
    <section className="p-6 sm:p-10 lg:p-14"><a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back home</a><div className="mt-10 lg:hidden"><BrandLogo /></div><h2 className="mt-8 text-3xl font-semibold">{signingUp ? "Create account" : "Sign in"}</h2><p className="mt-2 text-muted-foreground">{signingUp ? "Create your LIFE SAVER account to get started." : "Use your LIFE SAVER account to continue."}</p>
      <Button className="mt-6 w-full" disabled={busy} type="button" variant="outline" onClick={() => void continueWithGoogle()}>Continue with Google</Button><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or</div>
      <form className="grid gap-3" onSubmit={submit}><Input aria-label="Email" autoComplete="email" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required /><Input aria-label="Password" autoComplete={signingUp ? "new-password" : "current-password"} type="password" minLength={signingUp ? 6 : undefined} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required /><Button disabled={busy} type="submit">{busy ? "Please wait…" : signingUp ? "Create account" : "Sign in"}</Button>{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}</form>
      <p className="mt-6 text-center text-sm text-muted-foreground">{signingUp ? "Already have an account?" : "New to LIFE SAVER?"} <button className="text-primary hover:underline" type="button" disabled={busy} onClick={() => { setMode(signingUp ? "signin" : "signup"); setError("") }}>{signingUp ? "Sign in" : "Create account"}</button></p><button className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground hover:underline" type="button" disabled={busy} onClick={() => void signOutAndStartOver()}>Sign out and start over</button>
    </section>
  </div></main>
}
