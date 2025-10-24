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

export default function QCPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchPendingR3Studies();
  }, []);

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
        setStudies(data.data || []);
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
        setStudies(prev => prev.filter(study => study.id !== studyId));
        setSelectedStudy(null);
        setComments("");
        alert("R3 XML form approved successfully! Study will proceed to Medical Reviewer.");
        fetchPendingR3Studies();
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
        setStudies(prev => prev.filter(study => study.id !== studyId));
        setSelectedStudy(null);
        setRejectionReason("");
        setShowRejectModal(false);
        alert("R3 XML form rejected successfully! Study has been returned to Data Entry for corrections.");
        fetchPendingR3Studies();
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">QUALITY CONTROL</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and approve R3 XML forms before Medical Review
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
                <p className="mt-1 text-sm text-gray-500">
                  All R3 XML forms have been reviewed.
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getClassificationColor(study.userTag)}`}>
                            {study.userTag}
                          </span>
                          <span className="text-xs text-gray-500">
                            Form completed: {new Date(study.r3FormCompletedAt || study.updatedAt).toLocaleDateString()}
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

          {/* Study Details Panel */}
          {selectedStudy && (
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">R3 XML Form Review</h3>
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

              <div className="px-4 sm:px-6 py-4">
                {/* Study Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Study Details</h4>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">PMID</p>
                        <PmidLink pmid={selectedStudy.pmid} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Classification</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getClassificationColor(selectedStudy.userTag)}`}>
                          {selectedStudy.userTag}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500">Title</p>
                        <p className="text-sm text-gray-900 mt-1">{selectedStudy.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Drug Name</p>
                        <p className="text-sm text-gray-900 mt-1">{selectedStudy.drugName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Adverse Event</p>
                        <p className="text-sm text-gray-900 mt-1">{selectedStudy.adverseEvent}</p>
                      </div>
                    </div>
                  </div>

                  {/* R3 Form Data Preview */}
                  {selectedStudy.r3FormData && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">R3 Form Summary</h4>
                      <div className="bg-gray-50 rounded-md p-3 text-xs space-y-1">
                        {Object.entries(selectedStudy.r3FormData).slice(0, 5).map(([key, value]) => (
                          <div key={key} className="flex">
                            <span className="font-medium text-gray-600 w-40">{key}:</span>
                            <span className="text-gray-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments (Optional)
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Add any comments for the Medical Reviewer..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <PermissionGate resource="QC" action="approve">
                      <button
                        onClick={() => approveR3Form(selectedStudy.id)}
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
                            Approve R3 XML Form
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
    </PermissionGate>
  );
}
