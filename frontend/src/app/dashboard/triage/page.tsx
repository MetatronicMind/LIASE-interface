"use client";
import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";
import { PmidLink } from "@/components/PmidLink";
import PDFAttachmentUpload from "@/components/PDFAttachmentUpload";
import { CommentThread } from "@/components/CommentThread";
import TriageStudyDetails from "@/components/TriageStudyDetails";
import { useDateTime } from "@/hooks/useDateTime";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string[] | string;
  journal: string;
  publicationDate: string;
  abstract: string;
  drugName: string;
  adverseEvent: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  comments?: any[];
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    uploadedByName?: string;
  }>;
  qaApprovalStatus?: 'pending' | 'approved' | 'rejected';
  qaComments?: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  
  // AI Inference Data - Raw API response
  aiInferenceData?: any;
  
  // AI Inference Fields - Normalized from backend
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
  listedness?: string;
  seriousness?: string;
  clientName?: string;
  sponsor?: string;
  userTag?: 'ICSR' | 'AOI' | 'No Case' | null;
  effectiveClassification?: string;
  requiresManualReview?: boolean;
  fullTextAvailability?: string;
  fullTextSource?: string;
  
  // Legacy fields for backward compatibility
  Drugname?: string;
  Serious?: string;
  special_case?: string;
  ICSR_classification?: string;
  Text_type?: string;
  
  // Allocation fields
  assignedTo?: string;
  lockedAt?: string;
}

// No sample data - user requested removal of all sample/demo data
const fallbackStudies: any[] = [];

const statusStyles: Record<string, string> = {
  "Pending Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "Under Triage Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "Study in Process": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "Under Review": "bg-blue-100 text-blue-800 border border-blue-300",
  Approved: "bg-green-100 text-green-800 border border-green-300",
};

