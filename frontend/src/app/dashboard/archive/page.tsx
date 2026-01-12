"use client";

import { useState, useEffect } from "react";
import { 
  ArchiveBoxIcon, 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  FunnelIcon
} from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@/config/api";
import { useAuth } from "@/hooks/useAuth";

interface ArchivedRecord {
  id: string;
  studyId: string;
  originalStudyId?: string;
  status: string;
  initiatedAt: string;
  initiatedBy: string;
  reason?: string;
  data?: any;
}

export default function ArchivePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualId, setManualId] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
    studyId: "",
    drugName: "",
    clientName: "",
    pmid: "",
    seriousness: "",
    listedness: ""
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.studyId) queryParams.append('studyId', filters.studyId);
      if (filters.drugName) queryParams.append('drugName', filters.drugName);
      if (filters.clientName) queryParams.append('clientName', filters.clientName);
      if (filters.pmid) queryParams.append('pmid', filters.pmid);
      if (filters.seriousness) queryParams.append('seriousness', filters.seriousness);
      if (filters.listedness) queryParams.append('listedness', filters.listedness);

      const response = await fetch(`${getApiBaseUrl()}/archival/records?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch records');
      
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      setMessage({ type: 'error', text: 'Failed to load archived records' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const handleManualArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId) return;

    setArchiving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/archival/archive-study/${manualId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          options: { reason: 'Manual archive from dashboard' }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive study');
      }

      setMessage({ type: 'success', text: 'Study archived successfully' });
      setManualId("");
      fetchRecords();
    } catch (error: any) {
      console.error('Error archiving study:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to archive study' });
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <ArchiveBoxIcon className="w-8 h-8 mr-3 text-blue-600" />
          Archive Management
        </h1>
        <p className="mt-2 text-gray-600">
          Manage archived articles and view historical records.
        </p>
      </div>

      {/* Manual Archive Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Manual Archive</h2>
        <form onSubmit={handleManualArchive} className="flex gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label htmlFor="studyId" className="block text-sm font-medium text-gray-700 mb-1">
              Article ID
            </label>
            <div className="relative">
              <input
                type="text"
                id="studyId"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-10 p-2 border"
                placeholder="Enter unique article ID"
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <button
            type="submit"
            disabled={archiving || !manualId}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {archiving ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Archiving...
              </>
            ) : (
              'Archive Article'
            )}
          </button>
        </form>
        {message && (
          <div className={`mt-4 p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FunnelIcon className="w-5 h-5 mr-2 text-blue-600" />
          Filter Archives
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search ID */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Article ID</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filters.studyId}
                onChange={(e) => setFilters({ ...filters, studyId: e.target.value })}
                placeholder="Search by ID..."
                className="w-full pl-10 pr-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              />
            </div>
          </div>

          {/* Drug Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Drug Name</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filters.drugName}
                onChange={(e) => setFilters({ ...filters, drugName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
                placeholder="Filter by drug..."
              />
            </div>
          </div>

          {/* Client Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Client Name</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filters.clientName}
                onChange={(e) => setFilters({ ...filters, clientName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
                placeholder="Filter by client..."
              />
            </div>
          </div>

          {/* PMID */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">PMID</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filters.pmid}
                onChange={(e) => setFilters({ ...filters, pmid: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
                placeholder="Filter by PMID..."
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Seriousness */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Seriousness</label>
            <select
              value={filters.seriousness}
              onChange={(e) => setFilters({ ...filters, seriousness: e.target.value })}
              className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
            >
              <option value="">All</option>
              <option value="serious">Serious</option>
              <option value="non-serious">Non-Serious</option>
            </select>
          </div>

          {/* Listedness */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Listedness</label>
            <select
              value={filters.listedness}
              onChange={(e) => setFilters({ ...filters, listedness: e.target.value })}
              className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
            >
              <option value="">All</option>
              <option value="listed">Listed</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archived Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archived By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No archived records found
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {record.studyId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        record.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.initiatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.initiatedBy || 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
