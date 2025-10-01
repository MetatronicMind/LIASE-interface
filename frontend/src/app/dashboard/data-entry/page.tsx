"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/config/api";

interface Study {
  id: string;
  pmid: string;
  title: string;
  drugName: string;
  adverseEvent: string;
  userTag: string;
  r3FormStatus: string;
  r3FormData?: any;
  createdAt: string;
}

interface R3FormData {
  [key: string]: string;
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

export default function DataEntryPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [showR3Form, setShowR3Form] = useState(false);
  const [r3FormData, setR3FormData] = useState<R3FormData>({});
  const [prefilledData, setPrefilledData] = useState<R3FormData>({});
  const [loadingR3Data, setLoadingR3Data] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchDataEntryStudies();
  }, [currentPage, searchTerm]);

  const fetchDataEntryStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token"); // Changed from "token" to "auth_token" for consistency
      
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm })
      });

      console.log('Fetching data entry studies with params:', Object.fromEntries(params.entries()));

      const response = await fetch(`${getApiBaseUrl()}/studies/data-entry?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Data entry API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Data entry API response data:', data);
        console.log('Number of ICSR studies found:', data.data?.length || 0);
        
        // Log debug information if available
        if (data.debug) {
          console.log('=== DEBUG INFORMATION ===');
          console.log('User Organization ID:', data.debug.userOrgId);
          console.log('Test query result:', data.debug.testQuery);
          console.log('Query result count:', data.debug.resultCount);
          console.log('========================');
        }
        
        setStudies(data.data || []);
      } else {
        const errorText = await response.text();
        console.error('Data entry API error:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error("Error fetching data entry studies:", error);
    } finally {
      setLoading(false);
    }
  };

  const openR3Form = async (study: Study) => {
    setSelectedStudy(study);
    setShowR3Form(true);
    setR3FormData(study.r3FormData || {});
    
    // Fetch pre-filled data from external API
    try {
      setLoadingR3Data(true);
      const token = localStorage.getItem("auth_token"); // Fixed: Changed from "token" to "auth_token" for consistency
      const params = new URLSearchParams({
        pmid: study.pmid,
        drug_code: "Synthon", // You might want to make this dynamic
        drugname: study.drugName
      });

      const response = await fetch(`${getApiBaseUrl()}/studies/${study.id}/r3-form-data?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPrefilledData(data.data || {});
      }
    } catch (error) {
      console.error("Error fetching R3 data:", error);
    } finally {
      setLoadingR3Data(false);
    }
  };

  const closeR3Form = () => {
    setShowR3Form(false);
    setSelectedStudy(null);
    setR3FormData({});
    setPrefilledData({});
  };

  const handleFormChange = (fieldKey: string, value: string) => {
    setR3FormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const saveR3Form = async () => {
    if (!selectedStudy) return;

    try {
      setSavingForm(true);
      const token = localStorage.getItem("auth_token"); // Fixed: Changed from "token" to "auth_token" for consistency

      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/r3-form`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formData: r3FormData }),
      });

      if (response.ok) {
        alert("R3 form data saved successfully!");
        // Update the study status locally
        setStudies(prev => prev.map(study => 
          study.id === selectedStudy.id 
            ? { ...study, r3FormStatus: 'in_progress', r3FormData }
            : study
        ));
      } else {
        throw new Error("Failed to save R3 form data");
      }
    } catch (error) {
      console.error("Error saving R3 form:", error);
      alert("Error saving R3 form data. Please try again.");
    } finally {
      setSavingForm(false);
    }
  };

  const completeR3Form = async () => {
    if (!selectedStudy) return;

    try {
      setSavingForm(true);
      const token = localStorage.getItem("auth_token"); // Fixed: Changed from "token" to "auth_token" for consistency

      // First save the current form data
      await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/r3-form`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formData: r3FormData }),
      });

      // Then mark as completed
      const response = await fetch(`${getApiBaseUrl()}/studies/${selectedStudy.id}/r3-form/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("R3 form completed successfully!");
        closeR3Form();
        fetchDataEntryStudies(); // Refresh the list
      } else {
        throw new Error("Failed to complete R3 form");
      }
    } catch (error) {
      console.error("Error completing R3 form:", error);
      alert("Error completing R3 form. Please try again.");
    } finally {
      setSavingForm(false);
    }
  };

  const getFieldValue = (fieldKey: string) => {
    return r3FormData[fieldKey] || prefilledData[fieldKey] || "";
  };

  const isFieldPrefilled = (fieldKey: string) => {
    return prefilledData[fieldKey] && !r3FormData[fieldKey];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Data Entry</h1>
        <p className="text-black">
          Fill out R3 XML forms for ICSR classified studies
        </p>
      </div>

      {!showR3Form ? (
        <>
          {/* Search and Filters */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search ICSR studies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchDataEntryStudies}
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
                      <h3 className="text-lg font-semibold text-black mb-2">
                        {study.title}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-800 mb-2">
                        <span><strong>PMID:</strong> {study.pmid}</span>
                        <span><strong>Drug:</strong> {study.drugName}</span>
                      </div>
                      <p className="text-sm text-black">
                        <strong>Adverse Event:</strong> {study.adverseEvent}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        ICSR
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(study.r3FormStatus)}`}>
                        {study.r3FormStatus === "not_started" ? "Not Started" : 
                         study.r3FormStatus === "in_progress" ? "In Progress" : "Completed"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => openR3Form(study)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      {study.r3FormStatus === "completed" ? "View R3 Form" : "Open R3 XML"}
                    </button>
                  </div>
                </div>
              ))}

              {studies.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No ICSR studies available for data entry.
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* R3 Form Modal */
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">
                R3 XML Form - {selectedStudy?.title}
              </h2>
              <button
                onClick={closeR3Form}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingR3Data ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading R3 data...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {R3_FORM_FIELDS.map((field) => {
                    const isPrefilled = isFieldPrefilled(field.key);
                    
                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="block text-sm font-medium text-black">
                          {field.key} - {field.label}
                          <span className="ml-2 text-xs text-gray-600">
                            (Category: {field.category})
                          </span>
                        </label>
                        <textarea
                          value={getFieldValue(field.key)}
                          onChange={(e) => handleFormChange(field.key, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black
                            ${isPrefilled ? "bg-blue-50 border-blue-200" : "border-gray-300"}
                          `}
                          rows={2}
                          placeholder={
                            field.category === "A" 
                              ? "Can be auto-filled from PubMed/study data - editable"
                              : "Enter value here..."
                          }
                        />
                        {isPrefilled && (
                          <p className="text-xs text-blue-600">
                            Pre-filled from external API - you can edit this field
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200">
              <button
                onClick={closeR3Form}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  onClick={saveR3Form}
                  disabled={savingForm || loadingR3Data}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {savingForm ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={completeR3Form}
                  disabled={savingForm || loadingR3Data}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Complete Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}