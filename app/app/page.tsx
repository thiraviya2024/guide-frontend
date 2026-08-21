"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Activity, Camera, CheckCircle2, ChevronRight, ClipboardList, FileClock, FileText, HeartPulse, Home, LifeBuoy, LineChart, Loader2, LogOut, Menu, MessageCircle, Paperclip, Plus, Send, ShieldAlert, ShieldCheck, Siren, Sparkles, Stethoscope, Trash2, Upload, UserRound, X, type LucideIcon } from "lucide-react"
import { BrandLogo } from "@/components/medical/brand-logo"
import { BackendStatusPill } from "@/components/medical/backend-status-pill"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSession } from "@/components/providers/session-provider"
import { clinicalService } from "@/services/clinical"
import { aiService } from "@/services/ai"
import { datasetsService } from "@/services/datasets"
import { friendlyError } from "@/services/api"
import { useAdminStats, useApiStatus } from "@/hooks/use-backend"
import { isCalculatedParameter, parameterLabel, patientStatus } from "@/lib/medical"
import type { AnalysisResult, ParameterResult, Role } from "@/types"

interface HistoryItem { id: string; name: string; date: string; category?: string; analysis: AnalysisResult }
interface Message { id: string; role: "user" | "assistant"; content?: string; file?: string; analysis?: AnalysisResult; explanation?: string }
interface ManualRow { parameter: string; value: string; unit: string }
const HISTORY_KEY = "lifesaver.report-history"
const quickPrompts = ["Analyze my medical report", "Explain my abnormal values", "What should I discuss with my doctor?", "What foods may support my health?", "What does this result mean?"]
function roleLabel(role: Role) { return role.charAt(0).toUpperCase() + role.slice(1) }
function resultEntries(result: AnalysisResult) { return Object.entries(result.results || {}) }
function isAbnormal(value: ParameterResult) { return /high|low|borderline|elevated|abnormal/i.test(value.status || "") }
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) }
function statusLabel(analysis: AnalysisResult) { return /normal|good|optimal/i.test(analysis.overall_status || "") ? "Mostly normal" : "Needs attention" }

function AssistantText({ content }: { content: string }) {
  return <div className="space-y-2">{content.split(/\n+/).map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return null
    if (/^#{1,3}\s/.test(trimmed)) return <p key={index} className="font-semibold text-foreground">{trimmed.replace(/^#{1,3}\s/, "")}</p>
    if (/^[•*-]\s/.test(trimmed)) return <p key={index} className="flex gap-2"><span className="text-primary">•</span><span>{trimmed.replace(/^[•*-]\s/, "")}</span></p>
    return <p key={index}>{trimmed}</p>
  })}</div>
}

type QuestionIntent =
  | "greeting"
  | "report_summary"
  | "value_explanation"
  | "food_diet"
  | "exercise"
  | "lifestyle"
  | "possible_risks"
  | "possible_causes"
  | "doctor_consultation"
  | "medication_general"
  | "follow_up_question"
  | "clarification"
  | "general_health_question"

const PARAMETER_ALIASES: Record<string, string[]> = {
  ldl: ["ldl", "low density lipoprotein"],
  hdl: ["hdl", "high density lipoprotein"],
  triglycerides: ["triglycerides", "triglyceride", "tg"],
  vldl: ["vldl", "very low density lipoprotein"],
  non_hdl: ["non-hdl", "non hdl", "non hdl cholesterol"],
  total_cholesterol: ["total cholesterol", "cholesterol"],
  glucose: ["glucose", "blood sugar", "fasting glucose"],
  hemoglobin_a1c: ["hba1c", "hemoglobin a1c", "a1c"],
  tsh: ["tsh", "thyroid stimulating hormone"],
  creatinine: ["creatinine"],
  alt: ["alt", "alanine aminotransferase"],
  ast: ["ast", "aspartate aminotransferase"],
  bilirubin: ["bilirubin"],
  sodium: ["sodium"],
  potassium: ["potassium"],
  calcium: ["calcium"],
  vitamin_d: ["vitamin d", "vit d"],
  vitamin_b12: ["vitamin b12", "b12"],
  ferritin: ["ferritin"],
  platelet_count: ["platelet", "platelets"],
  wbc: ["wbc", "white blood cell", "white blood cells"],
}

