"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/config/api";
import { useSearchParams, useRouter } from "next/navigation";
import { PmidLink } from "@/components/PmidLink";
import PDFAttachmentUpload from "@/components/PDFAttachmentUpload";

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
  drugName: string;
  adverseEvent: string;
  userTag: string;
  r3FormStatus: string;
  r3FormData?: any;
  createdAt: string;
  fieldComments?: FieldComment[];
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    uploadedByName?: string;
  }>;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  // Additional study fields from backend
  authors?: string[] | string;
  journal?: string;
  publicationDate?: string;
  abstract?: string;
  // Raw AI Inference Data
  aiInferenceData?: StudyAIData;
  // AI Inference Fields - these are stored directly on the study object
  doi?: string;
  specialCase?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  patientDetails?: string;
  keyEvents?: string | string[];
  relevantDates?: string;
  administeredDrugs?: string[] | string;
  attributability?: string;
  drugEffect?: string;
  summary?: string;
  identifiableHumanSubject?: boolean | string;
  textType?: string;
  authorPerspective?: string;
  confirmedPotentialICSR?: boolean | string;
  icsrClassification?: string;
  substanceGroup?: string;
  vancouverCitation?: string;
  leadAuthor?: string;
  serious?: boolean | string;
  testSubject?: string;
  aoiDrugEffect?: string;
  approvedIndication?: string;
  aoiClassification?: string;
  justification?: string;
  clientName?: string;
  sponsor?: string;
}

interface StudyAIData {
  PMID: string;
  DOI: string;
  special_case: string;
  Country_of_first_author: string;
  Country_of_occurrence: string;
  Patient_details: string;
  Key_events: string;
  Relevant_dates: string;
  Administered_drugs: string;
  Attributability: string;
  Drug_effect: string;
  Summary: string;
  Identifiable_human_subject: string;
  Text_type: string;
  Author_perspective: string;
  Adverse_event: string;
  Confirmed_potential_ICSR: string;
  ICSR_classification: string;
  Substance_group: string;
  Reference_database: string;
  Date_and_time: string;
  Vancouver_citation: string;
  pubdate: string;
  Lead_author: string;
  Serious: string;
  Test_subject: string;
  AOI_drug_effect: string;
  Approved_indication: string;
  AOI_classification: string;
  Justification: string;
  Client_name: string;
  Drugname: string;
  Sponsor: string;
}

interface R3FormData {
  [key: string]: string;
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
  
  // Patient Characteristics (Category B & C)
  { key: "D", label: "Patient Characteristics", category: "B", required: false, section: "patient", isHeader: true },
  { key: "D.1", label: "Patient (name or initials)", category: "C", required: false, section: "patient" },
  { key: "D.2.1", label: "Date of Birth", category: "C", required: false, section: "patient" },
  { key: "D.2.2", label: "Age at Time of Onset of Reaction / Event", category: "C", required: false, section: "patient" },
  { key: "D.2.2a", label: "Age at Time of Onset of Reaction / Event (number)", category: "B", required: false, section: "patient" },
  { key: "D.2.2b", label: "Age at Time of Onset of Reaction / Event (unit)", category: "B", required: false, section: "patient" },
  { key: "D.2.2.1a", label: "Gestation Period When Reaction / Event Was Observed in the Foetus (number)", category: "C", required: false, section: "patient" },
  { key: "D.2.2.1b", label: "Gestation Period When Reaction / Event Was Observed in the Foetus (unit)", category: "B", required: false, section: "patient" },
  { key: "D.2.3", label: "Patient Age Group (as per reporter)", category: "C", required: false, section: "patient" },
  { key: "D.3", label: "Body Weight (kg)", category: "C", required: false, section: "patient" },
  { key: "D.4", label: "Height (cm)", category: "C", required: false, section: "patient" },
  { key: "D.5", label: "Sex", category: "C", required: false, section: "patient" },
  { key: "D.7", label: "Relevant Medical History and Concurrent Conditions", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r", label: "Structured Information - Patient History", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r.2", label: "Start Date of Medical History", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r.3", label: "Continuing Medical History", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r.4", label: "End Date of Medical History", category: "C", required: false, section: "patient" },
  { key: "D.7.3", label: "Structured Information Available", category: "C", required: false, section: "patient" },
  { key: "D.9.1", label: "Case Death", category: "C", required: false, section: "patient" },
  { key: "D.9.2.r", label: "Death Details", category: "C", required: false, section: "patient" },
  
