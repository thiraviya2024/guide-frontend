"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSession } from "@/components/providers/session-provider"
import type { Role } from "@/types"

const routeForRole: Record<Role, string> = { patient: "/patient", doctor: "/doctor", admin: "/admin" }

/** UI-only route guard. Backend authorization remains authoritative. */
export function RoleGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const { session, ready } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    if (!session) router.replace("/auth")
    else if (session.role !== role) router.replace(routeForRole[session.role])
  }, [ready, role, router, session])

  if (!ready || !session || session.role !== role) return <div className="grid min-h-dvh place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  return <>{children}</>
}
