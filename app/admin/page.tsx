"use client"

import { RoleGate } from "@/components/providers/role-gate"
import { RoleWorkspace } from "@/components/medical/role-workspace"
import { useSession } from "@/components/providers/session-provider"

function AdminWorkspace() {
  const { endSession } = useSession()
  return <RoleWorkspace role="admin" onLogout={() => { endSession(); window.location.assign("/") }} />
}

export default function AdminPage() {
  return <RoleGate role="admin"><AdminWorkspace /></RoleGate>
}
