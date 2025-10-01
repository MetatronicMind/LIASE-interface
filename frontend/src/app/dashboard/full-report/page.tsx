"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/config/api";
import { PermissionGate } from "@/components/PermissionProvider";

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
  updatedAt?: string;
  userId?: string;
  organizationId?: string;
  isProcessed?: boolean;
  processingNotes?: string;
  
  // Study metadata
  authors?: string[] | string;
  journal?: string;
  publicationDate?: string;
  abstract?: string;
  status?: string;
  createdBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewDetails?: any;
  comments?: any[];
  attachments?: any[];
  
  // AI Inference Data - Raw API response
  aiInferenceData?: any;
  
  // AI Inference Fields - Normalized from backend
  doi?: string;
  specialCase?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  patientDetails?: any;
  keyEvents?: string[] | string;
  relevantDates?: any;
  administeredDrugs?: string[] | string;
  attributability?: string;
  drugEffect?: string;
  summary?: string;
  identifiableHumanSubject?: boolean | string;
  textType?: string;
  authorPerspective?: string;
  confirmedPotentialICSR?: boolean;
  icsrClassification?: string;
  substanceGroup?: string;
  vancouverCitation?: string;
  leadAuthor?: string;
  serious?: boolean;
  testSubject?: string;
  aoiDrugEffect?: string;
  approvedIndication?: string;
  aoiClassification?: string;
  justification?: string;
  clientName?: string;
  sponsor?: string;
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchMedicalExaminerStudies();
  }, [currentPage, searchTerm]);

  const fetchMedicalExaminerStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`${getApiBaseUrl()}/studies/medical-examiner?${params}`, {
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
    setShowExportMenu(false);
  };

  const exportReport = () => {
    if (!selectedStudy) return;

    const reportData = {
      study: {
        // Basic study info
        pmid: selectedStudy.pmid,
        title: selectedStudy.title,
        drugName: selectedStudy.drugName,
        adverseEvent: selectedStudy.adverseEvent,
        userTag: selectedStudy.userTag,
        r3FormStatus: selectedStudy.r3FormStatus,
        status: selectedStudy.status,
        
        // Publication info
        authors: selectedStudy.authors,
        journal: selectedStudy.journal,
        publicationDate: selectedStudy.publicationDate,
        abstract: selectedStudy.abstract,
        
        // Timestamps
        createdAt: selectedStudy.createdAt,
        updatedAt: selectedStudy.updatedAt,
        r3FormCompletedAt: selectedStudy.r3FormCompletedAt,
        approvedAt: selectedStudy.approvedAt,
        
        // User info
        userId: selectedStudy.userId,
        organizationId: selectedStudy.organizationId,
        createdBy: selectedStudy.createdBy,
        r3FormCompletedBy: selectedStudy.r3FormCompletedBy,
        reviewedBy: selectedStudy.reviewedBy,
        approvedBy: selectedStudy.approvedBy,
        
        // Processing info
        isProcessed: selectedStudy.isProcessed,
        processingNotes: selectedStudy.processingNotes,
        reviewDetails: selectedStudy.reviewDetails,
        comments: selectedStudy.comments,
        attachments: selectedStudy.attachments,
      },
      aiInferenceData: {
        // Raw AI data
        rawData: selectedStudy.aiInferenceData,
        
        // Processed AI fields
        doi: selectedStudy.doi,
        specialCase: selectedStudy.specialCase,
        countryOfFirstAuthor: selectedStudy.countryOfFirstAuthor,
        countryOfOccurrence: selectedStudy.countryOfOccurrence,
        patientDetails: selectedStudy.patientDetails,
        keyEvents: selectedStudy.keyEvents,
        relevantDates: selectedStudy.relevantDates,
        administeredDrugs: selectedStudy.administeredDrugs,
        attributability: selectedStudy.attributability,
        drugEffect: selectedStudy.drugEffect,
        summary: selectedStudy.summary,
        identifiableHumanSubject: selectedStudy.identifiableHumanSubject,
        textType: selectedStudy.textType,
        authorPerspective: selectedStudy.authorPerspective,
        confirmedPotentialICSR: selectedStudy.confirmedPotentialICSR,
        icsrClassification: selectedStudy.icsrClassification,
        substanceGroup: selectedStudy.substanceGroup,
        vancouverCitation: selectedStudy.vancouverCitation,
        leadAuthor: selectedStudy.leadAuthor,
        serious: selectedStudy.serious,
        testSubject: selectedStudy.testSubject,
        aoiDrugEffect: selectedStudy.aoiDrugEffect,
        approvedIndication: selectedStudy.approvedIndication,
        aoiClassification: selectedStudy.aoiClassification,
        justification: selectedStudy.justification,
        clientName: selectedStudy.clientName,
        sponsor: selectedStudy.sponsor,
      },
      r3FormData: selectedStudy.r3FormData || {},
      r3FormSummary: {
        totalFields: R3_FORM_FIELDS.length,
        completedFields: selectedStudy.r3FormData ? Object.keys(selectedStudy.r3FormData).length : 0,
        completionRate: selectedStudy.r3FormData 
          ? Math.round((Object.keys(selectedStudy.r3FormData).length / R3_FORM_FIELDS.length) * 100)
          : 0,
        categoryBreakdown: {
          categoryA: {
            total: R3_FORM_FIELDS.filter(field => field.category === 'A').length,
            completed: selectedStudy.r3FormData 
              ? R3_FORM_FIELDS.filter(field => field.category === 'A' && selectedStudy.r3FormData[field.key]).length
              : 0
          },
          categoryB: {
            total: R3_FORM_FIELDS.filter(field => field.category === 'B').length,
            completed: selectedStudy.r3FormData 
              ? R3_FORM_FIELDS.filter(field => field.category === 'B' && selectedStudy.r3FormData[field.key]).length
              : 0
          },
          categoryC: {
            total: R3_FORM_FIELDS.filter(field => field.category === 'C').length,
            completed: selectedStudy.r3FormData 
              ? R3_FORM_FIELDS.filter(field => field.category === 'C' && selectedStudy.r3FormData[field.key]).length
              : 0
          }
        }
      },
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportFormat: "JSON",
        exportedBy: "LIASE System",
        version: "2.0"
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ICSR_Full_Report_${selectedStudy.pmid}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToR3XML = () => {
    if (!selectedStudy) return;

    const generateR3XML = () => {
      const xmlData = selectedStudy.r3FormData || {};
      const timestamp = new Date().toISOString();
      
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ichicsr lang="en" xmlns="http://www.ich.org/ICSR">
  <!-- ICH E2B(R3) Individual Case Safety Report -->
  <ichicsrmessageheader>
    <messagetype>ichicsr</messagetype>
    <messageformatversion>2.1</messageformatversion>
    <messageformatrelease>2.0</messageformatrelease>
    <messagenumb>LIASE-${selectedStudy.pmid}-${Date.now()}</messagenumb>
    <messagesenderidentifier>LIASE-SYSTEM</messagesenderidentifier>
    <messagereceiveridentifier>REGULATORY-AUTHORITY</messagereceiveridentifier>
    <messagedateformat>204</messagedateformat>
    <messagedate>${timestamp.replace(/[-:T]/g, '').substring(0, 14)}</messagedate>
  </ichicsrmessageheader>
  
  <safetyreport>
    <!-- Primary source information -->
    <primarysourcereaction>
      <primarysourcereaction>${selectedStudy.adverseEvent}</primarysourcereaction>
    </primarysourcereaction>
    
    <!-- Study information -->
    <companynumb>LIASE-${selectedStudy.pmid}</companynumb>
    <reporttype>1</reporttype>
    <serious>1</serious>
    <seriousnessdeath>${xmlData['E.i.3.2a'] === 'True' ? '1' : '0'}</seriousnessdeath>
    <seriousnesslifethreatening>${xmlData['E.i.3.2b'] === 'True' ? '1' : '0'}</seriousnesslifethreatening>
    <seriousnesshospitalization>${xmlData['E.i.3.2c'] === 'True' ? '1' : '0'}</seriousnesshospitalization>
    <seriousnessdisabling>${xmlData['E.i.3.2d'] === 'True' ? '1' : '0'}</seriousnessdisabling>
    <seriousnesscongenitalanomali>${xmlData['E.i.3.2e'] === 'True' ? '1' : '0'}</seriousnesscongenitalanomali>
    <seriousnessother>${xmlData['E.i.3.2f'] === 'True' ? '1' : '0'}</seriousnessother>
    
    <!-- Literature reference -->
    <literaturereference>
      <literaturereference>PMID: ${selectedStudy.pmid} - ${selectedStudy.title}</literaturereference>
    </literaturereference>
    
    <!-- Patient information -->
    <patient>
      <patientinitial>${xmlData['D.1'] || 'N/A'}</patientinitial>
      <patientbirthdate>${xmlData['D.2.1'] || ''}</patientbirthdate>
      <patientagegroup>${xmlData['D.2.3'] || ''}</patientagegroup>
      <patientweight>${xmlData['D.3'] || ''}</patientweight>
      <patientheight>${xmlData['D.4'] || ''}</patientheight>
      <patientsex>${xmlData['D.5'] || ''}</patientsex>
      
      <!-- Medical history -->
      ${xmlData['D.7.1.r.3'] ? `
      <medicalhistoryepisode>
        <patientepisodename>${xmlData['D.7.1.r.3']}</patientepisodename>
        <patientepisodestartdate>${xmlData['D.7.1.r.4'] || ''}</patientepisodestartdate>
      </medicalhistoryepisode>` : ''}
      
      <!-- Death information -->
      ${xmlData['D.9.2.r'] ? `
      <patientdeathdate>${xmlData['D.9.2.r']}</patientdeathdate>` : ''}
      
      <!-- Reaction information -->
      <reaction>
        <primarysourcereaction>${selectedStudy.adverseEvent}</primarysourcereaction>
        <reactionmeddraversionllt>24.1</reactionmeddraversionllt>
        <reactionmeddrallt>${selectedStudy.adverseEvent}</reactionmeddrallt>
        <reactionstartdate>${xmlData['E.i.4'] || ''}</reactionstartdate>
        <reactionenddate>${xmlData['E.i.5'] || ''}</reactionenddate>
        <reactionoutcome>6</reactionoutcome>
      </reaction>
      
      <!-- Drug information -->
      <drug>
        <drugcharacterization>1</drugcharacterization>
        <medicinalproduct>${selectedStudy.drugName}</medicinalproduct>
        <drugauthorizationnumb>${xmlData['G.k.2'] || ''}</drugauthorizationnumb>
        <drugstructuredosagenumb>${xmlData['G.k.1'] || ''}</drugstructuredosagenumb>
        <drugstartdate>${xmlData['E.i.4'] || ''}</drugstartdate>
        <drugenddate>${xmlData['E.i.5'] || ''}</drugenddate>
        <actiondrug>6</actiondrug>
      </drug>
    </patient>
    
    <!-- Reporter information -->
    <primarysource>
      <reportertitle>${xmlData['C.2.r.1.1'] || ''}</reportertitle>
      <reportergivename>${xmlData['C.2.r.1.2'] || ''}</reportergivename>
      <reportermiddlename>${xmlData['C.2.r.1.3'] || ''}</reportermiddlename>
      <reporterfamilyname>${xmlData['C.2.r.1.4'] || ''}</reporterfamilyname>
      <reporterorganization>${xmlData['C.2.r.2.1'] || ''}</reporterorganization>
      <qualification>5</qualification>
    </primarysource>
    
    <!-- Report dates -->
    <receiptdate>${selectedStudy.createdAt ? selectedStudy.createdAt.replace(/[-:T]/g, '').substring(0, 8) : ''}</receiptdate>
    <receivedate>${selectedStudy.r3FormCompletedAt ? selectedStudy.r3FormCompletedAt.replace(/[-:T]/g, '').substring(0, 8) : ''}</receivedate>
    
    <!-- Additional form data as narrative -->
    <narrative>
      <narrativeincludeclinical>Study Title: ${selectedStudy.title}

PMID: ${selectedStudy.pmid}
Drug: ${selectedStudy.drugName}
Adverse Event: ${selectedStudy.adverseEvent}

R3 Form Data:
${Object.entries(xmlData).map(([key, value]) => `${key}: ${value}`).join('\n')}

Form completed on: ${selectedStudy.r3FormCompletedAt ? new Date(selectedStudy.r3FormCompletedAt).toLocaleString() : 'N/A'}
Completed by: ${selectedStudy.r3FormCompletedBy || 'N/A'}
      </narrativeincludeclinical>
    </narrative>
  </safetyreport>
</ichicsr>`;

      return xml;
    };

    const xmlContent = generateR3XML();
    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ICSR_R3_Report_${selectedStudy.pmid}_${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!selectedStudy) return;

    const csvData = [];
    const headers = ['Section', 'Field Code', 'Field Label', 'Category', 'Value'];
    csvData.push(headers);

    // Add study information
    csvData.push(['Study', 'Study.PMID', 'PubMed ID', 'Study', selectedStudy.pmid]);
    csvData.push(['Study', 'Study.Title', 'Study Title', 'Study', selectedStudy.title]);
    csvData.push(['Study', 'Study.DrugName', 'Drug Name', 'Study', selectedStudy.drugName]);
    csvData.push(['Study', 'Study.AdverseEvent', 'Adverse Event', 'Study', selectedStudy.adverseEvent]);
    csvData.push(['Study', 'Study.UserTag', 'User Tag', 'Study', selectedStudy.userTag]);
    csvData.push(['Study', 'Study.Status', 'Study Status', 'Study', selectedStudy.status || 'N/A']);
    csvData.push(['Study', 'Study.R3FormStatus', 'R3 Form Status', 'Study', selectedStudy.r3FormStatus]);
    
    // Publication info
    if (selectedStudy.authors) {
      csvData.push(['Study', 'Study.Authors', 'Authors', 'Study', 
        Array.isArray(selectedStudy.authors) ? selectedStudy.authors.join('; ') : selectedStudy.authors]);
    }
    if (selectedStudy.journal) csvData.push(['Study', 'Study.Journal', 'Journal', 'Study', selectedStudy.journal]);
    if (selectedStudy.publicationDate) csvData.push(['Study', 'Study.PublicationDate', 'Publication Date', 'Study', selectedStudy.publicationDate]);
    if (selectedStudy.abstract) csvData.push(['Study', 'Study.Abstract', 'Abstract', 'Study', selectedStudy.abstract]);
    
    // Timestamps
    csvData.push(['Study', 'Study.CreatedAt', 'Created Date', 'Study', selectedStudy.createdAt]);
    if (selectedStudy.updatedAt) csvData.push(['Study', 'Study.UpdatedAt', 'Updated Date', 'Study', selectedStudy.updatedAt]);
    if (selectedStudy.r3FormCompletedAt) csvData.push(['Study', 'Study.CompletedAt', 'R3 Form Completed Date', 'Study', selectedStudy.r3FormCompletedAt]);
    if (selectedStudy.approvedAt) csvData.push(['Study', 'Study.ApprovedAt', 'Approved Date', 'Study', selectedStudy.approvedAt]);
    
    // User info
    if (selectedStudy.createdBy) csvData.push(['Study', 'Study.CreatedBy', 'Created By', 'Study', selectedStudy.createdBy]);
    if (selectedStudy.r3FormCompletedBy) csvData.push(['Study', 'Study.CompletedBy', 'R3 Form Completed By', 'Study', selectedStudy.r3FormCompletedBy]);
    if (selectedStudy.reviewedBy) csvData.push(['Study', 'Study.ReviewedBy', 'Reviewed By', 'Study', selectedStudy.reviewedBy]);
    if (selectedStudy.approvedBy) csvData.push(['Study', 'Study.ApprovedBy', 'Approved By', 'Study', selectedStudy.approvedBy]);
    
    // System info
    if (selectedStudy.userId) csvData.push(['Study', 'Study.UserId', 'User ID', 'Study', selectedStudy.userId]);
    if (selectedStudy.organizationId) csvData.push(['Study', 'Study.OrganizationId', 'Organization ID', 'Study', selectedStudy.organizationId]);
    if (selectedStudy.isProcessed !== undefined) csvData.push(['Study', 'Study.IsProcessed', 'Processing Status', 'Study', selectedStudy.isProcessed ? 'Processed' : 'Pending']);
    if (selectedStudy.processingNotes) csvData.push(['Study', 'Study.ProcessingNotes', 'Processing Notes', 'Study', selectedStudy.processingNotes]);

    // Add AI Inference data
    if (selectedStudy.doi) csvData.push(['AI', 'AI.DOI', 'DOI', 'AI', selectedStudy.doi]);
    if (selectedStudy.specialCase) csvData.push(['AI', 'AI.SpecialCase', 'Special Case', 'AI', selectedStudy.specialCase]);
    if (selectedStudy.countryOfFirstAuthor) csvData.push(['AI', 'AI.CountryOfFirstAuthor', 'Country of First Author', 'AI', selectedStudy.countryOfFirstAuthor]);
    if (selectedStudy.countryOfOccurrence) csvData.push(['AI', 'AI.CountryOfOccurrence', 'Country of Occurrence', 'AI', selectedStudy.countryOfOccurrence]);
    if (selectedStudy.attributability) csvData.push(['AI', 'AI.Attributability', 'Attributability', 'AI', selectedStudy.attributability]);
    if (selectedStudy.drugEffect) csvData.push(['AI', 'AI.DrugEffect', 'Drug Effect', 'AI', selectedStudy.drugEffect]);
    if (selectedStudy.textType) csvData.push(['AI', 'AI.TextType', 'Text Type', 'AI', selectedStudy.textType]);
    if (selectedStudy.authorPerspective) csvData.push(['AI', 'AI.AuthorPerspective', 'Author Perspective', 'AI', selectedStudy.authorPerspective]);
    if (selectedStudy.icsrClassification) csvData.push(['AI', 'AI.ICSRClassification', 'ICSR Classification', 'AI', selectedStudy.icsrClassification]);
    if (selectedStudy.substanceGroup) csvData.push(['AI', 'AI.SubstanceGroup', 'Substance Group', 'AI', selectedStudy.substanceGroup]);
    if (selectedStudy.leadAuthor) csvData.push(['AI', 'AI.LeadAuthor', 'Lead Author', 'AI', selectedStudy.leadAuthor]);
    if (selectedStudy.serious !== undefined) csvData.push(['AI', 'AI.Serious', 'Serious', 'AI', selectedStudy.serious ? 'Yes' : 'No']);
    if (selectedStudy.confirmedPotentialICSR !== undefined) csvData.push(['AI', 'AI.ConfirmedPotentialICSR', 'Confirmed Potential ICSR', 'AI', selectedStudy.confirmedPotentialICSR ? 'Yes' : 'No']);
    if (selectedStudy.identifiableHumanSubject !== undefined) csvData.push(['AI', 'AI.IdentifiableHumanSubject', 'Identifiable Human Subject', 'AI', selectedStudy.identifiableHumanSubject ? 'Yes' : 'No']);
    if (selectedStudy.testSubject) csvData.push(['AI', 'AI.TestSubject', 'Test Subject', 'AI', selectedStudy.testSubject]);
    if (selectedStudy.sponsor) csvData.push(['AI', 'AI.Sponsor', 'Sponsor', 'AI', selectedStudy.sponsor]);
    if (selectedStudy.clientName) csvData.push(['AI', 'AI.ClientName', 'Client Name', 'AI', selectedStudy.clientName]);
    
    // Complex AI fields
    if (selectedStudy.patientDetails) {
      csvData.push(['AI', 'AI.PatientDetails', 'Patient Details', 'AI', 
        typeof selectedStudy.patientDetails === 'object' 
          ? JSON.stringify(selectedStudy.patientDetails) 
          : selectedStudy.patientDetails]);
    }
    if (selectedStudy.keyEvents) {
      csvData.push(['AI', 'AI.KeyEvents', 'Key Events', 'AI', 
        Array.isArray(selectedStudy.keyEvents) 
          ? selectedStudy.keyEvents.join('; ') 
          : selectedStudy.keyEvents]);
    }
    if (selectedStudy.administeredDrugs) {
      csvData.push(['AI', 'AI.AdministeredDrugs', 'Administered Drugs', 'AI', 
        Array.isArray(selectedStudy.administeredDrugs) 
          ? selectedStudy.administeredDrugs.join('; ') 
          : selectedStudy.administeredDrugs]);
    }
    if (selectedStudy.relevantDates) {
      csvData.push(['AI', 'AI.RelevantDates', 'Relevant Dates', 'AI', 
        typeof selectedStudy.relevantDates === 'object' 
          ? JSON.stringify(selectedStudy.relevantDates) 
          : selectedStudy.relevantDates]);
    }
    if (selectedStudy.summary) csvData.push(['AI', 'AI.Summary', 'AI Summary', 'AI', selectedStudy.summary]);
    if (selectedStudy.justification) csvData.push(['AI', 'AI.Justification', 'Justification', 'AI', selectedStudy.justification]);
    if (selectedStudy.vancouverCitation) csvData.push(['AI', 'AI.VancouverCitation', 'Vancouver Citation', 'AI', selectedStudy.vancouverCitation]);

    // Add ALL R3 form data (both completed and empty fields)
    R3_FORM_FIELDS.forEach(field => {
      const value = selectedStudy.r3FormData?.[field.key] || '';
      csvData.push(['R3Form', field.key, field.label, field.category, value || '(Empty)']);
    });

    // Add R3 form summary
    csvData.push(['Summary', 'R3.TotalFields', 'Total R3 Fields', 'Summary', R3_FORM_FIELDS.length.toString()]);
    csvData.push(['Summary', 'R3.CompletedFields', 'Completed R3 Fields', 'Summary', 
      selectedStudy.r3FormData ? Object.keys(selectedStudy.r3FormData).length.toString() : '0']);
    csvData.push(['Summary', 'R3.CompletionRate', 'R3 Completion Rate (%)', 'Summary', 
      selectedStudy.r3FormData 
        ? Math.round((Object.keys(selectedStudy.r3FormData).length / R3_FORM_FIELDS.length) * 100).toString()
        : '0']);

    const csvContent = csvData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ICSR_Full_Report_${selectedStudy.pmid}_${new Date().toISOString().split('T')[0]}.csv`;
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
    <PermissionGate 
      resource="reports" 
      action="read"
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-600">You don't have permission to view full reports. Please contact your administrator to request the 'medical_examiner' role or 'reports' permission.</p>
          </div>
        </div>
      }
    >
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Full Report (Medical Examiner)</h1>
          <p className="text-black">
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
                      <h3 className="text-lg font-semibold text-black mb-2">
                        {study.title}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-800 mb-2">
                        <span><strong>PMID:</strong> {study.pmid}</span>
                        <span><strong>Drug:</strong> {study.drugName}</span>
                      </div>
                      <p className="text-sm text-black mb-2">
                        <strong>Adverse Event:</strong> {study.adverseEvent}
                      </p>
                      {study.r3FormCompletedAt && (
                        <p className="text-sm text-black">
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
                <h2 className="text-xl font-bold text-black">
                  ICSR Full Report - {selectedStudy?.title}
                </h2>
                <p className="text-sm text-black mt-1">
                  PMID: {selectedStudy?.pmid} | Drug: {selectedStudy?.drugName}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                  >
                    Export Report
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showExportMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px]">
                      <button
                        onClick={() => {
                          exportReport();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="text-blue-600">📄</span>
                        Export as JSON
                      </button>
                      <button
                        onClick={() => {
                          exportToR3XML();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="text-green-600">📋</span>
                        Export as R3 XML
                      </button>
                      <button
                        onClick={() => {
                          exportToCSV();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="text-orange-600">📊</span>
                        Export as CSV
                      </button>
                    </div>
                  )}
                </div>
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
                <h3 className="text-lg font-semibold text-black mb-3">Complete Study Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Basic Study Info */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-sm font-medium text-black">Title:</p>
                    <p className="text-sm text-black bg-white p-2 rounded border">{selectedStudy?.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">PMID:</p>
                    <p className="text-sm text-black">{selectedStudy?.pmid}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Drug Name:</p>
                    <p className="text-sm text-black">{selectedStudy?.drugName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Adverse Event:</p>
                    <p className="text-sm text-black">{selectedStudy?.adverseEvent}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">User Tag:</p>
                    <p className="text-sm text-black">{selectedStudy?.userTag}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Status:</p>
                    <p className="text-sm text-black">{selectedStudy?.status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">R3 Form Status:</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedStudy?.r3FormStatus === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedStudy?.r3FormStatus}
                    </span>
                  </div>
                  
                  {/* Publication Info */}
                  {selectedStudy?.journal && (
                    <div>
                      <p className="text-sm font-medium text-black">Journal:</p>
                      <p className="text-sm text-black">{selectedStudy.journal}</p>
                    </div>
                  )}
                  {selectedStudy?.publicationDate && (
                    <div>
                      <p className="text-sm font-medium text-black">Publication Date:</p>
                      <p className="text-sm text-black">{selectedStudy.publicationDate}</p>
                    </div>
                  )}
                  {selectedStudy?.authors && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-sm font-medium text-black">Authors:</p>
                      <p className="text-sm text-black bg-white p-2 rounded border">
                        {Array.isArray(selectedStudy.authors) 
                          ? selectedStudy.authors.join(', ') 
                          : selectedStudy.authors}
                      </p>
                    </div>
                  )}
                  {selectedStudy?.abstract && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-sm font-medium text-black">Abstract:</p>
                      <p className="text-sm text-black bg-white p-3 rounded border max-h-32 overflow-y-auto">
                        {selectedStudy.abstract}
                      </p>
                    </div>
                  )}
                  
                  {/* Timestamps */}
                  <div>
                    <p className="text-sm font-medium text-black">Created Date:</p>
                    <p className="text-sm text-black">{selectedStudy?.createdAt ? formatDate(selectedStudy.createdAt) : 'N/A'}</p>
                  </div>
                  {selectedStudy?.updatedAt && (
                    <div>
                      <p className="text-sm font-medium text-black">Last Updated:</p>
                      <p className="text-sm text-black">{formatDate(selectedStudy.updatedAt)}</p>
                    </div>
                  )}
                  {selectedStudy?.r3FormCompletedAt && (
                    <div>
                      <p className="text-sm font-medium text-black">Form Completed:</p>
                      <p className="text-sm text-black">{formatDate(selectedStudy.r3FormCompletedAt)}</p>
                    </div>
                  )}
                  
                  {/* User Info */}
                  {selectedStudy?.createdBy && (
                    <div>
                      <p className="text-sm font-medium text-black">Created By:</p>
                      <p className="text-sm text-black">{selectedStudy.createdBy}</p>
                    </div>
                  )}
                  {selectedStudy?.r3FormCompletedBy && (
                    <div>
                      <p className="text-sm font-medium text-black">Form Completed By:</p>
                      <p className="text-sm text-black">{selectedStudy.r3FormCompletedBy}</p>
                    </div>
                  )}
                  {selectedStudy?.reviewedBy && (
                    <div>
                      <p className="text-sm font-medium text-black">Reviewed By:</p>
                      <p className="text-sm text-black">{selectedStudy.reviewedBy}</p>
                    </div>
                  )}
                  {selectedStudy?.approvedBy && (
                    <div>
                      <p className="text-sm font-medium text-black">Approved By:</p>
                      <p className="text-sm text-black">{selectedStudy.approvedBy}</p>
                    </div>
                  )}
                  
                  {/* System Info */}
                  {selectedStudy?.userId && (
                    <div>
                      <p className="text-sm font-medium text-black">User ID:</p>
                      <p className="text-sm text-black">{selectedStudy.userId}</p>
                    </div>
                  )}
                  {selectedStudy?.organizationId && (
                    <div>
                      <p className="text-sm font-medium text-black">Organization ID:</p>
                      <p className="text-sm text-black">{selectedStudy.organizationId}</p>
                    </div>
                  )}
                  {selectedStudy?.isProcessed !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-black">Processing Status:</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedStudy.isProcessed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedStudy.isProcessed ? 'Processed' : 'Pending'}
                      </span>
                    </div>
                  )}
                  {selectedStudy?.processingNotes && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-sm font-medium text-black">Processing Notes:</p>
                      <p className="text-sm text-black bg-blue-50 p-2 rounded border">{selectedStudy.processingNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Inference Data */}
              {(selectedStudy?.aiInferenceData || 
                selectedStudy?.doi || 
                selectedStudy?.specialCase || 
                selectedStudy?.countryOfFirstAuthor || 
                selectedStudy?.summary) && (
                <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-black mb-3">AI Inference Data</h3>
                  
                  {/* AI Processed Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {selectedStudy?.doi && (
                      <div>
                        <p className="text-sm font-medium text-black">DOI:</p>
                        <p className="text-sm text-black">{selectedStudy.doi}</p>
                      </div>
                    )}
                    {selectedStudy?.specialCase && (
                      <div>
                        <p className="text-sm font-medium text-black">Special Case:</p>
                        <p className="text-sm text-black">{selectedStudy.specialCase}</p>
                      </div>
                    )}
                    {selectedStudy?.countryOfFirstAuthor && (
                      <div>
                        <p className="text-sm font-medium text-black">Country of First Author:</p>
                        <p className="text-sm text-black">{selectedStudy.countryOfFirstAuthor}</p>
                      </div>
                    )}
                    {selectedStudy?.countryOfOccurrence && (
                      <div>
                        <p className="text-sm font-medium text-black">Country of Occurrence:</p>
                        <p className="text-sm text-black">{selectedStudy.countryOfOccurrence}</p>
                      </div>
                    )}
                    {selectedStudy?.attributability && (
                      <div>
                        <p className="text-sm font-medium text-black">Attributability:</p>
                        <p className="text-sm text-black">{selectedStudy.attributability}</p>
                      </div>
                    )}
                    {selectedStudy?.drugEffect && (
                      <div>
                        <p className="text-sm font-medium text-black">Drug Effect:</p>
                        <p className="text-sm text-black">{selectedStudy.drugEffect}</p>
                      </div>
                    )}
                    {selectedStudy?.textType && (
                      <div>
                        <p className="text-sm font-medium text-black">Text Type:</p>
                        <p className="text-sm text-black">{selectedStudy.textType}</p>
                      </div>
                    )}
                    {selectedStudy?.authorPerspective && (
                      <div>
                        <p className="text-sm font-medium text-black">Author Perspective:</p>
                        <p className="text-sm text-black">{selectedStudy.authorPerspective}</p>
                      </div>
                    )}
                    {selectedStudy?.icsrClassification && (
                      <div>
                        <p className="text-sm font-medium text-black">ICSR Classification:</p>
                        <p className="text-sm text-black">{selectedStudy.icsrClassification}</p>
                      </div>
                    )}
                    {selectedStudy?.substanceGroup && (
                      <div>
                        <p className="text-sm font-medium text-black">Substance Group:</p>
                        <p className="text-sm text-black">{selectedStudy.substanceGroup}</p>
                      </div>
                    )}
                    {selectedStudy?.leadAuthor && (
                      <div>
                        <p className="text-sm font-medium text-black">Lead Author:</p>
                        <p className="text-sm text-black">{selectedStudy.leadAuthor}</p>
                      </div>
                    )}
                    {selectedStudy?.serious !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-black">Serious:</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedStudy.serious ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {selectedStudy.serious ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    {selectedStudy?.confirmedPotentialICSR !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-black">Confirmed Potential ICSR:</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedStudy.confirmedPotentialICSR ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedStudy.confirmedPotentialICSR ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    {selectedStudy?.identifiableHumanSubject !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-black">Identifiable Human Subject:</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedStudy.identifiableHumanSubject ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {selectedStudy.identifiableHumanSubject ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    {selectedStudy?.testSubject && (
                      <div>
                        <p className="text-sm font-medium text-black">Test Subject:</p>
                        <p className="text-sm text-black">{selectedStudy.testSubject}</p>
                      </div>
                    )}
                    {selectedStudy?.sponsor && (
                      <div>
                        <p className="text-sm font-medium text-black">Sponsor:</p>
                        <p className="text-sm text-black">{selectedStudy.sponsor}</p>
                      </div>
                    )}
                    {selectedStudy?.clientName && (
                      <div>
                        <p className="text-sm font-medium text-black">Client Name:</p>
                        <p className="text-sm text-black">{selectedStudy.clientName}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Complex AI Fields */}
                  {selectedStudy?.patientDetails && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-2">Patient Details:</p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {typeof selectedStudy.patientDetails === 'object' 
                          ? JSON.stringify(selectedStudy.patientDetails, null, 2)
                          : selectedStudy.patientDetails}
                      </div>
                    </div>
                  )}
                  
                  {selectedStudy?.keyEvents && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-2">Key Events:</p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {Array.isArray(selectedStudy.keyEvents) 
                          ? selectedStudy.keyEvents.join(', ')
                          : selectedStudy.keyEvents}
                      </div>
                    </div>
                  )}
                  
                  {selectedStudy?.administeredDrugs && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-2">Administered Drugs:</p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {Array.isArray(selectedStudy.administeredDrugs) 
                          ? selectedStudy.administeredDrugs.join(', ')
                          : selectedStudy.administeredDrugs}
                      </div>
                    </div>
                  )}
                  
                  {selectedStudy?.relevantDates && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-2">Relevant Dates:</p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {typeof selectedStudy.relevantDates === 'object' 
                          ? JSON.stringify(selectedStudy.relevantDates, null, 2)
                          : selectedStudy.relevantDates}
                      </div>
                    </div>
                  )}
                  
                  {selectedStudy?.summary && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-2">AI Summary:</p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {selectedStudy.summary}
                      </div>
                    </div>
                  )}
                  
                  {selectedStudy?.justification && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-2">Justification:</p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {selectedStudy.justification}
                      </div>
                    </div>
                  )}
                  
                  {selectedStudy?.vancouverCitation && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-2">Vancouver Citation:</p>
                      <div className="text-sm text-black bg-white p-3 rounded border">
                        {selectedStudy.vancouverCitation}
                      </div>
                    </div>
                  )}
                  
                  {/* Raw AI Inference Data */}
                  {selectedStudy?.aiInferenceData && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-black mb-2">Raw AI Inference Data:</p>
                      <details className="cursor-pointer">
                        <summary className="text-sm text-blue-600 hover:text-blue-800 mb-2">
                          Click to view raw AI response data
                        </summary>
                        <div className="text-xs text-black bg-white p-3 rounded border max-h-96 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(selectedStudy.aiInferenceData, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {/* R3 Form Data Summary */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-black mb-3">R3 Form Data Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-black">Total R3 Fields:</p>
                    <p className="text-black">{R3_FORM_FIELDS.length}</p>
                  </div>
                  <div>
                    <p className="font-medium text-black">Fields Completed:</p>
                    <p className="text-black">{selectedStudy?.r3FormData ? Object.keys(selectedStudy.r3FormData).length : 0}</p>
                  </div>
                  <div>
                    <p className="font-medium text-black">Completion Rate:</p>
                    <p className="text-black">
                      {selectedStudy?.r3FormData 
                        ? Math.round((Object.keys(selectedStudy.r3FormData).length / R3_FORM_FIELDS.length) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-black">Category A:</p>
                    <p className="text-black">
                      {selectedStudy?.r3FormData 
                        ? R3_FORM_FIELDS.filter(field => field.category === 'A' && selectedStudy.r3FormData[field.key]).length
                        : 0} / {R3_FORM_FIELDS.filter(field => field.category === 'A').length}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-black">Category B:</p>
                    <p className="text-black">
                      {selectedStudy?.r3FormData 
                        ? R3_FORM_FIELDS.filter(field => field.category === 'B' && selectedStudy.r3FormData[field.key]).length
                        : 0} / {R3_FORM_FIELDS.filter(field => field.category === 'B').length}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-black">Category C:</p>
                    <p className="text-black">
                      {selectedStudy?.r3FormData 
                        ? R3_FORM_FIELDS.filter(field => field.category === 'C' && selectedStudy.r3FormData[field.key]).length
                        : 0} / {R3_FORM_FIELDS.filter(field => field.category === 'C').length}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium text-green-800">Category A (Mandatory for transmission)</p>
                    <p className="text-gray-600">Required fields that must be completed for regulatory submission</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium text-yellow-800">Category B (Mandatory if available)</p>
                    <p className="text-gray-600">Required if the information is available or relevant</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium text-blue-800">Category C (Optional)</p>
                    <p className="text-gray-600">Additional information that may provide context</p>
                  </div>
                </div>
              </div>

              {/* R3 Form Data */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-black mb-4">Complete R3 Form Data (All Fields)</h3>
                
                {/* Group fields by category */}
                {['A', 'B', 'C', 'Null'].map(category => {
                  const categoryFields = R3_FORM_FIELDS.filter(field => field.category === category);
                  if (categoryFields.length === 0) return null;
                  
                  return (
                    <div key={category} className="mb-8">
                      <h4 className="text-md font-semibold text-black mb-4 flex items-center">
                        Category {category} Fields
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category)}`}>
                          {category === 'A' ? 'Mandatory for transmission' : 
                           category === 'B' ? 'Mandatory if available' : 
                           category === 'C' ? 'Optional' : 'Other'}
                        </span>
                      </h4>
                      
                      <div className="space-y-3">
                        {categoryFields.map((field) => {
                          const value = selectedStudy?.r3FormData?.[field.key] || "";
                          const hasValue = !!value;
                          
                          return (
                            <div key={field.key} className={`border rounded-lg p-4 ${
                              hasValue ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                            }`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium text-black">
                                    {field.key} - {field.label}
                                  </h5>
                                </div>
                                <div className="flex gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(field.category)}`}>
                                    Category {field.category}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    hasValue ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {hasValue ? 'Completed' : 'Empty'}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2">
                                {hasValue ? (
                                  <p className="text-sm text-black whitespace-pre-wrap bg-white p-3 rounded border">
                                    {value}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-500 italic p-3 rounded border border-dashed">
                                    No data provided for this field
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
    </PermissionGate>
  );
}