  // Reaction/Event Information (Category E)
  { key: "E.i.1.1a", label: "Reaction/Event (MedDRA terminology)", category: "C", required: true, section: "reaction" },
  { key: "E.i.3.2a", label: "Outcome - Recovered/Resolved", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2b", label: "Outcome - Recovering/Resolving", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2c", label: "Outcome - Not Recovered/Not Resolved", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2d", label: "Outcome - Recovered/Resolved with Sequelae", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2e", label: "Outcome - Fatal", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2f", label: "Outcome - Unknown", category: "C", required: false, section: "reaction" },
  { key: "E.i.4", label: "Date of Start of Reaction/Event", category: "C", required: false, section: "reaction" },
  { key: "E.i.5", label: "Date of End of Reaction/Event", category: "C", required: false, section: "reaction" },
  { key: "E.i.7", label: "Medical Confirmation by Healthcare Professional", category: "C", required: false, section: "reaction" },
];

export default function R3FormPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studyId = searchParams.get("studyId");

  const [study, setStudy] = useState<Study | null>(null);
  const [studyAIData, setStudyAIData] = useState<StudyAIData | null>(null);
  const [r3FormData, setR3FormData] = useState<R3FormData>({});
  const [prefilledData, setPrefilledData] = useState<R3FormData>({});
  const [loading, setLoading] = useState(true);
  const [loadingAIData, setLoadingAIData] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Helper function to get field comments for a specific field
  const getFieldComments = (fieldKey: string): FieldComment[] => {
    if (!study?.fieldComments) return [];
    return study.fieldComments.filter(comment => comment.fieldKey === fieldKey);
  };

  useEffect(() => {
    if (!studyId) {
      router.push("/dashboard/data-entry");
      return;
    }
    fetchStudyData();
  }, [studyId]);

