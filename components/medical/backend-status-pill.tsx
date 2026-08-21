"use client"

import { useApiStatus } from "@/hooks/use-backend"
import { useAiStatus } from "@/hooks/use-ai"
import { aiStatusLabel, aiStatusProviders } from "@/services/ai"
import { cn } from "@/lib/utils"

export function BackendStatusPill({ className }: { className?: string }) {
  const { status, error, isLoading } = useApiStatus()
  const { status: ai, error: aiError, isLoading: aiLoading } = useAiStatus()
  const backendOnline = !isLoading && !error && status?.status === "healthy"
  const aiOnline = !aiLoading && !aiError && aiStatusLabel(ai) === "AI Online"
  const label = aiLoading ? "Checking AI…" : aiOnline ? `${aiStatusLabel(ai)} · ${aiStatusProviders(ai)}` : backendOnline ? `Backend online · ${status?.total_modules ?? 0} modules` : "AI Offline"
  const dot = aiLoading ? "bg-muted-foreground" : aiOnline ? "bg-success" : backendOnline ? "bg-warning" : "bg-danger"
  return <span className={cn("inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground", className)}><span className={cn("h-2 w-2 rounded-full", dot)} />{label}</span>
}
