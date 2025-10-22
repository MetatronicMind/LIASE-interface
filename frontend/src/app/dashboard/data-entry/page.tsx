"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/config/api";
import { useRouter } from "next/navigation";

interface Study {
  id: string;
  pmid: string;
  title: string;
  drugName: string;
  adverseEvent: string;
  userTag: string;
  qaApprovalStatus: string;
  qaApprovedAt?: string;
  r3FormStatus: string;
  r3FormData?: any;
  medicalReviewStatus?: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
}

export default function DataEntryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
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
        <p className="text-black">
          Fill out R3 XML forms for ICSR classified studies
        </p>
      </div>

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
                  <p className="text-sm text-black mb-2">
                    <strong>Adverse Event:</strong> {study.adverseEvent}
                  </p>
                  
                  {/* QA Approval Info */}
                  {study.qaApprovedAt && (
                    <p className="text-xs text-green-600 mb-2">
                      ✓ QA Approved on {new Date(study.qaApprovedAt).toLocaleDateString()}
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
                          <p className="text-sm font-semibold text-orange-800">⚠️ Revoked by Medical Examiner</p>
                          <p className="text-xs text-orange-700 mt-1"><strong>Reason:</strong> {study.revocationReason}</p>
                          {study.revokedAt && (
                            <p className="text-xs text-orange-600 mt-1">
                              Revoked on {new Date(study.revokedAt).toLocaleDateString()} - Please make corrections and resubmit
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
              No ICSR studies available for data entry.
            </div>
          )}
        </div>
      )}
    </div>
  );
}