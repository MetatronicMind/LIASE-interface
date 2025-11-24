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
  abstract?: string;
  createdAt: string;
  updatedAt: string;
  
  // AI Inference Data
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
  sponsor?: string;
  effectiveClassification?: string;
  
  // AOI Assessment fields
  listedness?: 'Yes' | 'No' | null;
  seriousness?: 'Yes' | 'No' | null;
  
  // Legacy fields
  Drugname?: string;
  Serious?: string;
  special_case?: string;
  ICSR_classification?: string;
  Text_type?: string;
}

export default function AOIAssessmentPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [listedness, setListedness] = useState<'Yes' | 'No' | ''>('');
  const [seriousness, setSeriousness] = useState<'Yes' | 'No' | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAOIStudies();
  }, []);

  const fetchAOIStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies?limit=1000`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter for AOI cases only
        const aoiStudies = data.data.filter((study: Study) => study.userTag === 'AOI');
        setStudies(aoiStudies);
      } else {
        throw new Error("Failed to fetch AOI studies");
      }
    } catch (error) {
      console.error("Error fetching AOI studies:", error);
      setError("Failed to load AOI studies");
    } finally {
      setLoading(false);
    }
  };

  const handleStudySelect = (study: Study) => {
    setSelectedStudy(study);
    setListedness(study.listedness || '');
    setSeriousness(study.seriousness || '');
  };

  const handleSaveAssessment = async () => {
    if (!selectedStudy || !listedness || !seriousness) {
      alert("Please select both Listedness and Seriousness values");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/aoi-assessment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listedness,
          seriousness,
        }),
      });

      if (response.ok) {
        alert("AOI Assessment saved successfully!");
        // Update local state
        setStudies(prev => 
          prev.map(s => 
            s.id === selectedStudy.id 
              ? { ...s, listedness: listedness as 'Yes' | 'No', seriousness: seriousness as 'Yes' | 'No' }
              : s
          )
        );
        setSelectedStudy(null);
        setListedness('');
        setSeriousness('');
        fetchAOIStudies();
      } else {
        throw new Error("Failed to save AOI assessment");
      }
    } catch (error) {
      console.error("Error saving AOI assessment:", error);
      alert("Failed to save AOI assessment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AOI studies...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate resource="studies" action="read">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <h1 className="text-2xl sm:text-3xl font-bold">AOI Assessment</h1>
            <p className="mt-2 text-purple-100 text-sm sm:text-base">
              Assess Listedness and Seriousness for AOI cases
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
                AOI Cases ({studies.length})
              </h2>
            </div>

            {studies.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No AOI studies</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No studies classified as AOI are available for assessment.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {studies.map((study) => (
                  <li
                    key={study.id}
                    onClick={() => handleStudySelect(study)}
                    className="px-4 sm:px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <PmidLink pmid={study.pmid} />
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                            AOI
                          </span>
                          {study.listedness && study.seriousness && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                              ✓ Assessed
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">{study.title}</p>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-4">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Drug:</span> {study.drugName}
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Adverse Event:</span> {study.adverseEvent}
                          </p>
                          {study.listedness && (
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Listedness:</span> {study.listedness}
                            </p>
                          )}
                          {study.seriousness && (
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Seriousness:</span> {study.seriousness}
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
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">AOI Assessment</h3>
                <button
                  onClick={() => {
                    setSelectedStudy(null);
                    setListedness('');
                    setSeriousness('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-4 sm:px-6 py-4 max-h-[600px] overflow-y-auto">
                <div className="space-y-4">
                  {/* Study Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Study Details</h4>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">PMID</p>
                        <PmidLink pmid={selectedStudy.pmid} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Classification</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                          AOI
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

                  {/* Abstract */}
                  {(selectedStudy.aiInferenceData?.Abstract || selectedStudy.abstract) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Abstract</h4>
                      <div className="bg-gray-50 rounded-md p-3 text-sm">
                        <p className="text-gray-900 leading-relaxed">{selectedStudy.aiInferenceData?.Abstract || selectedStudy.abstract}</p>
                      </div>
                    </div>
                  )}

                  {/* AI Analysis & Clinical Data */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Analysis & Clinical Data
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {(selectedStudy.special_case || selectedStudy.specialCase) && (
                          <div>
                            <span className="font-medium text-gray-700">Special Case:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.special_case || selectedStudy.specialCase}</p>
                          </div>
                        )}
                        {(selectedStudy.Serious || selectedStudy.serious !== undefined) && (
                          <div>
                            <span className="font-medium text-gray-700">Serious Event:</span>
                            <p className="mt-1 text-gray-900">
                              {typeof selectedStudy.serious === 'boolean' 
                                ? (selectedStudy.serious ? 'Yes' : 'No')
                                : selectedStudy.Serious || 'Unknown'
                              }
                            </p>
                          </div>
                        )}
                        {selectedStudy.aoiClassification && (
                          <div>
                            <span className="font-medium text-gray-700">AOI Classification:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.aoiClassification}</p>
                          </div>
                        )}
                        {selectedStudy.approvedIndication && (
                          <div>
                            <span className="font-medium text-gray-700">Approved Indication:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.approvedIndication}</p>
                          </div>
                        )}
                      </div>

                      {selectedStudy.aoiDrugEffect && (
                        <div>
                          <span className="font-medium text-gray-700">AOI Drug Effect:</span>
                          <p className="mt-1 text-gray-900 text-sm">{selectedStudy.aoiDrugEffect}</p>
                        </div>
                      )}
                      {selectedStudy.justification && (
                        <div>
                          <span className="font-medium text-gray-700">Justification:</span>
                          <p className="mt-1 text-gray-900 text-sm">{selectedStudy.justification}</p>
                        </div>
                      )}
                      {selectedStudy.summary && (
                        <div>
                          <span className="font-medium text-gray-700">Summary:</span>
                          <p className="mt-1 text-gray-900 text-sm">{selectedStudy.summary}</p>
                        </div>
                      )}

                      {selectedStudy.administeredDrugs && Array.isArray(selectedStudy.administeredDrugs) && selectedStudy.administeredDrugs.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Administered Drugs:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {selectedStudy.administeredDrugs.map((drug, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                {drug}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AOI Assessment Form */}
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <h4 className="font-semibold text-gray-900 mb-4">Assessment</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Listedness <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={listedness}
                          onChange={(e) => setListedness(e.target.value as 'Yes' | 'No' | '')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seriousness <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={seriousness}
                          onChange={(e) => setSeriousness(e.target.value as 'Yes' | 'No' | '')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveAssessment}
                      disabled={!listedness || !seriousness || saving}
                      className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Assessment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
