import { apiClient } from "./api"
import type { DengueFeatures, DenguePredictionResponse } from "@/types"

/** Calls the backend prototype. No prediction or probability is calculated in the UI. */
export const dengueService = {
  predict: (features: DengueFeatures, signal?: AbortSignal) =>
    apiClient.post<DenguePredictionResponse>("/dengue/predict", { features }, { signal }),
}
