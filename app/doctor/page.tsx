"use client"

import { RoleGate } from "@/components/providers/role-gate"
import { DoctorWorkspace as DoctorPortal } from "@/components/doctor/doctor-workspace"
import { useSession } from "@/components/providers/session-provider"

function DoctorWorkspace() {
  const { endSession } = useSession()
  return <DoctorPortal onLogout={() => { endSession(); window.location.assign("/") }} />
}

export default function DoctorPage() {
  return <RoleGate role="doctor"><DoctorWorkspace /></RoleGate>
}
