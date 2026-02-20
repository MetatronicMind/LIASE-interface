"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { setSidebarLocked } from "@/redux/slices/uiSlice";
import { getApiBaseUrl } from "@/config/api";
import { PmidLink } from "@/components/PmidLink";
import TriageStudyDetails from "@/components/TriageStudyDetails";
import { useDateTime } from "@/hooks/useDateTime";
import authService from "@/services/authService";
import { toast } from "react-hot-toast";

interface TrackTriagePageProps {
  trackType: "ICSR" | "AOI" | "NoCase";
  trackDisplayName: string;
  pageTitle?: string;
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

export default function TrackTriagePage({
  trackType,
  trackDisplayName,
  pageTitle,
}: TrackTriagePageProps) {
  const dispatch = useDispatch();
  const { formatDate } = useDateTime();
  const API_BASE = getApiBaseUrl();
  const getToken = () => authService.getToken();

  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const trackPermissionKey =
    trackType === "ICSR"
      ? "icsr_track"
      : trackType === "AOI"
        ? "aoi_track"
        : "no_case_track";
  // Guard: a track perm object with all-false values ({read:false,triage:false,assessment:false})
  // is truthy but grants no access. Only use it if at least one value is explicitly true.
  const rawTrackPerm = user?.permissions?.[trackPermissionKey];
  const hasExplicitTrackAccess =
    rawTrackPerm?.read === true ||
    rawTrackPerm?.triage === true ||
    rawTrackPerm?.assessment === true;
  const permissions = hasExplicitTrackAccess
    ? rawTrackPerm
    : user?.permissions?.triage || user?.permissions?.QA;

  const canView = permissions?.triage === true || permissions?.read === true;
  const canAllocate = permissions?.triage === true || permissions?.write === true;
  const canClassify =
    permissions?.triage === true ||
    permissions?.classify === true ||
    permissions?.write === true;

  // Allocation state
  const [allocatedCases, setAllocatedCases] = useState<Study[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAllocating, setIsAllocating] = useState(false);
  const [poolCount, setPoolCount] = useState<number | null>(null);

  // Fetch pool stats
  const fetchPoolStats = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/track/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const stats = data.data?.[trackType];
        if (stats) {
          // Use 'triage' count for Triage Page
          setPoolCount(stats.triage || 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch pool stats", err);
    }
  }, [trackType, API_BASE]);

  useEffect(() => {
    fetchPoolStats(); // Initial fetch

    // Add focus listener
    const handleFocus = () => {
      fetchPoolStats();
    };
    window.addEventListener("focus", handleFocus);

    const interval = setInterval(fetchPoolStats, 10000); // Poll every 10s
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchPoolStats]);

  // Ensure currentIndex is valid when allocatedCases changes
  useEffect(() => {
    if (allocatedCases.length > 0 && currentIndex >= allocatedCases.length) {
      setCurrentIndex(Math.max(0, allocatedCases.length - 1));
    }
  }, [allocatedCases.length, currentIndex]);

  // Derived state for current case
  const currentCase =
    allocatedCases.length > 0 ? allocatedCases[currentIndex] : null;

  // Scroll to top when current case changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentCase?.id]);

  // Classification state
  const [classifying, setClassifying] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<
    string | null
  >(null);
  const [justification, setJustification] = useState<string>("");
  const [listedness, setListedness] = useState<string>("");
  const [seriousness, setSeriousness] = useState<string>("");
  const [fullTextAvailability, setFullTextAvailability] = useState<string>("");
  const [fullTextSource, setFullTextSource] = useState<string>("");

  // Unlock sidebar on unmount
  useEffect(() => {
    return () => {
      dispatch(setSidebarLocked(false));
    };
  }, [dispatch]);

  // Ensure sidebar is unlocked when there are no allocated cases
  useEffect(() => {
    if (allocatedCases.length === 0) {
      dispatch(setSidebarLocked(false));
    }
  }, [allocatedCases.length, dispatch]);

  // Normalize API studies to ensure proper data types
  const normalizeApiStudies = (apiStudies: any[]): Study[] => {
    return apiStudies.map((study) => ({
      ...study,
      authors: Array.isArray(study.authors)
        ? study.authors
        : typeof study.authors === "string"
          ? [study.authors]
          : [],
      comments: Array.isArray(study.comments) ? study.comments : [],
    }));
  };

