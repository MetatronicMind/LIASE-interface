"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Study {
  id: string;
  pmid: string;
  title: string;
  drugName: string;
  adverseEvent: string;
  userTag: string;
  r3FormStatus: string;
  r3FormData?: any;
  r3FormCompletedBy?: string;
  r3FormCompletedAt?: string;
  createdAt: string;
}

const R3_FORM_FIELDS = [
  { key: "C.2.r.1", label: "Reporter's Name", category: "A" },
  { key: "C.2.r.1.1", label: "Reporter's Title", category: "A" },
  { key: "C.2.r.1.2", label: "Reporter's Given Name", category: "A" },
  { key: "C.2.r.1.3", label: "Reporter's Middle Name", category: "A" },
  { key: "C.2.r.1.4", label: "Reporter's Family Name", category: "A" },
  { key: "C.2.r.2.1", label: "Reporter's Organisation", category: "A" },
  { key: "C.4.r.1", label: "Literature Reference(s)", category: "A" },
  { key: "D", label: "Patient Characteristics", category: "B" },
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
  { key: "D.7", label: "Relevant Medical History and Concurrent Conditions (not including reaction / event)", category: "C" },
  { key: "D.7.1.r", label: "Structured Information on Relevant Medical History (repeat as necessary)", category: "C" },
  { key: "D.7.1.r.2", label: "Start Date", category: "C" },
  { key: "D.7.1.r.3", label: "Continuing", category: "C" },
  { key: "D.7.1.r.4", label: "End Date", category: "C" },
  { key: "D.7.1.r.5", label: "Comments", category: "B" },
  { key: "D.7.1.r.6", label: "Family History", category: "B" },
  { key: "D.7.2", label: "Text for Relevant Medical History and Concurrent Conditions (not including reaction / event)", category: "B" },
  { key: "D.7.3", label: "Concomitant Therapies", category: "C" },
  { key: "D.8.r", label: "Relevant Past Drug History (repeat as necessary)", category: "B" },
  { key: "D.8.r.1", label: "Name of Drug as Reported", category: "B" },
  { key: "D.8.r.4", label: "Start Date", category: "B" },
  { key: "D.8.r.5", label: "End Date", category: "B" },
  { key: "D.9.1", label: "Date of Death", category: "C" },
  { key: "D.9.2.r", label: "Reported Cause(s) of Death (repeat as necessary)", category: "C" },
  { key: "D.9.2.r.2", label: "Reported Cause(s) of Death (free text)", category: "B" },
  { key: "E.i.1.1a", label: "Reaction / Event as Reported by the Primary Source in Native Language", category: "C" },
  { key: "E.i.1.1b", label: "Reaction / Event as Reported by the Primary Source Language", category: "B" },
  { key: "E.i.1.2", label: "Reaction / Event as Reported by the Primary Source for Translation", category: "B" },
  { key: "E.i.3.1", label: "Term Highlighted by the Reporter", category: "B" },
  { key: "E.i.3.2", label: "Seriousness Criteria at Event Level", category: "B" },
  { key: "E.i.3.2a", label: "Results in Death", category: "C" },
  { key: "E.i.3.2b", label: "Life Threatening", category: "C" },
  { key: "E.i.3.2c", label: "Caused / Prolonged Hospitalisation", category: "C" },
  { key: "E.i.3.2d", label: "Disabling / Incapacitating", category: "C" },
  { key: "E.i.3.2e", label: "Congenital Anomaly / Birth Defect", category: "C" },
  { key: "E.i.3.2f", label: "Other Medically Important Condition", category: "C" },
  { key: "E.i.4", label: "Date of Start of Reaction / Event", category: "C" },
  { key: "E.i.5", label: "Date of End of Reaction / Event", category: "C" },
  { key: "E.i.6a", label: "Duration of Reaction / Event (number)", category: "Null" },
  { key: "E.i.6b", label: "Duration of Reaction / Event (unit)", category: "Null" },
  { key: "E.i.7", label: "Outcome of Reaction / Event at the Time of Last Observation", category: "C" },
  { key: "E.i.9", label: "Identification of the Country Where the Reaction / Event Occurred", category: "A" },
  { key: "F.r", label: "Results of Tests and Procedures Relevant to the Investigation of the Patient (repeat as necessary)", category: "Null" },
  { key: "G.k.1", label: "Characterisation of Drug Role", category: "Null" },
  { key: "G.k.2", label: "Drug Identification", category: "Null" },
  { key: "H.1", label: "Case Narrative Including Clinical Course, Therapeutic Measures, Outcome and Additional Relevant Information", category: "Null" }
];

