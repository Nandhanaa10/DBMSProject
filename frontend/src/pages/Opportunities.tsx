import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { errMsg, USE_MOCKS } from "../api/client";
import { opportunitiesApi } from "../api/opportunities";
import mockJson from "../mocks/opportunities.json";
import type {
  OpportunityFilters,
  OpportunityListItem,
  OpportunityType,
} from "../types/opportunities";
import type { PaginationMeta } from "../types/api";

const mock = mockJson as unknown as {
  list: OpportunityListItem[];
};

const PAGE_SIZE = 8;

const emptyMeta: PaginationMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function filterMockOpportunities(
  items: OpportunityListItem[],
  filters: OpportunityFilters,
): OpportunityListItem[] {
  let result = [...items];

  if (filters.type) {
    result = result.filter((item) => item.type === filters.type);
  }

  if (filters.skill_id) {
    result = result.filter((item) =>
      item.required_skills.some(
        (skill) => skill.skill_id === filters.skill_id,
      ),
    );
  }

  if (filters.q) {
    const query = filters.q.toLowerCase();

    result = result.filter((item) => {
      const searchableText = [
        item.title,
        item.organization.name,
        item.location ?? "",
        ...item.required_skills.map((skill) => skill.skill_name),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }

  if (filters.deadline_before) {
    result = result.filter(
      (item) => item.deadline < filters.deadline_before!,
    );
  }

  if (filters.sort === "match") {
    result.sort(
      (a, b) =>
        b.match_percent - a.match_percent ||
        a.deadline.localeCompare(b.deadline) ||
        a.opportunity_id - b.opportunity_id,
    );
  } else {
    result.sort(
      (a, b) =>
        a.deadline.localeCompare(b.deadline) ||
        a.opportunity_id - b.opportunity_id,
    );
  }

  return result;
}

export default function OpportunitiesPage() {
  const [items, setItems] = useState<OpportunityListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [type, setType] = useState<OpportunityType | "">("");
  const [skillId, setSkillId] = useState("");
  const [deadlineBefore, setDeadlineBefore] = useState("");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [sort, setSort] = useState<"deadline" | "match">("deadline");

  const [activeFilters, setActiveFilters] = useState<OpportunityFilters>({
    sort: "deadline",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (USE_MOCKS) {
          const filtered = filterMockOpportunities(mock.list, {
            ...activeFilters,
            sort: activeFilters.sort ?? "deadline",
          });

          const total = filtered.length;
          const start = (page - 1) * PAGE_SIZE;

          if (cancelled) return;

          setItems(filtered.slice(start, start + PAGE_SIZE));
          setMeta({ page, limit: PAGE_SIZE, total });
        } else {
          const response = await opportunitiesApi.list({
            ...activeFilters,
            page,
            limit: PAGE_SIZE,
          });

          if (cancelled) return;

          setItems(response.data);
          setMeta(response.meta);
        }
      } catch (e) {
        if (!cancelled) {
          setError(errMsg(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeFilters, page]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const filters: OpportunityFilters = {
      sort,
    };

    if (search.trim()) filters.q = search.trim();
    if (type) filters.type = type;
    if (skillId.trim()) {
      const parsedSkillId = Number(skillId);
      if (Number.isInteger(parsedSkillId) && parsedSkillId > 0) {
        filters.skill_id = parsedSkillId;
      }
    }
    if (deadlineBefore) filters.deadline_before = deadlineBefore;
    if (eligibleOnly) filters.eligible_only = true;

    setPage(1);
    setActiveFilters(filters);
  }

  function resetFilters() {
    setSearch("");
    setType("");
    setSkillId("");
    setDeadlineBefore("");
    setEligibleOnly(false);
    setSort("deadline");
    setPage(1);
    setActiveFilters({ sort: "deadline" });
  }

  const totalPages = Math.max(
    1,
    Math.ceil(meta.total / Math.max(meta.limit, 1)),
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          OpportunityHub
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Find your next opportunity
        </h1>
        <p className="mt-2 text-gray-600">
          Discover internships, hackathons, jobs, and research opportunities.
        </p>
      </section>

      <form
        onSubmit={applyFilters}
        className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-4"
      >
        <label className="text-sm font-medium text-gray-700">
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, organization, skill..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Opportunity type
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as OpportunityType | "")
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          >
            <option value="">All types</option>
            <option value="internship">Internship</option>
            <option value="hackathon">Hackathon</option>
            <option value="job">Job</option>
            <option value="research">Research</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Required skill ID
          <input
            type="number"
            min="1"
            value={skillId}
            onChange={(event) => setSkillId(event.target.value)}
            placeholder="For example, 1"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="text-sm font-medium text-gray-700">
          Deadline before
          <input
            type="date"
            value={deadlineBefore}
            onChange={(event) => setDeadlineBefore(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(event) => setEligibleOnly(event.target.checked)}
            className="size-4 accent-indigo-600"
          />
          Eligible opportunities only
        </label>

        <label className="text-sm font-medium text-gray-700">
          Sort by
          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as "deadline" | "match")
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
          >
            <option value="deadline">Nearest deadline</option>
            <option value="match">Best skill match</option>
          </select>
        </label>

        <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </form>

      {USE_MOCKS && activeFilters.eligible_only && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Eligibility filtering is demonstrated by the live API. Mock data
          does not contain a student profile to verify eligibility.
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-gray-500">
          Loading opportunities...
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            No opportunities found
          </h2>
          <p className="mt-2 text-gray-500">
            Try changing your search or filters.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Opportunities
            </h2>
            <p className="text-sm text-gray-500">
              {meta.total} result{meta.total === 1 ? "" : "s"}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.opportunity_id}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
                    {item.type}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {item.match_percent}% match
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-600">
                  {item.organization.name}
                </p>

                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <p>{item.location || "Location not specified"}</p>
                  <p>Deadline: {formatDate(item.deadline)}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.required_skills.map((skill) => (
                    <span
                      key={skill.skill_id}
                      className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                    >
                      {skill.skill_name}
                    </span>
                  ))}
                </div>

                <Link
                  to={`/opportunities/${item.opportunity_id}`}
                  className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
                >
                  View details
                </Link>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}
