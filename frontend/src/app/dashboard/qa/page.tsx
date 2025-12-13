"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDateTime } from "@/hooks/useDateTime";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";
import { PmidLink } from "@/components/PmidLink";
import PDFAttachmentUpload from "@/components/PDFAttachmentUpload";
import { CommentThread } from "@/components/CommentThread";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

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
  userTag: 'ICSR' | 'AOI' | 'No Case' | null;
  qaApprovalStatus: 'pending' | 'approved' | 'rejected';
  qaComments?: string;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    uploadedByName?: string;
  }>;
  r3FormStatus?: string;
  qcR3Status?: string;
  r3FormData?: any;
  createdAt: string;
  updatedAt: string;
  r3FormCompletedAt?: string;
  abstract?: string;
  
  // AI Inference Data - All fields from Triage
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
  listedness?: string;
  seriousness?: string;
  fullTextAvailability?: string;
  clientName?: string;
  sponsor?: string;
  effectiveClassification?: string;
  requiresManualReview?: boolean;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  
  // Legacy fields for backward compatibility
  Drugname?: string;
  Serious?: string;
  special_case?: string;
  ICSR_classification?: string;
  Text_type?: string;
}

export default function QAPage() {
  const { user } = useAuth();
  const { formatDate } = useDateTime();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [canRevoke, setCanRevoke] = useState(false);
  const [revokeToStage, setRevokeToStage] = useState("");

  // Classification state
  const [classifying, setClassifying] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);
  const [justification, setJustification] = useState<string>("");
  const [listedness, setListedness] = useState<string>("");
  const [seriousness, setSeriousness] = useState<string>("");
  const [showRawData, setShowRawData] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  const statusStyles: Record<string, string> = {
    "Pending Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
    "Under Review": "bg-blue-100 text-blue-800 border border-blue-300",
    Approved: "bg-green-100 text-green-800 border border-green-300",
    "qc_triage": "bg-purple-100 text-purple-800 border border-purple-300",
  };

  useEffect(() => {
    fetchPendingStudies();
    fetchWorkflowConfig();
  }, []);

  // Helper function to normalize classification values from backend
  const normalizeClassification = (value?: string): string | undefined => {
    if (!value) return value;
    let normalized = value.replace(/^Classification:\s*/i, '').trim();
    normalized = normalized.replace(/^\d+\.\s*/, '').trim();
    return normalized;
  };

  // Function to calculate final classification based on AI inference data
  const getFinalClassification = (study: Study): string | null => {
    const rawIcsrClassification = study.aiInferenceData?.ICSR_classification || study.ICSR_classification || study.icsrClassification;
    const rawAoiClassification = study.aiInferenceData?.AOI_classification || study.aoiClassification;
    
    const icsrClassification = normalizeClassification(rawIcsrClassification);
    const aoiClassification = normalizeClassification(rawAoiClassification);

    if (!icsrClassification) return null;

    if (icsrClassification === "Article requires manual review") {
      return "Manual Review";
    }

    if (icsrClassification === "Probable ICSR/AOI") {
      return "Probable ICSR/AOI";
    }

    if (icsrClassification === "Probable ICSR") {
      if (aoiClassification === "Yes" || aoiClassification === "Yes (ICSR)") {
        return "Probable ICSR/AOI";
      } else {
        return "Probable ICSR";
      }
    }

    if (icsrClassification === "No Case") {
      if (aoiClassification === "Yes" || aoiClassification === "Yes (AOI)") {
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

  // Classification function
  const classifyStudy = async (studyId: string, classification: string, details?: { justification?: string, listedness?: string, seriousness?: string }) => {
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
      }
      
      const response = await fetch(`${getApiBaseUrl()}/studies/${studyId}`, {
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
        
        // Update the study in the local state
        setStudies(prev => prev.map(study => 
          study.id === studyId ? updatedStudy : study
        ));
        
        // Also update selected study if it's the one being classified
        if (selectedStudy && selectedStudy.id === studyId) {
          setSelectedStudy(updatedStudy);
        }
        
        // Reset classification state
        setSelectedClassification(null);
        setJustification("");
        setListedness("");
        setSeriousness("");
        
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

  const fetchWorkflowConfig = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/admin-config/workflow`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const config = data.configData;
        // Find transition from qc_triage
        // We look for any transition starting from qc_triage that allows revoke
        const transition = config.transitions.find((t: any) => t.from === 'qc_triage');
        if (transition && transition.canRevoke) {
          setCanRevoke(true);
          setRevokeToStage(transition.revokeTo);
        } else {
          setCanRevoke(false);
        }
      }
    } catch (error) {
      console.error('Error fetching workflow config:', error);
    }
  };

  const fetchPendingStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/QA-pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
      } else {
        throw new Error("Failed to fetch pending QA studies");
      }
    } catch (error) {
      console.error("Error fetching QA studies:", error);
      setError("Failed to load studies for QA review");
    } finally {
      setLoading(false);
    }
  };

  const approveClassification = async (studyId: string) => {
    setActionInProgress(studyId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${studyId}/QA/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comments }),
      });

      if (response.ok) {
        setStudies(prev => prev.filter(study => study.id !== studyId));
        setSelectedStudy(null);
        setComments("");
        alert("Classification approved successfully! Study will proceed to Data Entry.");
        fetchPendingStudies();
      } else {
        throw new Error("Failed to approve classification");
      }
    } catch (error) {
      console.error("Error approving classification:", error);
      alert("Failed to approve classification. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  const rejectClassification = async (studyId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setActionInProgress(studyId);
    try {
      const token = localStorage.getItem("auth_token");
      
      // Use the standard QA reject endpoint, which now supports targetStage
      const endpoint = `${getApiBaseUrl()}/studies/${studyId}/QA/reject`;
        
      const body = revokeToStage 
        ? { reason: rejectionReason, targetStage: revokeToStage }
        : { reason: rejectionReason };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setStudies(prev => prev.filter(study => study.id !== studyId));
        setSelectedStudy(null);
        setRejectionReason("");
        setShowRejectModal(false);
        alert(`Classification rejected successfully! Study has been returned to ${revokeToStage || 'Triage'}.`);
        fetchPendingStudies();
      } else {
        throw new Error("Failed to reject classification");
      }
    } catch (error) {
      console.error("Error rejecting classification:", error);
      alert("Failed to reject classification. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'ICSR': return 'bg-red-100 text-red-800 border-red-200';
      case 'AOI': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'No Case': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const handleBulkProcess = async () => {
    if (!confirm("Are you sure you want to process QC Allocation? This will move the majority of items to their next stage, keeping only the configured percentage for QC review.")) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/QA/bulk-process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchPendingStudies();
      } else {
        throw new Error("Failed to process QC items");
      }
    } catch (error) {
      console.error("Error processing QC items:", error);
      alert("Failed to process QC items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">Loading QA queue...</p>
      </div>
    );
  }

  return (
    <PermissionGate resource="QA" action="read">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">QC Allocation</h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve triage classifications before Data Entry
              </p>
            </div>
            <button
              onClick={handleBulkProcess}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Process QC Allocation
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Studies List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Triage Classifications ({studies.length})
              </h2>
            </div>

            {studies.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending classifications</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All triage classifications have been reviewed.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {studies.map((study) => (
                  <li
                    key={study.id}
                    className={`px-4 sm:px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedStudy?.id === study.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedStudy(study)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <PmidLink pmid={study.pmid} />
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getClassificationColor(study.userTag || '')}`}>
                            {study.userTag}
                          </span>
                          <span className="text-xs text-gray-500">
                            Classified: {formatDate(study.r3FormCompletedAt || study.updatedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">{study.title}</p>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-4">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Drug:</span> {study.drugName}
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Adverse Event:</span> {study.adverseEvent}
                          </p>
                          {study.justification && (
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Justification:</span> {study.justification}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Study Details Panel */}
          {selectedStudy && (
            <div className="mt-6 bg-white shadow rounded-lg" ref={detailsRef}>
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Classification Review</h3>
                <button
                  onClick={() => {
                    setSelectedStudy(null);
                    setComments("");
                    setRejectionReason("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-4 sm:px-6 py-4 space-y-6">
                {/* QC Rejection Notice */}
                {selectedStudy.qaApprovalStatus === 'rejected' && selectedStudy.qaComments && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-orange-800">
                          Classification Rejected by QC
                        </h3>
                        <div className="mt-2 text-sm text-orange-700">
                          <p className="font-semibold">Reason:</p>
                          <p className="mt-1">{selectedStudy.qaComments}</p>
                        </div>
                        <p className="mt-3 text-xs text-orange-600">
                          Please review and re-classify this study based on the QC feedback.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Revocation Notice */}
                {selectedStudy.revokedBy && selectedStudy.revocationReason && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-red-800">
                          Study Revoked
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p className="font-semibold">Reason:</p>
                          <p className="mt-1">{selectedStudy.revocationReason}</p>
                        </div>
                        {selectedStudy.revokedAt && (
                          <p className="mt-2 text-xs text-red-600">
                            Revoked on: {formatDate(selectedStudy.revokedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">Literature Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-bold text-gray-700">PMID:</span>
                      <p className="mt-1"><PmidLink pmid={selectedStudy.pmid} showIcon={true} /></p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">INN & Brand Name:</span>
                      <p className="mt-1 text-gray-900">{selectedStudy.drugName}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">Authors:</span>
                      <p className="mt-1 text-gray-900">
                        {Array.isArray(selectedStudy.authors) 
                          ? selectedStudy.authors.join(', ')
                          : typeof selectedStudy.authors === 'string' 
                            ? selectedStudy.authors 
                            : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">Journal Name:</span>
                      <p className="mt-1 text-gray-900">{selectedStudy.journal || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">Publication Date:</span>
                      <p className="mt-1 text-gray-900">{selectedStudy.publicationDate || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <span className="font-bold text-gray-700">Created On:</span>
                      <p className="mt-1 text-gray-900">{formatDate(selectedStudy.createdAt)}</p>
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">Title:</span>
                    <p className="mt-1 text-gray-900 leading-relaxed">{selectedStudy.title}</p>
                  </div>
                  {selectedStudy.vancouverCitation && (
                    <div>
                      <span className="font-bold text-gray-700">Literature Citation:</span>
                      <p className="mt-1 text-gray-900 text-sm italic">{selectedStudy.vancouverCitation}</p>
                    </div>
                  )}
                </div>

                {/* Enhanced Abstract Display */}
                {(selectedStudy.aiInferenceData?.Abstract || selectedStudy.abstract) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Abstract
                    </h4>
                    <div className="bg-white rounded p-4 border">
                      <p className="text-gray-900 leading-relaxed text-sm">{selectedStudy.aiInferenceData?.Abstract || selectedStudy.abstract}</p>
                    </div>
                  </div>
                )}
                
                {/* AI Final Classification - After Abstract */}
                {getFinalClassification(selectedStudy) && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-200">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600 mb-2">AI Classification Result</p>
                        <p className="text-2xl font-bold text-indigo-900">
                          {getFinalClassification(selectedStudy)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Study Metadata */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Literature Article Overview
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    {selectedStudy.doi && (
                      <div>
                        <span className="font-bold text-gray-700">DOI:</span>
                        <p className="mt-1 text-gray-900 break-all">
                          <a 
                            href={selectedStudy.doi.startsWith('http') ? selectedStudy.doi : `https://doi.org/${selectedStudy.doi}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline"
                          >
                            {selectedStudy.doi}
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedStudy.leadAuthor && (
                      <div>
                        <span className="font-bold text-gray-700">Lead Author:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.leadAuthor}</p>
                      </div>
                    )}
                    {selectedStudy.countryOfFirstAuthor && (
                      <div>
                        <span className="font-bold text-gray-700">Country of first Author:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.countryOfFirstAuthor}</p>
                      </div>
                    )}
                    {selectedStudy.countryOfOccurrence && (
                      <div>
                        <span className="font-bold text-gray-700">Country of Occurrence:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.countryOfOccurrence}</p>
                      </div>
                    )}
                    {selectedStudy.substanceGroup && (
                      <div>
                        <span className="font-bold text-gray-700">INN:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.substanceGroup}</p>
                      </div>
                    )}
                    {selectedStudy.authorPerspective && (
                      <div>
                        <span className="font-bold text-gray-700">Author Perspective:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.authorPerspective}</p>
                      </div>
                    )}
                    {selectedStudy.sponsor && (
                      <div>
                        <span className="font-bold text-gray-700">Client Name:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.sponsor}</p>
                      </div>
                    )}
                    {selectedStudy.testSubject && (
                      <div>
                        <span className="font-bold text-gray-700">Subject/Participant/Patient:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.testSubject}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Analysis & Clinical Data */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="font-bold flex justify-center items-center">
                      <p>AI Literature Analysis</p>
                      </div>
                      
                  </h4>
                  <div className="space-y-4">
                    {/* Grid Layout for Analysis Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                      <span className="font-bold text-gray-700">AI Identified Adverse Event(s):</span>
                      <p className="mt-1 text-gray-900">{selectedStudy.adverseEvent}</p>
                    </div>
                    {(selectedStudy.special_case || selectedStudy.specialCase) && (
                        <div>
                          <span className="font-bold text-gray-700">AI Identified Special Situation(s):</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.special_case || selectedStudy.specialCase}</p>
                        </div>
                      )}
                      
                      {(selectedStudy.Text_type || selectedStudy.textType) && (
                        <div>
                          <span className="font-bold text-gray-700">Article Type:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.Text_type || selectedStudy.textType}</p>
                        </div>
                      )}
                      {selectedStudy.approvedIndication && (
                        <div>
                          <span className="font-bold text-gray-700">AI Assessment of Indication:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.approvedIndication}</p>
                        </div>
                      )}
                    </div>

                    {/* Text-based Fields */}
                    {selectedStudy.attributability && (
                      <div>
                        <span className="font-bold text-gray-700">AI Assessment of Attributability:</span>
                        <p className="mt-1 text-gray-900 text-sm">{selectedStudy.attributability}</p>
                      </div>
                    )}
                    {selectedStudy.drugEffect && (
                      <div>
                        <span className="font-bold text-gray-700">AI Identified Drug Effect </span> <span>(Beneficial/Adverse) :</span>
                        <p className="mt-1 text-gray-900 text-sm">{selectedStudy.drugEffect}</p>
                      </div>
                    )}
                    {selectedStudy.justification && (
                      <div>
                        <span className="font-bold text-gray-700">AI Opinion on Literature:</span>
                            <p className="mt-1 text-gray-900 text-sm">
                              {selectedStudy.aiInferenceData?.justification || selectedStudy.aiInferenceData?.Justification || "N/A"}
                            </p>
                      </div>
                    )}

                    {/* Clinical Data */}
                    {selectedStudy.administeredDrugs && selectedStudy.administeredDrugs.length > 0 && (
                      <div>
                        <span className="font-bold text-gray-700">Administered Drugs:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedStudy.administeredDrugs.map((drug, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {drug}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedStudy.patientDetails && (
                      <div>
                        <span className="font-bold text-gray-700">Patient Details:</span>
                        <div className="mt-1 bg-white rounded p-3 border">
                          {typeof selectedStudy.patientDetails === 'object' ? (
                            <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                              {JSON.stringify(selectedStudy.patientDetails, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-gray-900 text-sm">{selectedStudy.patientDetails}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedStudy.relevantDates && (
                      <div>
                        <span className="font-bold text-gray-700">Relevant Dates:</span>
                        <div className="mt-1 bg-white rounded p-3 border">
                          {typeof selectedStudy.relevantDates === 'object' ? (
                            <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                              {JSON.stringify(selectedStudy.relevantDates, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-gray-900 text-sm">{selectedStudy.relevantDates}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              
                {selectedStudy.summary && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      AI Summary
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900 leading-relaxed">{selectedStudy.summary}</p>
                    </div>
                  </div>
                )}

                {/* Classification Actions - Primary Feature for Triage */}
                {/* Fixed parsing error */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Triage Classification Display */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Triage Classification
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Classification</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getClassificationColor(selectedStudy.userTag || '')}`}>
                            {getClassificationLabel(selectedStudy)}
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

                      {selectedStudy.justification && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Justification</span>
                          <p className="mt-1 text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded border border-gray-200">
                            {selectedStudy.justification}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PDF Attachments */}
                <PDFAttachmentUpload
                  studyId={selectedStudy.id}
                  attachments={selectedStudy.attachments || []}
                  onUploadComplete={async () => {
                    // Fetch the updated study with new attachments
                    try {
                      const token = localStorage.getItem('auth_token');
                      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}`, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      
                      if (response.ok) {
                        const updatedStudy = await response.json();
                        setSelectedStudy(updatedStudy);
                        fetchPendingStudies();
                      }
                    } catch (error) {
                      console.error('Failed to refresh study:', error);
                      fetchPendingStudies();
                    }
                  }}
                />

                {/* Comment Thread */}
                <div className="mb-6">
                  <CommentThread study={selectedStudy} />
                </div>

                {/* QA Actions */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">QA Decision</h4>
                  {/* Comments */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments (Optional)
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Add any comments for the Data Entryer..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <PermissionGate resource="QA" action="approve">
                      <button
                        onClick={() => approveClassification(selectedStudy.id)}
                        disabled={actionInProgress === selectedStudy.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center"
                      >
                        {actionInProgress === selectedStudy.id ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Approving...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve Classification
                          </>
                        )}
                      </button>
                    </PermissionGate>

                    {canRevoke && (
                      <PermissionGate resource="QA" action="reject">
                        <button
                          onClick={() => setShowRejectModal(true)}
                          disabled={actionInProgress === selectedStudy.id}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject Classification
                        </button>
                      </PermissionGate>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && selectedStudy && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Classification</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this classification. The study will be returned to Data Entry for corrections.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm"
                placeholder="Enter rejection reason..."
              />
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => rejectClassification(selectedStudy.id)}
                  disabled={!rejectionReason.trim() || actionInProgress === selectedStudy.id}
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
