"use client";
import { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, UserGroupIcon, ExclamationTriangleIcon, ChartBarIcon } from "@heroicons/react/24/outline";
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


 
  

export default function StudyReviewPage() {
  // Studies state
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

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
      const response = await fetch(`${API_BASE}/studies`, {
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

  // Filtering logic
  const filteredStudies = studies.filter((study: Study) => {
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
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
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

  // Action handlers (to be replaced with backend integration)
  const handleAction = (action: string) => {
    // TODO: Replace with backend call
    alert(`${action} action applied to PMID ${selectedStudy?.pmid}`);
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
          <p className="mt-1 text-sm text-gray-600">Review and manage literature studies for pharmacovigilance</p>
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
                  Showing sample data for demonstration purposes.
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
            Filter Studies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        className="border border-blue-400 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
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
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[study.status]}`}
                            >
                              {study.status}
                            </span>
                          </div>
                          
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                            {study.title}
                          </h4>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center">
                              <span className="font-medium w-16">Drug:</span>
                              <span className="text-blue-700 font-medium">{study.drugName}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium w-16">Created:</span>
                              <span>{new Date(study.createdAt).toLocaleDateString('en-CA')}</span>
                            </div>
                          </div>

                          {/* AI Analysis Badges */}
                          <div className="flex flex-wrap gap-1">
                            {study.Serious && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                study.Serious.toLowerCase() === 'serious' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {study.Serious}
                              </span>
                            )}
                            {study.special_case && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                {study.special_case}
                              </span>
                            )}
                            {study.ICSR_classification && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                {study.ICSR_classification.split(' ')[0]}
                              </span>
                            )}
                            {study.textType && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                {study.textType}
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
                        Showing <span className="font-semibold">{((page - 1) * pageSize) + 1}</span> to <span className="font-semibold">{Math.min(page * pageSize, filteredStudies.length)}</span> of <span className="font-semibold">{filteredStudies.length}</span> results
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

          {/* Study Details */}
          <div className="xl:col-span-2" ref={detailsRef}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
              {selectedStudy ? (
                <>
                  {/* Header */}
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Study Details
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[selectedStudy.status]}`}>
                          {selectedStudy.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-gray-900 mb-3">Study Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">PMID:</span>
                          <span className="ml-2"><PmidLink pmid={selectedStudy.pmid} showIcon={true} /></span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Drug:</span>
                          <span className="ml-2 text-gray-900 font-medium">{selectedStudy.drugName}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">DOI:</span>
                          {selectedStudy.doi ? (
                            <a href={selectedStudy.doi} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                              {selectedStudy.doi}
                            </a>
                          ) : (
                            <span className="ml-2 text-gray-500">N/A</span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Publication Date:</span>
                          <span className="ml-2 text-gray-900">
                            {(() => {
                              try {
                                const date = selectedStudy.publicationDate || selectedStudy.createdAt;
                                return date ? new Date(date).toLocaleDateString('en-CA') : 'N/A';
                              } catch (error) {
                                return 'N/A';
                              }
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Lead Author:</span>
                          <span className="ml-2 text-gray-900">{selectedStudy.leadAuthor || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Text Type:</span>
                          <span className="ml-2 text-gray-900">{selectedStudy.textType || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Country:</span>
                          <span className="ml-2 text-gray-900">{selectedStudy.countryOfFirstAuthor || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Client:</span>
                          <span className="ml-2 text-gray-900 font-medium">{selectedStudy.clientName || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Title:</span>
                        <p className="mt-1 text-gray-900 leading-relaxed">{selectedStudy.title}</p>
                      </div>
                      {selectedStudy.vancouverCitation && (
                        <div>
                          <span className="font-medium text-gray-700">Citation:</span>
                          <p className="mt-1 text-gray-700 text-sm italic">{selectedStudy.vancouverCitation}</p>
                        </div>
                      )}
                    </div>

                    {/* AI Analysis Results */}
                    {(selectedStudy.ICSR_classification || selectedStudy.special_case || selectedStudy.Serious) && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          AI Analysis Results
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedStudy.ICSR_classification && (
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                selectedStudy.ICSR_classification.toLowerCase().includes('probable') ? 'bg-orange-500' :
                                selectedStudy.ICSR_classification.toLowerCase().includes('possible') ? 'bg-yellow-500' :
                                'bg-gray-500'
                              }`}></div>
                              <div>
                                <p className="text-sm font-medium text-purple-900">ICSR Classification</p>
                                <p className="text-sm font-semibold text-gray-800">{selectedStudy.ICSR_classification}</p>
                              </div>
                            </div>
                          )}
                          {selectedStudy.special_case && (
                            <div className="flex items-center space-x-2">
                              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                              <div>
                                <p className="text-sm font-medium text-purple-900">Special Case</p>
                                <p className="text-sm font-semibold text-gray-800">{selectedStudy.special_case}</p>
                              </div>
                            </div>
                          )}
                          {selectedStudy.Serious && (
                            <div className="flex items-center space-x-2">
                              <div className={`w-4 h-4 rounded-full ${
                                selectedStudy.Serious.toLowerCase() === 'serious' ? 'bg-red-500' : 'bg-green-500'
                              }`}></div>
                              <div>
                                <p className="text-sm font-medium text-purple-900">Severity</p>
                                <p className="text-sm font-semibold text-gray-800">{selectedStudy.Serious}</p>
                              </div>
                            </div>
                          )}
                          {selectedStudy.aoiClassification && (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                              <div>
                                <p className="text-sm font-medium text-purple-900">Article of Interest Classification</p>
                                <p className="text-sm font-semibold text-gray-800">{selectedStudy.aoiClassification}</p>
                              </div>
                            </div>
                          )}
                          {selectedStudy.identifiableHumanSubject && (
                            <div className="flex items-center space-x-2">
                              <UserGroupIcon className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-purple-900">Human Subject</p>
                                <p className="text-sm font-semibold text-gray-800">{selectedStudy.identifiableHumanSubject ? 'Yes' : 'No'}</p>
                              </div>
                            </div>
                          )}
                          {selectedStudy.substanceGroup && (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="text-sm font-medium text-purple-900">Substance Group</p>
                                <p className="text-sm font-semibold text-gray-800">{selectedStudy.substanceGroup}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Clinical Details */}
                    {(selectedStudy.patientDetails || selectedStudy.testSubject) && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                          <UserGroupIcon className="w-5 h-5 mr-2" />
                          Patient Information
                        </h4>
                        {selectedStudy.patientDetails && (
                          <div className="mb-3">
                            <span className="font-medium text-green-900">Patient Details:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.patientDetails}</p>
                          </div>
                        )}
                        {selectedStudy.testSubject && (
                          <div>
                            <span className="font-medium text-green-900">Test Subject:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.testSubject}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Drug and Treatment Information */}
                    {(selectedStudy.administeredDrugs || selectedStudy.drugEffect || selectedStudy.aoiDrugEffect) && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                          </svg>
                          Drug Information
                        </h4>
                        {selectedStudy.administeredDrugs && (
                          <div className="mb-3">
                            <span className="font-medium text-blue-900">Administered Drugs:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.administeredDrugs}</p>
                          </div>
                        )}
                        {selectedStudy.drugEffect && (
                          <div className="mb-3">
                            <span className="font-medium text-blue-900">Drug Effect:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.drugEffect}</p>
                          </div>
                        )}
                        {selectedStudy.aoiDrugEffect && (
                          <div className="mb-3">
                            <span className="font-medium text-blue-900">Article of Interest Drug Effect:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.aoiDrugEffect}</p>
                          </div>
                        )}
                        {selectedStudy.approvedIndication && (
                          <div>
                            <span className="font-medium text-blue-900">Approved Indication:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.approvedIndication}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Events and Adverse Effects */}
                    {(selectedStudy.keyEvents || selectedStudy.adverseEvent || selectedStudy.attributability) && (
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <h4 className="font-semibold text-red-900 mb-4 flex items-center">
                          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                          Clinical Events
                        </h4>
                        {selectedStudy.keyEvents && (
                          <div className="mb-3">
                            <span className="font-medium text-red-900">Key Events:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.keyEvents}</p>
                          </div>
                        )}
                        {selectedStudy.adverseEvent && (
                          <div className="mb-3">
                            <span className="font-medium text-red-900">Adverse Event:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.adverseEvent}</p>
                          </div>
                        )}
                        {selectedStudy.attributability && (
                          <div className="mb-3">
                            <span className="font-medium text-red-900">Attributability:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.attributability}</p>
                          </div>
                        )}
                        {selectedStudy.relevantDates && (
                          <div>
                            <span className="font-medium text-red-900">Relevant Dates:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.relevantDates}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Author Perspective and Justification */}
                    {(selectedStudy.authorPerspective || selectedStudy.justification) && (
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <h4 className="font-semibold text-amber-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          Analysis & Perspective
                        </h4>
                        {selectedStudy.authorPerspective && (
                          <div className="mb-3">
                            <span className="font-medium text-amber-900">Author Perspective:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.authorPerspective}</p>
                          </div>
                        )}
                        {selectedStudy.justification && (
                          <div>
                            <span className="font-medium text-amber-900">Justification:</span>
                            <p className="mt-1 text-gray-800 leading-relaxed">{selectedStudy.justification}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Summary */}
                    {selectedStudy.summary && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                          Summary
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-800 leading-relaxed">{selectedStudy.summary}</p>
                        </div>
                      </div>
                    )}

                    {/* Key Points */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Key Points
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <ul className="space-y-2">
                          {(() => {
                            const keyEvents = selectedStudy.keyEvents;
                            const keyEventsArray = Array.isArray(keyEvents) 
                              ? keyEvents 
                              : typeof keyEvents === 'string' 
                                ? [keyEvents] 
                                : [];
                            
                            return keyEventsArray.map((point: string, idx: number) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-gray-800 leading-relaxed">{point}</span>
                              </li>
                            ));
                          })()}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Actions</h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleAction("Approve")}
                          className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve Study
                        </button>
                        <button
                          onClick={() => handleAction("Reject")}
                          className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject Study
                        </button>
                        <button
                          onClick={() => handleAction("Forward")}
                          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Forward Study
                        </button>
                      </div>
                    </div>

                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                  <svg className="w-16 h-16 mb-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Study Selected</h3>
                  <p className="text-gray-600 text-center max-w-sm">
                    {filteredStudies.length === 0
                      ? 'No studies match your filters. Try adjusting your search criteria.'
                      : 'Select a study from the list on the left to view its details and start your review process.'}
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