export default function FullReportPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchMedicalExaminerStudies();
  }, [currentPage, searchTerm]);

  const fetchMedicalExaminerStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/studies/medical-examiner?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching medical examiner studies:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = (study: Study) => {
    setSelectedStudy(study);
    setShowReport(true);
  };

  const closeReport = () => {
    setShowReport(false);
    setSelectedStudy(null);
  };

  const exportReport = () => {
    if (!selectedStudy) return;

    const reportData = {
      study: {
        pmid: selectedStudy.pmid,
        title: selectedStudy.title,
        drugName: selectedStudy.drugName,
        adverseEvent: selectedStudy.adverseEvent,
      },
      r3FormData: selectedStudy.r3FormData,
      completedAt: selectedStudy.r3FormCompletedAt,
      completedBy: selectedStudy.r3FormCompletedBy
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ICSR_Report_${selectedStudy.pmid}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "A":
        return "bg-blue-100 text-blue-800";
      case "B":
        return "bg-yellow-100 text-yellow-800";
      case "C":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Full Report (Medical Examiner)</h1>
        <p className="text-gray-600">
          Review completed ICSR studies with R3 form data
        </p>
      </div>

      {!showReport ? (
        <>
          {/* Search and Filters */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search completed ICSR studies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchMedicalExaminerStudies}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Studies List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid gap-6">
              {studies.map((study) => (
                <div
                  key={study.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {study.title}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-600 mb-2">
                        <span><strong>PMID:</strong> {study.pmid}</span>
                        <span><strong>Drug:</strong> {study.drugName}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Adverse Event:</strong> {study.adverseEvent}
                      </p>
                      {study.r3FormCompletedAt && (
                        <p className="text-sm text-gray-600">
                          <strong>Completed:</strong> {formatDate(study.r3FormCompletedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        ICSR
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Completed
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => viewReport(study)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      View Full Report
                    </button>
                  </div>
                </div>
              ))}

              {studies.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No completed ICSR studies available for review.
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Full Report Modal */
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  ICSR Full Report - {selectedStudy?.title}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  PMID: {selectedStudy?.pmid} | Drug: {selectedStudy?.drugName}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportReport}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Export Report
                </button>
                <button
                  onClick={closeReport}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Study Information */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Study Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Title:</p>
                    <p className="text-sm text-gray-900">{selectedStudy?.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">PMID:</p>
                    <p className="text-sm text-gray-900">{selectedStudy?.pmid}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Drug Name:</p>
                    <p className="text-sm text-gray-900">{selectedStudy?.drugName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Adverse Event:</p>
                    <p className="text-sm text-gray-900">{selectedStudy?.adverseEvent}</p>
                  </div>
                  {selectedStudy?.r3FormCompletedAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Form Completed:</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedStudy.r3FormCompletedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* R3 Form Data */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">R3 Form Data</h3>
                
                {R3_FORM_FIELDS.map((field) => {
                  const value = selectedStudy?.r3FormData?.[field.key] || "";
                  
                  if (!value) return null;
                  
                  return (
                    <div key={field.key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {field.key} - {field.label}
                          </h4>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(field.category)}`}>
                          Category {field.category}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                          {value}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {!selectedStudy?.r3FormData && (
                  <div className="text-center py-8 text-gray-500">
                    No R3 form data available for this study.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end items-center p-6 border-t border-gray-200">
              <button
                onClick={closeReport}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}