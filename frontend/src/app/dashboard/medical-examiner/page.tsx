"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  drugName: string;
  adverseEvent: string;
  userTag: string;
  r3FormData?: any;
  r3FormCompletedAt?: string;
  medicalReviewStatus: 'not_started' | 'in_progress' | 'completed' | 'revoked';
  fieldComments?: FieldComment[];
  createdAt: string;
  updatedAt: string;
  
  // Revocation tracking
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  
  // Additional fields from Triage/AI Inference
  abstract?: string;
  publicationDate?: string;
  doi?: string;
  leadAuthor?: string;
  vancouverCitation?: string;
  serious?: boolean;
  textType?: string;
  authorPerspective?: string;
  identifiableHumanSubject?: boolean;
  confirmedPotentialICSR?: boolean;
  icsrClassification?: string;
  substanceGroup?: string;
  testSubject?: string;
  aoiDrugEffect?: string;
  approvedIndication?: string;
  aoiClassification?: string;
  justification?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  patientDetails?: any;
  keyEvents?: string[];
  relevantDates?: any;
  administeredDrugs?: string[];
  attributability?: string;
  drugEffect?: string;
  summary?: string;
  specialCase?: string;
}

interface FieldComment {
  id: string;
  fieldKey: string;
  comment: string;
  userId: string;
  userName: string;
  createdAt: string;
}

const R3_FORM_FIELDS = [
  // Reporter Information (Category A)
  { key: "C.2.r.1", label: "Reporter's Name", category: "A" },
  { key: "C.2.r.1.1", label: "Reporter's Title", category: "A" },
  { key: "C.2.r.1.2", label: "Reporter's Given Name", category: "A" },
  { key: "C.2.r.1.3", label: "Reporter's Middle Name", category: "A" },
  { key: "C.2.r.1.4", label: "Reporter's Family Name", category: "A" },
  { key: "C.2.r.2.1", label: "Reporter's Organisation", category: "A" },
  { key: "C.4.r.1", label: "Literature Reference(s)", category: "A" },
  
  // Patient Characteristics (Category B & C)
  { key: "D.1", label: "Patient (name or initials)", category: "C" },
  { key: "D.2.1", label: "Date of Birth", category: "C" },
  { key: "D.2.2", label: "Age at Time of Onset of Reaction / Event", category: "C" },
  { key: "D.2.2a", label: "Age at Time of Onset of Reaction / Event (number)", category: "B" },
  { key: "D.2.2b", label: "Age at Time of Onset of Reaction / Event (unit)", category: "B" },
  { key: "D.2.2.1a", label: "Gestation Period When Reaction / Event Was Observed in the Foetus (number)", category: "C" },
  { key: "D.2.2.1b", label: "Gestation Period When Reaction / Event Was Observed in the Foetus (unit)", category: "B" },
  { key: "D.2.3", label: "Patient Age Group (as per reporter)", category: "C" },
  { key: "D.3", label: "Body Weight (kg)", category: "C" },
  { key: "D.4", label: "Height (cm)", category: "C" },
  { key: "D.5", label: "Sex", category: "C" },
  { key: "D.7", label: "Relevant Medical History and Concurrent Conditions", category: "C" },
  { key: "D.7.1.r", label: "Structured Information - Patient History", category: "C" },
  { key: "D.7.1.r.2", label: "Start Date of Medical History", category: "C" },
  { key: "D.7.1.r.3", label: "Continuing Medical History", category: "C" },
  { key: "D.7.1.r.4", label: "End Date of Medical History", category: "C" },
  { key: "D.7.3", label: "Structured Information Available", category: "C" },
  { key: "D.9.1", label: "Case Death", category: "C" },
  { key: "D.9.2.r", label: "Death Details", category: "C" },
  
  // Reaction/Event Information (Category E)
  { key: "E.i.1.1a", label: "Reaction/Event (MedDRA terminology)", category: "C" },
  { key: "E.i.3.2a", label: "Outcome - Recovered/Resolved", category: "C" },
  { key: "E.i.3.2b", label: "Outcome - Recovering/Resolving", category: "C" },
  { key: "E.i.3.2c", label: "Outcome - Not Recovered/Not Resolved", category: "C" },
  { key: "E.i.3.2d", label: "Outcome - Recovered/Resolved with Sequelae", category: "C" },
  { key: "E.i.3.2e", label: "Outcome - Fatal", category: "C" },
  { key: "E.i.3.2f", label: "Outcome - Unknown", category: "C" },
  { key: "E.i.4", label: "Date of Start of Reaction/Event", category: "C" },
  { key: "E.i.5", label: "Date of End of Reaction/Event", category: "C" },
  { key: "E.i.7", label: "Medical Confirmation by Healthcare Professional", category: "C" },
];

