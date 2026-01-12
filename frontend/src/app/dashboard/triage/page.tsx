"use client";
import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";
import { PmidLink } from "@/components/PmidLink";
import PDFAttachmentUpload from "@/components/PDFAttachmentUpload";
import { CommentThread } from "@/components/CommentThread";
import TriageStudyDetails from "@/components/TriageStudyDetails";
import { useDateTime } from "@/hooks/useDateTime";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

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
  createdBy: string;
  comments?: any[];
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    uploadedByName?: string;
  }>;
  qaApprovalStatus?: 'pending' | 'approved' | 'rejected';
  qaComments?: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  
  // AI Inference Data - Raw API response
  aiInferenceData?: any;
  
  // AI Inference Fields - Normalized from backend
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
  authorPerspective?: string;
  confirmedPotentialICSR?: boolean;
  icsrClassification?: string;
  substanceGroup?: string;
  vancouverCitation?: string;
  leadAuthor?: string;
  serious?: boolean;
  testSubject?: string;
  aoiDrugEffect?: string;
  approvedIndication?: string;
  aoiClassification?: string;
  justification?: string;
  listedness?: string;
  seriousness?: string;
  clientName?: string;
  sponsor?: string;
  userTag?: 'ICSR' | 'AOI' | 'No Case' | null;
  effectiveClassification?: string;
  requiresManualReview?: boolean;
  fullTextAvailability?: string;
  fullTextSource?: string;
  
  // Legacy fields for backward compatibility
  Drugname?: string;
  Serious?: string;
  special_case?: string;
  ICSR_classification?: string;
  Text_type?: string;
  
  // Allocation fields
  assignedTo?: string;
  lockedAt?: string;
}

// No sample data - user requested removal of all sample/demo data
const fallbackStudies: any[] = [];

const statusStyles: Record<string, string> = {
  "Pending Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "Under Triage Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "Study in Process": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "Under Review": "bg-blue-100 text-blue-800 border border-blue-300",
  Approved: "bg-green-100 text-green-800 border border-green-300",
};

