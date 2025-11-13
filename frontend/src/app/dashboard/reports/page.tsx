"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { API_CONFIG } from '../../../config/api';
import { PmidLink } from '../../../components/PmidLink';

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  publicationDate: string;
  abstract: string;
  drugName: string;
  adverseEvent: string;
  status: string;
  userTag?: 'ICSR' | 'AOI' | 'No Case' | null;
  effectiveClassification?: string;
  icsrClassification?: string;
  aoiClassification?: string;
  createdAt: string;
  updatedAt: string;
  qaApprovalStatus?: string;
  r3FormStatus?: string;
  qcR3Status?: string;
  medicalReviewStatus?: string;
  serious?: boolean;
  substanceGroup?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  leadAuthor?: string;
}

type StudyType = 'all' | 'ICSR' | 'AOI' | 'No Case';
type SortField = 'createdAt' | 'updatedAt' | 'title' | 'pmid' | 'drugName' | 'publicationDate';
type SortOrder = 'asc' | 'desc';

export default function ReportsPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [studyType, setStudyType] = useState<StudyType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [qaFilter, setQaFilter] = useState<string>('all');
  const [r3Filter, setR3Filter] = useState<string>('all');
  const [seriousFilter, setSeriousFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Selected items for export
  const [selectedStudies, setSelectedStudies] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    // Only fetch if user is available
    if (user) {
      fetchStudies();
    }
  }, [user]);

  const fetchStudies = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/studies?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch studies: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched studies:', data.studies?.length || 0);
      setStudies(data.studies || []);
    } catch (err: any) {
      console.error('Error fetching studies:', err);
      setError(err.message || 'Failed to fetch studies');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted studies
  const filteredStudies = useMemo(() => {
    let filtered = [...studies];

    // Filter by study type
    if (studyType !== 'all') {
      filtered = filtered.filter(study => study.userTag === studyType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(study =>
        study.title?.toLowerCase().includes(query) ||
        study.pmid?.toLowerCase().includes(query) ||
        study.drugName?.toLowerCase().includes(query) ||
        study.authors?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(study => study.status === statusFilter);
    }

    // QC filter
    if (qaFilter !== 'all') {
      filtered = filtered.filter(study => study.qaApprovalStatus === qaFilter);
    }

    // R3 form filter
    if (r3Filter !== 'all') {
      filtered = filtered.filter(study => study.r3FormStatus === r3Filter);
    }

    // Serious filter
    if (seriousFilter !== 'all') {
      const isSerious = seriousFilter === 'serious';
      filtered = filtered.filter(study => study.serious === isSerious);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(study => 
        new Date(study.createdAt) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(study => 
        new Date(study.createdAt) <= new Date(dateRange.end + 'T23:59:59')
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') aValue = aValue?.toLowerCase() || '';
      if (typeof bValue === 'string') bValue = bValue?.toLowerCase() || '';

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [studies, studyType, searchQuery, statusFilter, qaFilter, r3Filter, seriousFilter, dateRange, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredStudies.length / itemsPerPage);
  const paginatedStudies = filteredStudies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = useMemo(() => {
    const total = filteredStudies.length;
    const icsrCount = filteredStudies.filter(s => s.userTag === 'ICSR').length;
    const aoiCount = filteredStudies.filter(s => s.userTag === 'AOI').length;
    const noCaseCount = filteredStudies.filter(s => s.userTag === 'No Case').length;
    const unclassified = filteredStudies.filter(s => !s.userTag).length;
    const seriousCount = filteredStudies.filter(s => s.serious === true).length;

    return {
      total,
      icsrCount,
      aoiCount,
      noCaseCount,
      unclassified,
      seriousCount,
    };
  }, [filteredStudies]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudies(new Set());
    } else {
      setSelectedStudies(new Set(paginatedStudies.map(s => s.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectStudy = (studyId: string) => {
    const newSelected = new Set(selectedStudies);
    if (newSelected.has(studyId)) {
      newSelected.delete(studyId);
    } else {
      newSelected.add(studyId);
    }
    setSelectedStudies(newSelected);
    setSelectAll(newSelected.size === paginatedStudies.length);
  };

  const exportToCSV = () => {
    const studiesToExport = selectedStudies.size > 0
      ? filteredStudies.filter(s => selectedStudies.has(s.id))
      : filteredStudies;

    const headers = [
      'PMID',
      'Title',
      'Drug Name',
      'Classification',
      'Triage Classification',
      'AI Classification',
      'Status',
      'QC Status',
      'R3 Status',
      'Medical Review',
      'Serious',
      'Authors',
      'Journal',
      'Publication Date',
      'Country of First Author',
      'Country of Occurrence',
      'Substance Group',
      'Created At',
      'Updated At',
    ];

    const rows = studiesToExport.map(study => {
      // Handle authors field - could be string or array
      let authorsStr = '';
      if (Array.isArray(study.authors)) {
        authorsStr = study.authors.join('; ');
      } else if (typeof study.authors === 'string') {
        authorsStr = study.authors;
      }
      
      return [
        study.pmid || '',
        `"${(study.title || '').replace(/"/g, '""')}"`,
        study.drugName || '',
        study.userTag || study.effectiveClassification || 'Unclassified',
        getTriageClassification(study),
        getAIClassification(study),
        study.status || '',
        study.qaApprovalStatus || '',
        study.r3FormStatus || '',
        study.medicalReviewStatus || '',
        study.serious ? 'Yes' : 'No',
        `"${authorsStr.replace(/"/g, '""')}"`,
        study.journal || '',
        study.publicationDate || '',
        study.countryOfFirstAuthor || '',
        study.countryOfOccurrence || '',
        study.substanceGroup || '',
        new Date(study.createdAt).toLocaleString(),
        new Date(study.updatedAt).toLocaleString(),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const studiesToExport = selectedStudies.size > 0
      ? filteredStudies.filter(s => selectedStudies.has(s.id))
      : filteredStudies;

    const jsonContent = JSON.stringify(studiesToExport, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reports_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setStudyType('all');
    setSearchQuery('');
    setStatusFilter('all');
    setQaFilter('all');
    setR3Filter('all');
    setSeriousFilter('all');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  const getClassificationBadgeColor = (tag?: string | null) => {
    switch (tag) {
      case 'ICSR': return 'bg-red-100 text-red-800 border-red-200';
      case 'AOI': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'No Case': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Get triage classification (userTag) status
  const getTriageClassification = (study: Study) => {
    if (study.userTag) {
      return study.userTag;
    }
    return 'Pending';
  };

  // Get AI classification from ICSR or AOI classification fields
  const getAIClassification = (study: Study) => {
    if (study.icsrClassification) {
      return study.icsrClassification;
    }
    if (study.aoiClassification) {
      return study.aoiClassification;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full overflow-x-hidden">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Reports Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Comprehensive view of all reports with advanced filtering and export options</p>
        </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-blue-500">
          <div className="text-xs sm:text-sm text-gray-600 truncate">Total Reports</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-red-500">
          <div className="text-xs sm:text-sm text-gray-600 truncate">ICSR</div>
          <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.icsrCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-yellow-500">
          <div className="text-xs sm:text-sm text-gray-600 truncate">Article of Interest</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.aoiCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-gray-500">
          <div className="text-xs sm:text-sm text-gray-600 truncate">No Case</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-600">{stats.noCaseCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-purple-500">
          <div className="text-xs sm:text-sm text-gray-600 truncate">Unclassified</div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.unclassified}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-orange-500">
          <div className="text-xs sm:text-sm text-gray-600 truncate">Serious</div>
          <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.seriousCount}</div>
        </div>
      </div>

      {/* Filters and Export Section */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Filters & Export</h2>
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors w-full sm:w-auto"
          >
            Reset Filters
          </button>
        </div>

        {/* Study Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['all', 'ICSR', 'AOI', 'No Case'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setStudyType(type);
                setCurrentPage(1);
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                studyType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All Reports' : type}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="PMID, title, drug, event..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QC Status</label>
            <select
              value={qaFilter}
              onChange={(e) => {
                setQaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All QC Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">R3 Form</label>
            <select
              value={r3Filter}
              onChange={(e) => {
                setR3Filter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All R3 Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seriousness</label>
            <select
              value={seriousFilter}
              onChange={(e) => {
                setSeriousFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="serious">Serious Only</option>
              <option value="non-serious">Non-Serious Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t gap-3">
          <div className="text-xs sm:text-sm text-gray-600">
            {selectedStudies.size > 0 ? (
              <span>{selectedStudies.size} selected</span>
            ) : (
              <span>Showing {filteredStudies.length} reports</span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={exportToCSV}
              className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={exportToJSON}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={fetchStudies}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Scroll Hint for mobile */}
        <div className="block sm:hidden bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-700 text-center">
          ← Scroll horizontally to see all columns →
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 py-3 sticky left-0 bg-gray-50 z-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  onClick={() => handleSort('pmid')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    PMID
                    {sortField === 'pmid' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('title')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[200px]"
                >
                  <div className="flex items-center gap-1">
                    Title
                    {sortField === 'title' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('drugName')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Drug
                    {sortField === 'drugName' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Triage Class.
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  AI Class.
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  QC Triage
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  QC R3 XML
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  R3
                </th>
                <th
                  onClick={() => handleSort('createdAt')}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortField === 'createdAt' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedStudies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 sm:px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium">No reports found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudies.map((study) => (
                  <tr key={study.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 sm:px-4 py-3 sm:py-4 sticky left-0 bg-white hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedStudies.has(study.id)}
                        onChange={() => handleSelectStudy(study.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                      <PmidLink pmid={study.pmid} className="text-blue-600 hover:underline font-mono" />
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-[200px] sm:max-w-md">
                      <div className="line-clamp-2" title={study.title}>
                        {study.title}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {study.drugName}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        getTriageClassification(study) === 'Pending' 
                          ? 'bg-gray-100 text-gray-800' 
                          : getClassificationBadgeColor(study.userTag)
                      }`}>
                        {getTriageClassification(study)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        getAIClassification(study) === 'N/A' 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {getAIClassification(study)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {study.status}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        study.qaApprovalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        study.qaApprovalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {study.qaApprovalStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        (study as any).qcR3Status === 'approved' ? 'bg-green-100 text-green-800' :
                        (study as any).qcR3Status === 'rejected' ? 'bg-red-100 text-red-800' :
                        (study as any).qcR3Status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(study as any).qcR3Status === 'not_applicable' ? 'N/A' : ((study as any).qcR3Status || 'N/A')}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        study.r3FormStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        study.r3FormStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {study.r3FormStatus?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {new Date(study.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredStudies.length)} of{' '}
                {filteredStudies.length} results
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