export default function MedicalExaminerPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  
  // Field editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [fieldComment, setFieldComment] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentingField, setCommentingField] = useState<string | null>(null);
  
  // Revocation state
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revocationReason, setRevocationReason] = useState('');

  useEffect(() => {
    fetchStudies();
  }, [statusFilter]);

  const fetchStudies = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/medical-examiner?status=${statusFilter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
      } else {
        throw new Error("Failed to fetch studies");
      }
    } catch (error) {
      console.error("Error fetching studies:", error);
      setError("Failed to load studies for medical review");
    } finally {
      setLoading(false);
    }
  };

  const addFieldComment = async (fieldKey: string, comment: string) => {
    if (!selectedStudy || !comment.trim()) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/field-comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fieldKey, comment }),
      });

      if (response.ok) {
        // Refresh the selected study
        const updatedStudy = await fetchStudyDetails(selectedStudy.id);
        if (updatedStudy) {
          setSelectedStudy(updatedStudy);
        }
        setFieldComment('');
        setShowCommentModal(false);
        setCommentingField(null);
      } else {
        throw new Error("Failed to add field comment");
      }
    } catch (error) {
      console.error("Error adding field comment:", error);
      alert("Failed to add comment. Please try again.");
    }
  };

  const updateFieldValue = async (fieldKey: string, value: string) => {
    if (!selectedStudy) return;

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/field-value`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fieldKey, value }),
      });

      if (response.ok) {
        // Update the local study data
        const updatedStudy = { ...selectedStudy };
        if (!updatedStudy.r3FormData) updatedStudy.r3FormData = {};
        updatedStudy.r3FormData[fieldKey] = value;
        setSelectedStudy(updatedStudy);
        setEditingField(null);
        setFieldValue('');
      } else {
        throw new Error("Failed to update field value");
      }
    } catch (error) {
      console.error("Error updating field value:", error);
      alert("Failed to update field. Please try again.");
    }
  };

  const revokeStudy = async () => {
    if (!selectedStudy || !revocationReason.trim()) return;

    setActionInProgress('revoke');
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: revocationReason }),
      });

      if (response.ok) {
        setStudies(prev => prev.filter(study => study.id !== selectedStudy.id));
        setSelectedStudy(null);
        setRevocationReason('');
        setShowRevokeModal(false);
        alert("Study revoked and returned to Data Entry.");
      } else {
        throw new Error("Failed to revoke study");
      }
    } catch (error) {
      console.error("Error revoking study:", error);
      alert("Failed to revoke study. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  const completeMedicalReview = async () => {
    if (!selectedStudy) return;

    setActionInProgress('complete');
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/medical-review/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setStudies(prev => prev.filter(study => study.id !== selectedStudy.id));
        setSelectedStudy(null);
        alert("Medical review completed successfully.");
      } else {
        throw new Error("Failed to complete medical review");
      }
    } catch (error) {
      console.error("Error completing medical review:", error);
      alert("Failed to complete review. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  const fetchStudyDetails = async (studyId: string): Promise<Study | null> => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${studyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Error fetching study details:", error);
    }
    return null;
  };

  const getFieldValue = (fieldKey: string) => {
    return selectedStudy?.r3FormData?.[fieldKey] || '';
  };

  const getFieldComments = (fieldKey: string) => {
    return selectedStudy?.fieldComments?.filter(comment => comment.fieldKey === fieldKey) || [];
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">Loading medical review queue...</p>
      </div>
    );
  }

  return (
    <PermissionGate resource="medical_examiner" action="read">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Medical Reviewer</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review completed ICSR studies, comment on fields, and manage quality control
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Status Filter */}
          <div className="mb-6">
            <div className="flex space-x-2">
              {[
                { key: 'pending', label: 'Pending Review' },
                { key: 'completed', label: 'Completed' },
                { key: 'revoked', label: 'Revoked' },
                { key: 'all', label: 'All Studies' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {/* Studies Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Studies List */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Studies ({studies.length})
                </h2>
              </div>

              <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
                {studies.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No studies to review</h3>
                    <p className="mt-1 text-sm text-gray-500">No studies match the current filter.</p>
                  </div>
                ) : (
                  studies.map((study) => (
                    <div
                      key={study.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedStudy?.id === study.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedStudy(study)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-mono text-gray-600">PMID: {study.pmid}</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              ICSR
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                            {study.title}
                          </h3>
                          <p className="text-xs text-gray-600 mb-1">
                            Drug: {study.drugName} | Event: {study.adverseEvent}
                          </p>
                          <div className="flex items-center gap-2">
                            {study.r3FormCompletedAt && (
                              <p className="text-xs text-green-600">
                                R3 Form completed: {new Date(study.r3FormCompletedAt).toLocaleDateString()}
                              </p>
                            )}
                            {study.revokedBy && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                                ↻ Resubmitted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Study Review Panel */}
            <div className="bg-white rounded-xl shadow-lg">
              {selectedStudy ? (
                <>
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Medical Review</h2>
                    <p className="text-sm text-gray-600 mt-1">PMID: {selectedStudy.pmid}</p>
                  </div>

                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Resubmission Notice - Shows if study was previously revoked */}
                    {selectedStudy.revokedBy && selectedStudy.revocationReason && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                        <div className="flex items-start">
                          <svg className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-900 mb-1">
                              ↻ Resubmitted After Revocation
                            </h3>
                            <p className="text-xs text-blue-800 mb-2">
                              This study was previously revoked and has been corrected by Data Entry. Please review the updates.
                            </p>
                            <div className="bg-blue-100 rounded p-2 mt-2">
                              <p className="text-xs text-blue-900">
                                <strong>Previous Revocation Reason:</strong>
                              </p>
                              <p className="text-xs text-blue-800 mt-1">{selectedStudy.revocationReason}</p>
                              {selectedStudy.revokedAt && (
                                <p className="text-xs text-blue-700 mt-1">
                                  Revoked on: {new Date(selectedStudy.revokedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Comprehensive Study Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Study Details</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-gray-900 text-base">{selectedStudy.title}</h4>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">PMID:</span>
                            <p className="text-gray-900">{selectedStudy.pmid}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Classification:</span>
                            <p className="text-gray-900">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                selectedStudy.userTag === 'ICSR' ? 'bg-red-100 text-red-800' :
                                selectedStudy.userTag === 'AOI' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedStudy.userTag}
                              </span>
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Drug:</span>
                            <p className="text-gray-900">{selectedStudy.drugName}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Adverse Event:</span>
                            <p className="text-gray-900">{selectedStudy.adverseEvent}</p>
                          </div>
                          {selectedStudy.journal && (
                            <div>
                              <span className="font-medium text-gray-700">Journal:</span>
                              <p className="text-gray-900">{selectedStudy.journal}</p>
                            </div>
                          )}
                          {selectedStudy.publicationDate && (
                            <div>
                              <span className="font-medium text-gray-700">Publication Date:</span>
                              <p className="text-gray-900">{selectedStudy.publicationDate}</p>
                            </div>
                          )}
                          {selectedStudy.authors && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-700">Authors:</span>
                              <p className="text-gray-900">{selectedStudy.authors}</p>
                            </div>
                          )}
                          {selectedStudy.doi && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-700">DOI:</span>
                              <p className="text-gray-900 break-all">{selectedStudy.doi}</p>
                            </div>
                          )}
                        </div>
                        
                        {selectedStudy.vancouverCitation && (
                          <div className="pt-2 border-t border-gray-200">
                            <span className="font-medium text-gray-700 text-sm">Vancouver Citation:</span>
                            <p className="text-xs text-gray-600 italic mt-1">{selectedStudy.vancouverCitation}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Inference / Triage Information */}
                    {(selectedStudy.serious || selectedStudy.identifiableHumanSubject || selectedStudy.textType || selectedStudy.summary) && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Triage Assessment</h3>
                        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {selectedStudy.serious !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">Serious:</span>
                                <p className={`font-semibold ${selectedStudy.serious ? 'text-red-600' : 'text-green-600'}`}>
                                  {selectedStudy.serious ? 'Yes' : 'No'}
                                </p>
                              </div>
                            )}
                            {selectedStudy.identifiableHumanSubject !== undefined && (
                              <div>
                                <span className="font-medium text-gray-700">Human Subject:</span>
                                <p className="text-gray-900">{selectedStudy.identifiableHumanSubject ? 'Yes' : 'No'}</p>
                              </div>
                            )}
                            {selectedStudy.textType && (
                              <div>
                                <span className="font-medium text-gray-700">Text Type:</span>
                                <p className="text-gray-900">{selectedStudy.textType}</p>
                              </div>
                            )}
                            {selectedStudy.authorPerspective && (
                              <div>
                                <span className="font-medium text-gray-700">Author Perspective:</span>
                                <p className="text-gray-900">{selectedStudy.authorPerspective}</p>
                              </div>
                            )}
                            {selectedStudy.testSubject && (
                              <div>
                                <span className="font-medium text-gray-700">Test Subject:</span>
                                <p className="text-gray-900">{selectedStudy.testSubject}</p>
                              </div>
                            )}
                            {selectedStudy.specialCase && (
                              <div>
                                <span className="font-medium text-gray-700">Special Case:</span>
                                <p className="text-gray-900">{selectedStudy.specialCase}</p>
                              </div>
                            )}
                          </div>
                          
                          {selectedStudy.summary && (
                            <div className="pt-2 border-t border-gray-200">
                              <span className="font-medium text-gray-700 text-sm">Summary:</span>
                              <p className="text-sm text-gray-800 mt-1">{selectedStudy.summary}</p>
                            </div>
                          )}
                          
                          {selectedStudy.justification && (
                            <div className="pt-2 border-t border-gray-200">
                              <span className="font-medium text-gray-700 text-sm">Justification:</span>
                              <p className="text-sm text-gray-800 mt-1">{selectedStudy.justification}</p>
                            </div>
                          )}
                          
                          {selectedStudy.keyEvents && Array.isArray(selectedStudy.keyEvents) && selectedStudy.keyEvents.length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <span className="font-medium text-gray-700 text-sm">Key Events:</span>
                              <ul className="list-disc list-inside text-sm text-gray-800 mt-1 space-y-1">
                                {selectedStudy.keyEvents.map((event, idx) => (
                                  <li key={idx}>{event}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {selectedStudy.administeredDrugs && Array.isArray(selectedStudy.administeredDrugs) && selectedStudy.administeredDrugs.length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <span className="font-medium text-gray-700 text-sm">Administered Drugs:</span>
                              <p className="text-sm text-gray-800 mt-1">{selectedStudy.administeredDrugs.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Abstract */}
                    {selectedStudy.abstract && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Abstract</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedStudy.abstract}</p>
                        </div>
                      </div>
                    )}

                    {/* R3 Form Fields Review */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">R3 Form Fields</h3>
                      <div className="space-y-4">
                        {R3_FORM_FIELDS.map((field) => {
                          const value = getFieldValue(field.key);
                          const comments = getFieldComments(field.key);
                          const isEditing = editingField === field.key;

                          return (
                            <div key={field.key} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {field.key} - {field.label}
                                  </h4>
                                  <span className="text-xs text-gray-500">Category: {field.category}</span>
                                </div>
                                <div className="flex space-x-2">
                                  <PermissionGate resource="medical_examiner" action="comment_fields">
                                    <button
                                      onClick={() => {
                                        setCommentingField(field.key);
                                        setShowCommentModal(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      Comment
                                    </button>
                                  </PermissionGate>
                                  <PermissionGate resource="medical_examiner" action="edit_fields">
                                    <button
                                      onClick={() => {
                                        setEditingField(field.key);
                                        setFieldValue(value);
                                      }}
                                      className="text-green-600 hover:text-green-800 text-xs"
                                    >
                                      Edit
                                    </button>
                                  </PermissionGate>
                                </div>
                              </div>

                              {/* Field Value */}
                              <div className="mb-2">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={fieldValue}
                                      onChange={(e) => setFieldValue(e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => updateFieldValue(field.key, fieldValue)}
                                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingField(null);
                                          setFieldValue('');
                                        }}
                                        className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded">
                                    {value || 'No value entered'}
                                  </p>
                                )}
                              </div>

                              {/* Field Comments */}
                              {comments.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-700">Comments:</p>
                                  {comments.map((comment) => (
                                    <div key={comment.id} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                      <p className="text-xs text-gray-800">{comment.comment}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        By {comment.userName} on {new Date(comment.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Additional Fields - Show all other fields that exist in r3FormData but not in predefined list */}
                      {selectedStudy.r3FormData && Object.keys(selectedStudy.r3FormData).filter(key => 
                        !R3_FORM_FIELDS.some(field => field.key === key) && selectedStudy.r3FormData?.[key]
                      ).length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-md font-semibold text-gray-800 mb-3 border-t pt-4">Additional R3 Fields</h4>
                          <div className="space-y-3">
                            {Object.keys(selectedStudy.r3FormData)
                              .filter(key => !R3_FORM_FIELDS.some(field => field.key === key) && selectedStudy.r3FormData?.[key])
                              .sort()
                              .map((fieldKey) => {
                                const value = selectedStudy.r3FormData?.[fieldKey] || '';
                                const comments = getFieldComments(fieldKey);
                                const isEditing = editingField === fieldKey;

                                return (
                                  <div key={fieldKey} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                        <h4 className="text-sm font-medium text-gray-900">{fieldKey}</h4>
                                      </div>
                                      <div className="flex space-x-2">
                                        <PermissionGate resource="medical_examiner" action="comment_fields">
                                          <button
                                            onClick={() => {
                                              setCommentingField(fieldKey);
                                              setShowCommentModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 text-xs"
                                          >
                                            Comment
                                          </button>
                                        </PermissionGate>
                                        <PermissionGate resource="medical_examiner" action="edit_fields">
                                          <button
                                            onClick={() => {
                                              setEditingField(fieldKey);
                                              setFieldValue(value);
                                            }}
                                            className="text-green-600 hover:text-green-800 text-xs"
                                          >
                                            Edit
                                          </button>
                                        </PermissionGate>
                                      </div>
                                    </div>

                                    <div className="mb-2">
                                      {isEditing ? (
                                        <div className="space-y-2">
                                          <input
                                            type="text"
                                            value={fieldValue}
                                            onChange={(e) => setFieldValue(e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          />
                                          <div className="flex space-x-2">
                                            <button
                                              onClick={() => updateFieldValue(fieldKey, fieldValue)}
                                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingField(null);
                                                setFieldValue('');
                                              }}
                                              className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-200">
                                          {value || 'No value entered'}
                                        </p>
                                      )}
                                    </div>

                                    {comments.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-700">Comments:</p>
                                        {comments.map((comment) => (
                                          <div key={comment.id} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                            <p className="text-xs text-gray-800">{comment.comment}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                              By {comment.userName} on {new Date(comment.createdAt).toLocaleDateString()}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                      <PermissionGate resource="medical_examiner" action="write">
                        <button
                          onClick={completeMedicalReview}
                          disabled={actionInProgress === 'complete'}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          {actionInProgress === 'complete' ? 'Completing...' : 'Approve Study'}
                        </button>
                      </PermissionGate>

                      <PermissionGate resource="medical_examiner" action="revoke_studies">
                        <button
                          onClick={() => setShowRevokeModal(true)}
                          disabled={actionInProgress === 'revoke'}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          Revoke Study
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Select a study to review</h3>
                  <p className="mt-1 text-sm text-gray-500">Choose a study from the list to begin medical review.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comment Modal */}
        {showCommentModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Field Comment</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Field: {commentingField && R3_FORM_FIELDS.find(f => f.key === commentingField)?.label}
                </p>
                <textarea
                  value={fieldComment}
                  onChange={(e) => setFieldComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Enter your comment about this field..."
                />
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setShowCommentModal(false);
                      setFieldComment('');
                      setCommentingField(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => commentingField && addFieldComment(commentingField, fieldComment)}
                    disabled={!fieldComment.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    Add Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revoke Modal */}
        {showRevokeModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Revoke Study</h3>
                <p className="text-sm text-gray-600 mb-3">
                  This will return the study to Data Entry for corrections.
                </p>
                <textarea
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Explain why this study needs to be revised..."
                  required
                />
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setShowRevokeModal(false);
                      setRevocationReason('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={revokeStudy}
                    disabled={!revocationReason.trim() || actionInProgress === 'revoke'}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {actionInProgress === 'revoke' ? 'Revoking...' : 'Revoke Study'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}