"use client";
import React, { useState, useEffect, useCallback } from "react";
import authService from "@/services/authService";
import { useDispatch } from "react-redux";
import { setSidebarLocked } from "@/redux/slices/uiSlice";
import { PmidLink } from "@/components/PmidLink";
import TriageStudyDetails from "@/components/TriageStudyDetails";
import { useDateTime } from "@/hooks/useDateTime";
import { getApiBaseUrl } from "@/config/api";
import { toast } from "react-hot-toast";

interface TrackAllocationPageProps {
  trackType: "ICSR" | "AOI" | "NoCase";
  trackDisplayName: string;
}

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string[] | string;
  journal: string;
  publicationDate: string;
  abstract: string;
  drugName?: string;
  adverseEvent?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  userTag?: "ICSR" | "AOI" | "No Case" | null;
  workflowTrack?: string;
  subStatus?: string;
  effectiveClassification?: string;
  comments?: any[];
  aiInferenceData?: any;
  Text_type?: string;
  textType?: string;
  icsrClassification?: string;
  ICSR_classification?: string;
  aoiClassification?: string;
  attachments?: any[];
  qaApprovalStatus?: "pending" | "approved" | "rejected";
  qaComments?: string;
}

export default function TrackAllocationPage({
  trackType,
  trackDisplayName,
}: TrackAllocationPageProps) {
  const dispatch = useDispatch();
  const { formatDate } = useDateTime();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocationPercentage, setAllocationPercentage] = useState(10);
  const [configuredPercentage, setConfiguredPercentage] = useState(10);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 25;

  // Selected study for detail view
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [loadingStudy, setLoadingStudy] = useState(false);

  // Classification state (reused from TrackTriage for the sidebar)
  const [classifying, setClassifying] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<
    string | null
  >(null);
  const [justification, setJustification] = useState<string>("");
  const [listedness, setListedness] = useState<string>("");
  const [seriousness, setSeriousness] = useState<string>("");
  const [fullTextAvailability, setFullTextAvailability] = useState<string>("");
  const [fullTextSource, setFullTextSource] = useState<string>("");

  const getToken = () => authService.getToken();
  const API_BASE = getApiBaseUrl();

  const fetchStudies = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/track/${trackType}/allocation?page=${page}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setStudies(data.data || []);
        setTotalItems(data.pagination?.total || 0);
        if (data.allocationPercentage !== undefined) {
          setConfiguredPercentage(data.allocationPercentage);
          setAllocationPercentage(data.allocationPercentage);
        }
      } else {
        setError(data.error || "Failed to fetch studies");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch studies");
    } finally {
      setLoading(false);
    }
  }, [trackType, page]);

  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  // Lock sidebar when detail view is open
  useEffect(() => {
    dispatch(setSidebarLocked(!!selectedStudy));
    return () => {
      dispatch(setSidebarLocked(false)); // Ensure unlocked on unmount
    };
  }, [selectedStudy, dispatch]);

  const handleFetchStudyDetails = async (studyId: string) => {
    setLoadingStudy(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/studies/${studyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Ensure authors is an array
        const study = data.data;
        if (
          !Array.isArray(study.authors) &&
          typeof study.authors === "string"
        ) {
          study.authors = [study.authors];
        }
        setSelectedStudy(study);

        // We do NOT auto-select the classification here.
        // This allows TriageStudyDetails to show the "Article classified as: ..." summary view
        // with the chips for Justification, Listedness, etc. populated from the study data.
      } else {
        toast.error("Failed to load study details");
      }
    } catch (error) {
      console.error("Error fetching study details:", error);
      toast.error("Error loading study details");
    } finally {
      setLoadingStudy(false);
    }
  };

  const handleBackToList = () => {
    setSelectedStudy(null);
    setSelectedClassification(null);
    setJustification("");
    setListedness("");
    setSeriousness("");
    setFullTextAvailability("");
    setFullTextSource("");
  };

  const handleProcessAllocation = async () => {
    const token = getToken();
    if (!token) return;

    const confirmation = window.confirm(
      `Process allocation for ${totalItems} studies?\n\n` +
        `${allocationPercentage}% will be retained for manual assessment.\n` +
        `${100 - allocationPercentage}% will be auto-passed.\n\n` +
        `This action cannot be undone.`,
    );

    if (!confirmation) return;

    setProcessing(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/track/${trackType}/allocate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ retainPercentage: allocationPercentage }),
        },
      );

      const data = await response.json();

      if (data.success) {
        alert(
          `Allocation complete!\n\n` +
            `${data.results.retained} studies retained for assessment\n` +
            `${data.results.autoPassed} studies auto-passed`,
        );
        fetchStudies();
      } else {
        alert(data.error || "Failed to process allocation");
      }
    } catch (err: any) {
      alert(err.message || "Failed to process allocation");
    } finally {
      setProcessing(false);
    }
  };

  // Helper functions for classification display
  const normalizeClassification = (value?: string): string | undefined => {
    if (!value) return value;
    let normalized = value.replace(/^Classification:\s*/i, "").trim();
    normalized = normalized.replace(/^\d+\.\s*/, "").trim();
    return normalized;
  };

  const getFinalClassification = (study: Study): string | null => {
    const rawIcsrClassification =
      study.aiInferenceData?.ICSR_classification ||
      study.ICSR_classification ||
      study.icsrClassification;

    const normalized = normalizeClassification(rawIcsrClassification);

    if (normalized === "Article requires manual review") {
      return "Manual Review";
    }

    return normalized || null;
  };

  const getClassificationLabel = (study: Study) => {
    if (study.userTag === "No Case") {
      const textType = study.Text_type || study.textType;
      if (textType === "Animal Study" || textType === "In Vitro") {
        return textType;
      }
      return "No Case";
    }
    return study.userTag;
  };

  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case "ICSR":
        return "bg-red-100 text-red-800 border-red-200";
      case "AOI":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "No Case":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "Manual Review":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  // Placeholder for classification in allocation View (maybe update classification?)
  const classifyStudy = async (
    studyId: string,
    classification: string,
    details?: any,
  ) => {
    // Implementation similar to Triage if we allow re-classification
    // For now, let's assume it's view-only or just updates local state
    // If the user wants to actually CHANGE it, we should implement the PUT request
    try {
      setClassifying(studyId);
      const token = getToken();
      const body: any = { userTag: classification };
      if (details) {
        Object.assign(body, details);
      }

      const response = await fetch(`${API_BASE}/studies/${studyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success("Study updated successfully");
        // Update local study state
        setSelectedStudy((prev) =>
          prev ? { ...prev, userTag: classification as any } : null,
        );
      } else {
        toast.error("Failed to update study");
      }
    } catch (error) {
      toast.error("Error updating study");
    } finally {
      setClassifying(null);
    }
  };

  const retainedCount = Math.ceil(totalItems * (allocationPercentage / 100));
  const autoPassedCount = totalItems - retainedCount;
  const totalPages = Math.ceil(totalItems / limit);

  if (loadingStudy) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // DETAIL VIEW
  if (selectedStudy) {
    return (
      <div className="h-full flex flex-col bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {trackDisplayName} Allocation Assessment
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Exit Allocation
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* LEFT PANE: Abstract & Details */}
            <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Article Details</h3>
                <PmidLink pmid={selectedStudy.pmid} />
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedStudy.title}
                </h2>
                <div className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">
                    {Array.isArray(selectedStudy.authors)
                      ? selectedStudy.authors.join(", ")
                      : selectedStudy.authors}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{selectedStudy.journal}</span>
                  <span className="mx-2">•</span>
                  <span>{selectedStudy.publicationDate}</span>
                </div>

                <div className="prose max-w-none">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                    Abstract
                  </h4>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
                    {selectedStudy.abstract}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT PANE: Full Details & Classification */}
            <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <TriageStudyDetails
                study={selectedStudy as any}
                onUpdate={(updated: any) => {
                  setSelectedStudy((prev) =>
                    prev ? { ...prev, ...updated } : prev,
                  );
                  setStudies((prev) =>
                    prev.map((s) =>
                      s.id === updated.id ? { ...s, ...updated } : s,
                    ),
                  );
                }}
                classifyStudy={classifyStudy}
                selectedClassification={selectedClassification}
                setSelectedClassification={setSelectedClassification}
                justification={justification}
                setJustification={setJustification}
                listedness={listedness}
                setListedness={setListedness}
                seriousness={seriousness}
                setSeriousness={setSeriousness}
                fullTextAvailability={fullTextAvailability}
                setFullTextAvailability={setFullTextAvailability}
                fullTextSource={fullTextSource}
                setFullTextSource={setFullTextSource}
                classifying={classifying}
                getClassificationLabel={getClassificationLabel}
                getClassificationColor={getClassificationColor}
                getFinalClassification={getFinalClassification}
                formatDate={formatDate}
                API_BASE={API_BASE}
                fetchStudies={() => {}}
                canClassify={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {trackDisplayName} Allocation
        </h1>
        <p className="text-gray-600 mt-1">
          Manage allocation percentages for {trackDisplayName} studies
        </p>
      </div>

      {/* Allocation Control Panel */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Allocation Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Percentage Slider */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retain Percentage for Manual Assessment
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={allocationPercentage}
                onChange={(e) =>
                  setAllocationPercentage(Number(e.target.value))
                }
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={allocationPercentage}
                onChange={(e) =>
                  setAllocationPercentage(
                    Math.min(100, Math.max(0, Number(e.target.value))),
                  )
                }
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
              />
              <span className="text-gray-500">%</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Configured default: {configuredPercentage}%
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Studies:</span>
                <span className="font-semibold">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Retained:</span>
                <span className="font-semibold text-green-600">
                  {retainedCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">Auto-Passed:</span>
                <span className="font-semibold text-blue-600">
                  {autoPassedCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Process Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleProcessAllocation}
            disabled={processing || totalItems === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              "Process Allocation"
            )}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Studies Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Studies Pending Allocation
            </h2>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PMID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studies.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No studies pending allocation in {trackDisplayName} track
                  </td>
                </tr>
              ) : (
                studies.map((study) => (
                  <tr
                    key={study.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleFetchStudyDetails(study.id)}
                  >
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {study.pmid}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      <span className="font-medium hover:text-blue-600">
                        {study.title}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {study.drugName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${
                          study.effectiveClassification === "ICSR"
                            ? "bg-red-100 text-red-800"
                            : study.effectiveClassification === "AOI"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {study.effectiveClassification ||
                          study.userTag ||
                          "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(study.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFetchStudyDetails(study.id);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalItems)} of {totalItems} studies
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
