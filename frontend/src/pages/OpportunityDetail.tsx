import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { applicationsApi } from "../api/applications";
import { errMsg, USE_MOCKS } from "../api/client";
import mockJson from "../mocks/opportunities.json";
import mockApplicationsJson from "../mocks/applications.json";
import type { Application } from "../types/applications";
import type { OpportunityDetail } from "../types/opportunities";

const mockOpportunities = mockJson as unknown as {
  details: Record<string, OpportunityDetail>;
};

const mockApplications = mockApplicationsJson as unknown as {
  applications: Application[];
};

const MOCK_APPLICATIONS_KEY = "oh_mock_applications";

function readStoredApplications(): Application[] {
  try {
    const raw = localStorage.getItem(MOCK_APPLICATIONS_KEY);
    return raw ? (JSON.parse(raw) as Application[]) : [];
  } catch {
    return [];
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

export default function OpportunityDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const opportunityId = Number(id);

  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      if (!Number.isInteger(opportunityId) || opportunityId < 1) {
        setError("Invalid opportunity ID.");
        setLoading(false);
        return;
      }

      try {
        if (USE_MOCKS) {
          const record = mockOpportunities.details[String(opportunityId)];
          if (!record) {
            setError("Opportunity not found in mock data.");
          } else if (!cancelled) {
            setOpportunity(record);
          }
        } else {
          const response = await import("../api/opportunities").then(
            (module) => module.opportunitiesApi.getById(opportunityId),
          );
          if (!cancelled) setOpportunity(response.data);
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
  }, [opportunityId]);

  async function apply() {
    if (!opportunity) return;

    setApplying(true);
    setError("");
    setMessage("");

    try {
      if (USE_MOCKS) {
        const stored = readStoredApplications();
        const allApplications = [
          ...mockApplications.applications,
          ...stored,
        ];

        const duplicate = allApplications.some(
          (application) =>
            application.opportunity.opportunity_id === opportunity.opportunity_id,
        );

        if (duplicate) {
          setMessage("You are already tracking an application for this opportunity.");
          return;
        }

        const newApplication: Application = {
          application_id: Date.now(),
          status: "applied",
          applied_at: localTimestamp(),
          opportunity: {
            opportunity_id: opportunity.opportunity_id,
            title: opportunity.title,
            type: opportunity.type,
            location: opportunity.location,
            deadline: opportunity.deadline,
            apply_link: opportunity.apply_link,
            organization: {
              organization_id: opportunity.organization.organization_id,
              name: opportunity.organization.name,
            },
          },
        };

        localStorage.setItem(
          MOCK_APPLICATIONS_KEY,
          JSON.stringify([...stored, newApplication]),
        );

        setMessage(
          "Demo application created. Open My Applications to view it.",
        );
      } else {
        await applicationsApi.create({
          opportunity_id: opportunity.opportunity_id,
        });
        setMessage("Application created successfully.");
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return <main className="p-8 text-center text-gray-500">Loading...</main>;
  }

  if (!opportunity) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error || "Opportunity not found."}
        </p>
        <Link
          to="/opportunities"
          className="mt-4 inline-block font-semibold text-indigo-600"
        >
          Back to opportunities
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        to="/opportunities"
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
      >
        ← Back to opportunities
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold capitalize text-indigo-700">
            {opportunity.type}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            {opportunity.match_percent}% skill match
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          {opportunity.title}
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          {opportunity.organization.name}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Location" value={opportunity.location || "Not specified"} />
          <Info label="Mode" value={opportunity.mode} />
          <Info
            label="Stipend"
            value={
              opportunity.stipend == null
                ? "Not specified"
                : `₹${opportunity.stipend.toLocaleString("en-IN")}`
            }
          />
          <Info
            label="Deadline"
            value={new Date(opportunity.deadline).toLocaleString()}
          />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            About this opportunity
          </h2>
          <p className="mt-2 whitespace-pre-line leading-7 text-gray-600">
            {opportunity.description || "No description is available."}
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Required skills
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {opportunity.required_skills.map((skill) => (
              <span
                key={skill.skill_id}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700"
              >
                {skill.skill_name}
              </span>
            ))}
            {opportunity.required_skills.length === 0 && (
              <p className="text-sm text-gray-500">
                No mandatory skills specified.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Eligibility
          </h2>
          {opportunity.eligibility ? (
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p>
                Minimum CGPA:{" "}
                {opportunity.eligibility.min_cgpa ?? "No minimum"}
              </p>
              <p>
                Allowed branches:{" "}
                {opportunity.eligibility.allowed_branches ?? "All branches"}
              </p>
              <p>
                Allowed years:{" "}
                {opportunity.eligibility.allowed_years ?? "All years"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-600">
              No specific eligibility restrictions are listed.
            </p>
          )}
        </div>

        {opportunity.organization.website && (
          <p className="mt-6 text-sm">
            Organization website:{" "}
            <a
              href={opportunity.organization.website}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Visit website
            </a>
          </p>
        )}

        {error && (
          <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-6 rounded-lg bg-emerald-50 p-3 text-emerald-800"
          >
            {message}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={applying}
            onClick={() => void apply()}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {applying ? "Submitting..." : "Track application"}
          </button>

          {opportunity.apply_link && (
            <a
              href={opportunity.apply_link}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              External application link ↗
            </a>
          )}

          <Link
            to="/applications"
            className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            My applications
          </Link>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 font-semibold capitalize text-gray-900">{value}</p>
    </div>
  );
}
