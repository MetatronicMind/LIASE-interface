"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";
import { PmidLink } from "@/components/PmidLink";
import PDFAttachmentUpload from "@/components/PDFAttachmentUpload";
import { CommentThread } from "@/components/CommentThread";
import { useDateTime } from "@/hooks/useDateTime";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string | string[];
  journal: string;
  publicationDate?: string;
  drugName: string;
  adverseEvent: string;
  status?: string;
  userTag: string;
  qaApprovalStatus?: string;
  qaComments?: string;
  createdAt: string;
  updatedAt: string;
  abstract?: string;
  clientName?: string;
  sponsor?: string;
  icsrClassification?: string;
  ICSR_classification?: string;
  aoiClassification?: string;
  aiInferenceData?: any;
  Text_type?: string;
  textType?: string;
  specialCase?: string;
  special_case?: string;
  substanceGroup?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  leadAuthor?: string;
  authorPerspective?: string;
  testSubject?: string;
  attributability?: string;
  drugEffect?: string;
  justification?: string;
  patientDetails?: any;
  relevantDates?: any;
  administeredDrugs?: string[];
  summary?: string;
  doi?: string;
  vancouverCitation?: string;
  listedness?: string;
  seriousness?: string;
  fullTextAvailability?: string;
  fullTextSource?: string;
  keyEvents?: string[];
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    uploadedByName?: string;
  }>;
}

