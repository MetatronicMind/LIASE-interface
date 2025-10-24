"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";
import { PmidLink } from "@/components/PmidLink";

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  drugName: string;
  adverseEvent: string;
  userTag: 'ICSR' | 'AOI' | 'No Case';
  qaApprovalStatus: 'pending' | 'approved' | 'rejected';
  qaComments?: string;
  r3FormStatus?: string;
  qcR3Status?: string;
  r3FormData?: any;
  createdAt: string;
  updatedAt: string;
  r3FormCompletedAt?: string;
}

type ReviewTab = 'triage' | 'r3xml';

export default function QAPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReviewTab>('triage');
  const [studies, setStudies] = useState<Study[]>([]);
  const [r3Studies, setR3Studies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'triage') {
      fetchPendingStudies();
    } else {
      fetchPendingR3Studies();
    }
  }, [activeTab]);

  const fetchPendingStudies = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/QC-pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
      } else {
        throw new Error("Failed to fetch pending studies");
      }
    } catch (error) {
      console.error("Error fetching studies:", error);
      setError("Failed to load studies for QC review");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingR3Studies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/QC-r3-pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setR3Studies(data.data || []);
      } else {
        throw new Error("Failed to fetch pending R3 studies");
      }
    } catch (error) {
      console.error("Error fetching R3 studies:", error);
      setError("Failed to load R3 forms for QC review");
    } finally {
      setLoading(false);
    }
  };

  const approveClassification = async (studyId: string) => {
    setActionInProgress(studyId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${studyId}/QC/approve`, {
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
        alert("Classification approved successfully!");
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
      const response = await fetch(`${getApiBaseUrl()}/studies/${studyId}/QC/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        setStudies(prev => prev.filter(study => study.id !== studyId));
        setSelectedStudy(null);
        setRejectionReason("");
        setShowRejectModal(false);
        alert("Classification rejected successfully! Study has been returned to Triage for re-classification.");
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

  const approveR3Form = async (studyId: string) => {
    setActionInProgress(studyId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${studyId}/QC/r3/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comments }),
      });

      if (response.ok) {
        setR3Studies(prev => prev.filter(study => study.id !== studyId));
        setSelectedStudy(null);
        setComments("");
        alert("R3 XML form approved successfully! Study will proceed to Medical Reviewer.");
      } else {
        throw new Error("Failed to approve R3 form");
      }
    } catch (error) {
      console.error("Error approving R3 form:", error);
      alert("Failed to approve R3 form. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  const rejectR3Form = async (studyId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setActionInProgress(studyId);
    try {
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
        setR3Studies(prev => prev.filter(study => study.id !== studyId));
        setSelectedStudy(null);
        setRejectionReason("");
        setShowRejectModal(false);
        alert("R3 XML form rejected successfully! Study has been returned to Data Entry for corrections.");
      } else {
        throw new Error("Failed to reject R3 form");
      }
    } catch (error) {
      console.error("Error rejecting R3 form:", error);
      alert("Failed to reject R3 form. Please try again.");
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">Loading QC queue...</p>
      </div>
    );
  }

  return (
    <PermissionGate resource="QC" action="read">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">QUALITY ASSURANCE</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and approve study classifications and R3 XML forms
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => {
                    setActiveTab('triage');
                    setSelectedStudy(null);
                    setComments("");
                    setRejectionReason("");
                  }}
                  className={`${
                    activeTab === 'triage'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  Triage Classifications ({studies.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('r3xml');
                    setSelectedStudy(null);
                    setComments("");
                    setRejectionReason("");
                  }}
                  className={`${
                    activeTab === 'r3xml'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  R3 XML Forms ({r3Studies.length})
                </button>
              </nav>
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
                  {activeTab === 'triage' ? `Pending Classifications (${studies.length})` : `Pending R3 XML Forms (${r3Studies.length})`}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {activeTab === 'triage' ? 'Studies awaiting QC approval' : 'R3 XML forms awaiting QC approval'}
                </p>
              </div>

              <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
                {(activeTab === 'triage' ? studies : r3Studies).length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {activeTab === 'triage' ? 'No pending classifications' : 'No pending R3 XML forms'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {activeTab === 'triage' ? 'All studies have been reviewed.' : 'All R3 forms have been reviewed.'}
                    </p>
                  </div>
                ) : (
                  (activeTab === 'triage' ? studies : r3Studies).map((study) => (
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
                            <span className="text-sm font-mono text-gray-600">PMID: <PmidLink pmid={study.pmid} className="text-blue-600 hover:underline" /></span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getClassificationColor(study.userTag)}`}>
                              {study.userTag}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                            {study.title}
                          </h3>
                          <p className="text-xs text-gray-600 mb-1">
                            Drug: {study.drugName} | Event: {study.adverseEvent}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activeTab === 'triage' 
                              ? `Classified: ${new Date(study.updatedAt).toLocaleDateString()}`
                              : `Completed: ${study.r3FormCompletedAt ? new Date(study.r3FormCompletedAt).toLocaleDateString() : 'N/A'}`
                            }
                          </p>
                        </div>
                        {selectedStudy?.id === study.id && (
                          <div className="ml-4">
                            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Study Details & Actions */}
            <div className="bg-white rounded-xl shadow-lg">
              {selectedStudy ? (
                <>
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Review Classification</h2>
                    <p className="text-sm text-gray-600 mt-1">PMID: <PmidLink pmid={selectedStudy.pmid} showIcon={true} /></p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Study Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Study Details</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Title:</span>
                          <p className="text-sm text-gray-900 mt-1">{selectedStudy.title}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Drug:</span>
                            <p className="text-sm text-gray-900">{selectedStudy.drugName}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Adverse Event:</span>
                            <p className="text-sm text-gray-900">{selectedStudy.adverseEvent}</p>
                          </div>
                        </div>
                        {activeTab === 'triage' ? (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Current Classification:</span>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getClassificationColor(selectedStudy.userTag)}`}>
                              {selectedStudy.userTag}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm font-medium text-gray-700">R3 Form Status:</span>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              {selectedStudy.r3FormStatus?.replace('_', ' ') || 'Completed'}
                            </span>
                            <div className="mt-2">
                              <span className="text-sm font-medium text-gray-700">Completed:</span>
                              <span className="ml-2 text-sm text-gray-900">
                                {selectedStudy.r3FormCompletedAt ? new Date(selectedStudy.r3FormCompletedAt).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QC Comments */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        QC Comments (Optional)
                      </label>
                      <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                        placeholder="Add any comments about this classification..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <PermissionGate resource="QC" action="approve">
                        <button
                          onClick={() => activeTab === 'triage' ? approveClassification(selectedStudy.id) : approveR3Form(selectedStudy.id)}
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
                              {activeTab === 'triage' ? 'Approve Classification' : 'Approve R3 XML Form'}
                            </>
                          )}
                        </button>
                      </PermissionGate>

                      <PermissionGate resource="QC" action="reject">
                        <button
                          onClick={() => setShowRejectModal(true)}
                          disabled={actionInProgress === selectedStudy.id}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {activeTab === 'triage' ? 'Reject Classification' : 'Reject R3 XML Form'}
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
                  <p className="mt-1 text-sm text-gray-500">Choose a study from the list to review its classification.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {activeTab === 'triage' ? 'Reject Classification' : 'Reject R3 XML Form'}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for rejection: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder={activeTab === 'triage' ? 'Explain why this classification is incorrect...' : 'Explain what needs to be corrected in the R3 form...'}
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason("");
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => selectedStudy && (activeTab === 'triage' ? rejectClassification(selectedStudy.id) : rejectR3Form(selectedStudy.id))}
                    disabled={!rejectionReason.trim() || actionInProgress === selectedStudy?.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {actionInProgress === selectedStudy?.id ? "Rejecting..." : "Reject"}
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