export default function TriagePage() {
  const selectedOrganizationId = useSelector((state: RootState) => state.filter.selectedOrganizationId);
  const { formatDate } = useDateTime();
  // Studies state
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [search, setSearch] = useState("");
  const [studyIdFilter, setStudyIdFilter] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [classificationType, setClassificationType] = useState("");
  const [clientNameFilter, setClientNameFilter] = useState("");
  const [journalNameFilter, setJournalNameFilter] = useState("");
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  
  // Classification state
  const [classifying, setClassifying] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);
  const [justification, setJustification] = useState<string>("");
  const [listedness, setListedness] = useState<string>("");
  const [seriousness, setSeriousness] = useState<string>("");
  const [fullTextAvailability, setFullTextAvailability] = useState<string>("");
  const [fullTextSource, setFullTextSource] = useState<string>("");
  
  // UI state
  const [showRawData, setShowRawData] = useState(false);
  
  // Allocation state
  const [allocatedCase, setAllocatedCase] = useState<Study | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [isLockingStudy, setIsLockingStudy] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const API_BASE = getApiBaseUrl();

  // Normalize API studies to ensure proper data types
  const normalizeApiStudies = (apiStudies: any[]): Study[] => {
    return apiStudies.map(study => ({
      ...study,
      keyEvents: Array.isArray(study.keyEvents) 
        ? study.keyEvents 
        : typeof study.keyEvents === 'string' 
          ? [study.keyEvents] 
          : [],
      authors: Array.isArray(study.authors) 
        ? study.authors 
        : typeof study.authors === 'string' 
          ? [study.authors] 
          : [],
      comments: Array.isArray(study.comments) ? study.comments : []
    }));
  };

  // Fetch studies from API
  useEffect(() => {
    fetchStudies();
  }, [selectedOrganizationId]);

  const fetchStudies = async () => {
    setLoading(true);
    setError(''); // Clear any previous errors
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        // No sample data shown as requested by user
        setStudies([]);
        return;
      }

      console.log('Fetching studies from API...');
      const queryParams = selectedOrganizationId ? `&organizationId=${selectedOrganizationId}` : '';
      const response = await fetch(`${API_BASE}/studies?limit=1000${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        
        // Handle different possible response structures
        const studiesData = data.studies || data.data || (Array.isArray(data) ? data : []);
        
        if (studiesData.length === 0) {
          setError('No studies found in your organization. Try running drug discovery to create some studies.');
          // No sample data shown as requested by user
          setStudies([]);
        } else {
          // Deduplicate studies by PMID to prevent duplicate articles in triage
          const uniqueStudies = studiesData.reduce((acc: any[], study: any) => {
            if (!acc.some(s => s.pmid === study.pmid)) {
              acc.push(study);
            }
            return acc;
          }, []);
          
          if (uniqueStudies.length < studiesData.length) {
            console.warn(`Removed ${studiesData.length - uniqueStudies.length} duplicate studies`);
          }
          
          setStudies(normalizeApiStudies(uniqueStudies));
          console.log(`Successfully loaded ${uniqueStudies.length} unique studies`);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch studies:', response.status, response.statusText, errorText);
        
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          setError('You do not have permission to view studies.');
        } else {
          setError(`Failed to load studies: ${response.statusText}`);
        }
        
        // No sample data shown as requested by user
        setStudies([]);
      }
    } catch (error) {
      console.error('Error fetching studies:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Network error: ${errorMessage}. Check if the backend server is running.`);
      
      // No sample data shown as requested by user
      setStudies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateCase = async () => {
    console.log('handleAllocateCase: Starting allocation...');
    setIsAllocating(true);
    try {
      const token = localStorage.getItem('auth_token');
      console.log('handleAllocateCase: Fetching from API...');
      const response = await fetch(`${API_BASE}/studies/allocate-case`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('handleAllocateCase: Response status:', response.status);
      const data = await response.json();
      console.log('handleAllocateCase: Data received:', data);
      
      if (data.success) {
        console.log('handleAllocateCase: Setting new case:', data.case.id);
        setAllocatedCase(data.case);
        // Also update the studies list if needed, or just rely on allocatedCase view
      } else {
        console.log('handleAllocateCase: Allocation failed or no cases:', data.message);
        // If no cases are available, we should probably inform the user and exit allocation mode
        if (data.message === "No pending cases found for allocation") {
             alert("No more pending cases available for triage.");
             setAllocatedCase(null);
        } else {
             alert(data.message || "Failed to allocate case");
        }
      }
    } catch (error) {
      console.error("Error allocating case:", error);
      alert("Error allocating case. Please try again.");
    } finally {
      setIsAllocating(false);
    }
  };

  const handleReleaseCase = async () => {
    if (!allocatedCase) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE}/studies/release-case/${allocatedCase.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setAllocatedCase(null);
      // Refresh list to show updated status
      fetchStudies();
    } catch (error) {
      console.error("Error releasing case:", error);
    }
  };

  // View a study without locking
  const handleViewStudy = (study: Study) => {
    setSelectedStudy(study);
  };

  // Lock a study for editing in legacy view
  const handleLockStudy = async (study: Study) => {
    // If study is already locked by current user, just select it
    if (study.assignedTo === user?.id) {
      setSelectedStudy(study);
      return;
    }
    
    // If study is locked by someone else, show error
    if (study.assignedTo && study.assignedTo !== user?.id) {
      alert(`This case is currently being worked on by another user.`);
      return;
    }
    
    setIsLockingStudy(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/studies/lock-case/${study.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the study in the list with locked status
        const updatedStudy = data.study;
        setStudies(prev => prev.map(s => s.id === study.id ? updatedStudy : s));
        setSelectedStudy(updatedStudy);
      } else {
        alert(data.message || "Failed to lock case");
      }
    } catch (error) {
      console.error("Error locking case:", error);
      alert("Error locking case. Please try again.");
    } finally {
      setIsLockingStudy(false);
    }
  };

  // Release lock on a study
  const handleReleaseStudy = async (studyId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE}/studies/release-case/${studyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update the study in the list to show it's unlocked
      setStudies(prev => prev.map(s => 
        s.id === studyId ? { ...s, assignedTo: null, lockedAt: null } : s
      ));
    } catch (error) {
      console.error("Error releasing case:", error);
    }
  };

  // Classification function
  const classifyStudy = async (studyId: string, classification: string, details?: { justification?: string, listedness?: string, seriousness?: string, fullTextAvailability?: string }) => {
    console.log('classifyStudy called for:', studyId, classification);
    try {
      setClassifying(studyId);
      const token = localStorage.getItem("auth_token");
      
      const body: any = {
        userTag: classification
      };

      if (details) {
        if (details.justification) body.justification = details.justification;
        if (details.listedness) body.listedness = details.listedness;
        if (details.seriousness) body.seriousness = details.seriousness;
        if (details.fullTextAvailability) body.fullTextAvailability = details.fullTextAvailability;
      }
      
      console.log('Sending PUT request to:', `${API_BASE}/studies/${studyId}`);
      const response = await fetch(`${API_BASE}/studies/${studyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      
      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Full API Result:', result);
        const updatedStudy = result.study;
        
        if (result.debug) {
            console.log('=== CLASSIFICATION DEBUG ===');
            console.log('Full Debug Object:', result.debug);
            console.log('Transition Found:', result.debug.transition);
            console.log('Next Stage:', result.debug.nextStage);
            console.log('============================');
        } else {
            console.log('WARNING: No debug object in response');
        }
        
        // Update the study in the local state with the response from the server
        setStudies(prev => prev.map(study => 
          study.id === studyId ? updatedStudy : study
        ));
        
        // Also update selected study if it's the one being classified
        if (selectedStudy && selectedStudy.id === studyId) {
          setSelectedStudy(updatedStudy);
        }
        
        if (allocatedCase && allocatedCase.id === studyId) {
          setAllocatedCase(updatedStudy);
        }
        
        // Reset classification state
        setSelectedClassification(null);
        setJustification("");
        setListedness("");
        setSeriousness("");
        setFullTextAvailability("");
        
        // Check if we are in allocation mode and the classified study is the allocated one
        if (allocatedCase && allocatedCase.id === studyId) {
            // Fetch the next case automatically
            console.log('Auto-advancing to next case...');
            handleAllocateCase();
        } else {
            // Release the lock on the study in legacy view since it's now classified
            if (selectedStudy && selectedStudy.id === studyId) {
              handleReleaseStudy(studyId);
              setSelectedStudy(null);
            }
            alert(`Literature Article classified as ${classification}. Awaiting QC approval.`);
        }
      } else {
        throw new Error("Failed to classify study");
      }
    } catch (error) {
      console.error("Error classifying study:", error);
      alert("Error classifying study. Please try again.");
    } finally {
      setClassifying(null);
    }
  };

  // Helper function to normalize classification values from backend
  // Handles formats like "Classification:" or "4. Classification" -> "Classification"
  const normalizeClassification = (value?: string): string | undefined => {
    if (!value) return value;
    // Remove "Classification:" prefix if present
    let normalized = value.replace(/^Classification:\s*/i, '').trim();
    // Also remove number prefix patterns like "1. ", "2. ", "3. ", "4. ", etc.
    normalized = normalized.replace(/^\d+\.\s*/, '').trim();
    return normalized;
  };

  // Function to calculate final classification based on AI inference data
  // (Defined before filteredStudies to avoid hoisting issues)
  const getFinalClassification = (study: Study): string | null => {
    const rawIcsrClassification = study.aiInferenceData?.ICSR_classification || study.ICSR_classification || study.icsrClassification;
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

  // Get unique client names and journal names for dropdowns
  const uniqueClientNames = Array.from(new Set(studies.map(s => s.clientName).filter(Boolean))).sort();
  const uniqueJournalNames = Array.from(new Set(studies.map(s => s.journal).filter(Boolean))).sort();

  // Filtering logic
  const filteredStudies = studies.filter((study: Study) => {
    // Only show studies that need triage classification:
    // 1. Studies without a userTag (not yet classified), OR
    // 2. Studies that were rejected by QC (need re-classification)
    // 3. Studies that were revoked to Triage (status === 'triage')
    // Exclude studies that are approved or pending QC approval
    const needsTriage = !study.userTag || study.qaApprovalStatus === 'rejected' || study.status === 'triage';
    if (!needsTriage) return false;
    
    // Search by drug name, title, or PMID
    const matchesSearch =
      search.trim() === "" ||
      study.drugName.toLowerCase().includes(search.toLowerCase()) ||
      study.title.toLowerCase().includes(search.toLowerCase()) ||
      study.pmid.toLowerCase().includes(search.toLowerCase());
    
    // Study ID filter
    const matchesStudyId = 
      studyIdFilter.trim() === "" ||
      study.id.toLowerCase().includes(studyIdFilter.toLowerCase());

    // Status filter
    const matchesStatus = status === "" || study.status === status;
    // Date range filter (created date)
    const studyDate = study.createdAt.split('T')[0]; // Extract date part
    const matchesDateFrom = !dateFrom || studyDate >= dateFrom;
    const matchesDateTo = !dateTo || studyDate <= dateTo;
    
    // Classification Type filter
    const finalClassification = getFinalClassification(study);
    const matchesClassificationType = classificationType === "" || finalClassification === classificationType;

    // Client Name filter
    const matchesClientName = clientNameFilter === "" || study.clientName === clientNameFilter;

    // Journal Name filter
    const matchesJournalName = journalNameFilter === "" || study.journal === journalNameFilter;
    
    return matchesSearch && matchesStudyId && matchesStatus && matchesDateFrom && matchesDateTo && matchesClassificationType && matchesClientName && matchesJournalName;
  });

  // Pagination logic
  const pageCount = Math.ceil(filteredStudies.length / pageSize);
  const paginatedStudies = filteredStudies.slice((page - 1) * pageSize, page * pageSize);

  // When filtered list changes, keep selectedStudy in sync and reset pagination
  useEffect(() => {
    if (!filteredStudies.length) {
      setSelectedStudy(null);
      setPage(1);
      return;
    }
    // Do not auto-select any study when filters change
    setPage(1); // Reset to first page when filters change
  }, [search, studyIdFilter, status, dateFrom, dateTo, classificationType, clientNameFilter, journalNameFilter]);

  // Action handlers
  const handleAction = (action: string) => {
    // TODO: Replace with backend call
    alert(`${action} action applied to PMID ${selectedStudy?.pmid}`);
  };

  const getClassificationLabel = (study: Study) => {
    if (study.userTag === "No Case") {
      const textType = study.Text_type || study.textType;
      if (textType === "Animal Study" || textType === "In Vitro") {
        return textType;
      }
      return "No Case";
    }
    return study.userTag;
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

  const detailsRef = useRef<HTMLDivElement>(null);

  // Scroll to details section on mobile when study is selected
  useEffect(() => {
    if (selectedStudy && detailsRef.current && window.innerWidth < 1024) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedStudy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Literature Triage</h1>
            {/* <p className="mt-1 text-sm text-gray-600">Classify studies as ICSR, Article of Interest, or No Case for pharmacovigilance processing</p> */}
          </div>
          {allocatedCase && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Working on Case: {allocatedCase.pmid}</span>
              <button 
                onClick={handleReleaseCase}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Exit / Release Case
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Notice:</strong> {error}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Run drug discovery to create studies for classification.
                </p>
              </div>
            </div>
          </div>
        )}

        {!allocatedCase ? (
          <>
            {/* Allocation CTA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center mb-8">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Triage?</h2>
                <p className="text-gray-600 mb-8">
                  Get the next available case assigned to you. The system ensures no two users work on the same case.
                </p>
                <button
                  onClick={handleAllocateCase}
                  disabled={isAllocating}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  {isAllocating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Allocating Case...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="w-6 h-6 mr-2" />
                      Start Triage Session
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-gray-50 text-sm text-gray-500">Or browse pending articles (Legacy View)</span>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            Filter Articles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Drug Name, Title, or PMID</label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by drug name, title, or PMID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Study ID</label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by Study ID..."
                  value={studyIdFilter}
                  onChange={e => setStudyIdFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
                />
              </div>
            </div>
            
            {/* <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              >
                <option value="">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
              </select>
            </div> */}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Client Name </label>
              <select
                value={clientNameFilter}
                onChange={e => setClientNameFilter(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              >
                <option value="">All Clients</option>
                {uniqueClientNames.map((client, index) => (
                  <option key={index} value={client as string}>{client}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">AI Classification </label>
              <select
                value={classificationType}
                onChange={e => setClassificationType(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              >
                <option value="">All Classifications</option>
                <option value="Probable ICSR/AOI">Probable ICSR/AOI</option>
                <option value="Probable ICSR">Probable ICSR</option>
                <option value="Probable AOI">Probable AOI</option>
                <option value="No Case">No Case</option>
                <option value="Manual Review">Manual Review</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Journal Name </label>
              <select
                value={journalNameFilter}
                onChange={e => setJournalNameFilter(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              >
                <option value="">All Journals</option>
                {uniqueJournalNames.map((journal, index) => (
                  <option key={index} value={journal as string}>{journal}</option>
                ))}
              </select>
            </div>


            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              />
            </div>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 text-sm font-medium transition-colors"
              onClick={() => {
                setSearch("");
                setStudyIdFilter("");
                setStatus("");
                setDateFrom("");
                setDateTo("");
                setClassificationType("");
                setPage(1);
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
            <div className="flex items-center text-sm text-gray-600 ">
              <span className="font-medium">{filteredStudies.length}</span> Articles found
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Studies List */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Articles ({filteredStudies.length})
                    </h3>
                    <button
                      onClick={fetchStudies}
                      disabled={loading}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                      title="Refresh studies"
                    >
                      <svg 
                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  {filteredStudies.length > 10 && (
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Show:</label>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPageSize(value === 'all' ? filteredStudies.length || 1000 : Number(value));
                          setPage(1);
                        }}
                        className="border border-blue-400 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Studies List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-lg font-medium">Loading studies...</p>
                    <p className="text-sm mt-1">Please wait while we fetch your data</p>
                  </div>
                ) : filteredStudies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No studies found</p>
                    <p className="text-sm mt-1">Try adjusting your search criteria or run drug discovery to create studies</p>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 sm:p-6">
                    {paginatedStudies.map((study, index) => (
                      <div
                        key={study.pmid}
                        onClick={() => handleViewStudy(study)}
                        className={`group relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedStudy && selectedStudy.pmid === study.pmid
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : study.assignedTo && study.assignedTo !== user?.id
                            ? "border-yellow-200 bg-yellow-50"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                        }`}
                      >
                        {/* Study Card Content */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                ID: {study.id}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                PMID: <PmidLink pmid={study.pmid} className="text-blue-800 hover:underline ml-1" />
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {study.assignedTo && study.assignedTo !== user?.id && (
                                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Locked by another user">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              )}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[study.status]}`}>
                                {study.status === 'Study in Process' ? 'Under Triage Review' : study.status}
                              </span>
                            </div>
                          </div>
                          
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                            {study.title}
                          </h4>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">INN:</span> {study.drugName}
                            </div>
                            <div>
                              <span className="font-medium">Adverse Event:</span> {study.adverseEvent}
                            </div>
                            <div>
                              <span className="font-medium">Authors:</span> {
                                Array.isArray(study.authors) 
                                  ? study.authors.slice(0, 2).join(', ') + (study.authors.length > 2 ? ` et al.` : '')
                                  : typeof study.authors === 'string' 
                                    ? study.authors 
                                    : 'N/A'
                              }
                            </div>
                          </div>

                          {/* Classification and Tags */}
                          <div className="flex flex-wrap gap-1">
                            {study.assignedTo && study.assignedTo !== user?.id && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 border border-gray-400">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                In Use
                              </span>
                            )}
                            {study.assignedTo === user?.id && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800 border border-blue-400">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                You're Working On This
                              </span>
                            )}
                            {study.revokedBy && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Revoked
                              </span>
                            )}
                            {study.qaApprovalStatus === 'rejected' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                QC Rejected
                              </span>
                            )}
                            {(study.requiresManualReview || getFinalClassification(study) === "Manual Review") && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-300">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Manual Review
                              </span>
                            )}
                            {study.userTag && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getClassificationColor(study.userTag)}`}>
                                {getClassificationLabel(study)}
                              </span>
                            )}
                            {study.justification && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {study.justification}
                              </span>
                            )}
                            {study.fullTextAvailability && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                Full Text: {study.fullTextAvailability}
                              </span>
                            )}
                            {!study.userTag && study.qaApprovalStatus !== 'rejected' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Unclassified
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Selection Indicator */}
                        {selectedStudy && selectedStudy.pmid === study.pmid && (
                          <div className="absolute top-2 right-2">
                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="border-t border-gray-200 px-2 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 flex items-center justify-center sm:justify-start text-xs sm:text-sm text-gray-700">
                      <span>
                        Showing <span className="font-semibold">{(page - 1) * pageSize + 1}</span> to <span className="font-semibold">{Math.min(page * pageSize, filteredStudies.length)}</span> of <span className="font-semibold">{filteredStudies.length}</span> results
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous Page"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-xs sm:text-sm text-gray-700 px-2">
                        Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{pageCount}</span>
                      </span>
                      <button
                        onClick={() => setPage(Math.min(pageCount, page + 1))}
                        disabled={page === pageCount}
                        className="flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next Page"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Study Details with Classification Actions */}
          <div className="xl:col-span-2" ref={detailsRef}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
              {selectedStudy ? (
                <div className="flex-1 overflow-y-auto">
                  {/* Header */}
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Triage Classification
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[selectedStudy.status]}`}>
                          {selectedStudy.status === 'Study in Process' ? 'Under Triage Review' : selectedStudy.status}
                        </span>
                        {selectedStudy.userTag && (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getClassificationColor(selectedStudy.userTag)}`}>
                            {selectedStudy.userTag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* QC Rejection Notice */}
                    {selectedStudy.qaApprovalStatus === 'rejected' && selectedStudy.qaComments && (
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-orange-800">
                              Classification Rejected by QC
                            </h3>
                            <div className="mt-2 text-sm text-orange-700">
                              <p className="font-semibold">Reason:</p>
                              <p className="mt-1">{selectedStudy.qaComments}</p>
                            </div>
                            <p className="mt-3 text-xs text-orange-600">
                              Please review and re-classify this study based on the QC feedback.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Revocation Notice */}
                    {selectedStudy.revokedBy && selectedStudy.revocationReason && (
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
                              <p className="mt-1">{selectedStudy.revocationReason}</p>
                            </div>
                            {selectedStudy.revokedAt && (
                              <p className="mt-2 text-xs text-red-600">
                                Revoked on: {formatDate(selectedStudy.revokedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Basic Information */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-gray-900 mb-3">Literature Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-bold text-gray-700">Study ID:</span>
                          <p className="mt-1 text-gray-900 font-mono">{selectedStudy.id}</p>
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">PMID:</span>
                          <p className="mt-1"><PmidLink pmid={selectedStudy.pmid} showIcon={true} /></p>
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">INN & Brand Name:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.drugName}</p>
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">Authors:</span>
                          <p className="mt-1 text-gray-900">
                            {Array.isArray(selectedStudy.authors) 
                              ? selectedStudy.authors.join(', ')
                              : typeof selectedStudy.authors === 'string' 
                                ? selectedStudy.authors 
                                : 'N/A'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">Journal Name:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.journal || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">Publication Date:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.publicationDate || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <span className="font-bold text-gray-700">Created On:</span>
                          <p className="mt-1 text-gray-900">{formatDate(selectedStudy.createdAt)}</p>
                        </div>
                        {/* <div>
                          <span className="font-medium text-gray-700">Created By:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.createdBy || 'System'}</p>
                        </div> */}
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Title:</span>
                        <p className="mt-1 text-gray-900 leading-relaxed">{selectedStudy.title}</p>
                      </div>
                      {selectedStudy.vancouverCitation && (
                        <div>
                          <span className="font-bold text-gray-700">Literature Citation:</span>
                          <p className="mt-1 text-gray-900 text-sm italic">{selectedStudy.vancouverCitation}</p>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Abstract Display */}
                    {(selectedStudy.aiInferenceData?.Abstract || selectedStudy.abstract) && (
                      <div className="bg-gray-50 rounded-lg p-4">
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
                    
                    {/* AI Final Classification - After Abstract */}
                    {getFinalClassification(selectedStudy) && (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-200">
                        <div className="flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600 mb-2">AI Classification Result</p>
                            <p className="text-2xl font-bold text-indigo-900">
                              {getFinalClassification(selectedStudy)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Study Metadata */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        Literature Article Overview
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {selectedStudy.doi && (
                          <div>
                            <span className="font-bold text-gray-700">DOI:</span>
                            <p className="mt-1 text-gray-900 break-all">
                              <a 
                                href={selectedStudy.doi.startsWith('http') ? selectedStudy.doi : `https://doi.org/${selectedStudy.doi}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                {selectedStudy.doi}
                              </a>
                            </p>
                          </div>
                        )}
                        {selectedStudy.leadAuthor && (
                          <div>
                            <span className="font-bold text-gray-700">Lead Author:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.leadAuthor}</p>
                          </div>
                        )}
                        {selectedStudy.countryOfFirstAuthor && (
                          <div>
                            <span className="font-bold text-gray-700">Country of first Author:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.countryOfFirstAuthor}</p>
                          </div>
                        )}
                        {selectedStudy.countryOfOccurrence && (
                          <div>
                            <span className="font-bold text-gray-700">Country of Occurrence:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.countryOfOccurrence}</p>
                          </div>
                        )}
                        {selectedStudy.substanceGroup && (
                          <div>
                            <span className="font-bold text-gray-700">INN:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.substanceGroup}</p>
                          </div>
                        )}
                        {selectedStudy.authorPerspective && (
                          <div>
                            <span className="font-bold text-gray-700">Author Perspective:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.authorPerspective}</p>
                          </div>
                        )}
                        {selectedStudy.sponsor && (
                          <div>
                            <span className="font-bold text-gray-700">Client Name:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.sponsor}</p>
                          </div>
                        )}
                        {selectedStudy.testSubject && (
                          <div>
                            <span className="font-bold text-gray-700">Subject/Participant/Patient:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.testSubject}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Analysis & Clinical Data */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div className="font-bold flex justify-center items-center">
                          <p>AI Literature Analysis</p>
                          </div>
                         
                      </h4>
                      <div className="space-y-4">
                        {/* Grid Layout for Analysis Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                          <span className="font-bold text-gray-700">AI Identified Adverse Event(s):</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.adverseEvent}</p>
                        </div>
                        {(selectedStudy.special_case || selectedStudy.specialCase) && (
                            <div>
                              <span className="font-bold text-gray-700">AI Identified Special Situation(s):</span>
                              <p className="mt-1 text-gray-900">{selectedStudy.special_case || selectedStudy.specialCase}</p>
                            </div>
                          )}
                          
                          {(selectedStudy.Text_type || selectedStudy.textType) && (
                            <div>
                              <span className="font-bold text-gray-700">Article Type:</span>
                              <p className="mt-1 text-gray-900">{selectedStudy.Text_type || selectedStudy.textType}</p>
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
                            <span className="font-bold text-gray-700">AI Identified Drug Effect </span> <span>(Beneficial/Adverse) :</span>
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
                        {selectedStudy.administeredDrugs && selectedStudy.administeredDrugs.length > 0 && (
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

                    {/* Raw AI Data Viewer - for debugging and verification */}
                    {/* {selectedStudy.aiInferenceData && (
                      <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            Raw AI Data
                          </h4>
                          <button
                            onClick={() => setShowRawData(!showRawData)}
                            className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            {showRawData ? 'Hide' : 'Show'}
                            <svg className={`w-4 h-4 ml-1 transform transition-transform ${showRawData ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        {showRawData && (
                          <div className="bg-white rounded p-4 border max-h-96 overflow-y-auto">
                            <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                              {JSON.stringify(selectedStudy.aiInferenceData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )} */}

                    {/* Summary */}
                    {selectedStudy.summary && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          AI Summary
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-900 leading-relaxed">{selectedStudy.summary}</p>
                        </div>
                      </div>
                    )}

                    {/* Classification Actions - Primary Feature for Triage */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Classify Article
                      </h4>
                      
                      {!selectedStudy.assignedTo ? (
                        <div className="text-center py-6 bg-white bg-opacity-50 rounded-lg border border-blue-100">
                          <p className="text-gray-600 mb-4 font-medium">This case is currently unlocked.</p>
                          <p className="text-sm text-gray-500 mb-4">You are viewing this case in read-only mode. To classify or edit, you must lock it first.</p>
                          <button
                            onClick={() => handleLockStudy(selectedStudy)}
                            disabled={isLockingStudy}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                          >
                            {isLockingStudy ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Locking Case...
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Lock Case for Classification
                              </>
                            )}
                          </button>
                        </div>
                      ) : selectedStudy.assignedTo !== user?.id ? (
                        <div className="text-center py-6 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex justify-center mb-2">
                            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <p className="text-yellow-800 font-medium text-lg">
                            Locked by another user
                          </p>
                          <p className="text-yellow-600 mt-2">
                            This case is currently being worked on by another user. You can view the details but cannot make changes.
                          </p>
                        </div>
                      ) : (
                        <>
                      {selectedClassification ? (
                        <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm animate-fadeIn">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="font-medium text-gray-900">
                              Classifying as <span className={`font-bold ${
                                selectedClassification === 'ICSR' ? 'text-red-600' : 
                                selectedClassification === 'AOI' ? 'text-yellow-600' : 'text-gray-600'
                              }`}>{selectedClassification}</span>
                            </h5>
                            <button 
                              onClick={() => setSelectedClassification(null)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Justification</label>
                              <select
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                              >
                                <option value="">Select justification...</option>
                                {selectedClassification === 'ICSR' && (
                                  <>
                                    <option value="Valid Case">Valid Case</option>
                                    <option value="Potential Valid case">Potential Valid case</option>
                                  </>
                                )}
                                {selectedClassification === 'AOI' && (
                                  <>
                                    <option value="Adverse Event">Adverse Event</option>
                                    <option value="Special Situations">Special Situations</option>
                                    <option value="Adverse Event & Special Situations">Adverse Event & Special Situations</option>
                                    <option value="Others">Others</option>

                                  </>
                                )}
                                {selectedClassification === 'No Case' && (
                                  <>
                                    <option value="In Vitro Study">In Vitro Study</option>
                                    <option value="Pre-Clinical study">Pre-Clinical study</option>
                                    <option value="Treatment Medication">Treatment Medication</option>
                                    <option value="Secondary analysis">Secondary analysis</option>
                                    <option value="Others">Others</option>
                                  </>
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Full Text Availability</label>
                              <div className="flex gap-4">
                                <label className="inline-flex items-center">
                                  <input 
                                    type="radio" 
                                    className="form-radio text-blue-600" 
                                    name="fullTextAvailability" 
                                    value="Yes" 
                                    checked={fullTextAvailability === 'Yes'} 
                                    onChange={(e) => setFullTextAvailability(e.target.value)} 
                                  />
                                  <span className="ml-2 text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="inline-flex items-center">
                                  <input 
                                    type="radio" 
                                    className="form-radio text-blue-600" 
                                    name="fullTextAvailability" 
                                    value="No" 
                                    checked={fullTextAvailability === 'No'} 
                                    onChange={(e) => setFullTextAvailability(e.target.value)} 
                                  />
                                  <span className="ml-2 text-sm text-gray-700">No</span>
                                </label>
                              </div>
                              {fullTextAvailability === 'Yes' && (
                                <div className="mt-2">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Text Source/Comments</label>
                                  <textarea
                                    value={fullTextSource || ''}
                                    onChange={(e) => setFullTextSource(e.target.value)}
                                    placeholder="Enter source or comments..."
                                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                    rows={2}
                                  />
                                </div>
                              )}
                            </div>

                            {selectedClassification !== 'No Case' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Listedness</label>
                                  <div className="flex gap-4">
                                    <label className="inline-flex items-center">
                                      <input type="radio" className="form-radio text-blue-600" name="listedness" value="Listed" checked={listedness === 'Listed'} onChange={(e) => setListedness(e.target.value)} />
                                      <span className="ml-2 text-sm text-gray-700">Listed</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                      <input type="radio" className="form-radio text-blue-600" name="listedness" value="Unlisted" checked={listedness === 'Unlisted'} onChange={(e) => setListedness(e.target.value)} />
                                      <span className="ml-2 text-sm text-gray-700">Unlisted</span>
                                    </label>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Seriousness</label>
                                  <div className="flex gap-4">
                                    <label className="inline-flex items-center">
                                      <input type="radio" className="form-radio text-red-600" name="seriousness" value="Serious" checked={seriousness === 'Serious'} onChange={(e) => setSeriousness(e.target.value)} />
                                      <span className="ml-2 text-sm text-gray-700">Serious</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                      <input type="radio" className="form-radio text-red-600" name="seriousness" value="Non-Serious" checked={seriousness === 'Non-Serious'} onChange={(e) => setSeriousness(e.target.value)} />
                                      <span className="ml-2 text-sm text-gray-700">Non-Serious</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                onClick={() => setSelectedClassification(null)}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => classifyStudy(selectedStudy.id, selectedClassification, { justification, listedness, seriousness, fullTextAvailability, fullTextSource })}
                                disabled={!justification || classifying === selectedStudy.id}
                                className={`px-4 py-2 text-white rounded-md text-sm font-medium flex items-center ${
                                  !justification ? 'bg-gray-400 cursor-not-allowed' :
                                  selectedClassification === 'ICSR' ? 'bg-red-600 hover:bg-red-700' :
                                  selectedClassification === 'AOI' ? 'bg-yellow-600 hover:bg-yellow-700' :
                                  'bg-gray-600 hover:bg-gray-700'
                                }`}
                              >
                                {classifying === selectedStudy.id ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                  </>
                                ) : (
                                  'Confirm Classification'
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : !selectedStudy.userTag ? (
                        <>
                          <p className="text-sm text-gray-700 mb-4">
                            Review the literature details above and classify this article:
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => {
                                setSelectedClassification("ICSR");
                                setJustification("");
                                setListedness("");
                                setSeriousness("");
                                setFullTextAvailability("");
                                setFullTextSource("");
                              }}
                              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              ICSR (Individual Case Safety Report)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClassification("AOI");
                                setJustification("");
                                setListedness("");
                                setSeriousness("");
                                setFullTextAvailability("");
                                setFullTextSource("");
                              }}
                              className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium transition-colors flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Article of Interest
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClassification("No Case");
                                setJustification("");
                                setListedness("");
                                setSeriousness("");
                                setFullTextAvailability("");
                                setFullTextSource("");
                              }}
                              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              No Case
                            </button>
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="flex items-center mb-4 flex-wrap gap-2">
                            <div className="flex items-center">
                              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-700 font-medium mr-2">Study classified as: {getClassificationLabel(selectedStudy)}</span>
                            </div>
                            {selectedStudy.justification && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                {selectedStudy.justification}
                              </span>
                            )}
                            {selectedStudy.listedness && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                {selectedStudy.listedness}
                              </span>
                            )}
                            {selectedStudy.seriousness && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                {selectedStudy.seriousness}
                              </span>
                            )}
                            {selectedStudy.fullTextAvailability && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                Full Text: {selectedStudy.fullTextAvailability}
                              </span>
                            )}
                            {selectedStudy.fullTextAvailability === 'Yes' && selectedStudy.fullTextSource && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                Source: {selectedStudy.fullTextSource}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            This study has been classified. You can reclassify it if needed:
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <span className="text-sm text-gray-600 mr-2 flex items-center">Re-classify:</span>
                            <button
                              onClick={() => {
                                setSelectedClassification("ICSR");
                                setJustification(selectedStudy.justification || "");
                                setListedness(selectedStudy.listedness || "");
                                setSeriousness(selectedStudy.seriousness || "");
                              }}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm transition-colors"
                            >
                              ICSR
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClassification("AOI");
                                setJustification(selectedStudy.justification || "");
                                setListedness("");
                                setSeriousness("");
                              }}
                              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 text-sm transition-colors"
                            >
                              Article of Interest
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClassification("No Case");
                                setJustification(selectedStudy.justification || "");
                                setListedness("");
                                setSeriousness("");
                              }}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm transition-colors"
                            >
                              No Case
                            </button>
                          </div>
                        </div>
                      )}
                      </>
                      )}
                    </div>

                    {/* PDF Attachments */}
                    <PDFAttachmentUpload
                      studyId={selectedStudy.id}
                      attachments={selectedStudy.attachments || []}
                      onUploadComplete={async () => {
                        // Fetch the updated study with new attachments
                        try {
                          const token = localStorage.getItem('auth_token');
                          const response = await fetch(`${API_BASE}/studies/${selectedStudy.id}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          
                          if (response.ok) {
                            const updatedStudy = await response.json();
                            // Update the selected study to show new attachments immediately
                            setSelectedStudy(updatedStudy);
                            // Also refresh the full studies list
                            fetchStudies();
                          }
                        } catch (error) {
                          console.error('Failed to refresh study:', error);
                          // Fallback: just refresh the full list
                          fetchStudies();
                        }
                      }}
                    />

                    {/* Comment Thread */}
                    <CommentThread study={selectedStudy} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                  <svg className="w-16 h-16 mb-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Study Selected</h3>
                  <p className="text-gray-600 text-center max-w-sm">
                    {filteredStudies.length === 0
                      ? 'No studies match your filters. Try adjusting your search criteria.'
                      : 'Select a study from the list on the left to begin the triage classification process.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
      ) : (
        /* ALLOCATED CASE VIEW - SPLIT PANE */
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
          {/* LEFT PANE: Abstract & Details */}
          <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
             <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Study Details</h3>
                <PmidLink pmid={allocatedCase.pmid} />
             </div>
             <div className="p-6 overflow-y-auto flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{allocatedCase.title}</h2>
                <div className="text-sm text-gray-600 mb-4">
                   <span className="font-medium">{Array.isArray(allocatedCase.authors) ? allocatedCase.authors.join(', ') : allocatedCase.authors}</span>
                   <span className="mx-2">•</span>
                   <span>{allocatedCase.journal}</span>
                   <span className="mx-2">•</span>
                   <span>{allocatedCase.publicationDate}</span>
                </div>
                
                <div className="prose max-w-none">
                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Abstract</h4>
                   <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">{allocatedCase.abstract}</p>
                </div>
             </div>
          </div>

          {/* RIGHT PANE: Full Details & Classification */}
          <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
             <TriageStudyDetails 
                study={allocatedCase}
                onUpdate={setAllocatedCase}
                classifyStudy={classifyStudy}
                selectedClassification={selectedClassification}
                setSelectedClassification={setSelectedClassification}
                justification={justification}
                setJustification={setJustification}
                listedness={listedness}
                setListedness={setListedness}
                seriousness={seriousness}
                setSeriousness={setSeriousness}
                fullTextAvailability={fullTextAvailability}
                setFullTextAvailability={setFullTextAvailability}
                classifying={classifying}
                getClassificationLabel={getClassificationLabel}
                getClassificationColor={getClassificationColor}
                getFinalClassification={getFinalClassification}
                formatDate={formatDate}
                API_BASE={API_BASE}
                fetchStudies={fetchStudies}
             />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}