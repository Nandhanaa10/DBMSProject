import { api } from "./client";
import type {
  ApiListSuccess,
} from "../types/api";
import type {
  Organization,
  OrganizationFilters,
} from "../types/organizations";

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

export const organizationsApi = {
  list(
    filters: OrganizationFilters = {},
  ): Promise<ApiListSuccess<Organization>> {
    return api.get<Organization[]>(
      `/organizations${buildQuery(filters)}`,
    ) as Promise<ApiListSuccess<Organization>>;
  },
};
