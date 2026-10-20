import { api } from "./client";
import type { ApiSuccess } from "../types/api";
import type { DashboardSummary } from "../types/dashboard";

export const dashboardApi = {
  getSummary(): Promise<ApiSuccess<DashboardSummary>> {
    return api.get<DashboardSummary>("/dashboard/summary");
  },
};
