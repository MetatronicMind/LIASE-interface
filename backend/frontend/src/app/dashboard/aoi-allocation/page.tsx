"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/config/api";
import { PmidLink } from "@/components/PmidLink";
import TriageStudyDetails from "@/components/TriageStudyDetails";
import { useDateTime } from "@/hooks/useDateTime";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { setSidebarLocked } from "@/redux/slices/uiSlice";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string[] | string;
  journal: string;
  publicationDate: string;
  abstract: string;
  drugName: string;
  adverseEvent: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userTag?: "ICSR" | "AOI" | "No Case" | null;
  icsrClassification?: string;
  aoiClassification?: string;
  assignedTo?: string;
  lockedAt?: string;
}

export default function AOIAllocationPage() {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const selectedOrganizationId = useSelector(
    (state: RootState) => state.filter.selectedOrganizationId,
  );
  const dispatch = useDispatch();
  const { formatDate } = useDateTime();
  const API_BASE = getApiBaseUrl();

  // Use QA/QC permissions
  const permissions = user?.permissions?.QA || user?.permissions?.QC;
  const canView = permissions?.read;
  const canWrite = permissions?.write;

  const [allocatedCases, setAllocatedCases] = useState<Study[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAllocating, setIsAllocating] = useState(false);
  const [classifying, setClassifying] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<
    string | null
  >(null);

  const currentStudy = allocatedCases[currentIndex];

  const handleStartAllocation = async () => {
    setIsAllocating(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE}/track/AOI/allocate-batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        const normalizedCases = (data.cases || []).map((study: any) => ({
          ...study,
          authors: Array.isArray(study.authors)
            ? study.authors
            : typeof study.authors === "string" && study.authors.trim() !== ""
              ? [study.authors]
              : [],
        }));
        setAllocatedCases(normalizedCases);
        setCurrentIndex(0);
        dispatch(setSidebarLocked(true));
      } else {
        alert(data.message || "Failed to allocate AOI cases");
      }
    } catch (error) {
      console.error("Error allocating AOI cases:", error);
      alert("Error allocating AOI cases. Please try again.");
    } finally {
      setIsAllocating(false);
    }
  };

  const handleExitAllocation = async () => {
    if (allocatedCases.length === 0) return;

    if (
      !confirm(
        "Are you sure you want to exit? All allocated cases will be released.",
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_BASE}/studies/release-batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setAllocatedCases([]);
      setCurrentIndex(0);
      dispatch(setSidebarLocked(false));
      setSelectedClassification(null);
    } catch (error) {
      console.error("Error releasing cases:", error);
    }
  };

  const handleNextCase = () => {
    if (currentIndex < allocatedCases.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedClassification(null);
    }
  };

  const handlePrevCase = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setSelectedClassification(null);
    }
  };

  const classifyStudy = async (studyId: string, classification: string) => {
    try {
      setClassifying(studyId);
      const token = localStorage.getItem("auth_token");

      const body = {
        userTag: classification,
      };

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
        setSelectedClassification(null);

        // If no more cases, exit allocation
        if (allocatedCases.length <= 1) {
          dispatch(setSidebarLocked(false));
          setAllocatedCases([]);
          setCurrentIndex(0);
        } else {
          // Stay on current index if there are more cases
          if (currentIndex >= allocatedCases.length - 1) {
            setCurrentIndex(Math.max(0, allocatedCases.length - 2));
          }
        }
      } else {
        const error = await response.json();
        alert(error.message || "Failed to classify study");
      }
    } catch (error) {
      console.error("Error classifying study:", error);
      alert("Failed to classify study. Please try again.");
    } finally {
      setClassifying(null);
    }
  };

  const handleClassify = () => {
    if (!selectedClassification || !currentStudy) return;
    classifyStudy(currentStudy.id, selectedClassification);
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  if (user && canView === false) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md border border-gray-200 max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600">
            You do not have permission to access AOI Allocation.
          </p>
        </div>
      </div>
    );
  }

  if (allocatedCases.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            AOI Allocation
          </h1>
          <p className="text-gray-600 mb-6">
            Allocate and classify Probable AOI studies for quality check.
            Studies classified as:
          </p>
          <ul className="text-left text-gray-700 mb-6 space-y-2">
            <li>
              • <strong>AOI</strong> → Moves to Reports
            </li>
            <li>
              • <strong>ICSR</strong> → Moves to ICSR Triage
            </li>
            <li>
              • <strong>No Case</strong> → Moves to No Case Assessment
            </li>
          </ul>
          <button
            onClick={handleStartAllocation}
            disabled={isAllocating || !canWrite}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAllocating ? "Allocating..." : "Allocate AOI Cases"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AOI Allocation</h1>
          <p className="text-sm text-gray-500">
            Case {currentIndex + 1} of {allocatedCases.length}
          </p>
        </div>
        <button
          onClick={handleExitAllocation}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Exit Allocation
        </button>
      </div>

      {/* Study Details */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Study Details
            </h2>
            <span className="text-sm text-gray-500">
              PMID: <PmidLink pmid={currentStudy.pmid} />
            </span>
          </div>
          <h3 className="text-lg text-gray-800 mb-2">{currentStudy.title}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Journal:</span>
              <span className="ml-2 text-gray-900">{currentStudy.journal}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">
                Publication Date:
              </span>
              <span className="ml-2 text-gray-900">
                {formatDate(currentStudy.publicationDate)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Drug:</span>
              <span className="ml-2 text-gray-900">
                {currentStudy.drugName}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">
                ICSR Classification:
              </span>
              <span className="ml-2 text-gray-900">
                {currentStudy.icsrClassification || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Abstract */}
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Abstract</h4>
          <p className="text-gray-600 text-sm leading-relaxed">
            {currentStudy.abstract}
          </p>
        </div>
      </div>

      {/* Classification Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Classify Study
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <button
            onClick={() => setSelectedClassification("AOI")}
            className={`p-4 border-2 rounded-lg transition-colors ${
              selectedClassification === "AOI"
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-green-300"
            }`}
          >
            <div className="font-semibold text-gray-900">AOI</div>
            <div className="text-xs text-gray-500">→ Reports</div>
          </button>
          <button
            onClick={() => setSelectedClassification("ICSR")}
            className={`p-4 border-2 rounded-lg transition-colors ${
              selectedClassification === "ICSR"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-300"
            }`}
          >
            <div className="font-semibold text-gray-900">ICSR</div>
            <div className="text-xs text-gray-500">→ ICSR Triage</div>
          </button>
          <button
            onClick={() => setSelectedClassification("No Case")}
            className={`p-4 border-2 rounded-lg transition-colors ${
              selectedClassification === "No Case"
                ? "border-red-500 bg-red-50"
                : "border-gray-300 hover:border-red-300"
            }`}
          >
            <div className="font-semibold text-gray-900">No Case</div>
            <div className="text-xs text-gray-500">→ No Case Assessment</div>
          </button>
        </div>
        <button
          onClick={handleClassify}
          disabled={!selectedClassification || classifying !== null}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {classifying ? "Classifying..." : "Submit Classification"}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevCase}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous Case
        </button>
        <button
          onClick={handleNextCase}
          disabled={currentIndex >= allocatedCases.length - 1}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Case
        </button>
      </div>
    </div>
  );
}
