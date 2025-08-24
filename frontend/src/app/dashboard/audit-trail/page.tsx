"use client";
import React, { useState } from "react";
import SearchableSelect from "./SearchableSelect";
import {
  ArrowPathIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

const mockUsers = [
  { id: 1, name: "System Administrator" },
  { id: 2, name: "John Smith" },
  { id: 3, name: "Sarah Johnson" },
];
const mockActions = [
  {
    value: "login",
    label: "Login",
    icon: <LockClosedIcon className="w-4 h-4 text-blue-600 mr-1 inline-block align-middle" />
  },
  {
    value: "comment",
    label: "Comment",
    icon: <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-gray-500 mr-1 inline-block align-middle" />
  },
  {
    value: "approval",
    label: "Approval",
    icon: <CheckCircleIcon className="w-4 h-4 text-green-600 mr-1 inline-block align-middle" />
  },
  {
    value: "drug_update",
    label: "Drug Updated",
    icon: <ArrowPathIcon className="w-4 h-4 text-amber-600 mr-1 inline-block align-middle" />
  },
];
const mockLogs = [
  // Existing logs
  {
    timestamp: "2024-12-01",
    user: { id: 2, name: "John Smith" },
    action: "comment",
    details: "Added comment to study PMID: 38901235",
  },
  {
    timestamp: "2024-12-01",
    user: { id: 2, name: "John Smith" },
    action: "login",
    details: "User pv_user1 logged in with role Pharmacovigilance",
  },
  {
    timestamp: "2024-12-01",
    user: { id: 1, name: "System Administrator" },
    action: "login",
    details: "User admin logged in with role Admin",
  },
  {
    timestamp: "2024-11-30",
    user: { id: 3, name: "Sarah Johnson" },
    action: "approval",
    details: "Approved study PMID: 38901236 for AOI reporting",
  },
  {
    timestamp: "2024-11-30",
    user: { id: 1, name: "System Administrator" },
    action: "drug_update",
    details: "Updated drug information for Aspirin",
  },
  // More dummy logs
  {
    timestamp: "2024-11-29",
    user: { id: 2, name: "John Smith" },
    action: "comment",
    details: "Added comment to study PMID: 38901237",
  },
  {
    timestamp: "2024-11-29",
    user: { id: 3, name: "Sarah Johnson" },
    action: "login",
    details: "User sjohnson logged in with role Reviewer",
  },
  {
    timestamp: "2024-11-28",
    user: { id: 1, name: "System Administrator" },
    action: "approval",
    details: "Approved study PMID: 38901238 for AOI reporting",
  },
  {
    timestamp: "2024-11-28",
    user: { id: 2, name: "John Smith" },
    action: "drug_update",
    details: "Updated drug information for Paracetamol",
  },
  {
    timestamp: "2024-11-27",
    user: { id: 3, name: "Sarah Johnson" },
    action: "comment",
    details: "Added comment to study PMID: 38901239",
  },
  {
    timestamp: "2024-11-27",
    user: { id: 1, name: "System Administrator" },
    action: "login",
    details: "User admin logged in with role Admin",
  },
  {
    timestamp: "2024-11-26",
    user: { id: 2, name: "John Smith" },
    action: "approval",
    details: "Approved study PMID: 38901240 for AOI reporting",
  },
  {
    timestamp: "2024-11-26",
    user: { id: 3, name: "Sarah Johnson" },
    action: "drug_update",
    details: "Updated drug information for Ibuprofen",
  },
  {
    timestamp: "2024-11-25",
    user: { id: 1, name: "System Administrator" },
    action: "comment",
    details: "Added comment to study PMID: 38901241",
  },
  {
    timestamp: "2024-11-25",
    user: { id: 2, name: "John Smith" },
    action: "login",
    details: "User pv_user1 logged in with role Pharmacovigilance",
  },
  {
    timestamp: "2024-11-24",
    user: { id: 3, name: "Sarah Johnson" },
    action: "approval",
    details: "Approved study PMID: 38901242 for AOI reporting",
  },
  {
    timestamp: "2024-11-24",
    user: { id: 1, name: "System Administrator" },
    action: "drug_update",
    details: "Updated drug information for Metformin",
  },
];

function getActionMeta(action: string) {
  return mockActions.find(a => a.value === action) || { label: action, icon: null };
}

export default function AuditTrailPage() {
  // Filter and pagination state
  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtering
  const filteredLogs = mockLogs.filter(log => {
    if (user && String(log.user.id) !== user) return false;
    if (action && log.action !== action) return false;
    if (dateFrom && log.timestamp < dateFrom) return false;
    if (dateTo && log.timestamp > dateTo) return false;
    return true;
  });
  const pageCount = Math.ceil(filteredLogs.length / pageSize);
  const pagedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  // Summary
  const summary = mockActions.map(a => ({
    ...a,
    count: filteredLogs.filter(l => l.action === a.value).length
  }));

  function clearFilters() {
    setUser("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function exportCSV() {
    // Simple CSV export for demo
    const header = ["Timestamp", "User", "Action", "Details"];
    const rows = filteredLogs.map(l => [l.timestamp, l.user.name, getActionMeta(l.action).label, l.details]);
    const csv = [header, ...rows].map(r => r.map(x => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_trail.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-white min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-blue-900 mb-1 tracking-wider drop-shadow-sm">Audit Trail</h1>
            <div className="text-blue-700 text-base font-medium">Complete log of all user activities and system events</div>
          </div>
          <button
            className="bg-green-100 hover:bg-green-200 text-green-800 font-bold px-5 py-2 rounded-lg shadow transition flex items-center gap-2 self-start sm:self-auto"
            onClick={exportCSV}
          >
            <ArrowDownTrayIcon className="w-5 h-5 text-green-700" /> Export CSV
          </button>
        </div>
        {/* Filters - Study Review style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            Filter Activity Log
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">User</label>
              <SearchableSelect
                options={[{ value: "", label: "All Users" }, ...mockUsers.map(u => ({ value: String(u.id), label: u.name }))]}
                value={user}
                onChange={val => { setUser(val); setPage(1); }}
                placeholder="Select user..."
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Action</label>
              <select
                value={action}
                onChange={e => { setAction(e.target.value); setPage(1); }}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              >
                <option value="">All Actions</option>
                {mockActions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="w-full px-4 py-3 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-gray-900"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 text-sm font-medium transition-colors"
              onClick={clearFilters}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{filteredLogs.length}</span> records found
            </div>
          </div>
        </div>
        {/* Activity Log Table */}
        <div className="bg-white rounded-xl shadow border border-blue-100 p-0 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 pt-6 pb-2 gap-4">
            <div className="text-lg font-bold text-blue-900">Activity Log</div>
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-sm font-medium text-blue-900">Show</label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 bg-white text-blue-900"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-blue-200 rounded-lg">
              <thead>
                <tr className="bg-blue-50 text-blue-900">
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-200">Timestamp</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-200">User</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-200">Action</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-200">Details</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-400 border-b border-blue-100">No records found.</td>
                  </tr>
                ) : (
                  pagedLogs.map((log, idx) => (
                    <tr key={idx} className="border-b border-blue-50 last:border-b-0">
                      <td className="py-3 px-4 align-top text-blue-900">
                        {new Date(log.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-4 align-top text-blue-900 font-bold">
                        {log.user.name}
                        <div className="text-xs text-gray-600 font-normal">ID: {log.user.id}</div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-100 text-gray-800 font-semibold text-xs">
                          {getActionMeta(log.action).icon}
                          {getActionMeta(log.action).label}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-blue-900">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-4 border-t border-blue-100 bg-blue-50 rounded-b-xl">
            <div className="text-sm text-gray-600">
              Showing {filteredLogs.length === 0 ? 0 : (page - 1) * pageSize + 1}
              -{Math.min(page * pageSize, filteredLogs.length)} of {filteredLogs.length}
            </div>
            <div className="flex gap-1 items-center">
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                onClick={() => setPage(1)}
                disabled={page === 1}
                title="First page"
              >&#171;</button>
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                title="Previous page"
              >&#8249;</button>
              <span className="px-2 text-gray-700 font-semibold">Page {page} of {pageCount || 1}</span>
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount || pageCount === 0}
                title="Next page"
              >&#8250;</button>
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 border border-gray-300"
                onClick={() => setPage(pageCount)}
                disabled={page === pageCount || pageCount === 0}
                title="Last page"
              >&#187;</button>
            </div>
          </div>
        </div>
        {/* Activity Summary */}
        <div className="bg-white rounded-xl shadow border border-blue-100 p-6">
          <div className="font-bold text-lg text-blue-900 mb-4">Activity Summary</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {summary.map((a, idx) => (
              <div key={a.value} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 text-base font-semibold text-blue-900">
                <span className="text-xl">{a.icon}</span>
                <span>{a.label}</span>
                <span className="ml-auto text-blue-700 font-black text-lg">{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
