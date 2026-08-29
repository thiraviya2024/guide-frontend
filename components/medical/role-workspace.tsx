"use client"

import { useEffect, useMemo, useState } from "react"
import { Database, Home, Loader2, LogOut, Search, ShieldCheck, UserRound } from "lucide-react"
import { BrandLogo } from "@/components/medical/brand-logo"
import { Button } from "@/components/ui/button"
import { adminService, patientService } from "@/services/system"
import { datasetsService } from "@/services/datasets"
import { friendlyError } from "@/services/api"
import type { AdminStats, DatasetVersion, Patient, Role } from "@/types"

function WorkspaceHeader({ title, onLogout }: { title: string; onLogout: () => void }) {
  return <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4 sm:px-8"><div className="flex items-center gap-4"><BrandLogo /><div className="hidden border-l border-border pl-4 sm:block"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">Signed-in workspace · backend data where available</p></div></div><Button variant="ghost" size="sm" onClick={onLogout}><LogOut className="mr-2 h-4 w-4" /> Logout</Button></header>
}

function DoctorPanel() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [versions, setVersions] = useState<DatasetVersion[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)
  const [detail, setDetail] = useState<Patient | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([patientService.list(), datasetsService.versions()])
      .then(([patientData, versionData]) => { setPatients(patientData); setVersions(versionData.versions ?? []) })
      .catch((cause) => setError(friendlyError(cause)))
      .finally(() => setLoading(false))
  }, [])

  const filteredPatients = useMemo(() => patients.filter((patient) => `${patient.id ?? ""} ${patient.name ?? ""} ${patient.full_name ?? ""}`.toLowerCase().includes(search.toLowerCase())), [patients, search])
  async function selectPatient(patient: Patient) {
    setSelected(patient); setDetail(null); setDetailLoading(true)
    try { setDetail(patient.id === undefined ? patient : await patientService.get(patient.id)) }
    catch (cause) { setError(friendlyError(cause)) }
    finally { setDetailLoading(false) }
  }

  if (loading) return <Loading label="Loading patients and clinical datasets..." />
  if (error && !patients.length) return <ErrorNotice message={error} />
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]"><section className="rounded-2xl border border-border bg-card"><div className="border-b border-border p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Patients</h2><p className="mt-1 text-sm text-muted-foreground">Real records returned by the patient API.</p></div></div><label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search real patients..." className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" /></label></div><div className="max-h-[28rem] overflow-y-auto divide-y divide-border">{filteredPatients.length ? filteredPatients.map((patient, index) => <button key={String(patient.id ?? index)} onClick={() => selectPatient(patient)} className={`block w-full px-5 py-4 text-left transition-colors hover:bg-muted/60 ${selected?.id === patient.id ? "bg-primary/5" : ""}`}><p className="font-medium">{patient.full_name || patient.name || `Patient ${patient.id}`}</p><p className="mt-1 text-xs text-muted-foreground">ID: {patient.id ?? "Not returned"}{patient.age ? ` · ${patient.age} years` : ""}{patient.gender ? ` · ${patient.gender}` : ""}</p></button>) : <p className="p-5 text-sm text-muted-foreground">No matching patient records.</p>}</div></section><aside className="space-y-5"><section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" /><h2 className="font-semibold">Patient detail</h2></div>{detailLoading ? <Loading label="Loading patient..." compact /> : detail ? <div className="mt-4 space-y-2 text-sm"><p><span className="text-muted-foreground">Name:</span> {detail.full_name || detail.name || "Not returned"}</p><p><span className="text-muted-foreground">Patient ID:</span> {detail.id ?? "Not returned"}</p>{detail.age !== undefined && <p><span className="text-muted-foreground">Age:</span> {detail.age}</p>}{detail.gender && <p><span className="text-muted-foreground">Gender:</span> {detail.gender}</p>}<p className="mt-4 rounded-lg bg-muted/70 p-3 text-xs text-muted-foreground">Report history, findings, and explanations will appear here when a patient-report retrieval API is available.</p></div> : <p className="mt-4 text-sm text-muted-foreground">Select a patient to load their real details.</p>}</section><section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /><h2 className="font-semibold">Clinical datasets</h2></div><div className="mt-3 max-h-44 overflow-y-auto divide-y divide-border">{versions.length ? versions.map((version) => <div className="py-3 text-sm" key={version.id}><p className="font-medium">{version.category}</p><p className="text-xs text-muted-foreground">Version {version.version} · {version.status}</p></div>) : <p className="py-3 text-sm text-muted-foreground">No dataset versions are available.</p>}</div></section>{error && <ErrorNotice message={error} />}</aside></div>
}

function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { adminService.stats().then(setStats).catch((cause) => setError(friendlyError(cause))) }, [])
  if (error) return <ErrorNotice message={error} />
  if (!stats) return <Loading label="Loading administration data..." />
  return <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-semibold">Clinical rule statistics</h2></div><p className="mt-1 text-sm text-muted-foreground">Values returned by the existing admin API.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(stats).map(([name, value]) => <div className="rounded-xl bg-muted/60 p-4" key={name}><p className="text-2xl font-semibold">{value ?? 0}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{name.replace(/_/g, " ")}</p></div>)}</div></section>
}

function Loading({ label, compact = false }: { label: string; compact?: boolean }) { return <div className={`${compact ? "mt-4" : "mt-12"} flex items-center gap-3 text-sm text-muted-foreground`}><Loader2 className="h-5 w-5 animate-spin" /> {label}</div> }
function ErrorNotice({ message }: { message: string }) { return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{message}</div> }

export function RoleWorkspace({ role, onLogout }: { role: Exclude<Role, "patient">; onLogout: () => void }) {
  const doctor = role === "doctor"
  return <div className="min-h-dvh bg-background"><WorkspaceHeader title={doctor ? "Doctor workspace" : "Administration"} onLogout={onLogout} /><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="text-xs font-semibold tracking-[.16em] text-primary uppercase">LIFE SAVER</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{doctor ? "Clinical patient workspace" : "System administration"}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{doctor ? "Review real patient records and the clinical data currently available from the service." : "Available administration information is loaded from the existing service."}</p><div className="mt-8">{doctor ? <DoctorPanel /> : <AdminPanel />}</div><a href="/" className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Home className="h-4 w-4" /> Back to home</a></main></div>
}