  const handleStartTriage = async () => {
    setIsAllocating(true);
    try {
      const token = getToken();

      // Call the track-specific allocation endpoint
      const response = await fetch(
        `${API_BASE}/track/${trackType}/allocate-batch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        const cases = normalizeApiStudies(data.cases || data.data || []);
        if (cases.length === 0) {
          toast.error(
            `No ${trackDisplayName} cases available for triage at this time.`,
            {
              duration: 4000,
              icon: "📭",
            },
          );
          dispatch(setSidebarLocked(false));
        } else {
          setAllocatedCases(cases);
          setCurrentIndex(0);
          dispatch(setSidebarLocked(true));
          // Optimistic: decrement pool count by allocated amount
          setPoolCount((prev) =>
            prev !== null ? Math.max(0, prev - cases.length) : prev,
          );
          toast.success(
            `Allocated ${cases.length} case(s) for ${trackDisplayName} triage`,
            {
              duration: 3000,
            },
          );
          // Re-fetch accurate count from server
          fetchPoolStats();
        }
      } else {
        toast.error(data.message || data.error || "Failed to allocate cases");
      }
    } catch (error) {
      console.error("Error allocating cases:", error);
      toast.error("Error allocating cases. Please try again.");
    } finally {
      setIsAllocating(false);
    }
  };

  const handleExitTriage = async () => {
    if (allocatedCases.length === 0) return;

    if (
      !confirm(
        "Are you sure you want to exit? All allocated cases will be released.",
      )
    ) {
      return;
    }

    try {
      const token = getToken();
      await fetch(`${API_BASE}/track/${trackType}/release-batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Optimistic: increment pool count by released amount
      const releasedCount = allocatedCases.length;
      setAllocatedCases([]);
      setCurrentIndex(0);
      dispatch(setSidebarLocked(false));
      resetClassificationState();
      setPoolCount((prev) =>
        prev !== null ? prev + releasedCount : releasedCount,
      );
      // Re-fetch accurate count from server
      fetchPoolStats();
    } catch (error) {
      console.error("Error releasing cases:", error);
    }
  };

  const resetClassificationState = () => {
    setSelectedClassification(null);
    setJustification("");
    setListedness("");
    setSeriousness("");
    setFullTextAvailability("");
    setFullTextSource("");
  };

  const handleNextCase = () => {
    if (currentIndex < allocatedCases.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetClassificationState();
    }
  };

  const handlePrevCase = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      resetClassificationState();
    }
  };

  // Classification function
  const classifyStudy = async (
    studyId: string,
    classification: string,
    details?: {
      justification?: string;
      listedness?: string;
      seriousness?: string;
      fullTextAvailability?: string;
      fullTextSource?: string;
    },
  ) => {
    try {
      setClassifying(studyId);
      const token = getToken();

      const body: any = {
        userTag: classification,
      };

      if (details) {
        if (details.justification) body.justification = details.justification;
        if (details.listedness) body.listedness = details.listedness;
        if (details.seriousness) body.seriousness = details.seriousness;
        if (details.fullTextAvailability)
          body.fullTextAvailability = details.fullTextAvailability;
        if (details.fullTextSource !== undefined)
          body.fullTextSource = details.fullTextSource;
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
        // Remove the classified study from the list
        setAllocatedCases((prev) =>
          prev.filter((study) => study.id !== studyId),
        );
        resetClassificationState();
        // Re-fetch pool count (classification changes pool composition)
        fetchPoolStats();
      } else {
        throw new Error("Failed to classify article");
      }
    } catch (error) {
      console.error("Error classifying article:", error);
      toast.error("Error classifying article. Please try again.");
    } finally {
      setClassifying(null);
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user && canView === false) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md border border-gray-200 max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600">
            You do not have permission to view the {trackDisplayName} Triage
            section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {pageTitle || `${trackDisplayName} Triage Assessment`}
          </h1>
          {allocatedCases.length > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Case {currentIndex + 1} of {allocatedCases.length}
            </span>
          )}
          {allocatedCases.length === 0 && poolCount !== null && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
              Case Pool: {poolCount}
            </span>
          )}
        </div>

        {allocatedCases.length > 0 && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevCase}
              disabled={currentIndex === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNextCase}
              disabled={currentIndex === allocatedCases.length - 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <button
              onClick={handleExitTriage}
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Exit Triage
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        {allocatedCases.length === 0 ? (
          /* START TRIAGE VIEW */
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-center max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MagnifyingGlassIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {pageTitle
                  ? `Start ${pageTitle}`
                  : `Start ${trackDisplayName} Triage`}
              </h2>

              {canAllocate ? (
                <button
                  onClick={handleStartTriage}
                  disabled={isAllocating}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  {isAllocating ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      Allocating Cases...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="w-6 h-6 mr-2" />
                      Allocate my cases
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-xl border border-red-200 shadow-sm max-w-md">
                  <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-2" />
                  <h3 className="text-red-800 font-bold text-lg mb-1">
                    Permission Denied
                  </h3>
                  <p className="text-red-700 text-sm">
                    You do not have permission to allocate cases.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ALLOCATED CASE VIEW - SPLIT PANE */
          currentCase && (
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              {/* LEFT PANE: Abstract & Details */}
              <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Article Details</h3>
                  <PmidLink pmid={currentCase.pmid} />
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {currentCase.title}
                  </h2>
                  <div className="text-sm text-gray-600 mb-4">
                    <span className="font-medium">
                      {Array.isArray(currentCase.authors)
                        ? currentCase.authors.join(", ")
                        : currentCase.authors}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{currentCase.journal}</span>
                    <span className="mx-2">•</span>
                    <span>{currentCase.publicationDate}</span>
                  </div>

                  <div className="prose max-w-none">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                      Abstract
                    </h4>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
                      {currentCase.abstract}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT PANE: Full Details & Classification */}
              <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <TriageStudyDetails
                  study={currentCase as any}
                  onUpdate={(updated: any) =>
                    setAllocatedCases((prev) =>
                      prev.map((s) =>
                        s.id === updated.id ? { ...s, ...updated } : s,
                      ),
                    )
                  }
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
                  fetchStudies={() => {}} // No-op since we don't fetch list anymore
                  canClassify={canClassify}
                  ignorePreExistingClassification={true}
                />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
