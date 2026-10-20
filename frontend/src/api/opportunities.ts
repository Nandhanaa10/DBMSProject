import { api } from "./client";
import type {
  ApiListSuccess,
  ApiSuccess,
} from "../types/api";
import type {
  OpportunityDetail,
  OpportunityFilters,
  OpportunityListItem,
  OpportunityMatch,
} from "../types/opportunities";

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

export const opportunitiesApi = {
  list(
    filters: OpportunityFilters = {},
  ): Promise<ApiListSuccess<OpportunityListItem>> {
    return api.get<OpportunityListItem[]>(
      `/opportunities${buildQuery(filters)}`,
    ) as Promise<ApiListSuccess<OpportunityListItem>>;
  },

  getById(
    opportunityId: number,
  ): Promise<ApiSuccess<OpportunityDetail>> {
    return api.get<OpportunityDetail>(
      `/opportunities/${opportunityId}`,
    );
  },

  getMatch(
    opportunityId: number,
  ): Promise<ApiSuccess<OpportunityMatch>> {
    return api.get<OpportunityMatch>(
      `/opportunities/${opportunityId}/match`,
    );
  },
};