function detectQuestionIntent(question: string): QuestionIntent {
  const text = question.toLowerCase().trim()
  if (!text) return "clarification"
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|greetings)/.test(text)) return "greeting"
  if (/explain.*report|summarize.*report|overall.*report|report summary|what does my report mean/.test(text)) return "report_summary"
  if (/food|diet|nutrition|eat|foods|what should i eat/.test(text)) return "food_diet"
  if (/exercise|workout|fitness|walk|gym|training|activity/.test(text)) return "exercise"
  if (/lifestyle|sleep|stress|smoking|alcohol|hydration|water|weight|habit/.test(text)) return "lifestyle"
  if (/cause|risk|disease|illness|what can this cause|what disease/.test(text)) return "possible_risks"
  if (/why.*(high|low|abnormal)|what caused|possible causes|why is it/.test(text)) return "possible_causes"
  if (/what is my .*ldl|ldl|hdl|triglycer|vldl|non[- ]?hdl|cholesterol|glucose|a1c|tsh|creatinine|alt|ast|bilirubin|sodium|potassium|calcium|vitamin|platelet|wbc/.test(text)) return "value_explanation"
  if (/doctor|checkup|clinic|healthcare|consult|see a doctor|ask my doctor|question.*doctor/.test(text)) return "doctor_consultation"
  if (/medication|medicine|treatment|prescription|drug/.test(text)) return "medication_general"
  if (/why\?|what about|and|but|also|tell me more|can you explain more/.test(text)) return "follow_up_question"
  if (/what do you mean|can you clarify|which|unclear|not sure|more detail/.test(text)) return "clarification"
  return "general_health_question"
}

function findRequestedParameter(question: string): string | null {
  const text = question.toLowerCase()
  for (const [key, aliases] of Object.entries(PARAMETER_ALIASES)) {
    if (aliases.some((alias) => text.includes(alias))) return key
  }
  return null
}

function buildRelevantReportContext(question: string, analysis?: AnalysisResult): Record<string, unknown> | undefined {
  if (!analysis) return undefined

  const intent = detectQuestionIntent(question)
  const results = analysis.results || {}
  const entries = Object.entries(results)

  if (intent === "greeting") return undefined

  const abnormalEntries = entries.filter(([, value]) => isAbnormal(value))
  const requestedParameter = findRequestedParameter(question)
  const requestedResult = requestedParameter
    ? entries.find(([name]) => name.toLowerCase() === requestedParameter || name.toLowerCase().includes(requestedParameter))
    : undefined

  const relevantResults = (() => {
    if (intent === "report_summary") return results
    if (intent === "value_explanation" && requestedResult) {
      return Object.fromEntries([requestedResult])
    }
    if (intent === "food_diet") {
      return Object.fromEntries(abnormalEntries.slice(0, 6))
    }
    if (intent === "exercise" || intent === "lifestyle") {
      return Object.fromEntries(abnormalEntries.slice(0, 6))
    }
    if (intent === "possible_risks" || intent === "possible_causes" || intent === "doctor_consultation") {
      return Object.fromEntries(abnormalEntries.slice(0, 8))
    }
    if (intent === "follow_up_question") {
      return Object.fromEntries(abnormalEntries.slice(0, 6))
    }
    return Object.fromEntries(abnormalEntries.slice(0, 6))
  })()

  const context: Record<string, unknown> = {
    category: analysis.category || analysis.detected_category || analysis.report_type,
    results: relevantResults,
    relevant_question: question,
    intent,
  }
  if (intent === "report_summary") {
    context.summary = analysis.message
    context.overall_status = analysis.overall_status
    context.disease_risks = analysis.disease_risks?.slice(0, 4)
  } else if (["possible_risks", "doctor_consultation"].includes(intent)) {
    context.disease_risks = analysis.disease_risks?.slice(0, 4)
  }
  return context
}

