import { api } from "./client";
import type {
  ApiListSuccess,
  ApiSuccess,
} from "../types/api";
import type {
  Application,
  ApplicationFilters,
  ApplicationStatus,
  ApplicationStatusHistoryItem,
  CreateApplicationRequest,
  CreatedApplication,
  UpdatedApplicationStatus,
} from "../types/applications";

function buildQuery(params: object): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const result = query.toString();
  return result ? `?${result}` : "";
}

export const applicationsApi = {
  list(
    filters: ApplicationFilters = {},
  ): Promise<ApiListSuccess<Application>> {
    return api.get<Application[]>(
      `/applications${buildQuery(filters)}`,
    ) as Promise<ApiListSuccess<Application>>;
  },

  create(
    body: CreateApplicationRequest,
  ): Promise<ApiSuccess<CreatedApplication>> {
    return api.post<CreatedApplication>("/applications", body);
  },

  updateStatus(
    applicationId: number,
    status: ApplicationStatus,
    note: string | null = null,
  ): Promise<ApiSuccess<UpdatedApplicationStatus>> {
    return api.patch<UpdatedApplicationStatus>(
      `/applications/${applicationId}/status`,
      { status, note },
    );
  },

  getHistory(
    applicationId: number,
    page = 1,
    limit = 20,
  ): Promise<ApiListSuccess<ApplicationStatusHistoryItem>> {
    return api.get<ApplicationStatusHistoryItem[]>(
      `/applications/${applicationId}/history${buildQuery({
        page,
        limit,
      })}`,
    ) as Promise<ApiListSuccess<ApplicationStatusHistoryItem>>;
  },
};
