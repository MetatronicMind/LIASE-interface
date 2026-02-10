"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";
import { PmidLink } from "@/components/PmidLink";
import { CommentThread } from "@/components/CommentThread";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  drugName: string;
  adverseEvent: string;
  userTag: "ICSR" | "AOI" | "No Case";
  abstract?: string;
  createdAt: string;
  updatedAt: string;

  // AI Inference Data
  aiInferenceData?: any;
  doi?: string;
  specialCase?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  patientDetails?: any;
  keyEvents?: string[];
  relevantDates?: any;
  administeredDrugs?: string[];
  attributability?: string;
  drugEffect?: string;
  summary?: string;
  identifiableHumanSubject?: boolean;
  textType?: string;
  leadAuthor?: string;
  vancouverCitation?: string;
  serious?: boolean;
  confirmedPotentialICSR?: boolean;
  icsrClassification?: string;
  aoiClassification?: string;
  substanceGroup?: string;
  authorPerspective?: string;
  testSubject?: string;
  aoiDrugEffect?: string;
  approvedIndication?: string;
  justification?: string;
  sponsor?: string;
  clientName?: string;
  effectiveClassification?: string;
  requiresManualReview?: boolean;

  // AOI Assessment fields
  listedness?: string;
  seriousness?: string;
  fullTextAvailability?: string;
  fullTextSource?: string;
  aoiComments?: string;

  // Legacy fields
  Drugname?: string;
  Serious?: string;
  special_case?: string;
  ICSR_classification?: string;
  Text_type?: string;
}

