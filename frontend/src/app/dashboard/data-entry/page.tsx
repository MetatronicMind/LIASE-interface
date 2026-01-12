"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDateTime } from "@/hooks/useDateTime";
import { getApiBaseUrl } from "@/config/api";
import { useRouter } from "next/navigation";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface Study {
  id: string;
  pmid: string;
  title: string;
  drugName: string;
  adverseEvent: string;
  userTag: string;
  qaApprovalStatus: string;
  qaApprovedAt?: string;
  qaComments?: string;
  r3FormStatus: string;
  r3FormData?: any;
  medicalReviewStatus?: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  
  // AI Inference Data - Complete fields from AI Processing
  aiInferenceData?: any;
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
  abstract?: string;
  publicationDate?: string;
  authors?: string;
  journal?: string;
}

export default function DataEntryPage() {
  const selectedOrganizationId = useSelector((state: RootState) => state.filter.selectedOrganizationId);
  const { user } = useAuth();
  const { formatDateTime } = useDateTime();
  const router = useRouter();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [search, setSearch] = useState("");
  const [clientNameFilter, setClientNameFilter] = useState("");
  const [classificationType, setClassificationType] = useState("");
  const [journalNameFilter, setJournalNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Helper function to normalize classification values from backend
  const normalizeClassification = (value?: string): string | undefined => {
    if (!value) return value;
    let normalized = value.replace(/^Classification:\s*/i, '').trim();
    normalized = normalized.replace(/^\d+\.\s*/, '').trim();
    return normalized;
  };

  // Function to calculate final classification based on AI inference data
  const getFinalClassification = (study: Study): string | null => {
    const rawIcsrClassification = study.aiInferenceData?.ICSR_classification || study.ICSR_classification || study.icsrClassification;
    const rawAoiClassification = study.aiInferenceData?.AOI_classification || study.aoiClassification;
    
    const icsrClassification = normalizeClassification(rawIcsrClassification);
    const aoiClassification = normalizeClassification(rawAoiClassification);

    if (!icsrClassification) return null;

    if (icsrClassification === "Article requires manual review") {
      return "Manual Review";
    }

    if (icsrClassification === "Probable ICSR/AOI") {
      return "Probable ICSR/AOI";
    }

    if (icsrClassification === "Probable ICSR") {
      if (aoiClassification === "Yes" || aoiClassification === "Yes (ICSR)") {
        return "Probable ICSR/AOI";
      } else {
        return "Probable ICSR";
      }
    }

    if (icsrClassification === "No Case") {
      if (aoiClassification === "Yes" || aoiClassification === "Yes (AOI)") {
        return "Probable AOI";
      } else {
        return "No Case";
      }
    }

    return null;
  };

  useEffect(() => {
    fetchDataEntryStudies();
  }, [currentPage, searchTerm, selectedOrganizationId]);

  const fetchDataEntryStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token"); // Changed from "token" to "auth_token" for consistency
      
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const params = new URLSearchParams({
        limit: "1000",
        ...(selectedOrganizationId && { organizationId: selectedOrganizationId })
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

  // Extract unique client names for filter dropdown
  const uniqueClientNames = Array.from(new Set(studies.map(s => s.clientName).filter(Boolean))).sort();
  
  // Extract unique journal names for filter dropdown
  const uniqueJournalNames = Array.from(new Set(studies.map(s => s.journal).filter(Boolean))).sort();

  // Filter studies
  const filteredStudies = studies.filter(study => {
    // Search filter (Drug Name, Title, PMID)
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      (study.drugName && study.drugName.toLowerCase().includes(searchLower)) ||
      (study.title && study.title.toLowerCase().includes(searchLower)) ||
      (study.pmid && study.pmid.includes(searchLower));
      
    // Client Name filter
    const matchesClient = !clientNameFilter || study.clientName === clientNameFilter;
    
    // Classification filter
    const finalClassification = getFinalClassification(study);
    const matchesClassification = !classificationType || finalClassification === classificationType;
    
    // Journal filter
    const matchesJournal = !journalNameFilter || study.journal === journalNameFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const studyDate = new Date(study.publicationDate || study.createdAt || study.qaApprovedAt || '');
      if (dateFrom) {
        matchesDate = matchesDate && studyDate >= new Date(dateFrom);
      }
      if (dateTo) {
        matchesDate = matchesDate && studyDate <= new Date(dateTo);
      }
    }
    
    return matchesSearch && matchesClient && matchesClassification && matchesJournal && matchesDate;
  });

  const openR3Form = (study: Study) => {
    // Navigate to the dedicated R3 form page using Next.js router
    router.push(`/dashboard/r3-form?studyId=${study.id}`);
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
        {/* <p className="text-black">
          Fill out R3 XML forms for ICSR classified studies
        </p> */}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
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
        
        <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <button
            type="button"
            className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 text-sm font-medium transition-colors"
            onClick={() => {
              setSearch("");
              setClientNameFilter("");
              setClassificationType("");
              setJournalNameFilter("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All Filters
          </button>
          <div className="text-sm text-gray-500">
            {filteredStudies.length} Articles found
          </div>
        </div>
      </div>

      {/* Studies List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredStudies.map((study) => (
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
                    <span><strong>Article ID:</strong> {study.id}</span>
                    <span><strong>PMID:</strong> {study.pmid}</span>
                    <span><strong>Drug:</strong> {study.drugName}</span>
                  </div>
                  
                  {/* QC Approval Info */}
                  {(study.qaApprovalStatus === 'approved' || study.qaApprovedAt) ? (
                    study.qaComments === 'Auto approved QC' ? (
                      <p className="text-xs text-purple-600 mb-2">
                        ✓ Auto Approved{study.qaApprovedAt ? ` on ${formatDateTime(study.qaApprovedAt)}` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 mb-2">
                        ✓ QC Approved{study.qaApprovedAt ? ` on ${formatDateTime(study.qaApprovedAt)}` : ''}
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-gray-500 mb-2">
                      Not QC Reviewed
                    </p>
                  )}
                  
                  {/* Revocation Notice - Check for revokedBy field to show revocation */}
                  {study.revokedBy && study.revocationReason && (
                    <div className="bg-orange-50 border-l-4 border-orange-400 rounded-r-lg p-3 mb-2">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-orange-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-800">⚠️ Study Revoked</p>
                          <p className="text-xs text-orange-700 mt-1"><strong>Reason:</strong> {study.revocationReason}</p>
                          {study.revokedAt && (
                            <p className="text-xs text-orange-600 mt-1">
                              Revoked on {formatDateTime(study.revokedAt)} - Please make corrections and resubmit
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
              No articles available for data entry.
            </div>
          )}
        </div>
      )}
    </div>
  );
}