function AnalysisCard({ analysis, explanation }: { analysis: AnalysisResult; explanation?: string }) {
  const entries = resultEntries(analysis); const attention = entries.filter(([, value]) => isAbnormal(value)); const normal = entries.filter(([, value]) => !isAbnormal(value))
  const renderResult = ([name, value]: [string, ParameterResult], emphasized = false) => <div key={name} className={emphasized ? "rounded-xl border border-destructive/15 bg-destructive/[0.04] p-3" : "flex items-center justify-between rounded-xl border border-border p-3"}><div><span className="font-medium">{parameterLabel(name)}</span>{isCalculatedParameter(name) && <p className="mt-1 text-xs text-muted-foreground">Calculated from related lipid values</p>}</div><div className={emphasized ? "text-right" : "text-right text-xs text-muted-foreground"}><span className={emphasized ? "text-sm font-semibold text-destructive" : ""}>{String(value.value)} {value.unit || ""}</span><p className="mt-1 text-xs text-muted-foreground">{patientStatus(value.status)}{value.reference && !/unknown|no rule found/i.test(`${value.status || ""} ${value.reference}`) ? ` · Ref ${value.reference}` : ""}</p></div>{emphasized && value.recommendation && <p className="col-span-2 mt-2 text-xs leading-relaxed text-muted-foreground">{value.recommendation}</p>}</div>
  return <div className="space-y-4"><Card className="overflow-hidden border-primary/20 bg-card shadow-sm"><div className="border-b border-border bg-primary/[0.04] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-primary"><Activity className="h-4 w-4" /> Report summary</div><p className="mt-2 text-sm text-muted-foreground">The report was analyzed using the available clinical rules. LIFE SAVER&apos;s explanation is generated from those findings.</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">{analysis.detected_category || analysis.category || analysis.report_type || "Report analyzed"}</Badge>{analysis.overall_status && <Badge variant="outline">{analysis.overall_status}</Badge>}</div></div><div className="grid gap-4 p-5 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-destructive">Values needing attention</p><div className="mt-3 space-y-2">{attention.length ? attention.map((entry) => renderResult(entry, true)) : <p className="text-sm text-muted-foreground">No abnormal values were returned by the backend.</p>}</div></div><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Other results</p><div className="mt-3 space-y-2">{normal.length ? normal.map((entry) => renderResult(entry)) : <p className="text-sm text-muted-foreground">The service did not return additional result details.</p>}</div></div></div></Card>{explanation && <Card className="border-border p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> LIFE SAVER&apos;s explanation</div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{explanation}</p></Card>}{(analysis.disease_risks?.length || attention.length) ? <Card className="border-border bg-muted/30 p-5"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Safety note</div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">This is AI-assisted medical information, not a diagnosis. Discuss concerning results with a qualified healthcare professional.</p></Card> : null}</div>
}

