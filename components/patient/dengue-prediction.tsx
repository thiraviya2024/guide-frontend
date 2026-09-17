"use client"

import { FormEvent, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { normalizePersistedReport } from "@/services/reports"
import { dengueService } from "@/services/dengue"
import { ApiRequestError, friendlyError } from "@/services/api"
import type { DengueFeatures, DenguePredictionResponse } from "@/types"

type Row = Record<string, unknown>
type Field = keyof DengueFeatures
const fields: Array<[Field, string, string, string]> = [["age", "Age", "years", "age"], ["hemoglobin_g_dl", "Hemoglobin", "g/dL", "hemoglobin"], ["platelet_count", "Platelet Count", "/µL", "platelet count"], ["platelet_distribution_width", "Platelet Distribution Width", "PDW", "platelet distribution width"]]
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase())
const dengueDebug = (stage: string, value: unknown) => { if (process.env.NODE_ENV === "development") console.debug(`[Dengue] ${stage}`, value) }

function normalizeDengueFeatures(values: Record<Field, string>): DengueFeatures {
  const features: DengueFeatures = {}
  if (values.age.trim() !== "") features.age = Number(values.age)
  if (values.hemoglobin_g_dl.trim() !== "") features.hemoglobin_g_dl = Number(values.hemoglobin_g_dl)
  if (values.platelet_count.trim() !== "") features.platelet_count = Number(values.platelet_count)
  if (values.platelet_distribution_width.trim() !== "") features.platelet_distribution_width = Number(values.platelet_distribution_width)
  return features
}

function reportValue(report: Row | null, key: Field): string {
  if (!report) return ""
  const aliases: Record<Field, string[]> = { age: ["age"], hemoglobin_g_dl: ["hemoglobin", "haemoglobin"], platelet_count: ["platelet"], platelet_distribution_width: ["platelet distribution width", "pdw"] }
  const result = Object.entries(normalizePersistedReport(report).analysis.results).find(([name, item]) => aliases[key].some(alias => name.toLowerCase().replaceAll("_", " ").includes(alias)) && typeof item?.value === "number")?.[1]
  return typeof result?.value === "number" ? String(result.value) : ""
}

function Value({ title, value }: { title: string; value: unknown }) {
  return <div className="rounded-xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 font-semibold">{value === null || value === undefined ? "Not returned" : String(value)}</p></div>
}

function evidenceText(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return String(value)
  const item = value as Record<string, unknown>
  const base = item.value === null || item.value === undefined ? "" : String(item.value)
  const unit = typeof item.unit === "string" ? ` ${item.unit}` : ""
  const status = typeof item.status === "string" ? ` · ${item.status}` : ""
  return base || unit || status ? `${base}${unit}${status}`.trim() : JSON.stringify(item)
}

export function DenguePrediction({ report }: { report: Row | null }) {
  const [values, setValues] = useState<Record<Field, string>>({ age: "", hemoglobin_g_dl: "", platelet_count: "", platelet_distribution_width: "" })
  const [result, setResult] = useState<DenguePredictionResponse | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError(""); setResult(null)
    const features = normalizeDengueFeatures(values)
    dengueDebug("React state", values)
    dengueDebug("final POST payload", { features })
    try {
      const response = await dengueService.predict(features)
      if (!response || typeof response !== "object") throw new Error("The Dengue prediction service returned an invalid response.")
      dengueDebug("backend response", response)
      setResult(response)
    } catch (cause) {
      const status = cause instanceof ApiRequestError && cause.detail && typeof cause.detail === "object" ? (cause.detail as Record<string, unknown>).status : undefined
      setError(status === "MODEL_UNAVAILABLE" ? "Dengue prediction is temporarily unavailable because the prediction model could not be loaded." : friendlyError(cause))
    } finally { setLoading(false) }
  }
  const evidence = result?.clinical_evidence
  const evidenceEntries = evidence ? (Array.isArray(evidence) ? evidence.flatMap(item => Object.entries(item)) : Object.entries(evidence)) : []
  return <section><header><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Prototype clinical tool</p><h1 className="mt-2 text-3xl font-semibold">Dengue Prediction</h1><p className="mt-2 text-sm text-muted-foreground">The backend model provides this result; it is not a medical diagnosis.</p></header><div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,.8fr)]"><section className="rounded-3xl border bg-card p-5 shadow-sm"><h2 className="font-semibold">Dengue-related information</h2><form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>{fields.map(([key, title, unit, placeholder]) => <label className="grid gap-2 text-sm" key={key}><span className="font-medium">{title} <span className="font-normal text-muted-foreground">({unit})</span></span><Input type="number" min="0" step="any" value={values[key]} placeholder={placeholder} onValueChange={raw => { dengueDebug("raw input value", { field: key, raw }); setValues(current => ({ ...current, [key]: raw })) }} /></label>)}<div className="sm:col-span-2 flex flex-wrap gap-3"><Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? "Requesting prediction" : "Get Dengue prediction"}</Button>{report && <Button type="button" variant="outline" disabled={loading} onClick={() => setValues(Object.fromEntries(fields.map(([key]) => [key, reportValue(report, key)])) as Record<Field, string>)}>Use values from current report</Button>}</div></form><p className="mt-4 text-xs text-muted-foreground">Only these four values are sent. Blank values remain missing for the backend to assess.</p></section><section className="rounded-3xl border bg-card p-5 shadow-sm"><h2 className="font-semibold">Important</h2><p className="mt-4 text-sm text-muted-foreground">This is an academic/prototype Dengue prediction system, not a medical diagnosis.</p></section></div>{error && <div role="alert" className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}{result && <section className="mt-5 rounded-3xl border bg-card p-5 shadow-sm"><h2 className="font-semibold">Dengue Prediction</h2>{result.status === "INSUFFICIENT_INFORMATION" ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><b>Insufficient dengue-related information</b>{result.missing_features?.length ? <p className="mt-2">Missing: {result.missing_features.map(label).join(", ")}</p> : null}</div> : <div className="mt-4 grid gap-3 sm:grid-cols-2"><Value title="Prediction" value={result.prediction} /><Value title="Prototype Probability" value={result.probability} /><Value title="Risk Level" value={result.risk_level} /><Value title="Model" value={result.model_version ?? result.model_name} /></div>}{result.status === "MODEL_UNAVAILABLE" && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Dengue prediction is temporarily unavailable because the prediction model could not be loaded.</div>}{result.explanation && <p className="mt-5 text-sm text-muted-foreground">{result.explanation}</p>}{evidenceEntries.length > 0 && <div className="mt-5"><h3 className="font-semibold">Clinical Evidence</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{evidenceEntries.map(([name, value], index) => <div className="rounded-xl border p-3 text-sm" key={`${name}-${index}`}><p className="text-muted-foreground">{label(name)}</p><p className="mt-1 font-medium">{evidenceText(value)}</p></div>)}</div></div>}<details className="mt-5 rounded-xl border p-4 text-sm"><summary className="cursor-pointer font-medium">Model Information</summary><p className="mt-3 text-muted-foreground">Status: {String(result.status ?? "Not returned")}</p>{result.prototype_status && <p className="mt-1 text-muted-foreground">Prototype status: {result.prototype_status}</p>}{result.risk_threshold !== null && result.risk_threshold !== undefined && <p className="mt-1 text-muted-foreground">Risk threshold: {String(result.risk_threshold)}</p>}</details><p className="mt-5 rounded-xl bg-muted p-4 text-sm">{result.disclaimer || "This is an academic/prototype Dengue prediction system, not a medical diagnosis."}</p></section>}</section>
}