export default function AOIAssessmentPage() {
  const { user } = useAuth();
  const selectedOrganizationId = useSelector(
    (state: RootState) => state.filter.selectedOrganizationId,
  );
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [listedness, setListedness] = useState<"Yes" | "No" | "">("");
  const [seriousness, setSeriousness] = useState<"Yes" | "No" | "">("");
  const [comments, setComments] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter state
  // search is already defined above
  const [clientNameFilter, setClientNameFilter] = useState("");
  const [classificationType, setClassificationType] = useState("");
  const [journalNameFilter, setJournalNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Helper function to normalize classification values from backend
  const normalizeClassification = (value?: string): string | undefined => {
    if (!value) return value;
    let normalized = value.replace(/^Classification:\s*/i, "").trim();
    normalized = normalized.replace(/^\d+\.\s*/, "").trim();
    return normalized;
  };

  // Function to calculate final classification based on AI inference data
  const getFinalClassification = (study: Study): string | null => {
    const rawIcsrClassification =
      study.aiInferenceData?.ICSR_classification || study.icsrClassification;
    return normalizeClassification(rawIcsrClassification) || null;
  };

  useEffect(() => {
    fetchAOIStudies();
  }, [selectedOrganizationId]);

  const fetchAOIStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const queryParams = selectedOrganizationId
        ? `&organizationId=${selectedOrganizationId}`
        : "";
      const response = await fetch(
        `${getApiBaseUrl()}/studies?limit=1000${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        // Handle different possible response structures
        const studiesData =
          data.studies || data.data || (Array.isArray(data) ? data : []);
        // Filter for AOI cases only and exclude completed assessments
        const aoiStudies = studiesData.filter(
          (study: Study) =>
            study.userTag === "AOI" &&
            (!study.listedness || !study.seriousness),
        );
        setStudies(aoiStudies);
      } else {
        throw new Error("Failed to fetch AOI articles");
      }
    } catch (error) {
      console.error("Error fetching AOI articles:", error);
      setError("Failed to load AOI articles");
    } finally {
      setLoading(false);
    }
  };

  const handleStudySelect = (study: Study) => {
    setSelectedStudy(study);
    setListedness(study.listedness || "");
    setSeriousness(study.seriousness || "");
    setComments(study.aoiComments || "");
    setShowDetails(!!(study.listedness || study.seriousness));
  };

  const handleSaveAssessment = async () => {
    if (showDetails && (!listedness || !seriousness)) {
      alert(
        "Please select both Listedness and Seriousness values when adding detailed assessment",
      );
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const body: any = {
        comments,
      };

      if (showDetails) {
        body.listedness = listedness;
        body.seriousness = seriousness;
      }

      const response = await fetch(
        `${getApiBaseUrl()}/studies/${selectedStudy!.id}/aoi-assessment`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (response.ok) {
        alert("AOI Assessment saved successfully!");
        // Update local state
        setStudies((prev) =>
          prev.map((s) =>
            s.id === selectedStudy!.id
              ? {
                  ...s,
                  listedness: showDetails ? (listedness as "Yes" | "No") : null,
                  seriousness: showDetails
                    ? (seriousness as "Yes" | "No")
                    : null,
                  aoiComments: comments,
                }
              : s,
          ),
        );
        setSelectedStudy(null);
        setListedness("");
        setSeriousness("");
        setComments("");
        setShowDetails(false);
        fetchAOIStudies();
      } else {
        throw new Error("Failed to save AOI assessment");
      }
    } catch (error) {
      console.error("Error saving AOI assessment:", error);
      alert("Failed to save AOI assessment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudies = studies.filter((study) => {
    const matchesSearch =
      search === "" ||
      study.title.toLowerCase().includes(search.toLowerCase()) ||
      study.pmid?.includes(search) ||
      study.drugName?.toLowerCase().includes(search.toLowerCase()) ||
      study.adverseEvent?.toLowerCase().includes(search.toLowerCase());

    const matchesClient =
      clientNameFilter === "" ||
      study.clientName?.toLowerCase().includes(clientNameFilter.toLowerCase());

    const matchesClassification =
      classificationType === "" ||
      getFinalClassification(study) === classificationType;

    const matchesJournal =
      journalNameFilter === "" ||
      study.journal?.toLowerCase().includes(journalNameFilter.toLowerCase());

    const matchesDateFrom =
      dateFrom === "" ||
      new Date(study.createdAt).getTime() >= new Date(dateFrom).getTime();

    const matchesDateTo =
      dateTo === "" ||
      new Date(study.createdAt).getTime() <= new Date(dateTo).getTime();

    return (
      matchesSearch &&
      matchesClient &&
      matchesClassification &&
      matchesJournal &&
      matchesDateFrom &&
      matchesDateTo
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AOI articles...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate resource="studies" action="read">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <h1 className="text-2xl sm:text-3xl font-bold">AOI Assessment</h1>
            <p className="mt-2 text-purple-100 text-sm sm:text-base">
              Assess Listedness and Seriousness for AOI cases
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                />
              </svg>
              Filter Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label
                  htmlFor="search"
                  className="block text-sm font-medium text-gray-700"
                >
                  Search
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="search"
                    id="search"
                    className="w-full pl-10 pr-4 py-3 border border-purple-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-colors text-gray-900"
                    placeholder="Search title, drug, PMID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Client Name Filter */}
              <div className="space-y-2">
                <label
                  htmlFor="client"
                  className="block text-sm font-medium text-gray-700"
                >
                  Client Name
                </label>
                <input
                  type="text"
                  name="client"
                  id="client"
                  className="w-full px-4 py-3 border border-purple-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-colors text-gray-900"
                  placeholder="Filter by client..."
                  value={clientNameFilter}
                  onChange={(e) => setClientNameFilter(e.target.value)}
                />
              </div>

              {/* Classification Filter */}
              <div className="space-y-2">
                <label
                  htmlFor="classification"
                  className="block text-sm font-medium text-gray-700"
                >
                  AI Classification
                </label>
                <select
                  id="classification"
                  name="classification"
                  className="w-full px-4 py-3 border border-purple-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-colors text-gray-900"
                  value={classificationType}
                  onChange={(e) => setClassificationType(e.target.value)}
                >
                  <option value="">All Classifications</option>
                  <option value="Probable ICSR">Probable ICSR</option>
                  <option value="Probable AOI">Probable AOI</option>
                  <option value="Probable ICSR/AOI">Probable ICSR/AOI</option>
                  <option value="No Case">No Case</option>
                  <option value="Manual Review">Manual Review</option>
                </select>
              </div>

              {/* Journal Name Filter */}
              <div className="space-y-2">
                <label
                  htmlFor="journal"
                  className="block text-sm font-medium text-gray-700"
                >
                  Journal Name
                </label>
                <input
                  type="text"
                  name="journal"
                  id="journal"
                  className="w-full px-4 py-3 border border-purple-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-colors text-gray-900"
                  placeholder="Filter by journal..."
                  value={journalNameFilter}
                  onChange={(e) => setJournalNameFilter(e.target.value)}
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label
                  htmlFor="date-from"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date From
                </label>
                <input
                  type="date"
                  name="date-from"
                  id="date-from"
                  className="w-full px-4 py-3 border border-purple-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-colors text-gray-900"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="date-to"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date To
                </label>
                <input
                  type="date"
                  name="date-to"
                  id="date-to"
                  className="w-full px-4 py-3 border border-purple-400 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-colors text-gray-900"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Studies List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                AOI Cases ({filteredStudies.length})
              </h2>
            </div>

            {filteredStudies.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No articles found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {studies.length === 0
                    ? "No articles classified as AOI are available for assessment."
                    : "Try adjusting your search terms."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredStudies.map((study) => (
                  <li
                    key={study.id}
                    onClick={() => handleStudySelect(study)}
                    className="px-4 sm:px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            ID: {study.id}
                          </span>
                          <PmidLink pmid={study.pmid} />
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                            AOI
                          </span>
                          {study.listedness && study.seriousness && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                              ✓ Assessed
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {study.title}
                        </p>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-4">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Drug:</span>{" "}
                            {study.drugName}
                          </p>
                          {/* <p className="text-xs text-gray-500">
                            <span className="font-medium">Adverse Event:</span> {study.adverseEvent}
                          </p> */}
                          {study.listedness && (
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Listedness:</span>{" "}
                              {study.listedness}
                            </p>
                          )}
                          {study.seriousness && (
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Seriousness:</span>{" "}
                              {study.seriousness}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <svg
                          className="h-5 w-5 text-gray-400"
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Study Details Modal */}
          {selectedStudy && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4"
              onClick={() => setSelectedStudy(null)}
            >
              <div
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900">
                    AOI Assessment
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedStudy(null);
                      setListedness("");
                      setSeriousness("");
                    }}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
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

                <div className="px-6 py-4 overflow-y-auto flex-1">
                  <div className="space-y-4">
                    {/* Study Information */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">
                        Article Details
                      </h4>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Article ID</p>
                          <p className="text-sm text-gray-900 font-mono">
                            {selectedStudy.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">PMID</p>
                          <PmidLink pmid={selectedStudy.pmid} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Classification
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                            AOI
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs text-gray-500">Title</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedStudy.title}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Drug Name</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedStudy.drugName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Adverse Event</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedStudy.adverseEvent}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Abstract */}
                    {(selectedStudy.aiInferenceData?.Abstract ||
                      selectedStudy.abstract) && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">
                          Abstract
                        </h4>
                        <div className="bg-gray-50 rounded-md p-3 text-sm">
                          <p className="text-gray-900 leading-relaxed">
                            {selectedStudy.aiInferenceData?.Abstract ||
                              selectedStudy.abstract}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* AI Literature Analysis */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        AI Literature Analysis
                      </h4>
                      <div className="space-y-4">
                        {/* Grid Layout for Analysis Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-bold text-gray-700">
                              AI Identified Adverse Event(s):
                            </span>
                            <p className="mt-1 text-gray-900">
                              {selectedStudy.adverseEvent}
                            </p>
                          </div>
                          {(selectedStudy.specialCase ||
                            selectedStudy.aiInferenceData?.special_case) && (
                            <div>
                              <span className="font-bold text-gray-700">
                                AI Identified Special Situation(s):
                              </span>
                              <p className="mt-1 text-gray-900">
                                {selectedStudy.specialCase ||
                                  selectedStudy.aiInferenceData?.special_case}
                              </p>
                            </div>
                          )}
                          {(selectedStudy.textType ||
                            selectedStudy.aiInferenceData?.Text_type) && (
                            <div>
                              <span className="font-bold text-gray-700">
                                Article Type:
                              </span>
                              <p className="mt-1 text-gray-900">
                                {selectedStudy.textType ||
                                  selectedStudy.aiInferenceData?.Text_type}
                              </p>
                            </div>
                          )}
                          {selectedStudy.approvedIndication && (
                            <div>
                              <span className="font-bold text-gray-700">
                                AI Assessment of Indication:
                              </span>
                              <p className="mt-1 text-gray-900">
                                {selectedStudy.approvedIndication}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Text-based Fields */}
                        {selectedStudy.attributability && (
                          <div>
                            <span className="font-bold text-gray-700">
                              AI Assessment of Attributability:
                            </span>
                            <p className="mt-1 text-gray-900 text-sm">
                              {selectedStudy.attributability}
                            </p>
                          </div>
                        )}
                        {selectedStudy.drugEffect && (
                          <div>
                            <span className="font-bold text-gray-700">
                              AI Identified Drug Effect (Beneficial/Adverse):
                            </span>
                            <p className="mt-1 text-gray-900 text-sm">
                              {selectedStudy.drugEffect}
                            </p>
                          </div>
                        )}
                        {selectedStudy.justification && (
                          <div>
                            <span className="font-bold text-gray-700">
                              AI Opinion on Literature:
                            </span>
                            <p className="mt-1 text-gray-900 text-sm">
                              {selectedStudy.justification}
                            </p>
                          </div>
                        )}

                        {/* Clinical Data */}
                        {selectedStudy.administeredDrugs &&
                          Array.isArray(selectedStudy.administeredDrugs) &&
                          selectedStudy.administeredDrugs.length > 0 && (
                            <div>
                              <span className="font-bold text-gray-700">
                                Administered Drugs:
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {selectedStudy.administeredDrugs.map(
                                  (drug, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                                    >
                                      {drug}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        {selectedStudy.patientDetails && (
                          <div>
                            <span className="font-bold text-gray-700">
                              Patient Details:
                            </span>
                            <div className="mt-1 bg-white rounded p-3 border">
                              {typeof selectedStudy.patientDetails ===
                              "object" ? (
                                <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                                  {JSON.stringify(
                                    selectedStudy.patientDetails,
                                    null,
                                    2,
                                  )}
                                </pre>
                              ) : (
                                <p className="text-gray-900 text-sm">
                                  {selectedStudy.patientDetails}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {selectedStudy.relevantDates && (
                          <div>
                            <span className="font-bold text-gray-700">
                              Relevant Dates:
                            </span>
                            <div className="mt-1 bg-white rounded p-3 border">
                              {typeof selectedStudy.relevantDates ===
                              "object" ? (
                                <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                                  {JSON.stringify(
                                    selectedStudy.relevantDates,
                                    null,
                                    2,
                                  )}
                                </pre>
                              ) : (
                                <p className="text-gray-900 text-sm">
                                  {selectedStudy.relevantDates}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Triage Classification */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Triage Classification
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            Classification
                          </span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                selectedStudy.userTag === "ICSR"
                                  ? "bg-red-100 text-red-800"
                                  : selectedStudy.userTag === "AOI"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {selectedStudy.userTag}
                            </span>

                            {selectedStudy.listedness && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {selectedStudy.listedness}
                              </span>
                            )}

                            {selectedStudy.seriousness && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                {selectedStudy.seriousness}
                              </span>
                            )}

                            {selectedStudy.fullTextAvailability && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                Full Text: {selectedStudy.fullTextAvailability}
                              </span>
                            )}
                          </div>
                        </div>

                        {selectedStudy.fullTextSource && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">
                              Full Text Source
                            </span>
                            <p className="mt-1 text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded border border-gray-200">
                              {selectedStudy.fullTextSource}
                            </p>
                          </div>
                        )}

                        {selectedStudy.justification && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">
                              AI Opinion on Literature
                            </span>
                            <p className="mt-1 text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded border border-gray-200">
                              {selectedStudy.justification}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Comment Thread */}
                    <div className="mb-6">
                      <CommentThread study={selectedStudy} />
                    </div>

                    {/* AOI Assessment Form */}
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-semibold text-gray-900 mb-4">
                        Assessment
                      </h4>

                      <div className="mb-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showDetails}
                            onChange={(e) => setShowDetails(e.target.checked)}
                            className="form-checkbox h-4 w-4 text-orange-600 transition duration-150 ease-in-out"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Add detailed assessment (Listedness/Seriousness)
                          </span>
                        </label>
                      </div>

                      {showDetails && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 animate-fadeIn">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Listedness <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={listedness}
                              onChange={(e) =>
                                setListedness(
                                  e.target.value as "Yes" | "No" | "",
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                            >
                              <option value="">Select...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Seriousness{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={seriousness}
                              onChange={(e) =>
                                setSeriousness(
                                  e.target.value as "Yes" | "No" | "",
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                            >
                              <option value="">Select...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comments (Optional)
                        </label>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                          placeholder="Add any additional comments here..."
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveAssessment}
                        disabled={
                          (showDetails && (!listedness || !seriousness)) ||
                          saving
                        }
                        className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center"
                      >
                        {saving ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
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
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 mr-2"
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
                            Save Assessment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
