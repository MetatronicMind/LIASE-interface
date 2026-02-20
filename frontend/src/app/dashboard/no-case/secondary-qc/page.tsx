"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";
import { PmidLink } from "@/components/PmidLink";
import { useDateTime } from "@/hooks/useDateTime";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface Study {
  id: string;
  pmid: string;
  title: string;
  drugName: string;
  userTag: string;
  status: string;
  qaApprovalStatus?: string;
  updatedAt: string;
  createdAt: string;
  clientName?: string;
}

export default function NoCaseSecondaryQCPage() {
  const { formatDate } = useDateTime();
  const selectedOrganizationId = useSelector(
    (state: RootState) => state.filter.selectedOrganizationId,
  );

  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    fetchStudies();
  }, [selectedOrganizationId]);

  const fetchStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const orgParam = selectedOrganizationId
        ? `&organizationId=${selectedOrganizationId}`
        : "";
      const response = await fetch(
        `${getApiBaseUrl()}/studies/QA/no-case-secondary-pending?limit=200${orgParam}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
      } else {
        throw new Error("Failed to fetch Secondary QC studies");
      }
    } catch (err) {
      setError("Failed to load Secondary QC queue");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSecondaryQC = async () => {
    if (
      !confirm(
        `Process No Case Secondary QC?\n\nThis will:\n• Clear the configured percentage of cases directly to Reports\n• Send the remaining cases to No Case Triage for manual review`,
      )
    ) {
      return;
    }

    setProcessing(true);
    setLastResult(null);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${getApiBaseUrl()}/studies/QA/process-no-case-secondary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        setLastResult(result.message);
        fetchStudies();
      } else {
        throw new Error("Failed to process Secondary QC");
      }
    } catch (err) {
      setError("Failed to process Secondary QC");
    } finally {
      setProcessing(false);
    }
  };

  const filteredStudies = studies.filter((s) => {
    const q = search.toLowerCase();
    return (
      !search ||
      s.title?.toLowerCase().includes(q) ||
      s.pmid?.includes(q) ||
      s.drugName?.toLowerCase().includes(q)
    );
  });

  return (
    <PermissionGate resource="studies" action="read">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                No Case — Secondary QC
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Cases that passed primary No Case QC and are awaiting secondary
                processing. A configured percentage will be cleared to Reports;
                the rest go to No Case Triage.
              </p>
            </div>
            <button
              onClick={handleProcessSecondaryQC}
              disabled={processing || studies.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing…
                </>
              ) : (
                "Process Secondary QC"
              )}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          {lastResult && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-800 text-sm font-medium">
              {lastResult}
            </div>
          )}

          {/* Stats banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <p className="text-3xl font-bold text-indigo-700">
                {studies.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                In Secondary QC Queue
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by title, PMID, or drug name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Studies list */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Secondary QC Queue ({filteredStudies.length})
              </h2>
              <button
                onClick={fetchStudies}
                className="text-sm text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading…</p>
              </div>
            ) : filteredStudies.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  {search
                    ? "No matching studies found."
                    : "No studies awaiting Secondary QC."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredStudies.map((study) => (
                  <li
                    key={study.id}
                    className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-400">
                            {study.id}
                          </span>
                          <PmidLink pmid={study.pmid} />
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                            No Case
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Secondary QC
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {study.title}
                        </p>
                        <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-3">
                          <span>
                            <strong>Drug:</strong> {study.drugName}
                          </span>
                          {study.clientName && (
                            <span>
                              <strong>Client:</strong> {study.clientName}
                            </span>
                          )}
                          <span>
                            <strong>Updated:</strong>{" "}
                            {formatDate(study.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
