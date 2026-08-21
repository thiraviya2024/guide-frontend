"use client"

import useSWR from "swr"
import { aiService } from "@/services/ai"

export function useAiStatus() {
  const { data, error, isLoading } = useSWR("ai-status", () => aiService.status(), { refreshInterval: 60_000, revalidateOnFocus: false })
  return { status: data, error, isLoading }
}
