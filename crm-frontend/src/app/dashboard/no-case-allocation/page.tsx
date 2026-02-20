"use client";
import { useState, useEffect } from "react";
import { useDateTime } from "@/hooks/useDateTime";
import { getApiBaseUrl } from "@/config/api";
import { PmidLink } from "@/components/PmidLink";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string | string[];
  journal: string;
  publicationDate?: string;
  drugName: string;
  adverseEvent: string;
  status?: string;
  userTag: "ICSR" | "AOI" | "No Case" | null;
  qaApprovalStatus: "pending" | "approved" | "rejected" | "manual_qc";
  createdAt: string;
  updatedAt: string;
  textType?: string;
  Text_type?: string;
}

export default function NoCaseAllocationPage() {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const selectedOrganizationId = useSelector(
    (state: RootState) => state.filter.selectedOrganizationId,
  );
  const { formatDate } = useDateTime();

  // Use QC/QA permissions
  const permissions = user?.permissions?.QA || user?.permissions?.QC;
  const canView = permissions?.read;
  const canWrite = permissions?.write;

  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (canView) {
      fetchNoCaseStudies();
    }
  }, [selectedOrganizationId, canView]);

  const fetchNoCaseStudies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      const url = new URL(`${getApiBaseUrl()}/studies/QA-pending`);
      if (selectedOrganizationId) {
        url.searchParams.append("organizationId", selectedOrganizationId);
      }
      url.searchParams.append("userTag", "No Case");

      // Fetch only No Casse studies pending QC
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudies(data.data || []);
      } else {
        throw new Error("Failed to fetch No Case studies");
      }
    } catch (error) {
      console.error("Error fetching No Case QCs:", error);
      setError("Failed to load No Case studies");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQC = async () => {
    if (
      !confirm(
        "Are you sure you want to process Primary QC for No Case items?\n\nA configured percentage will be sent back to Triage for reclassification. The remainder will advance to Secondary QC.",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${getApiBaseUrl()}/studies/QA/process-no-case`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchNoCaseStudies();
      } else {
        throw new Error("Failed to process QC items");
      }
    } catch (error) {
      console.error("Error processing QC items:", error);
      alert("Failed to process QC items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudies = studies.filter((study) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      (study.drugName && study.drugName.toLowerCase().includes(searchLower)) ||
      (study.title && study.title.toLowerCase().includes(searchLower)) ||
      (study.pmid && study.pmid.includes(searchLower))
    );
  });

  if (isLoading) return <div className="p-6">Loading...</div>;

  if (user && canView === false) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md border border-gray-200 max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600">
            You do not have permission to view the No Case Allocation section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            No Case Allocation
          </h1>
          <p className="text-sm text-gray-500">
            Review studies marked as "No Case" pending QC.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={handleProcessQC}
            disabled={studies.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            Process QC
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/3 px-3 py-2 border rounded-md"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading studies...
          </div>
        ) : filteredStudies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No pending "No Case" studies found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PMID / Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publication Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sub-Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudies.map((study) => (
                  <tr key={study.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600">
                        <PmidLink pmid={study.pmid} />
                      </div>
                      <div className="text-sm text-gray-900 line-clamp-2">
                        {study.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {study.journal}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(study.publicationDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {study.drugName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {study.Text_type || study.textType || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        No Case
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