export default function NoCaseTriageManualPage() {
  const { formatDate } = useDateTime();
  const selectedOrganizationId = useSelector(
    (state: RootState) => state.filter.selectedOrganizationId,
  );

  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [search, setSearch] = useState("");

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
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `${getApiBaseUrl()}/studies/QA/no-case-triage-studies?limit=200${orgParam}${searchParam}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
      } else {
        throw new Error("Failed to fetch No Case Triage studies");
      }
    } catch (err) {
      setError("Failed to load No Case Triage queue");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (studyId: string) => {
    setActionInProgress(studyId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${getApiBaseUrl()}/studies/${studyId}/QA/no-case-triage/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comments }),
        },
      );
      if (response.ok) {
        setStudies((prev) => prev.filter((s) => s.id !== studyId));
        setSelectedStudy(null);
        setComments("");
        alert("Study approved and cleared to Reports.");
        fetchStudies();
      } else {
        throw new Error("Failed to approve study");
      }
    } catch (err) {
      alert("Failed to approve study. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (studyId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    setActionInProgress(studyId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${getApiBaseUrl()}/studies/${studyId}/QA/no-case-triage/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectionReason }),
        },
      );
      if (response.ok) {
        setStudies((prev) => prev.filter((s) => s.id !== studyId));
        setSelectedStudy(null);
        setRejectionReason("");
        setShowRejectModal(false);
        alert("Study rejected and returned to Triage for reclassification.");
        fetchStudies();
      } else {
        throw new Error("Failed to reject study");
      }
    } catch (err) {
      alert("Failed to reject study. Please try again.");
    } finally {
      setActionInProgress(null);
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
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              No Case Triage
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manual review of No Case studies that did not pass Secondary QC.
              Approve to clear to Reports, or reject to send back to Triage for
              reclassification.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <p className="text-3xl font-bold text-orange-600">
                {studies.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Pending Manual Review
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
                No Case Triage Queue ({filteredStudies.length})
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" />
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
                    ? "No matching studies."
                    : "No studies in No Case Triage."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredStudies.map((study) => (
                  <li
                    key={study.id}
                    className={`px-4 sm:px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedStudy?.id === study.id ? "bg-orange-50" : ""
                    }`}
                    onClick={() => setSelectedStudy(study)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <PmidLink pmid={study.pmid} />
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            No Case Triage
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(study.updatedAt)}
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
                        </div>
                      </div>
                      <svg
                        className="h-5 w-5 text-gray-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Study Details Modal */}
        {selectedStudy && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40 flex justify-center pt-10 pb-10">
            <div className="relative bg-white rounded-lg shadow-xl max-w-[95vw] w-full mx-4 flex flex-col max-h-[90vh]">
              {/* Modal header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-lg sticky top-0 z-10">
                <h3 className="text-lg font-semibold text-gray-900">
                  No Case Triage Review
                </h3>
                <button
                  onClick={() => {
                    setSelectedStudy(null);
                    setComments("");
                    setRejectionReason("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="px-4 sm:px-6 py-6 overflow-y-auto space-y-6">
                {/* Basic info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900">
                    Article Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Article ID</p>
                      <p className="text-sm font-mono text-gray-900">
                        {selectedStudy.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">PMID</p>
                      <PmidLink pmid={selectedStudy.pmid} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Classification</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                        No Case
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Drug Name</p>
                      <p className="text-sm text-gray-900">
                        {selectedStudy.drugName}
                      </p>
                    </div>
                    {selectedStudy.clientName && (
                      <div>
                        <p className="text-xs text-gray-500">Client</p>
                        <p className="text-sm text-gray-900">
                          {selectedStudy.clientName || selectedStudy.sponsor}
                        </p>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">Title</p>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedStudy.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Journal</p>
                      <p className="text-sm text-gray-900">
                        {selectedStudy.journal}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Publication Date</p>
                      <p className="text-sm text-gray-900">
                        {selectedStudy.publicationDate || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Abstract */}
                {(selectedStudy.aiInferenceData?.Abstract ||
                  selectedStudy.abstract) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Abstract
                    </h4>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {selectedStudy.aiInferenceData?.Abstract ||
                        selectedStudy.abstract}
                    </p>
                  </div>
                )}

                {/* AI Analysis */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    AI Analysis
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {(selectedStudy.Text_type || selectedStudy.textType) && (
                      <div>
                        <span className="font-bold text-gray-700">
                          Article Type:
                        </span>
                        <p className="mt-1 text-gray-900">
                          {selectedStudy.Text_type || selectedStudy.textType}
                        </p>
                      </div>
                    )}
                    {(selectedStudy.special_case ||
                      selectedStudy.specialCase) && (
                      <div>
                        <span className="font-bold text-gray-700">
                          Special Situation:
                        </span>
                        <p className="mt-1 text-gray-900">
                          {selectedStudy.special_case ||
                            selectedStudy.specialCase}
                        </p>
                      </div>
                    )}
                    {selectedStudy.substanceGroup && (
                      <div>
                        <span className="font-bold text-gray-700">INN:</span>
                        <p className="mt-1 text-gray-900">
                          {selectedStudy.substanceGroup}
                        </p>
                      </div>
                    )}
                    {selectedStudy.countryOfFirstAuthor && (
                      <div>
                        <span className="font-bold text-gray-700">
                          Country of First Author:
                        </span>
                        <p className="mt-1 text-gray-900">
                          {selectedStudy.countryOfFirstAuthor}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedStudy.attributability && (
                    <div className="mt-3">
                      <span className="font-bold text-gray-700">
                        Attributability:
                      </span>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudy.attributability}
                      </p>
                    </div>
                  )}
                  {selectedStudy.justification && (
                    <div className="mt-3">
                      <span className="font-bold text-gray-700">
                        AI Opinion:
                      </span>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudy.aiInferenceData?.justification ||
                          selectedStudy.aiInferenceData?.Justification ||
                          selectedStudy.justification}
                      </p>
                    </div>
                  )}
                  {selectedStudy.summary && (
                    <div className="mt-3">
                      <span className="font-bold text-gray-700">
                        AI Summary:
                      </span>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudy.summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* QC Comments from Secondary QC */}
                {selectedStudy.qaComments && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-1">
                      Secondary QC Notes
                    </h4>
                    <p className="text-sm text-yellow-900">
                      {selectedStudy.qaComments}
                    </p>
                  </div>
                )}

                {/* PDF Attachments */}
                <PDFAttachmentUpload
                  studyId={selectedStudy.id}
                  attachments={selectedStudy.attachments || []}
                  onUploadComplete={async () => {
                    try {
                      const token = localStorage.getItem("auth_token");
                      const res = await fetch(
                        `${getApiBaseUrl()}/studies/${selectedStudy.id}`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        },
                      );
                      if (res.ok) {
                        const updated = await res.json();
                        setSelectedStudy(updated);
                        fetchStudies();
                      }
                    } catch {
                      fetchStudies();
                    }
                  }}
                />

                {/* Comments */}
                <CommentThread study={selectedStudy} />

                {/* Decision */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">
                    No Case Triage Decision
                  </h4>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments (Optional)
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-green-500 focus:border-green-500"
                      placeholder="Add comments…"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedStudy.id)}
                      disabled={actionInProgress === selectedStudy.id}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {actionInProgress === selectedStudy.id ? (
                        <svg
                          className="animate-spin h-4 w-4"
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
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      Approve — Clear to Reports
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionInProgress === selectedStudy.id}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Reject — Return to Triage
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedStudy && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Reject — Return to Triage
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Provide a reason. The study will be returned to Triage for
                reclassification.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Enter rejection reason…"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleReject(selectedStudy.id)}
                  disabled={
                    !rejectionReason.trim() ||
                    actionInProgress === selectedStudy.id
                  }
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
