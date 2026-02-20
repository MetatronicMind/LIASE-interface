"use client";
import React, { useState, useEffect, useCallback } from "react";
import authService from "@/services/authService";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setSidebarLocked } from "@/redux/slices/uiSlice";
import { toast } from "react-hot-toast";
import {
  PencilSquareIcon,
  UserIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { PmidLink } from "@/components/PmidLink";
import TriageStudyDetails from "@/components/TriageStudyDetails";
import { useDateTime } from "@/hooks/useDateTime";
import { getApiBaseUrl } from "@/config/api";

interface TrackAssessmentPageProps {
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
  sourceTrack?: string;
  crossAllocationComment?: string | null;
  crossAllocatedFrom?: string | null;
}

// Destination options removed in favor of dynamic AssessmentAction UI

export default function TrackAssessmentPage({
  trackType,
  trackDisplayName,
}: TrackAssessmentPageProps) {
  const dispatch = useDispatch();
  const { formatDate } = useDateTime();
  const { user } = useSelector((state: RootState) => state.auth);
  const trackPermissionKey =
    trackType === "ICSR"
      ? "icsr_track"
      : trackType === "AOI"
      ? "aoi_track"
      : "no_case_track";
  const canViewAssessment =
    user?.permissions?.[trackPermissionKey]?.assessment ??
    user?.permissions?.QC?.read ??
    user?.permissions?.QA?.read;
  const [allocatedCases, setAllocatedCases] = useState<Study[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAllocating, setIsAllocating] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [routingStudyId, setRoutingStudyId] = useState<string | null>(null);
  const [poolCount, setPoolCount] = useState<number | null>(null);
  const [secondaryQcCount, setSecondaryQcCount] = useState<number | null>(null);
  const [processingQC, setProcessingQC] = useState(false);

  // Reroute modal state
  const [rerouteModal, setRerouteModal] = useState<{
    targetTrack: string;
    destination: string;
  } | null>(null);
  const [rerouteComment, setRerouteComment] = useState("");

  // Classification state (needed for TriageStudyDetails compatibility)
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

  // Fetch currently allocated cases on mount and focus
  const fetchAllocatedCases = useCallback(async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(
        `${getApiBaseUrl()}/track/${trackType}/my-allocated`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAllocatedCases(data.data);
        }
      }
    } catch (err) {
      console.error("Error fetching allocated cases:", err);
    }
  }, [trackType]);

  useEffect(() => {
    fetchAllocatedCases();

    // Add focus listener to refetch when tab becomes active
    const handleFocus = () => {
      fetchAllocatedCases();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchAllocatedCases]);

  // Fetch Secondary QC count for No Case track
  const fetchSecondaryQcCount = useCallback(async () => {
    if (trackType !== "NoCase") return;
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(
        `${API_BASE}/studies/QA/no-case-secondary-pending?limit=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setSecondaryQcCount(data.pagination?.total ?? 0);
      }
    } catch (err) {
      console.error("Failed to fetch secondary QC count", err);
    }
  }, [trackType, API_BASE]);

  const handleProcessQC = async () => {
    if (
      !confirm(
        `Process Secondary QC?\n\nA configured percentage will be returned to No Case QC for further review. The remainder will be cleared directly to Reports.`,
      )
    )
      return;
    setProcessingQC(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE}/studies/QA/process-no-case-secondary`,
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
        toast.success(data.message || "Secondary QC processed successfully.");
        fetchSecondaryQcCount();
      } else {
        toast.error(data.error || "Failed to process Secondary QC.");
      }
    } catch (err) {
      toast.error("Error processing Secondary QC.");
    } finally {
      setProcessingQC(false);
    }
  };

  // Fetch pool stats - extracted as useCallback so action handlers can call it
  const fetchPoolStats = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${API_BASE}/track/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const stats = data.data?.[trackType];
        if (stats) {
          // Use 'assessment' count for Assessment Page
          setPoolCount(stats.assessment || 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch pool stats", err);
    }
  }, [trackType, API_BASE]);

  // Poll pool stats and refetch on focus
  useEffect(() => {
    fetchPoolStats(); // Initial fetch
    fetchSecondaryQcCount();
    const handleFocus = () => {
      fetchPoolStats();
      fetchSecondaryQcCount();
    };
    window.addEventListener("focus", handleFocus);

    const interval = setInterval(() => {
      fetchPoolStats();
      fetchSecondaryQcCount();
    }, 10000); // Poll every 10s
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchPoolStats, fetchSecondaryQcCount]);

  const currentCase =
    allocatedCases.length > 0 ? allocatedCases[currentIndex] : null;

  // Scroll to top when current case changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentCase?.id]);

  // Pre-populate logic removed to show the Summary View (already classified) by default in Assessment
  // instead of opening the edit form immediately.

  // Unlock sidebar on unmount
  useEffect(() => {
    return () => {
      dispatch(setSidebarLocked(false));
    };
  }, [dispatch]);

  // Ensure sidebar is unlocked when there are no allocated cases or assessment not started
  useEffect(() => {
    if (allocatedCases.length === 0 || !assessmentStarted) {
      dispatch(setSidebarLocked(false));
    } else {
      dispatch(setSidebarLocked(true));
    }
  }, [allocatedCases.length, assessmentStarted, dispatch]);

  const handleStartAssessment = async () => {
    setIsAllocating(true);
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/track/${trackType}/allocate-assessment-batch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ batchSize: 10 }),
        },
      );

      const data = await response.json();

      if (data.success) {
        // TriageStudyDetails expects 'authors' to be string or array
        // We'll trust the API or normalize if needed in the logic below
        const cases = data.cases || [];
        if (cases.length === 0) {
          toast.error(`No ${trackDisplayName} cases available for assessment.`);
        } else {
          setAllocatedCases(cases);
          setCurrentIndex(0);
          setAssessmentStarted(true); // Start assessment view
          // Optimistic: decrement pool count by allocated amount
          setPoolCount((prev) =>
            prev !== null ? Math.max(0, prev - cases.length) : prev,
          );
          toast.success(`Allocated ${cases.length} case(s) for assessment`);
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

  const handleExitAssessment = async () => {
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
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/track/${trackType}/release-assessment-batch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      // Optimistic: increment pool count by released amount
      const releasedCount = allocatedCases.length;
      setAllocatedCases([]);
      setCurrentIndex(0);
      setAssessmentStarted(false);
      setPoolCount((prev) =>
        prev !== null ? prev + releasedCount : releasedCount,
      );
      // Re-fetch accurate count from server
      fetchPoolStats();
    } catch (error) {
      console.error("Error releasing cases:", error);
      toast.error("Error releasing cases");
    }
  };

  const handleNextCase = () => {
    if (currentIndex < allocatedCases.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevCase = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleAssessmentDecision = async (
    actionType: "approve" | "reroute" | "reject",
    targetTrack?: string,
    destinationEndpoint?: string,
    crossAllocationComment?: string,
  ) => {
    const token = getToken();
    if (!token || !currentCase) return;

    let confirmMessage = "";
    if (actionType === "approve") {
      confirmMessage = `Approve this case and route to ${destinationEndpoint?.replace("_", " ")}?`;
    } else if (actionType === "reroute") {
      confirmMessage = `Re-classify as ${targetTrack} and route to ${destinationEndpoint?.replace("_", " ")}?`;
    } else if (actionType === "reject") {
      confirmMessage = `Reject this case and return to ${destinationEndpoint?.replace("_", " ")}?`;
    }

    const confirmation = window.confirm(confirmMessage);
    if (!confirmation) return;

    setRoutingStudyId(currentCase.id);

    try {
      // Step 1: Update Classification (if rerouting)
      if (actionType === "reroute" && targetTrack) {
        // Map targetTrack to userTag format
        const userTag = targetTrack === "NoCase" ? "No Case" : targetTrack;

        await fetch(`${API_BASE}/studies/${currentCase.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userTag }),
        });
      }

      // Step 2: Route the study
      // Using generic route endpoint, assuming it accepts these destinations
      // For cross-track routing, we might need a different logic if the backend is strict,
      // but assuming 'route' handles the move.
      const body: any = { destination: destinationEndpoint };
      // Pass previous track when rerouting so backend can store history
      if (actionType === "reroute") {
        body.previousTrack = trackType; // Current track becomes previous
        if (crossAllocationComment) {
          body.crossAllocationComment = crossAllocationComment;
        }
      }

      const response = await fetch(
        `${API_BASE}/track/route/${currentCase.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();

      if (data.success || response.ok) {
        // Tolerate if success is true or response is ok
        let successMessage = "";
        if (actionType === "approve")
          successMessage = "Case approved and routed successfully";
        else if (actionType === "reroute")
          successMessage = `Case re-classified to ${targetTrack} and routed`;
        else if (actionType === "reject")
          successMessage = "Case rejected successfully";

        toast.success(successMessage);

        // Remove from allocated cases
        const newCases = allocatedCases.filter((c) => c.id !== currentCase.id);
        setAllocatedCases(newCases);

        // Adjust current index if needed
        if (currentIndex >= newCases.length) {
          setCurrentIndex(Math.max(0, newCases.length - 1));
        }

        // Re-fetch pool count (routing changes pool composition)
        fetchPoolStats();
      } else {
        toast.error(data.error || "Failed to process decision");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process decision");
    } finally {
      setRoutingStudyId(null);
    }
  };

  // Helper functions for classification display (copied from TrackTriagePage)
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

  // Classification implementation
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
        // Update local state to reflect change immediately without removing from list
        setAllocatedCases((prev) =>
          prev.map((s) =>
            s.id === studyId
              ? { ...s, userTag: classification as any, ...body }
              : s,
          ),
        );
        setSelectedClassification(classification);
        toast.success(
          `Classification updated to ${classification}. Please confirm routing decision.`,
        );
        // Re-fetch pool count (classification changes pool composition)
        fetchPoolStats();
      } else {
        throw new Error("Failed to update classification");
      }
    } catch (error) {
      console.error("Error classifying:", error);
      toast.error("Failed to update classification");
    } finally {
      setClassifying(null);
    }
  };

  // View: Assessment Workspace (Triage Style)
  if (user && canViewAssessment === false) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md border border-gray-200 max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600">
            You do not have permission to view the {trackDisplayName} Assessment
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
            {trackDisplayName} Assessment
          </h1>
          {allocatedCases.length > 0 && assessmentStarted && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Case {currentIndex + 1} of {allocatedCases.length}
            </span>
          )}
          {!assessmentStarted && poolCount !== null && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
              Case Pool: {poolCount}
            </span>
          )}
        </div>

        {allocatedCases.length > 0 && assessmentStarted && (
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
              onClick={handleExitAssessment}
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Exit Assessment
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        {!assessmentStarted || allocatedCases.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-center max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MagnifyingGlassIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {trackDisplayName} Assessment
              </h2>

              {/* The "Continue Assessment" specific screen is removed per request. 
                  We now show the Allocate button screen ALWAYS, but if cases exist, 
                  we add a small link or button to resume. */}

              <div className="flex flex-col items-center">
                <p className="text-gray-500 mb-8">
                  Ready to begin assessment? Click below to allocate a batch of
                  cases.
                </p>

                <button
                  onClick={handleStartAssessment}
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
                      Allocate Cases
                    </>
                  )}
                </button>

                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                  Allocating cases will lock them to your account for
                  assessment.
                </div>

                {/* Process QC — No Case only */}
                {trackType === "NoCase" && (
                  <div className="mt-6 pt-6 border-t border-gray-200 w-full">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          Secondary QC Queue
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {secondaryQcCount !== null
                            ? `${secondaryQcCount} case${secondaryQcCount !== 1 ? "s" : ""} pending`
                            : "Loading…"}
                        </p>
                      </div>
                      <button
                        onClick={handleProcessQC}
                        disabled={processingQC || secondaryQcCount === 0}
                        className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processingQC ? (
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
                          "Process QC"
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      A configured percentage will be returned to No Case QC.
                      The remainder will be cleared directly to Reports.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
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

              {/* RIGHT PANE: Details & Routing */}
              <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-hidden">
                {/* Classification & AI Info (Scrollable) */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
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
                    fetchStudies={() => {}}
                    canClassify={true}
                  />
                </div>

                {/* Routing Controls (Fixed at bottom right) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 shrink-0">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                    <ChartBarIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Route Decision
                  </h3>

                  <div className="flex flex-col gap-3">
                    {/* Status Indicator */}
                    <div className="text-sm bg-gray-50 p-2 rounded border border-gray-100 mb-2">
                      <span className="text-gray-600">
                        Current Classification:{" "}
                      </span>
                      <span
                        className={`font-bold ${
                          selectedClassification === "ICSR"
                            ? "text-red-600"
                            : selectedClassification === "AOI"
                              ? "text-amber-600"
                              : selectedClassification === "No Case"
                                ? "text-gray-600"
                                : "text-gray-600"
                        }`}
                      >
                        {selectedClassification || "Unclassified"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* ICSR TRACK ACTIONS */}
                      {trackType === "ICSR" && (
                        <>
                          {/* If Classified as ICSR: Approve (Data Entry) */}
                          {selectedClassification === "ICSR" && (
                            <button
                              onClick={() =>
                                handleAssessmentDecision(
                                  "approve",
                                  undefined,
                                  "data_entry",
                                )
                              }
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50"
                            >
                              {routingStudyId === currentCase.id
                                ? "Processing..."
                                : "Approve (Data Entry)"}
                            </button>
                          )}

                          {/* If Classified as AOI */}
                          {selectedClassification === "AOI" && (
                            <button
                              onClick={() => {
                                setRerouteComment("");
                                setRerouteModal({
                                  targetTrack: "AOI",
                                  destination: "aoi_assessment",
                                });
                              }}
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-medium disabled:opacity-50"
                            >
                              Re-route to AOI Assessment
                            </button>
                          )}

                          {/* If Classified as No Case */}
                          {selectedClassification === "No Case" && (
                            <button
                              onClick={() => {
                                setRerouteComment("");
                                setRerouteModal({
                                  targetTrack: "No Case",
                                  destination: "no_case_assessment",
                                });
                              }}
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium disabled:opacity-50"
                            >
                              Re-route to No Case Assessment
                            </button>
                          )}
                        </>
                      )}

                      {/* AOI TRACK ACTIONS */}
                      {trackType === "AOI" && (
                        <>
                          {/* If Classified as AOI: Approve (Reports) */}
                          {selectedClassification === "AOI" && (
                            <button
                              onClick={() =>
                                handleAssessmentDecision(
                                  "approve",
                                  undefined,
                                  "reporting",
                                )
                              }
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50"
                            >
                              Approve (Reports)
                            </button>
                          )}

                          {/* If Classified as ICSR */}
                          {selectedClassification === "ICSR" && (
                            <button
                              onClick={() => {
                                setRerouteComment("");
                                setRerouteModal({
                                  targetTrack: "ICSR",
                                  destination: "icsr_assessment",
                                });
                              }}
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50"
                            >
                              Re-route to ICSR Assessment
                            </button>
                          )}

                          {/* If Classified as No Case */}
                          {selectedClassification === "No Case" && (
                            <button
                              onClick={() => {
                                setRerouteComment("");
                                setRerouteModal({
                                  targetTrack: "No Case",
                                  destination: "no_case_assessment",
                                });
                              }}
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium disabled:opacity-50"
                            >
                              Re-route to No Case Assessment
                            </button>
                          )}
                        </>
                      )}

                      {/* NO CASE TRACK ACTIONS */}
                      {trackType === "NoCase" && (
                        <>
                          {/* If Classified as No Case: Approve (Reports) */}
                          {selectedClassification === "No Case" && (
                            <button
                              onClick={() =>
                                handleAssessmentDecision(
                                  "approve",
                                  undefined,
                                  "reporting",
                                )
                              }
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50"
                            >
                              Confirm No Case (Reports)
                            </button>
                          )}

                          {/* If Classified as ICSR */}
                          {selectedClassification === "ICSR" && (
                            <button
                              onClick={() => {
                                setRerouteComment("");
                                setRerouteModal({
                                  targetTrack: "ICSR",
                                  destination: "icsr_assessment",
                                });
                              }}
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50"
                            >
                              Re-route to ICSR Assessment
                            </button>
                          )}

                          {/* If Classified as AOI */}
                          {selectedClassification === "AOI" && (
                            <button
                              onClick={() => {
                                setRerouteComment("");
                                setRerouteModal({
                                  targetTrack: "AOI",
                                  destination: "aoi_assessment",
                                });
                              }}
                              disabled={routingStudyId === currentCase.id}
                              className="col-span-1 sm:col-span-2 flex items-center justify-center p-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-medium disabled:opacity-50"
                            >
                              Re-route to AOI Assessment
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* REJECT / RETURN BUTTON */}
                    <div className="pt-3 mt-1 border-t border-gray-100">
                      <button
                        onClick={() => {
                          let dest = "icsr_triage";
                          let target = "ICSR";

                          // HISTORY-BASED ROUTING
                          // If this case came from another track (sourceTrack), prefer sending it back there.
                          // Specifically handling "From ICSR Assessment -> AOI Assessment (Reject) -> ICSR Assessment"
                          if (currentCase.sourceTrack) {
                            if (currentCase.sourceTrack === "ICSR") {
                              target = "ICSR";
                              dest = "icsr_assessment"; // Return to Assessment as requested
                            } else if (currentCase.sourceTrack === "AOI") {
                              target = "AOI";
                              dest = "aoi_assessment";
                            } else if (currentCase.sourceTrack === "NoCase") {
                              target = "No Case";
                              dest = "no_case_assessment";
                            }
                          } else {
                            // Default Fallback: Return to Current Track Triage
                            if (trackType === "AOI") {
                              dest = "aoi_triage";
                              target = "AOI";
                            } else if (trackType === "NoCase") {
                              dest = "no_case_triage";
                              target = "No Case";
                            } else {
                              // ICSR
                              dest = "icsr_triage";
                              target = "ICSR";
                            }
                          }

                          handleAssessmentDecision("reject", target, dest);
                        }}
                        disabled={routingStudyId === currentCase.id}
                        className="w-full flex items-center justify-center p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-all font-medium disabled:opacity-50"
                      >
                        {currentCase.sourceTrack
                          ? `Reject (Return to ${currentCase.sourceTrack} Assessment)`
                          : `Reject (Return to ${trackType === "NoCase" ? "No Case" : trackType} Triage)`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Reroute / Cross-Allocation Comment Modal */}
      {rerouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Cross-Allocate to {rerouteModal.targetTrack}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for re-routing this case. This comment
              will be displayed at the top of the case for the next reviewer.
            </p>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              placeholder="Enter reason for cross-allocation..."
              value={rerouteComment}
              onChange={(e) => setRerouteComment(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRerouteModal(null);
                  setRerouteComment("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rerouteComment.trim()) {
                    toast.error("Please enter a reason for cross-allocation.");
                    return;
                  }
                  const { targetTrack, destination } = rerouteModal;
                  setRerouteModal(null);
                  handleAssessmentDecision(
                    "reroute",
                    targetTrack,
                    destination,
                    rerouteComment.trim(),
                  );
                  setRerouteComment("");
                }}
                disabled={routingStudyId === currentCase?.id}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Confirm Re-route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
