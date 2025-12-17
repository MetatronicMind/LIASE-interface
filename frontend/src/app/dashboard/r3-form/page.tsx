"use client";
import { useState, useEffect } from "react";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { useDateTime } from "@/hooks/useDateTime";
import { getApiBaseUrl } from "@/config/api";
import { useSearchParams, useRouter } from "next/navigation";
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
  listedness?: string;
  seriousness?: string;
  fullTextAvailability?: string;
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
  Listedness?: string;
  Seriousness?: string;
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
  { key: "D.1", label: "Patient (name or initials)", category: "C", required: true, section: "patient" },
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
  { key: "D.7", label: "Relevant Medical History and Concurrent Conditions (not including reaction / event)", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r", label: "Structured Information on Relevant Medical History (repeat as necessary)", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r.2", label: "Start Date", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r.3", label: "Continuing", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r.4", label: "End Date", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r.5", label: "Comments", category: "C", required: false, section: "patient" },
  { key: "D.7.1.r.6", label: "Family History", category: "C", required: false, section: "patient" },
  { key: "D.7.2", label: "Text for Relevant Medical History and Concurrent Conditions (not including reaction / event)", category: "C", required: false, section: "patient" },
  { key: "D.7.3", label: "Concomitant Therapies", category: "C", required: false, section: "patient" },
  { key: "D.8.r", label: "Relevant Past Drug History (repeat as necessary)", category: "C", required: false, section: "patient" },
  { key: "D.8.r.1", label: "Name of Drug as Reported", category: "C", required: true, section: "patient" },
  { key: "D.8.r.4", label: "Start Date", category: "C", required: false, section: "patient" },
  { key: "D.8.r.5", label: "End Date", category: "C", required: false, section: "patient" },
  { key: "D.9.1", label: "Date of Death", category: "C", required: false, section: "patient" },
  { key: "D.9.2.r", label: "Reported Cause(s) of Death (repeat as necessary)", category: "C", required: false, section: "patient" },
  { key: "D.9.2.r.2", label: "Reported Cause(s) of Death (free text)", category: "C", required: false, section: "patient" },
  
  // Reaction/Event Information (Category E)
  { key: "E.i.1.1a", label: "Reaction / Event as Reported by the Primary Source in Native Language", category: "C", required: true, section: "reaction" },
  { key: "E.i.1.1b", label: "Reaction / Event as Reported by the Primary Source Language", category: "C", required: false, section: "reaction" },
  { key: "E.i.1.2", label: "Reaction / Event as Reported by the Primary Source for Translation", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.1", label: "Term Highlighted by the Reporter", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2", label: "Seriousness Criteria at Event Level", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2a", label: "Results in Death", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2b", label: "Life Threatening", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2c", label: "Caused / Prolonged Hospitalisation", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2d", label: "Disabling / Incapacitating", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2e", label: "Congenital Anomaly / Birth Defect", category: "C", required: false, section: "reaction" },
  { key: "E.i.3.2f", label: "Other Medically Important Condition", category: "C", required: false, section: "reaction" },
  { key: "E.i.4", label: "Date of Start of Reaction / Event", category: "C", required: false, section: "reaction" },
  { key: "E.i.5", label: "Date of End of Reaction / Event", category: "C", required: false, section: "reaction" },
  { key: "E.i.6a", label: "Duration of Reaction / Event (number)", category: "C", required: false, section: "reaction" },
  { key: "E.i.6b", label: "Duration of Reaction / Event (unit)", category: "C", required: false, section: "reaction" },
  { key: "E.i.7", label: "Outcome of Reaction / Event at the Time of Last Observation", category: "C", required: false, section: "reaction" },
  { key: "E.i.9", label: "Identification of the Country Where the Reaction / Event Occurred", category: "C", required: false, section: "reaction" },
  
  // Tests and Procedures (Category F)
  { key: "F.r", label: "Results of Tests and Procedures Relevant to the Investigation of the Patient (repeat as necessary)", category: "C", required: false, section: "tests" },
  
  // Drug Information (Category G)
  { key: "G.k.1", label: "Characterisation of Drug Role", category: "C", required: true, section: "drug" },
  { key: "G.k.2", label: "Drug Identification", category: "C", required: true, section: "drug" },
  
  // Case Narrative (Category H)
  { key: "H.1", label: "Case Narrative Including Clinical Course, Therapeutic Measures, Outcome and Additional Relevant Information", category: "C", required: false, section: "narrative" },
];

export default function R3FormPage() {
  const { user } = useAuth();
  const { formatDate, formatDateTime } = useDateTime();
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
  const [canRevoke, setCanRevoke] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revocationReason, setRevocationReason] = useState("");
  const [revokeToStage, setRevokeToStage] = useState("");

  // Confirmation Modal State
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ field: 'listedness' | 'seriousness', value: string } | null>(null);
  const [changeComment, setChangeComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const statusStyles: Record<string, string> = {
    "Pending Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
    "Under Triage Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
    "Study in Process": "bg-yellow-100 text-yellow-800 border border-yellow-300",
    "Under Review": "bg-blue-100 text-blue-800 border border-blue-300",
    Approved: "bg-green-100 text-green-800 border border-green-300",
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

  const getClassificationLabel = (study: Study) => {
    if (study.userTag === "No Case") {
      const textType = study.textType;
      if (textType === "Animal Study" || textType === "In Vitro") {
        return textType;
      }
      return "No Case";
    }
    return study.userTag;
  };

  const normalizeClassification = (value?: string): string | undefined => {
    if (!value) return value;
    // Remove "Classification:" prefix if present
    let normalized = value.replace(/^Classification:\s*/i, '').trim();
    // Also remove number prefix patterns like "1. ", "2. ", "3. ", "4. ", etc.
    normalized = normalized.replace(/^\d+\.\s*/, '').trim();
    return normalized;
  };

  const getFinalClassification = (study: Study): string | null => {
    const rawIcsrClassification = study.aiInferenceData?.ICSR_classification || study.icsrClassification;
    const rawAoiClassification = study.aiInferenceData?.AOI_classification || study.aoiClassification;
    
    const icsrClassification = normalizeClassification(rawIcsrClassification);
    const aoiClassification = normalizeClassification(rawAoiClassification);

    if (!icsrClassification) return null;

    // If ICSR Classification is "Article requires manual review"
    if (icsrClassification === "Article requires manual review") {
      return "Manual Review";
    }

    // If ICSR Classification is "Probable ICSR/AOI", return it regardless of AOI Classification
    if (icsrClassification === "Probable ICSR/AOI") {
      return "Probable ICSR/AOI";
    }

    // If ICSR Classification is "Probable ICSR"
    if (icsrClassification === "Probable ICSR") {
      if (aoiClassification === "Yes" || aoiClassification === "Yes (ICSR)") {
        return "Probable ICSR/AOI";
      } else {
        return "Probable ICSR";
      }
    }

    // If ICSR Classification is "No Case"
    if (icsrClassification === "No Case") {
      if (aoiClassification === "Yes" || aoiClassification === "Yes (AOI)") {
        return "Probable AOI";
      } else {
        return "No Case";
      }
    }

    return null;
  };

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
    fetchWorkflowConfig();
  }, [studyId]);

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
        // Find transition from data_entry
        const transition = config.transitions.find((t: any) => t.from === 'data_entry');
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
        drugname: studyData.drugName,
        client: studyData.clientName || ""
      });

      console.log('Fetching R3 form data from external API:', {
        studyId: studyData.id,
        pmid: studyData.pmid,
        drugname: studyData.drugName,
        url: `${getApiBaseUrl()}/studies/${studyData.id}/r3-form-data?${params}`
      });

      const r3Response = await fetch(`${getApiBaseUrl()}/studies/${studyData.id}/r3-form-data?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let externalR3Data = {};
      if (r3Response.ok) {
        const r3Data = await r3Response.json();
        console.log('R3 form data received:', r3Data);
        externalR3Data = r3Data.data || {};
      } else {
        console.error('Failed to fetch R3 form data:', r3Response.status, r3Response.statusText);
      }

      // Set the raw AI inference data for sidebar display
      if (completeStudyData.aiInferenceData) {
        setStudyAIData(completeStudyData.aiInferenceData);
      }

      // Merge and populate form fields from all sources
      const prefilledFormData = mergeDataSources(externalR3Data, completeStudyData.aiInferenceData || null, completeStudyData);
      console.log('Setting prefilled data with', Object.keys(prefilledFormData).length, 'fields');
      setPrefilledData(prefilledFormData);
      
    } catch (error) {
      console.error("Error fetching AI inference data:", error);
    } finally {
      setLoadingAIData(false);
    }
  };

  const mergeDataSources = (externalR3Data: any, studyAIInfo: StudyAIData | null, studyData: Study): R3FormData => {
    const merged: R3FormData = {};
    
    console.log('Merging data sources - External R3 Data:', externalR3Data);
    
    // First, populate from external R3 API data (highest priority)
    // Keep all values except "NA" - "False" and "No" are valid responses
    Object.keys(externalR3Data).forEach(key => {
      const value = externalR3Data[key];
      // Only skip if value is "NA" or empty, keep everything else including "False", "No", "0"
      if (value && value !== "NA" && value !== "") {
        merged[key] = value;
        console.log(`Pre-filled from R3 API: ${key} = ${value}`);
      }
    });
    
    console.log('After R3 API merge, merged fields:', Object.keys(merged).length);
    
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
    
    console.log('Final merged data - Total fields:', Object.keys(merged).length);
    console.log('Final merged data:', merged);
    
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

  const handleRevoke = async () => {
    if (!study || !revocationReason.trim()) {
      alert("Please provide a reason for revocation");
      return;
    }

    try {
      setSavingForm(true);
      const token = localStorage.getItem("auth_token");

      const response = await fetch(`${getApiBaseUrl()}/studies/${study.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: revocationReason,
          targetStage: revokeToStage
        }),
      });

      if (response.ok) {
        alert("Study revoked successfully!");
        if (revokeToStage === 'triage') {
          router.push("/dashboard/triage");
        } else {
          router.push("/dashboard/data-entry");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to revoke study");
      }
    } catch (error: any) {
      console.error("Error revoking study:", error);
      alert(error.message || "Error revoking study. Please try again.");
    } finally {
      setSavingForm(false);
      setShowRevokeModal(false);
    }
  };

  const handleTriageChange = (field: 'listedness' | 'seriousness', value: string) => {
    setPendingChange({ field, value });
    setChangeComment("");
    setShowConfirmationModal(true);
  };

  const confirmTriageChange = async () => {
    if (!study || !pendingChange) return;

    try {
      setSavingComment(true);
      
      let newComment = null;

      // Save comment if provided
      if (changeComment.trim()) {
        const token = localStorage.getItem("auth_token");
        const commentResponse = await fetch(`${getApiBaseUrl()}/studies/${study.id}/field-comment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            fieldKey: pendingChange.field, 
            comment: changeComment 
          }),
        });

        if (commentResponse.ok) {
          const data = await commentResponse.json();
          newComment = data.fieldComment;
        }
      }
      
      // Save the field value to the backend
      const token = localStorage.getItem("auth_token");
      await fetch(`${getApiBaseUrl()}/studies/${study.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [pendingChange.field]: pendingChange.value }),
      });

      // Update local state
      setStudy(prev => {
        if (!prev) return null;
        const updated = { ...prev, [pendingChange.field]: pendingChange.value };
        if (newComment) {
          updated.fieldComments = [...(prev.fieldComments || []), newComment];
        }
        return updated;
      });

      setShowConfirmationModal(false);
      setPendingChange(null);
      setChangeComment("");
    } catch (error) {
      console.error("Error updating triage status:", error);
      alert("Failed to update. Please try again.");
    } finally {
      setSavingComment(false);
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
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
              {/* Header Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Triage Classification
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                   {/* Status */}
                   <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[study.r3FormStatus || 'Pending Review'] || "bg-gray-100 text-gray-800"}`}>
                      {study.r3FormStatus === 'Study in Process' ? 'Under Triage Review' : (study.r3FormStatus || 'Pending Review')}
                   </span>
                   {/* User Tag */}
                   {study.userTag && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getClassificationColor(study.userTag)}`}>
                        {study.userTag}
                      </span>
                   )}
                </div>
              </div>

              {/* Revocation Notice */}
              {study.revokedBy && study.revocationReason && (
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
                        <p className="mt-1">{study.revocationReason}</p>
                      </div>
                      {study.revokedAt && (
                        <p className="mt-2 text-xs text-red-600">
                          Revoked on: {formatDate(study.revokedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 mb-3">Literature Information</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-bold text-gray-700 block">Study ID:</span>
                    <p className="mt-1 text-gray-900 font-mono">{study.id}</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">PMID:</span>
                    <p className="mt-1"><PmidLink pmid={study.pmid} showIcon={true} /></p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">INN & Brand Name:</span>
                    <p className="mt-1 text-gray-900">{study.drugName}</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">Authors:</span>
                    <p className="mt-1 text-gray-900">
                      {Array.isArray(study.authors) 
                        ? study.authors.join(', ')
                        : typeof study.authors === 'string' 
                          ? study.authors 
                          : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">Journal Name:</span>
                    <p className="mt-1 text-gray-900">{study.journal || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">Publication Date:</span>
                    <p className="mt-1 text-gray-900">{study.publicationDate || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">Created On:</span>
                    <p className="mt-1 text-gray-900">{formatDate(study.createdAt)}</p>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700 block">Title:</span>
                    <p className="mt-1 text-gray-900 leading-relaxed">{study.title}</p>
                  </div>
                  {study.vancouverCitation && (
                    <div>
                      <span className="font-bold text-gray-700 block">Literature Citation:</span>
                      <p className="mt-1 text-gray-900 text-sm italic">{study.vancouverCitation}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Abstract */}
              {(study.aiInferenceData?.Summary || study.abstract) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Abstract
                  </h4>
                  <div className="bg-white rounded p-4 border">
                    <p className="text-gray-900 leading-relaxed text-sm">{study.abstract || study.aiInferenceData?.Summary}</p>
                  </div>
                </div>
              )}

              {/* AI Final Classification */}
              {getFinalClassification(study) && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-200">
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-2">AI Classification Result</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        {getFinalClassification(study)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Literature Article Overview */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  Literature Article Overview
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {study.doi && (
                    <div>
                      <span className="font-bold text-gray-700 block">DOI:</span>
                      <p className="mt-1 text-gray-900 break-all">
                        <a 
                          href={study.doi.startsWith('http') ? study.doi : `https://doi.org/${study.doi}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline"
                        >
                          {study.doi}
                        </a>
                      </p>
                    </div>
                  )}
                  {study.leadAuthor && (
                    <div>
                      <span className="font-bold text-gray-700 block">Lead Author:</span>
                      <p className="mt-1 text-gray-900">{study.leadAuthor}</p>
                    </div>
                  )}
                  {study.countryOfFirstAuthor && (
                    <div>
                      <span className="font-bold text-gray-700 block">Country of first Author:</span>
                      <p className="mt-1 text-gray-900">{study.countryOfFirstAuthor}</p>
                    </div>
                  )}
                  {study.countryOfOccurrence && (
                    <div>
                      <span className="font-bold text-gray-700 block">Country of Occurrence:</span>
                      <p className="mt-1 text-gray-900">{study.countryOfOccurrence}</p>
                    </div>
                  )}
                  {study.substanceGroup && (
                    <div>
                      <span className="font-bold text-gray-700 block">INN:</span>
                      <p className="mt-1 text-gray-900">{study.substanceGroup}</p>
                    </div>
                  )}
                  {study.authorPerspective && (
                    <div>
                      <span className="font-bold text-gray-700 block">Author Perspective:</span>
                      <p className="mt-1 text-gray-900">{study.authorPerspective}</p>
                    </div>
                  )}
                  {study.sponsor && (
                    <div>
                      <span className="font-bold text-gray-700 block">Client Name:</span>
                      <p className="mt-1 text-gray-900">{study.sponsor}</p>
                    </div>
                  )}
                  {study.testSubject && (
                    <div>
                      <span className="font-bold text-gray-700 block">Subject/Participant/Patient:</span>
                      <p className="mt-1 text-gray-900">{study.testSubject}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Literature Analysis */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Literature Analysis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-bold text-gray-700 block">AI Identified Adverse Event(s):</span>
                    <p className="mt-1 text-gray-900">{study.adverseEvent}</p>
                  </div>
                  {(study.specialCase) && (
                    <div>
                      <span className="font-bold text-gray-700 block">AI Identified Special Situation(s):</span>
                      <p className="mt-1 text-gray-900">{study.specialCase}</p>
                    </div>
                  )}
                  {(study.textType) && (
                    <div>
                      <span className="font-bold text-gray-700 block">Article Type:</span>
                      <p className="mt-1 text-gray-900">{study.textType}</p>
                    </div>
                  )}
                  {study.approvedIndication && (
                    <div>
                      <span className="font-bold text-gray-700 block">AI Assessment of Indication:</span>
                      <p className="mt-1 text-gray-900">{study.approvedIndication}</p>
                    </div>
                  )}
                  {study.attributability && (
                    <div>
                      <span className="font-bold text-gray-700 block">AI Assessment of Attributability:</span>
                      <p className="mt-1 text-gray-900">{study.attributability}</p>
                    </div>
                  )}
                  {study.drugEffect && (
                    <div>
                      <span className="font-bold text-gray-700 block">AI Identified Drug Effect (Beneficial/Adverse):</span>
                      <p className="mt-1 text-gray-900">{study.drugEffect}</p>
                    </div>
                  )}
                  {study.justification && (
                    <div>
                      <span className="font-bold text-gray-700 block">AI Opinion on Literature:</span>
                      <p className="mt-1 text-gray-900">{study.justification}</p>
                    </div>
                  )}
                  {study.administeredDrugs && (
                    <div>
                      <span className="font-bold text-gray-700 block">Administered Drugs:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Array.isArray(study.administeredDrugs) ? study.administeredDrugs.map((drug, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {drug}
                          </span>
                        )) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {study.administeredDrugs}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {study.patientDetails && (
                    <div>
                      <span className="font-bold text-gray-700 block">Patient Details:</span>
                      <div className="mt-1 bg-white rounded p-3 border">
                        <p className="text-gray-900 text-sm">{study.patientDetails}</p>
                      </div>
                    </div>
                  )}
                  {study.relevantDates && (
                    <div>
                      <span className="font-bold text-gray-700 block">Relevant Dates:</span>
                      <div className="mt-1 bg-white rounded p-3 border">
                        <p className="text-gray-900 text-sm">{study.relevantDates}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {study.summary && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    AI Summary
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 leading-relaxed">{study.summary}</p>
                  </div>
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
                      ⚠️ Study Revoked
                    </h3>
                    <p className="text-xs text-orange-800 mb-2">
                      This study was revoked and sent back for corrections. Please address the issues mentioned below.
                    </p>
                    <div className="bg-orange-100 rounded p-3 mt-2">
                      <p className="text-xs text-orange-900 font-semibold">Revocation Reason:</p>
                      <p className="text-sm text-orange-800 mt-1">{study.revocationReason}</p>
                      {study.revokedAt && (
                        <p className="text-xs text-orange-700 mt-2">
                          Revoked on: {formatDateTime(study.revokedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comment Thread - Shows all comments chronologically */}
            <CommentThread study={study} />
            
            {/* Debug Info - Prefilled Data Status */}
            {Object.keys(prefilledData).length > 0 && (
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">
                      ℹ️ Pre-filled Data Available
                    </h3>
                    <p className="text-xs text-blue-800">
                      {Object.keys(prefilledData).length} fields have been pre-filled from the R3 API. These fields are highlighted in blue.
                    </p>
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
                  Reporter Information
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
                              <span className="text-sm font-semibold">Comments:</span>
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
                                  By {comment.userName} on {formatDateTime(comment.createdAt)}
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
                                  By {comment.userName} on {formatDateTime(comment.createdAt)}
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

              {/* Tests and Procedures Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  Tests and Procedures (Category F)
                </h2>
                
                <div className="grid gap-6">
                  {R3_FORM_FIELDS.filter(field => field.section === 'tests').map((field) => {
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
                                  By {comment.userName} on {formatDateTime(comment.createdAt)}
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
                          rows={3}
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

              {/* Drug Information Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  Drug Information (Category G)
                </h2>
                
                <div className="grid gap-6">
                  {R3_FORM_FIELDS.filter(field => field.section === 'drug').map((field) => {
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
                                  By {comment.userName} on {formatDateTime(comment.createdAt)}
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
                          rows={2}
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

              {/* Case Narrative Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  Case Narrative (Category H)
                </h2>
                
                <div className="grid gap-6">
                  {R3_FORM_FIELDS.filter(field => field.section === 'narrative').map((field) => {
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
                                  By {comment.userName} on {formatDateTime(comment.createdAt)}
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
                          rows={6}
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

              {/* Triage Assessment Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  Triage Assessment
                </h2>
                
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Listedness
                    </label>
                    <select
                      value={study?.listedness || ""}
                      onChange={(e) => handleTriageChange('listedness', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    >
                      <option value="">Select...</option>
                      <option value="Listed">Listed</option>
                      <option value="Unlisted">Unlisted</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Seriousness
                    </label>
                    <select
                      value={study?.seriousness || ""}
                      onChange={(e) => handleTriageChange('seriousness', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    >
                      <option value="">Select...</option>
                      <option value="Serious">Serious</option>
                      <option value="Non-Serious">Non-Serious</option>
                    </select>
                  </div>
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
              {canRevoke && (
                <button
                  onClick={() => setShowRevokeModal(true)}
                  disabled={savingForm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Revoke
                </button>
              )}
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

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revoke Study</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to revoke this study? It will be sent back to the previous stage.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Revocation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
                placeholder="Please provide a reason..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={!revocationReason.trim() || savingForm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {savingForm ? "Revoking..." : "Confirm Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {showConfirmationModal && pendingChange && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Change</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are changing <strong>{pendingChange.field === 'listedness' ? 'Listedness' : 'Seriousness'}</strong> to <strong>{pendingChange.value || 'None'}</strong>.
              Please confirm this change and provide a reason.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Change <span className="text-red-500">*</span>
              </label>
              <textarea
                value={changeComment}
                onChange={(e) => setChangeComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
                placeholder="Please provide a reason..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setPendingChange(null);
                  setChangeComment("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmTriageChange}
                disabled={!changeComment.trim() || savingComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {savingComment ? "Saving..." : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}