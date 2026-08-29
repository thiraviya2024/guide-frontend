"use client"

import { useRouter } from "next/navigation"
import { PatientShell } from "@/components/patient/patient-shell"
import { RoleGate } from "@/components/providers/role-gate"
import { useSession } from "@/components/providers/session-provider"

function PatientContent() {
  const { session, endSession } = useSession()
  const router = useRouter()
  if (!session) return null
  return <><button className="fixed bottom-4 left-4 z-[60] rounded-lg border bg-card px-3 py-2 text-sm shadow-sm" onClick={() => { endSession(); router.replace("/") }}>Logout</button><PatientShell /></>
}

export default function PatientPage() {
  return <RoleGate role="patient"><PatientContent /></RoleGate>
}
