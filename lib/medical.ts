import type { ClinicalModule } from "@/types"

export interface ModuleMeta {
  key: ClinicalModule
  name: string
  short: string
  description: string
  // manual-entry parameter fields with unit + reference hint
  fields: { key: string; label: string; unit: string; reference?: string }[]
}

export const MODULE_META: Record<ClinicalModule, ModuleMeta> = {
  lipid: {
    key: "lipid",
    name: "Lipid Profile",
    short: "Lipid",
    description: "Cholesterol and triglyceride panel",
    fields: [
      { key: "total_cholesterol", label: "Total Cholesterol", unit: "mg/dL", reference: "< 200" },
      { key: "ldl", label: "LDL Cholesterol", unit: "mg/dL", reference: "< 100" },
      { key: "hdl", label: "HDL Cholesterol", unit: "mg/dL", reference: "> 40" },
      { key: "triglycerides", label: "Triglycerides", unit: "mg/dL", reference: "< 150" },
    ],
  },
  cbc: {
    key: "cbc",
    name: "Complete Blood Count",
    short: "CBC",
    description: "Red & white cell, platelet counts",
    fields: [
      { key: "hemoglobin", label: "Hemoglobin", unit: "g/dL", reference: "12 – 17" },
      { key: "wbc", label: "WBC", unit: "10³/µL", reference: "4 – 11" },
      { key: "platelets", label: "Platelets", unit: "10³/µL", reference: "150 – 450" },
      { key: "rbc", label: "RBC", unit: "10⁶/µL", reference: "4.2 – 5.9" },
      { key: "neutrophils", label: "Neutrophils", unit: "%", reference: "40 – 80" },
      { key: "lymphocytes", label: "Lymphocytes", unit: "%", reference: "20 – 40" },
    ],
  },
  lft: {
    key: "lft",
    name: "Liver Function Test",
    short: "LFT",
    description: "Liver enzymes and proteins",
    fields: [
      { key: "alt", label: "ALT", unit: "U/L", reference: "7 – 56" },
      { key: "ast", label: "AST", unit: "U/L", reference: "10 – 40" },
      { key: "alp", label: "ALP", unit: "U/L", reference: "44 – 147" },
      { key: "total_bilirubin", label: "Total Bilirubin", unit: "mg/dL", reference: "0.1 – 1.2" },
      { key: "albumin", label: "Albumin", unit: "g/dL", reference: "3.5 – 5.0" },
    ],
  },
  kft: {
    key: "kft",
    name: "Kidney Function Test",
    short: "KFT",
    description: "Renal function markers",
    fields: [
      { key: "creatinine", label: "Creatinine", unit: "mg/dL", reference: "0.6 – 1.3" },
      { key: "bun", label: "BUN", unit: "mg/dL", reference: "7 – 20" },
      { key: "uric_acid", label: "Uric Acid", unit: "mg/dL", reference: "3.5 – 7.2" },
      { key: "sodium", label: "Sodium", unit: "mmol/L", reference: "135 – 145" },
      { key: "potassium", label: "Potassium", unit: "mmol/L", reference: "3.5 – 5.1" },
    ],
  },
  thyroid: {
    key: "thyroid",
    name: "Thyroid Profile",
    short: "Thyroid",
    description: "TSH, T3, T4 hormones",
    fields: [
      { key: "tsh", label: "TSH", unit: "µIU/mL", reference: "0.4 – 4.0" },
      { key: "t3", label: "T3", unit: "ng/dL", reference: "80 – 200" },
      { key: "t4", label: "T4", unit: "µg/dL", reference: "5.0 – 12.0" },
    ],
  },
  diabetes: {
    key: "diabetes",
    name: "Diabetes Panel",
    short: "Diabetes",
    description: "Glucose and HbA1c",
    fields: [
      { key: "fasting_glucose", label: "Fasting Glucose", unit: "mg/dL", reference: "70 – 100" },
      { key: "hba1c", label: "HbA1c", unit: "%", reference: "< 5.7" },
      { key: "postprandial_glucose", label: "Postprandial Glucose", unit: "mg/dL", reference: "< 140" },
    ],
  },
  vitamins: {
    key: "vitamins",
    name: "Vitamins Panel",
    short: "Vitamins",
    description: "Vitamin D, B12 and more",
    fields: [
      { key: "vitamin_d", label: "Vitamin D", unit: "ng/mL", reference: "30 – 100" },
      { key: "vitamin_b12", label: "Vitamin B12", unit: "pg/mL", reference: "200 – 900" },
    ],
  },
  electrolytes: {
    key: "electrolytes",
    name: "Electrolytes Panel",
    short: "Electrolytes",
    description: "Sodium, potassium, chloride balance",
    fields: [
      { key: "sodium", label: "Sodium", unit: "mmol/L", reference: "135 – 145" },
      { key: "potassium", label: "Potassium", unit: "mmol/L", reference: "3.5 – 5.1" },
      { key: "chloride", label: "Chloride", unit: "mmol/L", reference: "98 – 107" },
    ],
  },
}

const PARAMETER_LABELS: Record<string, string> = {
  total_cholesterol: "Total Cholesterol",
  ldl: "LDL Cholesterol",
  hdl: "HDL Cholesterol",
  triglycerides: "Triglycerides",
  vldl: "VLDL",
  non_hdl: "Non-HDL Cholesterol",
  hemoglobin_a1c: "Hemoglobin A1c",
  fasting_glucose: "Fasting Glucose",
  postprandial_glucose: "Postprandial Glucose",
  vitamin_d: "Vitamin D",
  vitamin_b12: "Vitamin B12",
}

export function parameterLabel(key: string): string {
  if (PARAMETER_LABELS[key]) return PARAMETER_LABELS[key]
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function isCalculatedParameter(key: string): boolean {
  return key.toLowerCase() === "vldl" || key.toLowerCase() === "non_hdl" || key.toLowerCase() === "non-hdl"
}

export function patientStatus(status?: string): string {
  if (!status || /unknown|no rule found|not available/i.test(status)) return "Reference range not available"
  return status
}

/** Normalize a backend status string to a semantic tone. */
export function statusTone(status?: string): "normal" | "high" | "low" | "borderline" | "unknown" {
  if (!status) return "unknown"
  const s = status.toLowerCase()
  if (s.includes("normal") || s.includes("good") || s.includes("optimal")) return "normal"
  if (s.includes("borderline")) return "borderline"
  if (s.includes("high") || s.includes("elevated")) return "high"
  if (s.includes("low") || s.includes("deficien")) return "low"
  return "unknown"
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return "Good Morning"
  if (h < 17) return "Good Afternoon"
  return "Good Evening"
}
