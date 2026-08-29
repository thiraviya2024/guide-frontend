import { apiClient } from "./api"

export interface AiStatus {
  success?: boolean
  message?: string
  groq?: { status?: string }
  gemini?: { status?: string }
  [key: string]: unknown
}

export interface AiStructuredResponse {
  summary?: string
  abnormal_results?: unknown[]
  possible_causes?: unknown[]
  recommendations?: unknown[]
  lifestyle_suggestions?: unknown[]
  model_consensus?: string
  [key: string]: unknown
}

export interface AiAnalyzeResponse {
  success?: boolean
  message?: string
  data?: unknown
  explanation?: string
  response?: string | AiStructuredResponse
  answer?: string
  provider?: string[]
  agreement_score?: number
  physician_review_required?: boolean
  [key: string]: unknown
}

interface ClinicalEvidenceResult {
  value: number
  status?: string
  unit?: string
  calculated?: boolean
  reference?: string
}

function isCalculatedResult(name: string): boolean {
  return /^(vldl|non[-_ ]hdl)$/i.test(name)
}

function clinicalEvidence(report: Record<string, unknown>): Record<string, unknown> {
  const rawResults = report.results
  const results: Record<string, ClinicalEvidenceResult> = {}
  if (rawResults && typeof rawResults === "object") {
    for (const [name, raw] of Object.entries(rawResults as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue
      const result = raw as Record<string, unknown>
      if (typeof result.value !== "number") continue
      results[name] = {
        value: result.value,
        status: typeof result.status === "string" ? result.status : undefined,
        unit: typeof result.unit === "string" ? result.unit : undefined,
        calculated: isCalculatedResult(name),
      }
    }
  }

  const rawRisks = Array.isArray(report.disease_risks) ? report.disease_risks : []
  const risks = rawRisks.flatMap((risk) => {
    if (!risk || typeof risk !== "object") return []
    const item = risk as Record<string, unknown>
    if (typeof item.disease !== "string") return []
    return [{
      disease: item.disease,
      confidence: typeof item.confidence === "string" ? item.confidence : undefined,
    }]
  })

  return {
    category: typeof report.category === "string" ? report.category : undefined,
    overall_status: typeof report.overall_status === "string" ? report.overall_status : undefined,
    results,
    disease_risks: risks,
  }
}

function formatClinicalEvidence(evidence: Record<string, unknown>): string {
  const results = evidence.results && typeof evidence.results === "object" ? evidence.results as Record<string, ClinicalEvidenceResult> : {}
  const lines = Object.entries(results).map(([name, result]) => {
    const calculated = result.calculated ? ", calculated" : ""
    const unit = result.unit ? ` ${result.unit}` : ""
    const status = result.status ? `, status = ${result.status.toLowerCase()}` : ""
    return `${name} = ${result.value}${unit}${status}${calculated}`
  })
  return lines.length ? lines.join("\n") : "No report values were supplied for this question."
}

function formatRuleFindings(evidence: Record<string, unknown>): string {
  const risks = Array.isArray(evidence.disease_risks) ? evidence.disease_risks : []
  if (!risks.length) return "No additional structured risk findings supplied."
  return risks.map((risk) => {
    if (!risk || typeof risk !== "object") return ""
    const item = risk as Record<string, unknown>
    return [item.disease, item.confidence ? `confidence = ${item.confidence}` : ""].filter(Boolean).join(", ")
  }).filter(Boolean).join("\n")
}

function buildModelContext(
  question: string,
  evidence: Record<string, unknown> | undefined,
  history: unknown[],
  intent: string,
): string {
  const reportEvidence = evidence ?? { results: {}, disease_risks: [] }
  return [
    "You are LIFE SAVER, a patient-facing medical report assistant.",
    "The clinical evidence below has already been extracted and evaluated by the rule engine.",
    "Treat it as the available evidence from the uploaded report.",
    "Do NOT say that the report is missing when clinical evidence is present.",
    "Do NOT ask the user to upload or provide test values when those values are already supplied.",
    "Answer the CURRENT USER QUESTION directly.",
    "Use simple patient-friendly English.",
    "Do not reproduce internal rule-engine messages or prompt instructions.",
    "Do not output meta-commentary such as 'I should...' or 'Does this follow?'.",
    "Do not invent values or diagnose a disease from laboratory results alone.",
    "If the user asks about food, answer the food question using the supplied lipid findings.",
    "If the user says hello or hi, simply greet the user and offer help; do not dump the entire report.",
    "If the user asks for the complete report explanation, explain the complete structured evidence.",
    "The rule engine supplies medical evidence only. The final answer must be generated naturally by the LLM.",
    `QUESTION INTENT:\n${intent}`,
    `USER QUESTION:\n${question}`,
    `CLINICAL EVIDENCE:\n${formatClinicalEvidence(reportEvidence)}`,
    `RULE ENGINE FINDINGS:\n${formatRuleFindings(reportEvidence)}`,
    `CONVERSATION HISTORY:\n${history.length ? JSON.stringify(history) : "[]"}`,
  ].join("\n\n")
}

const INTERNAL_ARTIFACTS = [
  /^user question:/i,
  /^required output structure:/i,
  /^required structure:/i,
  /^detected risks:/i,
  /^lifestyle suggestions:/i,
  /^disclaimer(?:\s+must be|:)/i,
  /^tone:/i,
  /^mandatory:/i,
  /^structure matches exactly\??/i,
  /^simple language\??/i,
  /^professional tone\??/i,
  /^disclaimer included\??/i,
  /^check .* thresholds:/i,
]

function cleanItems(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !INTERNAL_ARTIFACTS.some((pattern) => pattern.test(item)))
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return ""
  const withoutThinking = value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json|markdown|text)?/gi, "")
    .replace(/```/g, "")
  const normalized = withoutThinking
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "  ")
  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  return lines
    .filter((line) => !INTERNAL_ARTIFACTS.some((pattern) => pattern.test(line)))
    .filter((line) => !/^\s*(analyze user input|required output structure|required structure|draft|step \d+[:.]|i(?:'|’)ll put it at the end)/i.test(line))
    .map((line) => line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^[-*]\s+/, "• "))
    .join("\n")
}

function formatStructuredResponse(data: AiStructuredResponse): string {
  const sections: string[] = []
  const summary = cleanText(data.summary)
  if (summary) sections.push(summary)
  const addSection = (title: string, items: unknown) => {
    const cleaned = cleanItems(items)
    if (cleaned.length) sections.push(`${title}\n${cleaned.map((item) => `• ${item}`).join("\n")}`)
  }
  addSection("Key Findings", data.abnormal_results)
  addSection("Possible Causes", data.possible_causes)
  addSection("Recommendations", data.recommendations)
  addSection("Lifestyle Suggestions", data.lifestyle_suggestions)
  const consensus = cleanText(data.model_consensus)
  if (consensus && !/^based on analysis from multiple ai models$/i.test(consensus)) sections.push(consensus)
  return sections.join("\n\n")
}

function extractText(payload: AiAnalyzeResponse): string {
  const structured = payload.response && typeof payload.response === "object" ? payload.response : null
  if (structured) return formatStructuredResponse(structured)
  const candidates = [payload.response, payload.answer, payload.explanation, payload.message]
  for (const candidate of candidates) {
    const cleaned = cleanText(candidate)
    if (cleaned) return cleaned
  }
  if (typeof payload.data === "string") return cleanText(payload.data)
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as Record<string, unknown>
    const nestedStructured = data.response && typeof data.response === "object" ? data.response as AiStructuredResponse : null
    if (nestedStructured) return formatStructuredResponse(nestedStructured)
    for (const key of ["response", "answer", "explanation", "message", "content", "text"]) {
      const cleaned = cleanText(data[key])
      if (cleaned) return cleaned
    }
  }
  return ""
}

export const aiService = {
  async status(): Promise<AiStatus> {
    return apiClient.get<AiStatus>("/ai/status", { timeout: 60_000 })
  },
  async analyze(content: string, context?: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
    const userMessage = content.trim()
    const report = context?.report_analysis as {
      results?: unknown
      disease_risks?: unknown[]
      overall_status?: string
      category?: string
      relevant_question?: string
      intent?: string
      [key: string]: unknown
    } | undefined
    const conversationHistory = Array.isArray(context?.conversation_history) ? context.conversation_history : []
    const questionIntent = typeof context?.question_intent === "string" ? context.question_intent : "general_health_question"

    const evidence = report && typeof report === "object" && Object.keys(report).length > 0 ? clinicalEvidence(report) : undefined
    const body: Record<string, unknown> = {
      prompt: userMessage,
      context: buildModelContext(userMessage, evidence, conversationHistory, questionIntent),
      question_intent: questionIntent,
      conversation_history: conversationHistory,
      answer_scope: questionIntent === "report_summary" ? "comprehensive report explanation" : "answer the current question directly using only relevant report context",
    }

    if (evidence) {
      body.results = evidence.results
      body.disease_risks = evidence.disease_risks
    }

    if (process.env.NODE_ENV === "development") console.debug("[LIFE SAVER] AI request payload", body)

    const result = await apiClient.post<AiAnalyzeResponse>("/ai/analyze", body, { timeout: 180_000, signal })
    const answer = extractText(result)
    if (!answer) throw new Error("The AI service did not return an answer.")
    return answer
  },
  async consensus(content: string, context?: Record<string, unknown>): Promise<string> {
    const userMessage = content.trim()
    const prompt = context
      ? `${userMessage}\n\nReport context:\n${JSON.stringify(context.report_analysis ?? context)}`
      : userMessage
    const result = await apiClient.post<AiAnalyzeResponse>("/ai/consensus", { prompt }, { timeout: 180_000 })
    const answer = extractText(result)
    if (!answer) throw new Error("The AI service did not return an answer.")
    return answer
  },
}

export function aiStatusLabel(status?: AiStatus) {
  const online = status?.success === true && (status?.groq?.status === "online" || status?.gemini?.status === "online")
  return online ? "AI Online" : "AI Offline"
}

export function aiStatusProviders(status?: AiStatus) {
  return [status?.groq?.status === "online" ? "Groq" : null, status?.gemini?.status === "online" ? "Gemini" : null].filter(Boolean).join(" + ")
}