function Sidebar({ role, history, active, onSelect, onLogout, open, onClose, displayName }: { role: Role; history: HistoryItem[]; active: string; onSelect: (id: string) => void; onLogout: () => void; open: boolean; onClose: () => void; displayName: string }) {
  const items: { id: string; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "reports", label: "Reports", icon: ClipboardList, count: history.length },
    { id: "history", label: "History", icon: FileClock },
    { id: "chat", label: "Chat analysis", icon: MessageCircle },
    { id: "trends", label: "Disease trends", icon: LineChart },
    { id: "helpline", label: "Helpline", icon: LifeBuoy },
    { id: "sos", label: "SOS", icon: Siren },
  ]
  return <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-border bg-card/95 shadow-xl backdrop-blur transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none`}><div className="flex items-center justify-between px-5 py-5"><BrandLogo /><Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose} aria-label="Close sidebar"><X className="h-4 w-4" /></Button></div><div className="mx-4 mb-5 flex items-center gap-3 rounded-2xl border border-primary/10 bg-primary/[0.05] p-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><UserRound className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName}</p><p className="text-xs text-muted-foreground">{roleLabel(role)} workspace</p></div></div><nav className="space-y-1 px-3">{items.map(({ id, label, icon: Icon, count }) => <Button key={id} variant="ghost" className={`w-full justify-start gap-3 ${active === id ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground"} ${id === "sos" ? "mt-3 text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`} onClick={() => { onSelect(id); onClose() }}><Icon className="h-4 w-4" /> <span>{label}</span>{count ? <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{count}</span> : null}{active === id && id !== "sos" ? <ChevronRight className="ml-auto h-4 w-4" /> : null}</Button>)}</nav>{role === "doctor" && <Button variant="ghost" className="mx-3 mt-2 justify-start gap-3 text-muted-foreground" onClick={() => { onSelect("datasets"); onClose() }}><Upload className="h-4 w-4" /> Datasets</Button>}{role === "admin" && <Button variant="ghost" className="mx-3 mt-2 justify-start gap-3 text-muted-foreground" onClick={() => { onSelect("system"); onClose() }}><Activity className="h-4 w-4" /> System</Button>}<div className="mt-auto p-4"><Separator className="mb-4" /><Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={() => onSelect("home")}><Home className="h-4 w-4" /> Back to home</Button><Button variant="ghost" className="mt-1 w-full justify-start gap-3 text-muted-foreground" onClick={onLogout}><LogOut className="h-4 w-4" /> Logout</Button></div></aside>
}
function Welcome({ onPrompt }: { onPrompt: (prompt: string) => void }) { return <div className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-4 py-10 text-center sm:px-8"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Stethoscope className="h-8 w-8" /></div><h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Your personal AI medical assistant</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Ask a health-related question or upload a report. LIFE SAVER sends your message to the live AI backend and keeps your current report as conversation context.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{quickPrompts.map((prompt) => <button key={prompt} onClick={() => onPrompt(prompt)} className="rounded-2xl border border-border bg-card p-4 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">{prompt}<span className="mt-2 block text-xs text-muted-foreground">Ask LIFE SAVER</span></button>)}</div></div> }

function ManualEntry({ onClose, onAnalyze, busy }: { onClose: () => void; onAnalyze: (rows: ManualRow[]) => void; busy: boolean }) { const [rows, setRows] = useState<ManualRow[]>([{ parameter: "", value: "", unit: "" }]); const update = (i: number, key: keyof ManualRow, value: string) => setRows((r) => r.map((row, index) => index === i ? { ...row, [key]: value } : row)); return <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-foreground/30 p-4 sm:items-center"><Card className="w-full max-w-2xl p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-primary"><HeartPulse className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Clinical input</span></div><h2 className="mt-2 text-xl font-semibold">Enter report values</h2><p className="mt-1 text-sm text-muted-foreground">Use values exactly as they appear on your medical report. LIFE SAVER will compare them using the existing clinical rules.</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close manual entry"><X className="h-4 w-4" /></Button></div><div className="mt-6 hidden grid-cols-[1.4fr_.8fr_.8fr_auto] gap-2 border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid"><span>Parameter</span><span>Report value</span><span>Unit</span><span /></div><div className="mt-4 space-y-3">{rows.map((row, i) => <div key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1.4fr_.8fr_.8fr_auto]"><input aria-label={`Parameter ${i + 1}`} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm" placeholder="e.g. LDL" value={row.parameter} onChange={(e) => update(i, "parameter", e.target.value)} /><input aria-label={`Value ${i + 1}`} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Enter value from your medical report" inputMode="decimal" value={row.value} onChange={(e) => update(i, "value", e.target.value)} /><input aria-label={`Unit ${i + 1}`} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm" placeholder="mg/dL" value={row.unit} onChange={(e) => update(i, "unit", e.target.value)} /><Button variant="ghost" size="icon" className="justify-self-end" aria-label="Remove parameter" disabled={rows.length === 1} onClick={() => setRows((r) => r.filter((_, index) => index !== i))}><Trash2 className="h-4 w-4" /></Button></div>)}</div><Button variant="outline" className="mt-4 gap-2" onClick={() => setRows((r) => [...r, { parameter: "", value: "", unit: "" }])}><Plus className="h-4 w-4" /> Add parameter</Button><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={() => onAnalyze(rows)}>{busy ? "Analyzing..." : "Analyze report"}</Button></div></Card></div> }

export default function AssistantPage() {
  const { session, ready, endSession } = useSession(); const inputRef = useRef<HTMLTextAreaElement>(null); const fileRef = useRef<HTMLInputElement>(null); const cameraRef = useRef<HTMLInputElement>(null); const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false); const [view, setView] = useState("home"); const [text, setText] = useState(""); const [messages, setMessages] = useState<Message[]>([]); const [history, setHistory] = useState<HistoryItem[]>([]); const [loading, setLoading] = useState(false); const [stage, setStage] = useState(""); const [error, setError] = useState(""); const [menuOpen, setMenuOpen] = useState(false); const [manualOpen, setManualOpen] = useState(false)
  useEffect(() => { try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")) } catch {} }, []); useEffect(() => { if (ready && !session) window.location.replace("/auth") }, [ready, session]); useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }) }, [messages.length, loading])
  function logout() { endSession(); window.location.replace("/") }; function saveHistory(item: HistoryItem) { const next = [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, 30); setHistory(next); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) }
  async function explain(result: AnalysisResult) { return aiService.analyze("Explain these medical report results in simple, patient-safe language.", { report_analysis: result, question_intent: "report_summary" }) }
  async function analyze(file: File) { setError(""); setLoading(true); setStage("Scanning report..."); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", file: file.name }]); try { setStage("Extracting parameters..."); const result = await clinicalService.analyzeFile(file); setStage("Consulting AI..."); const explanation = await explain(result); const item = { id: crypto.randomUUID(), name: file.name, date: new Date().toISOString(), category: result.detected_category || result.category, analysis: result }; saveHistory(item); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", analysis: result, explanation }]) } catch (err) { console.error("[v0] report flow failed", err); setError(friendlyError(err)); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "The report analysis could not be completed. The backend error is shown above; please try again." }]) } finally { setLoading(false); setStage("") } }
  function moduleFor(rows: ManualRow[]) { const names = rows.map((r) => r.parameter.toLowerCase()).join(" "); if (/cholesterol|ldl|hdl|triglycer|vldl|non[- ]?hdl/.test(names)) return "lipid"; if (/hemoglobin|wbc|white blood|platelet|rbc|red blood/.test(names)) return "cbc"; if (/creatinine|urea|egfr|bun/.test(names)) return "kft"; if (/tsh|thyroid|t3|t4/.test(names)) return "thyroid"; if (/glucose|hba1c|insulin/.test(names)) return "diabetes"; if (/alt|ast|bilirubin|albumin|alp/.test(names)) return "lft"; if (/sodium|potassium|chloride|calcium/.test(names)) return "electrolytes"; if (/vitamin|b12|folate|ferritin/.test(names)) return "vitamins"; return null }
  async function analyzeManual(rows: ManualRow[]) { const valid = rows.filter((r) => r.parameter.trim() && r.value.trim()); if (!valid.length) return; const module = moduleFor(valid); if (!module) { setError("Report type could not be determined. Please provide clearer parameter names or upload the report for automatic detection."); return; } setManualOpen(false); setLoading(true); setError(""); setStage("Checking manual values..."); try { const values = Object.fromEntries(valid.map((r) => [r.parameter.trim(), Number(r.value)])); const result = await clinicalService.analyzeManual(module, values); setStage("Consulting AI..."); const explanation = await explain(result); saveHistory({ id: crypto.randomUUID(), name: "Manual values", date: new Date().toISOString(), category: result.detected_category || result.category, analysis: result }); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", analysis: result, explanation }]) } catch (err) { console.error("[v0] manual analysis failed", err); setError(friendlyError(err)) } finally { setLoading(false); setStage("") } }
  async function sendText(value = text) { const question = value.trim(); if (!question || loading) return; setText(""); setError(""); const userMessage = { id: crypto.randomUUID(), role: "user" as const, content: question }; const conversationSnapshot = [...messages, userMessage]; const recentHistory = conversationSnapshot.slice(-8).map((message) => {
    if (!message.content) return null
    return `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`
  }).filter(Boolean) as string[]
  const latestReport = [...messages].reverse().find((message) => message.analysis)?.analysis; const reportContext = buildRelevantReportContext(question, latestReport)
  setMessages((current) => [...current, userMessage]); if (/chest pain|trouble breathing|difficulty breathing|stroke|unconscious|severe bleeding|suicid|overdose/i.test(question)) { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "Your symptoms may need urgent attention. Please contact local emergency services or go to the nearest emergency department now. Do not rely on an AI assistant for emergency care." }]); return } setLoading(true); setStage(latestReport ? "Reviewing your report context..." : "LIFE SAVER is analyzing..."); try { const response = await aiService.analyze(question, {
      report_analysis: reportContext,
      conversation_history: recentHistory,
      question_intent: detectQuestionIntent(question),
    }); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: response }]) } catch (err) { console.error("[v0] AI chat request failed", err); setError(friendlyError(err)); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "I couldn't reach the AI service right now. Please try again shortly." }]) } finally { setLoading(false); setStage("") } }
  if (!ready || !session) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  return <div className="flex h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_right,oklch(0.97_0.04_210),transparent_35%),var(--background)]"><Sidebar role={session.role} displayName={session.displayName} history={history} active={view} onSelect={(id) => setView(id)} onLogout={logout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />{sidebarOpen && <button className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}<main className="flex min-w-0 flex-1 flex-col"><header className="flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-background/75 px-4 backdrop-blur sm:px-6"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Patient workspace</p><p className="font-semibold tracking-tight">Good to see you, {session.displayName.split(" ")[0]}</p></div></div><div className="flex items-center gap-2"><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-success" /> Secure session</span><BackendStatusPill /></div></header><div className="flex min-h-0 flex-1 flex-col">{view === "reports" ? <ReportListView history={history} onOpen={(item) => { setMessages([{ id: crypto.randomUUID(), role: "user", file: item.name }, { id: crypto.randomUUID(), role: "assistant", analysis: item.analysis }]); setView("home") }} /> : view === "history" ? <HistoryView history={history} onOpen={(item) => { setMessages([{ id: crypto.randomUUID(), role: "user", file: item.name }, { id: crypto.randomUUID(), role: "assistant", analysis: item.analysis }]); setView("home") }} /> : view === "trends" ? <TrendsView history={history} /> : view === "sos" ? <SosView /> : view === "helpline" ? <Helpline /> : view === "datasets" ? <DatasetView /> : view === "system" ? <SystemView /> : <><ScrollArea className="min-h-0 flex-1"><div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">{messages.length === 0 ? <Welcome onPrompt={(prompt) => { setText(prompt); inputRef.current?.focus() }} /> : <div className="space-y-6" ref={messagesEndRef}>{messages.map((message) => <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>{message.file ? <div className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground"><FileText className="h-4 w-4" />{message.file}</div> : message.analysis ? <div className="w-full max-w-3xl"><AnalysisCard analysis={message.analysis} explanation={message.explanation} /></div> : <div className={message.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground" : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-4 text-sm leading-7 text-foreground shadow-sm"}>{message.role === "assistant" && <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><HeartPulse className="h-3.5 w-3.5" /> LIFE SAVER</div>}{message.role === "assistant" && message.content ? <AssistantText content={message.content} /> : message.content}</div>}</motion.div>)}</div>}{loading && <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground"><span className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-primary" /><span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:240ms]" /></span>{stage}</div>}{error && <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}</div></ScrollArea><div className="border-t border-border/80 bg-background/80 p-4 backdrop-blur sm:px-8"><div className="mx-auto max-w-4xl"><div className="relative rounded-2xl border border-border bg-card p-2 shadow-lg shadow-primary/5"><div className="flex items-end gap-2"><Button variant="ghost" size="icon" aria-label="Add attachment or manual entry" onClick={() => setMenuOpen((v) => !v)}><Plus className="h-5 w-5" /></Button><Textarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); sendText() } }} placeholder="Ask about your report, food, exercise, or next steps..." className="min-h-10 resize-none border-0 bg-transparent py-2 shadow-none focus-visible:ring-0" /><Button size="icon" className="rounded-xl" aria-label="Send message" disabled={!text.trim() || loading} onClick={() => sendText()}><Send className="h-4 w-4" /></Button></div>{menuOpen && <div className="absolute bottom-14 left-2 z-20 w-52 rounded-xl border border-border bg-card p-1 shadow-lg"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { fileRef.current?.click(); setMenuOpen(false) }}><Paperclip className="h-4 w-4 text-primary" /> Upload report</button><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { cameraRef.current?.click(); setMenuOpen(false) }}><Camera className="h-4 w-4 text-primary" /> Camera</button><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setManualOpen(true); setMenuOpen(false) }}><FileText className="h-4 w-4 text-primary" /> Manual entry</button></div>}</div><div className="flex items-center justify-between px-1 pt-2"><p className="text-xs text-muted-foreground">AI-assisted medical information, not a diagnosis.</p><span className="hidden text-xs text-muted-foreground sm:inline">Enter to send · Shift+Enter for a new line</span></div></div></div><input ref={fileRef} type="file" accept=".pdf,.txt,.csv,.xlsx,.xls,.doc,.docx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) analyze(file); e.currentTarget.value = "" }} /><input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) analyze(file); e.currentTarget.value = "" }} /></>}</div></main>{manualOpen && <ManualEntry onClose={() => setManualOpen(false)} onAnalyze={analyzeManual} busy={loading} />}</div>
}

function ReportListView({ history, onOpen }: { history: HistoryItem[]; onOpen: (item: HistoryItem) => void }) { return <ScrollArea className="flex-1"><div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8"><PageHeading icon={ClipboardList} eyebrow="YOUR RECORDS" title="Reports" description="Review the analyses available in this browser session." />{history.length ? <div className="mt-8 grid gap-4 md:grid-cols-2">{history.map((item) => <button key={item.id} onClick={() => onOpen(item)} className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"><div className="flex items-start justify-between gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><p className="mt-5 font-semibold">{item.category || "Medical report"}</p><p className="mt-1 truncate text-sm text-muted-foreground">{item.name}</p><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs"><span className="text-muted-foreground">{formatDate(item.date)}</span><Badge variant={statusLabel(item.analysis) === "Needs attention" ? "destructive" : "secondary"}>{statusLabel(item.analysis)}</Badge></div></button>)}</div> : <EmptyState icon={FileText} title="No reports yet" description="Upload a report or enter values manually to start your health record." />}</div></ScrollArea> }
function HistoryView({ history, onOpen }: { history: HistoryItem[]; onOpen: (item: HistoryItem) => void }) { return <ScrollArea className="flex-1"><div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8"><PageHeading icon={FileClock} eyebrow="YOUR TIMELINE" title="History" description="Previous report analyses saved in this browser." />{history.length ? <div className="mt-8 space-y-3">{history.map((item) => <button key={item.id} onClick={() => onOpen(item)} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40"><span className="hidden h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{item.category || "Medical report"}</span><span className="mt-1 block truncate text-sm text-muted-foreground">{item.name}</span></span><span className="text-right"><span className="block text-xs text-muted-foreground">{formatDate(item.date)}</span><Badge className="mt-2" variant={statusLabel(item.analysis) === "Needs attention" ? "destructive" : "secondary"}>{statusLabel(item.analysis)}</Badge></span><ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" /></button>)}</div> : <EmptyState icon={FileClock} title="Your history is empty" description="Your previous analyses will appear here after you upload or enter a report." />}</div></ScrollArea> }
function TrendsView({ history }: { history: HistoryItem[] }) { const measuredResults = history.flatMap((item) => Object.keys(item.analysis.results || {})); const supported = measuredResults.filter((key, index) => measuredResults.indexOf(key) === index); return <ScrollArea className="flex-1"><div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8"><PageHeading icon={LineChart} eyebrow="PATTERN WATCH" title="Disease trends" description="Track verified results over time as more reports become available." />{supported.length ? <Card className="mt-8 p-6"><div className="flex items-center gap-2 text-primary"><CheckCircle2 className="h-5 w-5" /><p className="font-semibold">Verified parameters found</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{supported.length} parameter{supported.length === 1 ? "" : "s"} are available across your saved reports. Trend charts will appear when the same parameter has dated measurements to compare.</p><div className="mt-5 flex flex-wrap gap-2">{supported.map((key) => <Badge key={key} variant="outline">{parameterLabel(key)}</Badge>)}</div></Card> : <EmptyState icon={LineChart} title="No enough historical reports yet" description="Upload more than one report to see verified trends. LIFE SAVER will never invent medical history." />}</div></ScrollArea> }
function Helpline() { return <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-8"><PageHeading icon={LifeBuoy} eyebrow="SUPPORT & SAFETY" title="Helpline" description="Know when to pause and speak with a qualified healthcare professional." /><div className="mt-8 grid gap-4 md:grid-cols-2"><Card className="border-primary/15 bg-primary/[0.04] p-6"><HeartPulse className="h-6 w-6 text-primary" /><h2 className="mt-4 text-lg font-semibold">Prepare for your appointment</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Bring your report, note your symptoms, and ask a clinician how these results fit your health history.</p></Card><Card className="border-destructive/20 bg-destructive/[0.04] p-6"><ShieldAlert className="h-6 w-6 text-destructive" /><h2 className="mt-4 text-lg font-semibold">Urgent symptoms</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">For severe chest pain, difficulty breathing, sudden weakness, uncontrolled bleeding, loss of consciousness, or immediate danger, contact local emergency services now.</p></Card></div></div> }
function SosView() { return <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-8 sm:px-8"><Card className="w-full border-destructive/30 bg-destructive/[0.04] p-6 text-center sm:p-10"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground"><Siren className="h-8 w-8" /></span><p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-destructive">Emergency guidance</p><h1 className="mt-3 text-2xl font-semibold">Do not wait for an AI response</h1><p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">If you or someone with you has severe chest pain, trouble breathing, sudden weakness, uncontrolled bleeding, loss of consciousness, or immediate danger, contact local emergency services or go to the nearest emergency department now.</p></Card></div> }
function PageHeading({ icon: Icon, eyebrow, title, description }: { icon: LucideIcon; eyebrow: string; title: string; description: string }) { return <div><div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary"><Icon className="h-4 w-4" /> {eyebrow}</div><h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div> }
function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) { return <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon className="h-6 w-6" /></span><h2 className="mt-5 text-lg font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p></div> }
function DatasetView() { const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const fileRef = useRef<HTMLInputElement>(null); async function upload(file: File) { setBusy(true); setMessage(""); setError(""); try { const result = await datasetsService.upload(file); setMessage(result.message || `Uploaded ${result.file_name || file.name}.`) } catch (err) { setError(friendlyError(err)) } finally { setBusy(false) } } return <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8"><h1 className="text-2xl font-semibold">Doctor dataset workspace</h1><p className="mt-2 text-muted-foreground">Upload clinical rule datasets through the real backend integration.</p><Card className="mt-8 border-dashed p-10 text-center"><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file) }} /><Upload className="mx-auto h-8 w-8 text-primary" /><p className="mt-4 font-medium">Clinical Rule Dataset</p><Button className="mt-5 gap-2" onClick={() => fileRef.current?.click()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Uploading..." : "Choose Excel file"}</Button>{message && <p className="mt-4 rounded-xl bg-accent/10 p-3 text-sm text-accent-foreground">{message}</p>}{error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}</Card></div> }
function SystemView() { const { status, isLoading, error } = useApiStatus(); const { stats } = useAdminStats(); return <ScrollArea className="flex-1"><div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8"><h1 className="text-2xl font-semibold">System operations</h1><p className="mt-2 text-muted-foreground">Live metrics from the LIFE SAVER backend.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><Card className="p-5"><p className="font-medium">Backend status</p><p className="mt-2 text-sm text-muted-foreground">{isLoading ? "Checking service..." : error ? "Backend unavailable" : status?.message || status?.status || "Online"}</p></Card><Card className="p-5"><p className="font-medium">Clinical modules</p><p className="mt-2 text-sm text-muted-foreground">{status?.total_modules ?? "—"} modules · {status?.endpoints_count ?? "—"} endpoints</p></Card></div>{stats && <pre className="mt-8 overflow-auto rounded-2xl border border-border bg-card p-5 text-xs">{JSON.stringify(stats, null, 2)}</pre>}</div></ScrollArea> }
