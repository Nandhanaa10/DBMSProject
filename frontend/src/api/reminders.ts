import { api } from "./client";
import type {
  ApiListSuccess,
  ApiSuccess,
} from "../types/api";
import type {
  CreateReminderRequest,
  DeleteReminderResponse,
  Reminder,
  ReminderFilters,
} from "../types/reminders";

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

export const remindersApi = {
  list(
    filters: ReminderFilters = {},
  ): Promise<ApiListSuccess<Reminder>> {
    return api.get<Reminder[]>(
      `/reminders${buildQuery(filters)}`,
    ) as Promise<ApiListSuccess<Reminder>>;
  },

  create(
    body: CreateReminderRequest,
  ): Promise<ApiSuccess<Reminder>> {
    return api.post<Reminder>("/reminders", body);
  },

  update(
    reminderId: number,
    body: CreateReminderRequest,
  ): Promise<ApiSuccess<Reminder>> {
    return api.put<Reminder>(
      `/reminders/${reminderId}`,
      body,
    );
  },

  remove(
    reminderId: number,
  ): Promise<ApiSuccess<DeleteReminderResponse>> {
    return api.delete<DeleteReminderResponse>(
      `/reminders/${reminderId}`,
    );
  },
};
