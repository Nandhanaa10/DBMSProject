import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { applicationsApi } from "../api/applications";
import { errMsg, USE_MOCKS } from "../api/client";
import mockJson from "../mocks/applications.json";
import type {
  Application,
  ApplicationStatus,
  ApplicationStatusHistoryItem,
} from "../types/applications";

const mock = mockJson as unknown as {
  applications: Application[];
  history: Record<string, ApplicationStatusHistoryItem[]>;
};

const MOCK_APPLICATIONS_KEY = "oh_mock_applications";
const MOCK_HISTORY_KEY = "oh_mock_application_history";

const statuses: ApplicationStatus[] = [
  "saved",
  "applied",
  "shortlisted",
  "interview",
  "offered",
  "rejected",
  "withdrawn",
];

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function localTimestamp(): string {
  const now = new Date();
  return new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 19);
}

function statusClass(status: ApplicationStatus): string {
  switch (status) {
    case "offered":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
    case "withdrawn":
      return "bg-red-50 text-red-700";
    case "interview":
    case "shortlisted":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function uniqueApplications(items: Application[]): Application[] {
  const byId = new Map<number, Application>();

  items.forEach((item) => byId.set(item.application_id, item));

  return Array.from(byId.values()).sort(
    (a, b) => b.applied_at.localeCompare(a.applied_at),
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [histories, setHistories] = useState<
    Record<string, ApplicationStatusHistoryItem[]>
  >({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (USE_MOCKS) {
          const storedApps = readStored<Application[]>(
            MOCK_APPLICATIONS_KEY,
            [],
          );
          const storedHistory = readStored<
            Record<string, ApplicationStatusHistoryItem[]>
          >(MOCK_HISTORY_KEY, {});

          const merged = uniqueApplications([
            ...mock.applications,
            ...storedApps,
          ]);

          if (cancelled) return;

          setApplications(merged);
          setHistories({
            ...mock.history,
            ...storedHistory,
          });
        } else {
          const response = await applicationsApi.list({
            page: 1,
            limit: 100,
          });

          const historyEntries = await Promise.all(
            response.data.map(async (application) => {
              try {
                const history = await applicationsApi.getHistory(
                  application.application_id,
                  1,
                  100,
                );
                return [
                  String(application.application_id),
                  history.data,
                ] as const;
              } catch {
                return [
                  String(application.application_id),
                  [],
                ] as const;
              }
            }),
          );

          if (cancelled) return;

          setApplications(response.data);
          setHistories(Object.fromEntries(historyEntries));
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

  async function changeStatus(
    application: Application,
    newStatus: ApplicationStatus,
  ) {
    if (application.status === newStatus) return;

    setUpdatingId(application.application_id);
    setError("");
    setMessage("");

    const note = notes[application.application_id]?.trim() || null;

    try {
      if (USE_MOCKS) {
        const updatedApplication: Application = {
          ...application,
          status: newStatus,
        };

        const updatedApplications = applications.map((item) =>
          item.application_id === application.application_id
            ? updatedApplication
            : item,
        );

        const historyItem: ApplicationStatusHistoryItem = {
          old_status: application.status,
          new_status: newStatus,
          changed_at: localTimestamp(),
          note,
        };

        const updatedHistories = {
          ...histories,
          [String(application.application_id)]: [
            ...(histories[String(application.application_id)] ?? []),
            historyItem,
          ],
        };

        setApplications(updatedApplications);
        setHistories(updatedHistories);

        localStorage.setItem(
          MOCK_APPLICATIONS_KEY,
          JSON.stringify(updatedApplications),
        );
        localStorage.setItem(
          MOCK_HISTORY_KEY,
          JSON.stringify(updatedHistories),
        );
      } else {
        await applicationsApi.updateStatus(
          application.application_id,
          newStatus,
          note,
        );

        const historyResponse = await applicationsApi.getHistory(
          application.application_id,
          1,
          100,
        );

        setApplications((current) =>
          current.map((item) =>
            item.application_id === application.application_id
              ? { ...item, status: newStatus }
              : item,
          ),
        );

        setHistories((current) => ({
          ...current,
          [String(application.application_id)]: historyResponse.data,
        }));
      }

      setMessage("Application status updated.");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setUpdatingId(null);
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
          My applications
        </h1>
        <p className="mt-2 text-gray-600">
          Keep track of your applications and their status history.
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

      {applications.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            No applications yet
          </h2>
          <p className="mt-2 text-gray-500">
            Browse opportunities and track the ones you apply for.
          </p>
          <Link
            to="/opportunities"
            className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Browse opportunities
          </Link>
        </section>
      ) : (
        <div className="space-y-5">
          {applications.map((application) => {
            const history = histories[String(application.application_id)] ?? [];

            return (
              <article
                key={application.application_id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {application.opportunity.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {application.opportunity.organization.name}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Applied:{" "}
                      {new Date(application.applied_at).toLocaleString()}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-sm font-semibold capitalize ${statusClass(application.status)}`}
                  >
                    {application.status}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Update status
                    <select
                      value={application.status}
                      disabled={updatingId === application.application_id}
                      onChange={(event) =>
                        void changeStatus(
                          application,
                          event.target.value as ApplicationStatus,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Note for the status change
                    <input
                      value={notes[application.application_id] ?? ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [application.application_id]: event.target.value,
                        }))
                      }
                      maxLength={255}
                      placeholder="Optional note"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </label>
                </div>

                {application.opportunity.apply_link && (
                  <a
                    href={application.opportunity.apply_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Open application link ↗
                  </a>
                )}

                <div className="mt-7 border-t border-gray-100 pt-5">
                  <h3 className="font-semibold text-gray-900">
                    Status timeline
                  </h3>

                  {history.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">
                      No status-change history recorded yet.
                    </p>
                  ) : (
                    <ol className="mt-4 space-y-4">
                      {history.map((item, index) => (
                        <li
                          key={`${item.changed_at}-${index}`}
                          className="relative border-l-2 border-indigo-100 pb-1 pl-5 last:border-transparent"
                        >
                          <span className="absolute -left-[7px] top-1 size-3 rounded-full border-2 border-white bg-indigo-500" />
                          <p className="font-medium capitalize text-gray-900">
                            {item.old_status ?? "Initial"} → {item.new_status}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(item.changed_at).toLocaleString()}
                          </p>
                          {item.note && (
                            <p className="mt-1 text-sm text-gray-600">
                              {item.note}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