  const fetchStudyData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      
      // Fetch study details
      const studyResponse = await fetch(`${getApiBaseUrl()}/studies/${studyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (studyResponse.ok) {
        const studyData = await studyResponse.json();
        setStudy(studyData);
        setR3FormData(studyData.r3FormData || {});
        
        // Fetch AI inference data
        await fetchAIInferenceData(studyData);
      } else {
        throw new Error("Failed to fetch study data");
      }
    } catch (error) {
      console.error("Error fetching study data:", error);
      alert("Error loading study data. Redirecting back to data entry.");
      router.push("/dashboard/data-entry");
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInferenceData = async (studyData: Study) => {
    try {
      setLoadingAIData(true);
      const token = localStorage.getItem("auth_token");
      
      // First, get the complete study object with all AI inference fields
      const studyResponse = await fetch(`${getApiBaseUrl()}/studies/${studyData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let completeStudyData = studyData;
      if (studyResponse.ok) {
        completeStudyData = await studyResponse.json();
        // Update our study state with complete data
        setStudy(completeStudyData);
      }
      
      // Then fetch external R3 field data
      const params = new URLSearchParams({
        pmid: studyData.pmid,
        drug_code: "Synthon",
        drugname: studyData.drugName
      });

      const r3Response = await fetch(`${getApiBaseUrl()}/studies/${studyData.id}/r3-form-data?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let externalR3Data = {};
      if (r3Response.ok) {
        const r3Data = await r3Response.json();
        externalR3Data = r3Data.data || {};
      }

      // Set the raw AI inference data for sidebar display
      if (completeStudyData.aiInferenceData) {
        setStudyAIData(completeStudyData.aiInferenceData);
      }

      // Merge and populate form fields from all sources
      const prefilledFormData = mergeDataSources(externalR3Data, completeStudyData.aiInferenceData || null, completeStudyData);
      setPrefilledData(prefilledFormData);
      
    } catch (error) {
      console.error("Error fetching AI inference data:", error);
    } finally {
      setLoadingAIData(false);
    }
  };

  const mergeDataSources = (externalR3Data: any, studyAIInfo: StudyAIData | null, studyData: Study): R3FormData => {
    const merged: R3FormData = {};
    
    // First, populate from external R3 API data (highest priority)
    Object.keys(externalR3Data).forEach(key => {
      if (externalR3Data[key] && externalR3Data[key] !== "NA" && externalR3Data[key] !== "False") {
        merged[key] = externalR3Data[key];
      }
    });
    
    // Then, populate from study's normalized AI inference fields (these are stored directly on study object)
    
    // Reporter Information from study data
    if (studyData.leadAuthor && !merged["C.2.r.1"]) {
      const authorParts = studyData.leadAuthor.split(' ');
      if (authorParts.length > 0) {
        merged["C.2.r.1"] = studyData.leadAuthor;
        merged["C.2.r.1.2"] = authorParts[0]; // Given name
        if (authorParts.length > 1) {
          merged["C.2.r.1.4"] = authorParts[authorParts.length - 1]; // Family name
        }
        if (authorParts.length > 2) {
          merged["C.2.r.1.3"] = authorParts.slice(1, -1).join(' '); // Middle names
        }
      }
    }
    
    // Alternative: if leadAuthor not available, try from authors array
    if (!merged["C.2.r.1"] && studyData.authors) {
      const authorsArray = Array.isArray(studyData.authors) ? studyData.authors : [studyData.authors];
      if (authorsArray.length > 0) {
        const firstAuthor = authorsArray[0];
        const authorParts = firstAuthor.split(' ');
        merged["C.2.r.1"] = firstAuthor;
        merged["C.2.r.1.2"] = authorParts[0];
        if (authorParts.length > 1) {
          merged["C.2.r.1.4"] = authorParts[authorParts.length - 1];
        }
      }
    }
    
    // Literature Reference from study data
    if (studyData.vancouverCitation && !merged["C.4.r.1"]) {
      merged["C.4.r.1"] = studyData.vancouverCitation;
    } else if (!merged["C.4.r.1"]) {
      // Build citation from available study data
      let citation = "";
      if (studyData.authors) {
        const authorsArray = Array.isArray(studyData.authors) ? studyData.authors : [studyData.authors];
        citation += authorsArray.join(", ") + ". ";
      }
      if (studyData.title) {
        citation += studyData.title + ". ";
      }
      if (studyData.journal) {
        citation += studyData.journal + ". ";
      }
      if (studyData.publicationDate) {
        citation += new Date(studyData.publicationDate).getFullYear() + ". ";
      }
      citation += `PMID: ${studyData.pmid}`;
      if (studyData.doi) {
        citation += `. DOI: ${studyData.doi}`;
      }
      merged["C.4.r.1"] = citation;
    }
    
    // Patient Details from study AI inference data
    if (studyData.patientDetails && !merged["D.7.1.r"]) {
      merged["D.7.1.r"] = studyData.patientDetails;
    }
    
    // Medical History from study summary or abstract
    if (!merged["D.7"] && (studyData.summary || studyData.abstract)) {
      merged["D.7"] = studyData.summary || studyData.abstract || "";
    }
    
    // Key Events can help populate medical history
    if (studyData.keyEvents && !merged["D.7.1.r"]) {
      const keyEventsStr = Array.isArray(studyData.keyEvents) ? studyData.keyEvents.join('; ') : studyData.keyEvents;
      merged["D.7.1.r"] = `Key Events: ${keyEventsStr}`;
    }
    
    // Relevant dates
    if (studyData.relevantDates && !merged["D.7.1.r.2"]) {
      merged["D.7.1.r.2"] = studyData.relevantDates;
    }
    
    // Adverse Event/Reaction Information
    if (studyData.adverseEvent && !merged["E.i.1.1a"]) {
      merged["E.i.1.1a"] = studyData.adverseEvent;
    }
    
    // Drug Effect determines outcome
    if (studyData.drugEffect && !merged["E.i.3.2c"]) {
      // Map drug effect to outcome
      if (studyData.drugEffect.toLowerCase().includes('adverse') || 
          studyData.drugEffect.toLowerCase().includes('negative')) {
        merged["E.i.3.2c"] = "True"; // Not Recovered/Not Resolved
      }
    }
    
    // Serious adverse events
    if (studyData.serious && !merged["E.i.3.2e"]) {
      const isSerious = studyData.serious === true || studyData.serious === 'Yes' || studyData.serious === 'true';
      if (isSerious) {
        merged["E.i.3.2e"] = "True"; // Fatal outcome possibility
      }
    }
    
    // Medical confirmation from text type or author perspective
    if (studyData.textType && !merged["E.i.7"]) {
      if (studyData.textType.toLowerCase().includes('case') || 
          studyData.textType.toLowerCase().includes('report')) {
        merged["E.i.7"] = "3"; // Healthcare professional confirmation
      }
    }
    
    // Country information for reporting
    if (studyData.countryOfFirstAuthor && !merged["C.2.r.2.1"]) {
      merged["C.2.r.2.1"] = `Institution in ${studyData.countryOfFirstAuthor}`;
    }
    
    // Also try to get data from the raw AI inference data object if available
    if (studyAIInfo) {
      // Fallback mappings from raw AI data if study fields not populated
      if (studyAIInfo.Lead_author && !merged["C.2.r.1"]) {
        const authorParts = studyAIInfo.Lead_author.split(' ');
        merged["C.2.r.1"] = studyAIInfo.Lead_author;
        merged["C.2.r.1.2"] = authorParts[0];
        if (authorParts.length > 1) {
          merged["C.2.r.1.4"] = authorParts[authorParts.length - 1];
        }
      }
      
      if (studyAIInfo.Vancouver_citation && !merged["C.4.r.1"]) {
        merged["C.4.r.1"] = studyAIInfo.Vancouver_citation;
      }
      
      if (studyAIInfo.Patient_details && !merged["D.7.1.r"]) {
        merged["D.7.1.r"] = studyAIInfo.Patient_details;
      }
      
      if (studyAIInfo.Adverse_event && !merged["E.i.1.1a"]) {
        merged["E.i.1.1a"] = studyAIInfo.Adverse_event;
      }
      
      if (studyAIInfo.Country_of_first_author && !merged["C.2.r.2.1"]) {
        merged["C.2.r.2.1"] = `Institution in ${studyAIInfo.Country_of_first_author}`;
      }
    }
    
    return merged;
  };

  const handleFormChange = (fieldKey: string, value: string) => {
    setR3FormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const getFieldValue = (fieldKey: string) => {
    return r3FormData[fieldKey] || prefilledData[fieldKey] || "";
  };

  const isFieldPrefilled = (fieldKey: string) => {
    return prefilledData[fieldKey] && !r3FormData[fieldKey];
  };

  const saveR3Form = async () => {
    if (!study) return;

    try {
      setSavingForm(true);
      const token = localStorage.getItem("auth_token");

      // Merge prefilled data with manually entered data
      // Manually entered data (r3FormData) takes priority over prefilled data
      const completeFormData = {
        ...prefilledData,  // First, include all prefilled data from API
        ...r3FormData      // Then override with any manually entered data
      };

      const response = await fetch(`${getApiBaseUrl()}/studies/${study.id}/r3-form`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formData: completeFormData }),
      });

      if (response.ok) {
        alert("R3 form data saved successfully!");
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
    if (!study) return;

    try {
      setSavingForm(true);
      const token = localStorage.getItem("auth_token");

      // Merge prefilled data with manually entered data
      // Manually entered data (r3FormData) takes priority over prefilled data
      const completeFormData = {
        ...prefilledData,  // First, include all prefilled data from API
        ...r3FormData      // Then override with any manually entered data
      };

      // First save the complete form data (including prefilled data)
      await fetch(`${getApiBaseUrl()}/studies/${study.id}/r3-form`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formData: completeFormData }),
      });

      // Then mark as completed
      const response = await fetch(`${getApiBaseUrl()}/studies/${study.id}/r3-form/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("R3 form completed successfully!");
        router.push("/dashboard/data-entry");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading study data...</p>
        </div>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Study Not Found</h2>
          <button
            onClick={() => router.push("/dashboard/data-entry")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Data Entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Side Panel */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-12' : 'w-80'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h3 className="text-lg font-semibold text-gray-900">Study Information</h3>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          {/* Content */}
          {!sidebarCollapsed && (
            <div className="flex-1 p-4 overflow-y-auto">
              {/* Basic Study Info */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">PMID:</span>
                    <span className="ml-2"><PmidLink pmid={study.pmid} showIcon={true} /></span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Drug:</span>
                    <span className="ml-2 text-gray-900">{study.drugName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Adverse Event:</span>
                    <span className="ml-2 text-gray-900">{study.adverseEvent}</span>
                  </div>
                </div>
              </div>

              {/* AI Inference Data - COMPLETE AI PROCESSING FIELDS */}
              {loadingAIData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading AI data...</span>
                </div>
              ) : studyAIData && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 text-base border-b pb-2">AI Processing Data (Complete)</h4>
                  
                  {/* Classification Fields */}
                  {(studyAIData.Serious || studyAIData.Confirmed_potential_ICSR || studyAIData.ICSR_classification) && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h5 className="font-semibold text-gray-900 text-xs mb-2 uppercase">Classification</h5>
                      {studyAIData.Serious && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Serious:</span>
                          <p className={`mt-0.5 text-sm font-semibold ${studyAIData.Serious.toLowerCase() === 'yes' ? 'text-red-600' : 'text-green-600'}`}>
                            {studyAIData.Serious}
                          </p>
                        </div>
                      )}
                      {studyAIData.Confirmed_potential_ICSR && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Confirmed ICSR:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Confirmed_potential_ICSR}</p>
                        </div>
                      )}
                      {studyAIData.ICSR_classification && (
                        <div>
                          <span className="font-medium text-gray-600 text-sm">ICSR Classification:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.ICSR_classification}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Identification Fields */}
                  {(studyAIData.DOI || studyAIData.special_case || studyAIData.Lead_author || studyAIData.Vancouver_citation) && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <h5 className="font-semibold text-gray-900 text-xs mb-2 uppercase">Identification</h5>
                      {studyAIData.DOI && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">DOI:</span>
                          <p className="mt-0.5 text-sm text-gray-900 break-all">{studyAIData.DOI}</p>
                        </div>
                      )}
                      {studyAIData.special_case && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Special Case:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.special_case}</p>
                        </div>
                      )}
                      {studyAIData.Lead_author && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Lead Author:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Lead_author}</p>
                        </div>
                      )}
                      {studyAIData.Vancouver_citation && (
                        <div>
                          <span className="font-medium text-gray-600 text-sm">Vancouver Citation:</span>
                          <p className="mt-0.5 text-xs text-gray-800 italic">{studyAIData.Vancouver_citation}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Geographic Fields */}
                  {(studyAIData.Country_of_first_author || studyAIData.Country_of_occurrence) && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <h5 className="font-semibold text-gray-900 text-xs mb-2 uppercase">Geographic</h5>
                      {studyAIData.Country_of_first_author && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Country (First Author):</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Country_of_first_author}</p>
                        </div>
                      )}
                      {studyAIData.Country_of_occurrence && (
                        <div>
                          <span className="font-medium text-gray-600 text-sm">Country (Occurrence):</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Country_of_occurrence}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Medical Analysis Fields */}
                  {(studyAIData.Patient_details || studyAIData.Key_events || studyAIData.Administered_drugs || studyAIData.Relevant_dates) && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <h5 className="font-semibold text-gray-900 text-xs mb-2 uppercase">Medical Analysis</h5>
                      {studyAIData.Patient_details && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Patient Details:</span>
                          <p className="mt-0.5 text-sm text-gray-900 bg-white p-2 rounded border border-purple-100">{studyAIData.Patient_details}</p>
                        </div>
                      )}
                      {studyAIData.Key_events && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Key Events:</span>
                          <p className="mt-0.5 text-sm text-gray-900 bg-white p-2 rounded border border-purple-100">{studyAIData.Key_events}</p>
                        </div>
                      )}
                      {studyAIData.Administered_drugs && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Administered Drugs:</span>
                          <p className="mt-0.5 text-sm text-gray-900 bg-white p-2 rounded border border-purple-100">{studyAIData.Administered_drugs}</p>
                        </div>
                      )}
                      {studyAIData.Relevant_dates && (
                        <div>
                          <span className="font-medium text-gray-600 text-sm">Relevant Dates:</span>
                          <p className="mt-0.5 text-sm text-gray-900 bg-white p-2 rounded border border-purple-100">{studyAIData.Relevant_dates}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Drug Effect & Assessment */}
                  {(studyAIData.Attributability || studyAIData.Drug_effect || studyAIData.AOI_drug_effect || studyAIData.Approved_indication || studyAIData.AOI_classification) && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <h5 className="font-semibold text-gray-900 text-xs mb-2 uppercase">Drug Effect & Assessment</h5>
                      {studyAIData.Attributability && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Attributability:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Attributability}</p>
                        </div>
                      )}
                      {studyAIData.Drug_effect && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Drug Effect:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Drug_effect}</p>
                        </div>
                      )}
                      {studyAIData.AOI_drug_effect && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">AOI Drug Effect:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.AOI_drug_effect}</p>
                        </div>
                      )}
                      {studyAIData.Approved_indication && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Approved Indication:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Approved_indication}</p>
                        </div>
                      )}
                      {studyAIData.AOI_classification && (
                        <div>
                          <span className="font-medium text-gray-600 text-sm">AOI Classification:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.AOI_classification}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Content Classification */}
                  {(studyAIData.Text_type || studyAIData.Author_perspective || studyAIData.Identifiable_human_subject || studyAIData.Test_subject) && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <h5 className="font-semibold text-gray-900 text-xs mb-2 uppercase">Content Classification</h5>
                      {studyAIData.Text_type && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Text Type:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Text_type}</p>
                        </div>
                      )}
                      {studyAIData.Author_perspective && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Author Perspective:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Author_perspective}</p>
                        </div>
                      )}
                      {studyAIData.Identifiable_human_subject && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Identifiable Human Subject:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Identifiable_human_subject}</p>
                        </div>
                      )}
                      {studyAIData.Test_subject && (
                        <div>
                          <span className="font-medium text-gray-600 text-sm">Test Subject:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Test_subject}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Business Information */}
                  {(studyAIData.Substance_group || studyAIData.Client_name || studyAIData.Sponsor) && (
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                      <h5 className="font-semibold text-gray-900 text-xs mb-2 uppercase">Business Information</h5>
                      {studyAIData.Substance_group && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Substance Group:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Substance_group}</p>
                        </div>
                      )}
                      {studyAIData.Client_name && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">Client Name:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Client_name}</p>
                        </div>
                      )}
                      {studyAIData.Sponsor && (
                        <div>
                          <span className="font-medium text-gray-600 text-sm">Sponsor:</span>
                          <p className="mt-0.5 text-sm text-gray-900">{studyAIData.Sponsor}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Summary & Justification */}
                  {(studyAIData.Summary || studyAIData.Justification) && (
                    <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                      <h5 className="font-semibold text-gray-900 text-xs mb-2 uppercase">Analysis Summary</h5>
                      {studyAIData.Summary && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-600 text-sm">AI Summary:</span>
                          <p className="mt-0.5 text-sm text-gray-900 bg-white p-2 rounded border border-teal-100">{studyAIData.Summary}</p>
                        </div>
                      )}
                      {studyAIData.Justification && (
                        <div>
                          <span className="font-medium text-gray-600 text-sm">Justification:</span>
                          <p className="mt-0.5 text-sm text-gray-900 bg-white p-2 rounded border border-teal-100">{studyAIData.Justification}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">R3 XML Form</h1>
              <p className="text-sm text-gray-600 mt-1">{study.title}</p>
            </div>
            <button
              onClick={() => router.push("/dashboard/data-entry")}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Data Entry
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Revocation Notice - Shows if study was previously revoked */}
            {study?.revokedBy && study?.revocationReason && (
              <div className="mb-6 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-orange-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-orange-900 mb-1">
                      ⚠️ Study Revoked by Medical Reviewer
                    </h3>
                    <p className="text-xs text-orange-800 mb-2">
                      This study was revoked and sent back for corrections. Please address the issues mentioned below.
                    </p>
                    <div className="bg-orange-100 rounded p-3 mt-2">
                      <p className="text-xs text-orange-900 font-semibold">Revocation Reason:</p>
                      <p className="text-sm text-orange-800 mt-1">{study.revocationReason}</p>
                      {study.revokedAt && (
                        <p className="text-xs text-orange-700 mt-2">
                          Revoked on: {new Date(study.revokedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* PDF Attachments Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <PDFAttachmentUpload
                studyId={study.id}
                attachments={study.attachments || []}
                onUploadComplete={async () => {
                  // Fetch the updated study with new attachments
                  fetchStudyData();
                }}
              />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Reporter Information Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  Reporter Information (Category A)
                </h2>
                
                <div className="grid gap-6">
                  {R3_FORM_FIELDS.filter(field => field.section === 'reporter' && !field.isHeader).map((field) => {
                    const isPrefilled = isFieldPrefilled(field.key);
                    const fieldComments = getFieldComments(field.key);
                    
                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.key} - {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          <span className="ml-2 text-xs text-gray-500">
                            (Category: {field.category})
                          </span>
                        </label>
                        
                        {/* Medical Reviewer Comments */}
                        {fieldComments.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center text-yellow-800">
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-semibold">Medical Reviewer Comments:</span>
                            </div>
                            {fieldComments.map((comment) => (
                              <div key={comment.id} className="bg-yellow-100 rounded p-2">
                                <p className="text-sm text-yellow-900">{comment.comment}</p>
                                <p className="text-xs text-yellow-700 mt-1">
                                  By {comment.userName} on {new Date(comment.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <textarea
                          value={getFieldValue(field.key)}
                          onChange={(e) => handleFormChange(field.key, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black
                            ${isPrefilled ? "bg-blue-50 border-blue-200" : "border-gray-300"}
                            ${fieldComments.length > 0 ? "border-yellow-300 focus:ring-yellow-400" : ""}
                          `}
                          rows={field.key === 'C.4.r.1' ? 3 : 2}
                          placeholder="Auto-filled from PubMed/study data - editable"
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
              </div>

              {/* Patient Characteristics Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  Patient Characteristics (Category B & C)
                </h2>
                
                <div className="grid gap-6">
                  {R3_FORM_FIELDS.filter(field => field.section === 'patient' && !field.isHeader).map((field) => {
                    const isPrefilled = isFieldPrefilled(field.key);
                    const fieldComments = getFieldComments(field.key);
                    
                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.key} - {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          <span className="ml-2 text-xs text-gray-500">
                            (Category: {field.category})
                          </span>
                        </label>
                        
                        {/* Medical Reviewer Comments */}
                        {fieldComments.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center text-yellow-800">
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-semibold">Medical Reviewer Comments:</span>
                            </div>
                            {fieldComments.map((comment) => (
                              <div key={comment.id} className="bg-yellow-100 rounded p-2">
                                <p className="text-sm text-yellow-900">{comment.comment}</p>
                                <p className="text-xs text-yellow-700 mt-1">
                                  By {comment.userName} on {new Date(comment.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <textarea
                          value={getFieldValue(field.key)}
                          onChange={(e) => handleFormChange(field.key, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black
                            ${isPrefilled ? "bg-blue-50 border-blue-200" : "border-gray-300"}
                            ${fieldComments.length > 0 ? "border-yellow-300 focus:ring-yellow-400" : ""}
                          `}
                          rows={field.key.includes('D.7.1.r') ? 4 : 2}
                          placeholder="Enter value here..."
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
              </div>

              {/* Reaction/Event Information Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  Reaction/Event Information (Category C)
                </h2>
                
                <div className="grid gap-6">
                  {R3_FORM_FIELDS.filter(field => field.section === 'reaction').map((field) => {
                    const isPrefilled = isFieldPrefilled(field.key);
                    const fieldComments = getFieldComments(field.key);
                    
                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.key} - {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          <span className="ml-2 text-xs text-gray-500">
                            (Category: {field.category})
                          </span>
                        </label>
                        
                        {/* Medical Reviewer Comments */}
                        {fieldComments.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center text-yellow-800">
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-semibold">Medical Reviewer Comments:</span>
                            </div>
                            {fieldComments.map((comment) => (
                              <div key={comment.id} className="bg-yellow-100 rounded p-2">
                                <p className="text-sm text-yellow-900">{comment.comment}</p>
                                <p className="text-xs text-yellow-700 mt-1">
                                  By {comment.userName} on {new Date(comment.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {field.key.startsWith('E.i.3.2') ? (
                          <select
                            value={getFieldValue(field.key)}
                            onChange={(e) => handleFormChange(field.key, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black
                              ${isPrefilled ? "bg-blue-50 border-blue-200" : "border-gray-300"}
                              ${fieldComments.length > 0 ? "border-yellow-300 focus:ring-yellow-400" : ""}
                            `}
                          >
                            <option value="">Select...</option>
                            <option value="True">True</option>
                            <option value="False">False</option>
                          </select>
                        ) : (
                          <textarea
                            value={getFieldValue(field.key)}
                            onChange={(e) => handleFormChange(field.key, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black
                              ${isPrefilled ? "bg-blue-50 border-blue-200" : "border-gray-300"}
                              ${fieldComments.length > 0 ? "border-yellow-300 focus:ring-yellow-400" : ""}
                            `}
                            rows={2}
                            placeholder="Enter value here..."
                          />
                        )}
                        {isPrefilled && (
                          <p className="text-xs text-blue-600">
                            Pre-filled from external API - you can edit this field
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <span className="text-sm text-gray-500">
              All changes are automatically saved
            </span>
            <div className="flex gap-3">
              <button
                onClick={saveR3Form}
                disabled={savingForm}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {savingForm ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={completeR3Form}
                disabled={savingForm}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {savingForm ? "Completing..." : "Complete Form"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}