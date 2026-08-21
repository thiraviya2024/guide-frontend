"use client"

import useSWR from "swr"
import { systemService, adminService } from "@/services/system"
import { datasetsService } from "@/services/datasets"
import type { AdminStats, ApiStatus, DatasetCategoriesResponse, DatasetVersionsResponse } from "@/types"

export function useApiStatus() {
  const { data, error, isLoading, mutate } = useSWR<ApiStatus>("status", () => systemService.status(), {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  })
  return { status: data, error, isLoading, refresh: mutate }
}

export function useAdminStats() {
  const { data, error, isLoading, mutate } = useSWR<AdminStats>("admin-stats", () => adminService.stats(), {
    revalidateOnFocus: false,
  })
  return { stats: data, error, isLoading, refresh: mutate }
}

export function useDatasetCategories() {
  const { data, error, isLoading } = useSWR<DatasetCategoriesResponse>(
    "dataset-categories",
    () => datasetsService.categories(),
    { revalidateOnFocus: false },
  )
  return { data, error, isLoading }
}

export function useDatasetVersions() {
  const { data, error, isLoading, mutate } = useSWR<DatasetVersionsResponse>(
    "dataset-versions",
    () => datasetsService.versions(),
    { revalidateOnFocus: false },
  )
  return { data, error, isLoading, refresh: mutate }
}
