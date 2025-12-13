"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDateTime } from "@/hooks/useDateTime";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";
import { PmidLink } from "@/components/PmidLink";
import PDFAttachmentUpload from "@/components/PDFAttachmentUpload";
import { CommentThread } from "@/components/CommentThread";

interface FieldComment {
  id: string;
  fieldKey: string;
  comment: string;
  userId: string;
  userName: string;
  createdAt: string;
}

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string | string[];
  journal: string;
  drugName: string;
  adverseEvent: string;
  userTag: 'ICSR' | 'AOI' | 'No Case';
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
  fieldComments?: FieldComment[];
  createdAt: string;
  updatedAt: string;
  r3FormCompletedAt?: string;
  abstract?: string;
  publicationDate?: string;
  
  // AI Inference Data - All fields from Triage/QC Triage
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
  clientName?: string;
  sponsor?: string;
  effectiveClassification?: string;
  requiresManualReview?: boolean;
  listedness?: string;
  seriousness?: string;
  fullTextAvailability?: string;
  
  // Legacy fields for backward compatibility
  Drugname?: string;
  Serious?: string;
  special_case?: string;
  ICSR_classification?: string;
  Text_type?: string;
}

const R3_FORM_FIELDS = [
  // Reporter Information (Category A)
  { key: "C.2.r.1", label: "Reporter's Name", category: "A", required: true, section: "reporter" },
  { key: "C.2.r.1.1", label: "Reporter's Title", category: "A", required: false, section: "reporter" },
  { key: "C.2.r.1.2", label: "Reporter's Given Name", category: "A", required: true, section: "reporter" },
  { key: "C.2.r.1.3", label: "Reporter's Middle Name", category: "A", required: false, section: "reporter" },
  { key: "C.2.r.1.4", label: "Reporter's Family Name", category: "A", required: true, section: "reporter" },
  { key: "C.2.r.2.1", label: "Reporter's Organisation", category: "A", required: false, section: "reporter" },
  { key: "C.4.r.1", label: "Literature Reference(s)", category: "A", required: true, section: "reporter" },
  
  // Patient Characteristics
  { key: "D.1", label: "Patient (name or initials)", category: "C", required: false, section: "patient" },
  { key: "D.2.1", label: "Date of Birth", category: "C", required: false, section: "patient" },
  { key: "D.2.2a", label: "Age at Time of Onset (number)", category: "B", required: false, section: "patient" },
  { key: "D.2.2b", label: "Age at Time of Onset (unit)", category: "B", required: false, section: "patient" },
  { key: "D.2.3", label: "Patient Age Group", category: "C", required: false, section: "patient" },
  { key: "D.3", label: "Body Weight (kg)", category: "C", required: false, section: "patient" },
  { key: "D.4", label: "Height (cm)", category: "C", required: false, section: "patient" },
  { key: "D.5", label: "Sex", category: "C", required: false, section: "patient" },
  { key: "D.7.2", label: "Relevant Medical History", category: "C", required: false, section: "patient" },
  { key: "D.9.1", label: "Date of Death", category: "C", required: false, section: "patient" },
  
  // Reaction/Event Information
  { key: "E.i.1.1a", label: "Reaction / Event as Reported", category: "C", required: true, section: "reaction" },
  { key: "E.i.3.2a", label: "Results in Death", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2b", label: "Life Threatening", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2c", label: "Caused / Prolonged Hospitalisation", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2d", label: "Disabling / Incapacitating", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2e", label: "Congenital Anomaly / Birth Defect", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2f", label: "Other Medically Important Condition", category: "C", required: false, section: "reaction" },
  { key: "E.i.4", label: "Date of Start of Reaction / Event", category: "C", required: false, section: "reaction" },
  { key: "E.i.5", label: "Date of End of Reaction / Event", category: "C", required: false, section: "reaction" },
  { key: "E.i.7", label: "Outcome of Reaction / Event", category: "C", required: false, section: "reaction" },
  { key: "E.i.9", label: "Country Where Reaction Occurred", category: "C", required: false, section: "reaction" },
  
  // Drug Information
  { key: "G.k.1", label: "Characterisation of Drug Role", category: "C", required: true, section: "drug" },
  { key: "G.k.2", label: "Drug Identification", category: "C", required: true, section: "drug" },
  
  // Case Narrative
  { key: "H.1", label: "Case Narrative", category: "C", required: false, section: "narrative" },
];

export default function QCPage() {
  const { user } = useAuth();
  const { formatDate } = useDateTime();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  // Field-level commenting
  const [fieldCommentsState, setFieldCommentsState] = useState<{[key: string]: string}>({});
  const [addingCommentToField, setAddingCommentToField] = useState<string | null>(null);

  useEffect(() => {
    console.log('QC Page mounted, fetching studies...');
    fetchPendingR3Studies();
  }, []);

  const fetchPendingR3Studies = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth_token");
      
      console.log('Fetching QC pending R3 studies...');
      
      const response = await fetch(`${getApiBaseUrl()}/studies/QC-r3-pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('QC API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('QC API response data:', data);
        setStudies(data.data || []);
      } else {
        const errorText = await response.text();
        console.error('QC API error:', response.status, errorText);
        throw new Error(`Failed to fetch pending R3 studies: ${response.status}`);
      }
    } catch (err) {
      console.error('Error in fetchPendingR3Studies:', err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const addFieldComment = async (fieldKey: string) => {
    if (!selectedStudy || !fieldCommentsState[fieldKey]?.trim()) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/field-comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fieldKey,
          comment: fieldCommentsState[fieldKey].trim(),
        }),
      });

      if (response.ok) {
        // Refresh study data to get updated comments
        const data = await response.json();
        setSelectedStudy(data.study);
        setFieldCommentsState(prev => ({ ...prev, [fieldKey]: "" }));
        setAddingCommentToField(null);
      } else {
        alert("Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding field comment:", error);
      alert("Error adding comment");
    }
  };

  const getFieldComments = (fieldKey: string): FieldComment[] => {
    if (!selectedStudy?.fieldComments) return [];
    return selectedStudy.fieldComments.filter(comment => comment.fieldKey === fieldKey);
  };

  const approveR3Form = async (studyId: string) => {
    try {
      setActionInProgress(studyId);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${studyId}/QC/r3/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("R3 XML Form approved successfully!");
        setSelectedStudy(null);
        fetchPendingR3Studies();
      } else {
        throw new Error("Failed to approve R3 form");
      }
    } catch (error) {
      console.error("Error approving R3 form:", error);
      alert("Error approving R3 form");
    } finally {
      setActionInProgress(null);
    }
  };

  const rejectR3Form = async (studyId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      setActionInProgress(studyId);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${studyId}/QC/r3/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        alert("R3 XML Form rejected and returned to Data Entry");
        setShowRejectModal(false);
        setRejectionReason("");
        setSelectedStudy(null);
        fetchPendingR3Studies();
      } else {
        throw new Error("Failed to reject R3 form");
      }
    } catch (error) {
      console.error("Error rejecting R3 form:", error);
      alert("Error rejecting R3 form");
    } finally {
      setActionInProgress(null);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "ICSR":
        return "bg-red-100 text-red-800 border-red-200";
      case "AOI":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "No Case":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const renderFieldWithComments = (field: any) => {
    const value = selectedStudy?.r3FormData?.[field.key] || "";
    const fieldComments = getFieldComments(field.key);
    const isAddingComment = addingCommentToField === field.key;

    return (
      <div key={field.key} className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {field.key} - {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
            <span className="ml-2 text-xs text-gray-500">(Category: {field.category})</span>
          </label>
          <button
            onClick={() => setAddingCommentToField(isAddingComment ? null : field.key)}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            {isAddingComment ? "Cancel" : "+ Comment"}
          </button>
        </div>

        {/* Field Value (Read-only) */}
        <div className="bg-white border border-gray-300 rounded-md p-3 text-sm text-gray-900 min-h-[2.5rem]">
          {value || <span className="text-gray-400 italic">No data entered</span>}
        </div>

        {/* Existing Comments */}
        {fieldComments.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center text-yellow-800">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold">QC Comments:</span>
            </div>
            {fieldComments.map((comment) => (
              <div key={comment.id} className="bg-yellow-100 rounded p-2">
                <p className="text-sm text-yellow-900">{comment.comment}</p>
                <p className="text-xs text-yellow-700 mt-1">
                  By {comment.userName} on {formatDate(comment.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment Input */}
        {isAddingComment && (
          <div className="space-y-2">
            <textarea
              value={fieldCommentsState[field.key] || ""}
              onChange={(e) => setFieldCommentsState(prev => ({ ...prev, [field.key]: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your comment for this field..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => addFieldComment(field.key)}
                disabled={!fieldCommentsState[field.key]?.trim()}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Comment
              </button>
              <button
                onClick={() => {
                  setAddingCommentToField(null);
                  setFieldCommentsState(prev => ({ ...prev, [field.key]: "" }));
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('QC Page rendering - Studies:', studies.length, 'Error:', error);
  console.log('User:', user);
  console.log('Loading:', loading);
  console.log('Selected Study:', selectedStudy?.id);

  // Render content directly without PermissionGate for debugging
  const content = (
    <div className="min-h-screen bg-gray-50">
      {console.log('Rendering QC content...')}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">QUALITY CONTROL</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review R3 XML forms and add comments on specific fields before approval
          </p>
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
                Pending R3 XML Forms ({studies.length})
              </h2>
            </div>

            {studies.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending R3 forms</h3>
                <p className="mt-1 text-sm text-gray-500">All R3 XML forms have been reviewed.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {studies.map((study) => (
                  <li
                    key={study.id}
                    className="px-4 sm:px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedStudy(study)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <PmidLink pmid={study.pmid} />
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getClassificationColor(study.userTag)}`}>
                            {study.userTag}
                          </span>
                          <span className="text-xs text-gray-500">
                            Form completed: {formatDate(study.r3FormCompletedAt || study.updatedAt)}
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

          {/* Study R3 Form Review Modal */}
          {selectedStudy && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40 flex justify-center pt-10 pb-10">
              <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 flex flex-col max-h-[90vh]">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-lg sticky top-0 z-10">
                  <h3 className="text-lg font-semibold text-gray-900">R3 XML Form Review</h3>
                  <button
                    onClick={() => {
                      setSelectedStudy(null);
                      setFieldCommentsState({});
                      setAddingCommentToField(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-4 sm:px-6 py-6 overflow-y-auto">
                {/* Study Header */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <PmidLink pmid={selectedStudy.pmid} />
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getClassificationColor(selectedStudy.userTag)}`}>
                      {selectedStudy.userTag}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{selectedStudy.title}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Drug:</span> {selectedStudy.drugName}</div>
                    <div><span className="font-medium">Adverse Event:</span> {selectedStudy.adverseEvent}</div>
                  </div>
                </div>

                {/* Abstract - From Triage */}
                {(selectedStudy.aiInferenceData?.Abstract || selectedStudy.abstract) && (
                  <div className="mb-6 bg-gray-50 rounded-lg p-4">
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

                {/* Study Metadata - From Triage/QC Triage */}
                <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Study Metadata
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    {selectedStudy.doi && (
                      <div>
                        <span className="font-medium text-gray-700">DOI:</span>
                        <p className="mt-1 text-gray-900 break-all">{selectedStudy.doi}</p>
                      </div>
                    )}
                    {selectedStudy.leadAuthor && (
                      <div>
                        <span className="font-medium text-gray-700">Lead Author:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.leadAuthor}</p>
                      </div>
                    )}
                    {selectedStudy.countryOfFirstAuthor && (
                      <div>
                        <span className="font-medium text-gray-700">Country (First Author):</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.countryOfFirstAuthor}</p>
                      </div>
                    )}
                    {selectedStudy.countryOfOccurrence && (
                      <div>
                        <span className="font-medium text-gray-700">Country of Occurrence:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.countryOfOccurrence}</p>
                      </div>
                    )}
                    {selectedStudy.substanceGroup && (
                      <div>
                        <span className="font-medium text-gray-700">Substance Group:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.substanceGroup}</p>
                      </div>
                    )}
                    {selectedStudy.authorPerspective && (
                      <div>
                        <span className="font-medium text-gray-700">Author Perspective:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.authorPerspective}</p>
                      </div>
                    )}
                    {selectedStudy.clientName && (
                      <div>
                        <span className="font-medium text-gray-700">Client:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.clientName}</p>
                      </div>
                    )}
                    {selectedStudy.sponsor && (
                      <div>
                        <span className="font-medium text-gray-700">Sponsor:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.sponsor}</p>
                      </div>
                    )}
                    {selectedStudy.testSubject && (
                      <div>
                        <span className="font-medium text-gray-700">Test Subject:</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.testSubject}</p>
                      </div>
                    )}
                    {selectedStudy.vancouverCitation && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <span className="font-medium text-gray-700">Vancouver Citation:</span>
                        <p className="mt-1 text-gray-900 text-xs italic">{selectedStudy.vancouverCitation}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Analysis & Clinical Data - From Triage/QC Triage */}
                <div className="mb-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Literature Analysis
                  </h4>
                  <div className="space-y-4">
                    {/* Grid Layout for Analysis Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-bold text-gray-700">AI Identified Adverse Event(s):</span>
                        <p className="mt-1 text-gray-900">{selectedStudy.adverseEvent}</p>
                      </div>
                      {(selectedStudy.specialCase || selectedStudy.aiInferenceData?.special_case) && (
                        <div>
                          <span className="font-bold text-gray-700">AI Identified Special Situation(s):</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.specialCase || selectedStudy.aiInferenceData?.special_case}</p>
                        </div>
                      )}
                      {(selectedStudy.textType || selectedStudy.aiInferenceData?.Text_type) && (
                        <div>
                          <span className="font-bold text-gray-700">Article Type:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.textType || selectedStudy.aiInferenceData?.Text_type}</p>
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
                        <span className="font-bold text-gray-700">AI Identified Drug Effect (Beneficial/Adverse):</span>
                        <p className="mt-1 text-gray-900 text-sm">{selectedStudy.drugEffect}</p>
                      </div>
                    )}
                    {selectedStudy.justification && (
                      <div>
                        <span className="font-bold text-gray-700">AI Opinion on Literature:</span>
                        <p className="mt-1 text-gray-900 text-sm">{selectedStudy.justification}</p>
                      </div>
                    )}

                    {/* Clinical Data */}
                    {selectedStudy.administeredDrugs && Array.isArray(selectedStudy.administeredDrugs) && selectedStudy.administeredDrugs.length > 0 && (
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

                {/* Triage Classification */}
                <div className="mb-6 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
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
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              selectedStudy.userTag === 'ICSR' ? 'bg-red-100 text-red-800' :
                              selectedStudy.userTag === 'AOI' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                          {selectedStudy.userTag}
                        </span>
                        
                        {selectedStudy.userTag !== 'No Case' && selectedStudy.listedness && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {selectedStudy.listedness}
                          </span>
                        )}

                        {selectedStudy.userTag !== 'No Case' && selectedStudy.seriousness && (
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
                        <span className="text-sm font-medium text-gray-500">AI Opinion on Literature</span>
                        <p className="mt-1 text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded border border-gray-200">
                          {selectedStudy.justification}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF Attachments */}
                <div className="mb-6">
                  <PDFAttachmentUpload
                    studyId={selectedStudy.id}
                    attachments={selectedStudy.attachments || []}
                    onUploadComplete={fetchPendingR3Studies}
                  />
                </div>

                {/* Comment Thread */}
                <div className="mb-6">
                  <CommentThread study={selectedStudy} />
                </div>

                {/* R3 XML Form Section Header */}
                <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    R3 XML Form Fields
                  </h4>
                  <p className="mt-1 text-sm text-gray-600">Review and add comments to the R3 XML form fields below</p>
                </div>

                {/* R3 Form Fields with Comments */}
                <div className="space-y-6">
                  {/* Reporter Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      Reporter Information (Category A)
                    </h3>
                    <div className="space-y-4">
                      {R3_FORM_FIELDS.filter(f => f.section === "reporter").map(renderFieldWithComments)}
                    </div>
                  </div>

                  {/* Patient Characteristics */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      Patient Characteristics
                    </h3>
                    <div className="space-y-4">
                      {R3_FORM_FIELDS.filter(f => f.section === "patient").map(renderFieldWithComments)}
                    </div>
                  </div>

                  {/* Reaction/Event Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      Reaction/Event Information
                    </h3>
                    <div className="space-y-4">
                      {R3_FORM_FIELDS.filter(f => f.section === "reaction").map(renderFieldWithComments)}
                    </div>
                  </div>

                  {/* Drug Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      Drug Information
                    </h3>
                    <div className="space-y-4">
                      {R3_FORM_FIELDS.filter(f => f.section === "drug").map(renderFieldWithComments)}
                    </div>
                  </div>

                  {/* Case Narrative */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      Case Narrative
                    </h3>
                    <div className="space-y-4">
                      {R3_FORM_FIELDS.filter(f => f.section === "narrative").map(renderFieldWithComments)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 pt-6 border-t border-gray-200 flex space-x-3 sticky bottom-0 bg-white pb-4">
                  <PermissionGate resource="QC" action="approve">
                    <button
                      onClick={() => approveR3Form(selectedStudy.id)}
                      disabled={actionInProgress === selectedStudy.id}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center"
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
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve R3 XML Form
                        </>
                      )}
                    </button>
                  </PermissionGate>

                  <PermissionGate resource="QC" action="reject">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionInProgress === selectedStudy.id}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject R3 XML Form
                    </button>
                  </PermissionGate>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject R3 XML Form</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this R3 XML form. The study will be returned to Data Entry for corrections.
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
                  onClick={() => rejectR3Form(selectedStudy.id)}
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
    );

  return content; // Return content directly for debugging without PermissionGate
  
  // Uncomment below to re-enable permission gate
  // return (
  //   <PermissionGate resource="QC" action="view">
  //     {content}
  //   </PermissionGate>
  // );
}
