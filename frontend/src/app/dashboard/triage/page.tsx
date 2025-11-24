"use client";
import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";
import { PmidLink } from "@/components/PmidLink";

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
  qaApprovalStatus?: 'pending' | 'approved' | 'rejected';
  qaComments?: string;
  
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
  clientName?: string;
  sponsor?: string;
  userTag?: 'ICSR' | 'AOI' | 'No Case' | null;
  effectiveClassification?: string;
  
  // Legacy fields for backward compatibility
  Drugname?: string;
  Serious?: string;
  special_case?: string;
  ICSR_classification?: string;
  Text_type?: string;
}

// No sample data - user requested removal of all sample/demo data
const fallbackStudies: any[] = [];

const statusStyles: Record<string, string> = {
  "Pending Review": "bg-yellow-100 text-yellow-800 border border-yellow-300",
  "Under Review": "bg-blue-100 text-blue-800 border border-blue-300",
  Approved: "bg-green-100 text-green-800 border border-green-300",
};

export default function TriagePage() {
  // Studies state
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [classificationType, setClassificationType] = useState("");
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [comment, setComment] = useState("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  
  // Classification state
  const [classifying, setClassifying] = useState<string | null>(null);
  
  // UI state
  const [showRawData, setShowRawData] = useState(false);

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
  }, []);

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
      const response = await fetch(`${API_BASE}/studies?limit=1000`, {
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
          setStudies(normalizeApiStudies(studiesData));
          console.log(`Successfully loaded ${studiesData.length} studies`);
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

  // Classification function
  const classifyStudy = async (studyId: string, classification: string) => {
    try {
      setClassifying(studyId);
      const token = localStorage.getItem("auth_token");
      
      const response = await fetch(`${API_BASE}/studies/${studyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userTag: classification
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update the study in the local state with the response from the server
        // This ensures qaApprovalStatus is set to 'pending'
        setStudies(prev => prev.map(study => 
          study.id === studyId 
            ? { ...study, userTag: classification as any, qaApprovalStatus: 'pending' }
            : study
        ));
        // Also update selected study if it's the one being classified
        if (selectedStudy && selectedStudy.id === studyId) {
          setSelectedStudy(prev => prev ? { ...prev, userTag: classification as any, qaApprovalStatus: 'pending' } : null);
        }
        alert(`Study classified as ${classification}. Awaiting QC approval.`);
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

  // Function to calculate final classification based on AI inference data
  // (Defined before filteredStudies to avoid hoisting issues)
  const getFinalClassification = (study: Study): string | null => {
    const icsrClassification = study.aiInferenceData?.ICSR_classification || study.ICSR_classification || study.icsrClassification;
    const aoiClassification = study.aiInferenceData?.AOI_classification || study.aoiClassification;

    if (!icsrClassification) return null;

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

  // Filtering logic
  const filteredStudies = studies.filter((study: Study) => {
    // Only show studies that need triage classification:
    // 1. Studies without a userTag (not yet classified), OR
    // 2. Studies that were rejected by QC (need re-classification)
    // Exclude studies that are approved or pending QC approval
    const needsTriage = !study.userTag || study.qaApprovalStatus === 'rejected';
    if (!needsTriage) return false;
    
    // Search by drug name or title
    const matchesSearch =
      search.trim() === "" ||
      study.drugName.toLowerCase().includes(search.toLowerCase()) ||
      study.title.toLowerCase().includes(search.toLowerCase());
    // Status filter
    const matchesStatus = status === "" || study.status === status;
    // Date range filter (created date)
    const studyDate = study.createdAt.split('T')[0]; // Extract date part
    const matchesDateFrom = !dateFrom || studyDate >= dateFrom;
    const matchesDateTo = !dateTo || studyDate <= dateTo;
    
    // Classification Type filter
    const finalClassification = getFinalClassification(study);
    const matchesClassificationType = classificationType === "" || finalClassification === classificationType;
    
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesClassificationType;
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
  }, [search, status, dateFrom, dateTo]);

  // Action handlers
  const handleAction = (action: string) => {
    // TODO: Replace with backend call
    alert(`${action} action applied to PMID ${selectedStudy?.pmid}`);
  };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    // TODO: Replace with backend call
    alert(`Comment added to PMID ${selectedStudy?.pmid}: ${comment}`);
    setComment("");
  };

  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case "ICSR":
        return "bg-red-100 text-red-800 border-red-200";
      case "AOI":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "No Case":
        return "bg-gray-100 text-gray-800 border-gray-200";
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
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">TRIAGE</h1>
          <p className="mt-1 text-sm text-gray-600">Classify studies as ICSR, Article of Interest, or No Case for pharmacovigilance processing</p>
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

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            Filter Studies for Triage
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Search Studies</label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by drug name or title..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
                />
              </div>
            </div>
            
            <div className="space-y-2">
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
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Classification Type</label>
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
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{filteredStudies.length}</span> studies found
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
                      Studies ({filteredStudies.length})
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
                        onClick={() => setSelectedStudy(study)}
                        className={`group relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedStudy && selectedStudy.pmid === study.pmid
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                        }`}
                      >
                        {/* Study Card Content */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              PMID: <PmidLink pmid={study.pmid} className="text-blue-800 hover:underline ml-1" />
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[study.status]}`}>
                              {study.status}
                            </span>
                          </div>
                          
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                            {study.title}
                          </h4>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Drug:</span> {study.drugName}
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
                            {study.qaApprovalStatus === 'rejected' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                QC Rejected
                              </span>
                            )}
                            {study.userTag && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getClassificationColor(study.userTag)}`}>
                                {study.userTag}
                              </span>
                            )}
                            {study.identifiableHumanSubject && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                Human Subject
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
                          {selectedStudy.status}
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
                    
                    {/* Basic Information */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-gray-900 mb-3">Study Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">PMID:</span>
                          <p className="mt-1"><PmidLink pmid={selectedStudy.pmid} showIcon={true} /></p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Drug:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.drugName}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Authors:</span>
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
                          <span className="font-medium text-gray-700">Journal:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.journal || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Publication Date:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.publicationDate || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Adverse Event:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.adverseEvent}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Created:</span>
                          <p className="mt-1 text-gray-900">{new Date(selectedStudy.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Created By:</span>
                          <p className="mt-1 text-gray-900">{selectedStudy.createdBy || 'System'}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Title:</span>
                        <p className="mt-1 text-gray-900 leading-relaxed">{selectedStudy.title}</p>
                      </div>
                      {selectedStudy.vancouverCitation && (
                        <div>
                          <span className="font-medium text-gray-700">Citation:</span>
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
                        Study Metadata
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {selectedStudy.doi && (
                          <div>
                            <span className="font-medium text-gray-700">DOI:</span>
                            <p className="mt-1 text-gray-900 break-all">{selectedStudy.doi}</p>
                          </div>
                        )}
                        {selectedStudy.leadAuthor && (
                          <div>
                            <span className="font-medium text-gray-700">Lead Author:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.leadAuthor}</p>
                          </div>
                        )}
                        {selectedStudy.countryOfFirstAuthor && (
                          <div>
                            <span className="font-medium text-gray-700">Author Country:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.countryOfFirstAuthor}</p>
                          </div>
                        )}
                        {selectedStudy.countryOfOccurrence && (
                          <div>
                            <span className="font-medium text-gray-700">Country of Occurrence:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.countryOfOccurrence}</p>
                          </div>
                        )}
                        {selectedStudy.substanceGroup && (
                          <div>
                            <span className="font-medium text-gray-700">Substance Group:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.substanceGroup}</p>
                          </div>
                        )}
                        {selectedStudy.authorPerspective && (
                          <div>
                            <span className="font-medium text-gray-700">Author Perspective:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.authorPerspective}</p>
                          </div>
                        )}
                        {selectedStudy.sponsor && (
                          <div>
                            <span className="font-medium text-gray-700">Sponsor:</span>
                            <p className="mt-1 text-gray-900">{selectedStudy.sponsor}</p>
                          </div>
                        )}
                        {selectedStudy.testSubject && (
                          <div>
                            <span className="font-medium text-gray-700">Test Subject:</span>
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
                        AI Analysis & Clinical Data
                      </h4>
                      <div className="space-y-4">
                        {/* Grid Layout for Analysis Fields */}
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
                          {(selectedStudy.Text_type || selectedStudy.textType) && (
                            <div>
                              <span className="font-medium text-gray-700">Text Type:</span>
                              <p className="mt-1 text-gray-900">{selectedStudy.Text_type || selectedStudy.textType}</p>
                            </div>
                          )}
                          {selectedStudy.identifiableHumanSubject !== undefined && (
                            <div>
                              <span className="font-medium text-gray-700">Human Subject:</span>
                              <p className="mt-1 text-gray-900">{selectedStudy.identifiableHumanSubject ? 'Yes' : 'No'}</p>
                            </div>
                          )}
                          {selectedStudy.approvedIndication && (
                            <div>
                              <span className="font-medium text-gray-700">Approved Indication:</span>
                              <p className="mt-1 text-gray-900">{selectedStudy.approvedIndication}</p>
                            </div>
                          )}
                        </div>

                        {/* Text-based Fields */}
                        {selectedStudy.attributability && (
                          <div>
                            <span className="font-medium text-gray-700">Attributability:</span>
                            <p className="mt-1 text-gray-900 text-sm">{selectedStudy.attributability}</p>
                          </div>
                        )}
                        {selectedStudy.drugEffect && (
                          <div>
                            <span className="font-medium text-gray-700">Drug Effect:</span>
                            <p className="mt-1 text-gray-900 text-sm">{selectedStudy.drugEffect}</p>
                          </div>
                        )}
                        {selectedStudy.justification && (
                          <div>
                            <span className="font-medium text-gray-700">Justification:</span>
                            <p className="mt-1 text-gray-900 text-sm">{selectedStudy.justification}</p>
                          </div>
                        )}

                        {/* Clinical Data */}
                        {selectedStudy.administeredDrugs && selectedStudy.administeredDrugs.length > 0 && (
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
                        {selectedStudy.patientDetails && (
                          <div>
                            <span className="font-medium text-gray-700">Patient Details:</span>
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
                            <span className="font-medium text-gray-700">Relevant Dates:</span>
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
                    {selectedStudy.aiInferenceData && (
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
                    )}

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
                        Classify Study
                      </h4>
                      
                      {!selectedStudy.userTag ? (
                        <>
                          <p className="text-sm text-gray-700 mb-4">
                            Review the study details below and classify this study for pharmacovigilance processing:
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => classifyStudy(selectedStudy.id, "ICSR")}
                              disabled={classifying === selectedStudy.id}
                              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center"
                            >
                              {classifying === selectedStudy.id ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Classifying...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  ICSR (Individual Case Safety Report)
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => classifyStudy(selectedStudy.id, "AOI")}
                              disabled={classifying === selectedStudy.id}
                              className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center"
                            >
                              {classifying === selectedStudy.id ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Classifying...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Article of Interest
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => classifyStudy(selectedStudy.id, "No Case")}
                              disabled={classifying === selectedStudy.id}
                              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center"
                            >
                              {classifying === selectedStudy.id ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Classifying...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  No Case
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="flex items-center mb-4">
                            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-700 font-medium">Study classified as: {selectedStudy.userTag}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            This study has been classified. You can reclassify it if needed:
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <span className="text-sm text-gray-600 mr-2 flex items-center">Re-classify:</span>
                            <button
                              onClick={() => classifyStudy(selectedStudy.id, "ICSR")}
                              disabled={classifying === selectedStudy.id}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 text-sm transition-colors"
                            >
                              ICSR
                            </button>
                            <button
                              onClick={() => classifyStudy(selectedStudy.id, "AOI")}
                              disabled={classifying === selectedStudy.id}
                              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 disabled:opacity-50 text-sm transition-colors"
                            >
                              Article of Interest
                            </button>
                            <button
                              onClick={() => classifyStudy(selectedStudy.id, "No Case")}
                              disabled={classifying === selectedStudy.id}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm transition-colors"
                            >
                              No Case
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Comments */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <ChatBubbleLeftEllipsisIcon className="w-5 h-5 mr-2 text-gray-600" />
                        Add Classification Notes
                      </h4>
                      <div className="space-y-4">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Add notes about your classification decision..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          rows={4}
                        />
                        <button
                          onClick={handleCommentSubmit}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Add Comment
                        </button>
                      </div>
                    </div>
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
      </div>
    </div>
  );
}