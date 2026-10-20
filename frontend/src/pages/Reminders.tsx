import { useEffect, useState, type FormEvent } from "react";
import { remindersApi } from "../api/reminders";
import { opportunitiesApi } from "../api/opportunities";
import { errMsg, USE_MOCKS } from "../api/client";
import mockRemindersJson from "../mocks/reminders.json";
import mockOpportunitiesJson from "../mocks/opportunities.json";
import type { OpportunityListItem } from "../types/opportunities";
import type {
  CreateReminderRequest,
  Reminder,
} from "../types/reminders";

const mockReminders = mockRemindersJson as unknown as Reminder[];
const mockOpportunities = mockOpportunitiesJson as unknown as {
  list: OpportunityListItem[];
};

interface FormState {
  opportunity_id: string;
  remind_at: string;
  message: string;
}

const emptyForm: FormState = {
  opportunity_id: "",
  remind_at: "",
  message: "",
};

function toInputDate(value: string): string {
  return value.slice(0, 16);
}

function toApiDate(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityListItem[]>(
    [],
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (USE_MOCKS) {
          if (!cancelled) {
            setReminders(mockReminders);
            setOpportunities(mockOpportunities.list);
          }
        } else {
          const [reminderResponse, opportunityResponse] = await Promise.all([
            remindersApi.list({ page: 1, limit: 100 }),
            opportunitiesApi.list({ page: 1, limit: 100 }),
          ]);

          if (!cancelled) {
            setReminders(reminderResponse.data);
            setOpportunities(opportunityResponse.data);
          }
        }
      } catch (e) {
        if (!cancelled) setError(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function beginEdit(reminder: Reminder) {
    setEditingId(reminder.reminder_id);
    setForm({
      opportunity_id: String(reminder.opportunity_id),
      remind_at: toInputDate(reminder.remind_at),
      message: reminder.message,
    });
    setError("");
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!form.opportunity_id || !form.remind_at || !form.message.trim()) {
      setError("Choose an opportunity, date/time, and message.");
      return;
    }

    const opportunityId = Number(form.opportunity_id);
    const opportunity = opportunities.find(
      (item) => item.opportunity_id === opportunityId,
    );

    if (!opportunity) {
      setError("Select a valid opportunity.");
      return;
    }

    const body: CreateReminderRequest = {
      opportunity_id: opportunityId,
      remind_at: toApiDate(form.remind_at),
      message: form.message.trim(),
    };

    setSaving(true);

    try {
      if (USE_MOCKS) {
        if (editingId !== null) {
          setReminders((current) =>
            current.map((reminder) =>
              reminder.reminder_id === editingId
                ? {
                    ...reminder,
                    opportunity_id: opportunityId,
                    remind_at: body.remind_at,
                    message: body.message,
                    opportunity: {
                      opportunity_id: opportunity.opportunity_id,
                      title: opportunity.title,
                      deadline: opportunity.deadline,
                    },
                  }
                : reminder,
            ),
          );
          setMessage("Demo reminder updated.");
        } else {
          const created: Reminder = {
            reminder_id: Date.now(),
            opportunity_id: opportunityId,
            remind_at: body.remind_at,
            message: body.message,
            is_sent: false,
            opportunity: {
              opportunity_id: opportunity.opportunity_id,
              title: opportunity.title,
              deadline: opportunity.deadline,
            },
          };

          setReminders((current) => [...current, created]);
          setMessage("Demo reminder created.");
        }
      } else if (editingId !== null) {
        const response = await remindersApi.update(editingId, body);
        setReminders((current) =>
          current.map((item) =>
            item.reminder_id === editingId ? response.data : item,
          ),
        );
        setMessage("Reminder updated successfully.");
      } else {
        const response = await remindersApi.create(body);
        setReminders((current) => [...current, response.data]);
        setMessage("Reminder created successfully.");
      }

      resetForm();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeReminder(reminderId: number) {
    if (!window.confirm("Delete this reminder?")) return;

    setError("");
    setMessage("");

    try {
      if (!USE_MOCKS) {
        await remindersApi.remove(reminderId);
      }

      setReminders((current) =>
        current.filter((item) => item.reminder_id !== reminderId),
      );

      if (editingId === reminderId) resetForm();

      setMessage("Reminder deleted.");
    } catch (e) {
      setError(errMsg(e));
    }
  }

  if (loading) {
    return <main className="p-8 text-center text-gray-500">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          OpportunityHub
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          My reminders
        </h1>
        <p className="mt-2 text-gray-600">
          Keep important applications and deadlines on your radar.
        </p>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          {editingId === null ? "Create a reminder" : "Edit reminder"}
        </h2>

        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Opportunity
            <select
              required
              value={form.opportunity_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  opportunity_id: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Choose an opportunity</option>
              {opportunities.map((opportunity) => (
                <option
                  key={opportunity.opportunity_id}
                  value={opportunity.opportunity_id}
                >
                  {opportunity.title}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-700">
            Reminder date and time
            <input
              required
              type="datetime-local"
              value={form.remind_at}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  remind_at: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="text-sm font-medium text-gray-700 md:col-span-2">
            Message
            <input
              required
              maxLength={255}
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              placeholder="For example, prepare your application documents"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId === null
                  ? "Create reminder"
                  : "Save changes"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Scheduled reminders
          </h2>
          <span className="text-sm text-gray-500">
            {reminders.length} reminder{reminders.length === 1 ? "" : "s"}
          </span>
        </div>

        {reminders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
            No reminders yet. Create one using the form above.
          </div>
        ) : (
          <div className="space-y-3">
            {[...reminders]
              .sort((a, b) => a.remind_at.localeCompare(b.remind_at))
              .map((reminder) => (
                <article
                  key={reminder.reminder_id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {reminder.message}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          reminder.is_sent
                            ? "bg-gray-100 text-gray-600"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {reminder.is_sent ? "Sent" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {reminder.opportunity.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Remind at: {formatDate(reminder.remind_at)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Opportunity deadline:{" "}
                      {formatDate(reminder.opportunity.deadline)}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => beginEdit(reminder)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeReminder(reminder.reminder_id)}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}