export default function TriagePage() {
  const selectedOrganizationId = useSelector((state: RootState) => state.filter.selectedOrganizationId);
  const { formatDate } = useDateTime();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const permissions = user?.permissions?.triage;
  
  const canView = permissions?.read;
  const canAllocate = permissions?.write;
  const canClassify = permissions?.classify;

  // Allocation state
  const [allocatedCases, setAllocatedCases] = useState<Study[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAllocating, setIsAllocating] = useState(false);
  
  // Derived state for current case
  const currentCase = allocatedCases.length > 0 ? allocatedCases[currentIndex] : null;
  
  // Classification state
  const [classifying, setClassifying] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);
  const [justification, setJustification] = useState<string>("");
  const [listedness, setListedness] = useState<string>("");
  const [seriousness, setSeriousness] = useState<string>("");
  const [fullTextAvailability, setFullTextAvailability] = useState<string>("");
  const [fullTextSource, setFullTextSource] = useState<string>("");
  
  // UI state
  const [showRawData, setShowRawData] = useState(false);

  const API_BASE = getApiBaseUrl();

  // Normalize API studies to ensure proper data types
  const normalizeApiStudies = (apiStudies: any[]): Study[] => {
    return apiStudies.map(study => ({
      ...study,
      keyEvents: Array.isArray(study.keyEvents) 
        ? study.keyEvents 
        : typeof study.keyEvents === 'string' 
          ? [study.keyEvents] 
          : [],
      authors: Array.isArray(study.authors) 
        ? study.authors 
        : typeof study.authors === 'string' 
          ? [study.authors] 
          : [],
      comments: Array.isArray(study.comments) ? study.comments : []
    }));
  };

  const handleStartTriage = async () => {
    setIsAllocating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/studies/allocate-batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAllocatedCases(normalizeApiStudies(data.cases || []));
        setCurrentIndex(0);
      } else {
        alert(data.message || "Failed to allocate cases");
      }
    } catch (error) {
      console.error("Error allocating cases:", error);
      alert("Error allocating cases. Please try again.");
    } finally {
      setIsAllocating(false);
    }
  };

  const handleExitTriage = async () => {
    if (allocatedCases.length === 0) return;
    
    if (!confirm("Are you sure you want to exit? All allocated cases will be released.")) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE}/studies/release-batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setAllocatedCases([]);
      setCurrentIndex(0);
      // Reset classification state
      setSelectedClassification(null);
      setJustification("");
      setListedness("");
      setSeriousness("");
      setFullTextAvailability("");
      setFullTextSource("");
    } catch (error) {
      console.error("Error releasing cases:", error);
    }
  };

  const handleNextCase = () => {
    if (currentIndex < allocatedCases.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // Reset classification state for new case
      setSelectedClassification(null);
      setJustification("");
      setListedness("");
      setSeriousness("");
      setFullTextAvailability("");
      setFullTextSource("");
    }
  };

  const handlePrevCase = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      // Reset classification state
      setSelectedClassification(null);
      setJustification("");
      setListedness("");
      setSeriousness("");
      setFullTextAvailability("");
      setFullTextSource("");
    }
  };

  // Classification function
  const classifyStudy = async (studyId: string, classification: string, details?: { justification?: string, listedness?: string, seriousness?: string, fullTextAvailability?: string, fullTextSource?: string }) => {
    console.log('classifyStudy called for:', studyId, classification);
    try {
      setClassifying(studyId);
      const token = localStorage.getItem("auth_token");
      
      const body: any = {
        userTag: classification
      };

      if (details) {
        if (details.justification) body.justification = details.justification;
        if (details.listedness) body.listedness = details.listedness;
        if (details.seriousness) body.seriousness = details.seriousness;
        if (details.fullTextAvailability) body.fullTextAvailability = details.fullTextAvailability;
        if (details.fullTextSource !== undefined) body.fullTextSource = details.fullTextSource;
      }
      
      console.log('Sending PUT request to:', `${API_BASE}/studies/${studyId}`);
      const response = await fetch(`${API_BASE}/studies/${studyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        const result = await response.json();
        const updatedStudy = result.study;
        
        // Update the study in the allocatedCases state
        setAllocatedCases(prev => prev.map(study => 
          study.id === studyId ? updatedStudy : study
        ));
        
        // Reset classification state
        setSelectedClassification(null);
        setJustification("");
        setListedness("");
        setSeriousness("");
        setFullTextAvailability("");
        setFullTextSource("");
        
        alert(`Literature Article classified as ${classification}.`);
      } else {
        throw new Error("Failed to classify study");
      }
    } catch (error) {
      console.error("Error classifying study:", error);
      alert("Error classifying study. Please try again.");
    } finally {
      setClassifying(null);
    }
  };

  // Helper function to normalize classification values from backend
  // Handles formats like "Classification:" or "4. Classification" -> "Classification"
  const normalizeClassification = (value?: string): string | undefined => {
    if (!value) return value;
    // Remove "Classification:" prefix if present
    let normalized = value.replace(/^Classification:\s*/i, '').trim();
    // Also remove number prefix patterns like "1. ", "2. ", "3. ", "4. ", etc.
    normalized = normalized.replace(/^\d+\.\s*/, '').trim();
    return normalized;
  };

  // Function to calculate final classification based on AI inference data
  // (Defined before filteredStudies to avoid hoisting issues)
  const getFinalClassification = (study: Study): string | null => {
    const rawIcsrClassification = study.aiInferenceData?.ICSR_classification || study.ICSR_classification || study.icsrClassification;
    const rawAoiClassification = study.aiInferenceData?.AOI_classification || study.aoiClassification;
    
    const icsrClassification = normalizeClassification(rawIcsrClassification);
    const aoiClassification = normalizeClassification(rawAoiClassification);

    if (!icsrClassification) return null;

    const icsrLower = icsrClassification.toLowerCase();
    const aoiLower = (aoiClassification || '').toLowerCase();

    // If ICSR Classification is "Article requires manual review"
    if (icsrLower.includes("manual review")) {
      return "Manual Review";
    }

    // If ICSR Classification is "Probable ICSR/AOI", return it regardless of AOI Classification
    if (icsrLower.includes("probable icsr/aoi")) {
      return "Probable ICSR/AOI";
    }

    const isProbableICSR = icsrLower.includes("probable") || icsrLower === "yes" || icsrLower.includes("yes (icsr)");
    const isProbableAOI = aoiLower.includes("probable") || aoiLower === "yes" || aoiLower.includes("yes (aoi)");

    if (isProbableICSR) {
      if (isProbableAOI) {
        return "Probable ICSR/AOI";
      } else {
        return "Probable ICSR";
      }
    }

    // If ICSR Classification is "No Case"
    if (icsrLower === "no case") {
      if (isProbableAOI) {
        return "Probable AOI";
      } else {
        return "No Case";
      }
    }

    return null;
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
           <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
           <p className="text-gray-600">You do not have permission to view the Triage Assessment section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Triage Assessment</h1>
          {allocatedCases.length > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Case {currentIndex + 1} of {allocatedCases.length}
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
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Start Literature Triage</h2>
              {/* <p className="text-lg text-gray-600 mb-8">
                Click below to allocate a batch of 10 high-priority cases. 
                Cases are prioritized by AI classification (Probable ICSR/AOI).
              </p> */}
              
              {canAllocate ? (
              <button
                onClick={handleStartTriage}
                disabled={isAllocating}
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {isAllocating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                  <h3 className="text-red-800 font-bold text-lg mb-1">Permission Denied</h3>
                  <p className="text-red-700 text-sm">You do not have permission to allocate cases.</p>
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
                    <h3 className="font-bold text-gray-900">Study Details</h3>
                    <PmidLink pmid={currentCase.pmid} />
                 </div>
                 <div className="p-6 overflow-y-auto flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{currentCase.title}</h2>
                    <div className="text-sm text-gray-600 mb-4">
                       <span className="font-medium">{Array.isArray(currentCase.authors) ? currentCase.authors.join(', ') : currentCase.authors}</span>
                       <span className="mx-2">•</span>
                       <span>{currentCase.journal}</span>
                       <span className="mx-2">•</span>
                       <span>{currentCase.publicationDate}</span>
                    </div>
                    
                    <div className="prose max-w-none">
                       <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Abstract</h4>
                       <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">{currentCase.abstract}</p>
                    </div>
                 </div>
              </div>

              {/* RIGHT PANE: Full Details & Classification */}
              <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                 <TriageStudyDetails 
                    study={currentCase}
                    onUpdate={(updated) => setAllocatedCases(prev => prev.map(s => s.id === updated.id ? updated : s))}
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
                 />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
