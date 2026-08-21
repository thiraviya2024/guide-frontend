"use client"

import { FormEvent, useState } from "react"
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { BrandLogo } from "@/components/medical/brand-logo"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useSession } from "@/components/providers/session-provider"
import type { Role } from "@/types"

const roles: { value: Role; label: string; note: string }[] = [
  { value: "patient", label: "Patient", note: "Virtual medical assistant" },
  { value: "doctor", label: "Doctor", note: "Dataset and report workspace" },
  { value: "admin", label: "Admin", note: "System operations" },
]

export default function AuthPage() {
  const { startExplorer } = useSession()
  const [role, setRole] = useState<Role>("patient")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState("")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const name = email.split("@")[0]?.replace(/[._-]/g, " ") || "Explorer"
    startExplorer(role, name.replace(/\b\w/g, (char) => char.toUpperCase()), email)
    setNotice("Demo session started. Backend authentication is not connected yet.")
    window.setTimeout(() => window.location.assign(role === "patient" ? "/app" : `/app?role=${role}`), 400)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
            <div><BrandLogo className="text-primary-foreground" /></div>
            <div className="max-w-sm">
              <p className="text-sm font-medium text-primary-foreground/70">VIRTUAL MEDICAL ASSISTANT</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Clearer health decisions start with better understanding.</h1>
              <p className="mt-5 leading-relaxed text-primary-foreground/75">Upload a report, understand the signals, and prepare a better conversation with a qualified healthcare professional.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-foreground/70"><ShieldCheck className="h-4 w-4" /> AI-assisted interpretation, not diagnosis</div>
          </section>
          <section className="p-6 sm:p-10 lg:p-14">
            <a href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-10 -ml-3 gap-2")}><ArrowLeft className="h-4 w-4" /> Back home</a>
            <div className="mb-8 lg:hidden"><BrandLogo /></div>
            <p className="text-sm font-medium text-primary">DEMO LOGIN</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">Your AI-powered medical assistant is ready.</p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" /></div></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 pr-10" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <div className="rounded-2xl border border-border bg-muted/40 p-4"><p className="text-sm font-semibold">Choose demo role</p><div className="mt-3 grid grid-cols-3 gap-2">{roles.map((item) => <button type="button" key={item.value} onClick={() => setRole(item.value)} className={cn("rounded-xl border px-2 py-3 text-left transition-colors", role === item.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted")}><span className="block text-sm font-medium">{item.label}</span><span className="mt-1 block text-[11px] leading-tight text-muted-foreground">{item.note}</span></button>)}</div></div>
              <Button type="submit" className="w-full">Sign In as {roles.find((item) => item.value === role)?.label}</Button>
              {notice && <p className="rounded-xl bg-accent/10 p-3 text-sm text-accent-foreground">{notice}</p>}
            </form>
            <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">Demo access only. Real authentication will connect when the backend auth endpoints are implemented.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
