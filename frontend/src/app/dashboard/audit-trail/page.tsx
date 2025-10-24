"use client";
import React, { useState, useEffect } from "react";
import {
  ArrowPathIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { auditService, AuditLog, AuditFilters } from "../../../services/auditService";

// Action configuration with icons
const actionConfig: Record<string, { label: string; icon: React.ReactElement; color: string }> = {
  login: {
    label: "Login",
    icon: <LockClosedIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-blue-600"
  },
  logout: {
    label: "Logout",
    icon: <LockClosedIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-gray-600"
  },
  comment: {
    label: "Comment",
    icon: <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-gray-500"
  },
  approve: {
    label: "Approve",
    icon: <CheckCircleIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-green-600"
  },
  reject: {
    label: "Reject",
    icon: <ExclamationTriangleIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-red-600"
  },
  create: {
    label: "Create",
    icon: <ArrowPathIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-green-600"
  },
  update: {
    label: "Update",
    icon: <ArrowPathIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-amber-600"
  },
  delete: {
    label: "Delete",
    icon: <ExclamationTriangleIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-red-600"
  },
  read: {
    label: "Read",
    icon: <ArrowPathIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-blue-500"
  }
};

function getActionMeta(action: string) {
  return actionConfig[action] || { 
    label: action.charAt(0).toUpperCase() + action.slice(1), 
    icon: React.createElement(ArrowPathIcon, { className: "w-4 h-4 mr-1 inline-block align-middle" }),
    color: "text-gray-600"
  };
}

export default function AuditTrailPage() {
  // State for audit logs and pagination
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filter and pagination state
  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Available actions from service
  const availableActions = auditService.getAvailableActions();

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: AuditFilters = {
        page,
        limit: pageSize,
        ...(user && { userId: user }),
        ...(action && { action }),
        ...(dateFrom && { startDate: dateFrom }),
        ...(dateTo && { endDate: dateTo }),
        sortOrder: 'desc'
      };

      const response = await auditService.getAuditLogs(filters);
      setAuditLogs(response.auditLogs);
      setTotalRecords(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for filter dropdown
  const fetchUsers = async () => {
    try {
      const usersData = await auditService.getUsers();
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchAuditLogs();
  }, [page, pageSize, user, action, dateFrom, dateTo]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Calculate pagination
  const pageCount = Math.ceil(totalRecords / pageSize);

  // Generate summary from current logs
  const summary = availableActions.map(a => ({
    ...a,
    count: auditLogs.filter(log => log.action === a.value).length
  }));

  function clearFilters() {
    setUser("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  async function exportCSV() {
    try {
      const filters: AuditFilters = {
        ...(user && { userId: user }),
        ...(action && { action }),
        ...(dateFrom && { startDate: dateFrom }),
        ...(dateTo && { endDate: dateTo })
      };
      
      await auditService.exportAuditLogsCSV(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audit logs');
    }
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
        {/* Filters */}
        <div className="bg-white rounded-xl shadow border border-blue-100 p-6 mb-8">
          <div className="font-bold text-lg text-blue-900 mb-4">Filters</div>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-blue-900 mb-1">User</label>
              <select
                value={user}
                onChange={e => { setUser(e.target.value); setPage(1); }}
                className="w-full border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 bg-white text-blue-900"
              >
                <option value="">All Users</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-blue-900 mb-1">Action</label>
              <select
                value={action}
                onChange={e => { setAction(e.target.value); setPage(1); }}
                className="w-full border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 bg-white text-blue-900"
              >
                <option value="">All Actions</option>
                {availableActions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-blue-900 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 bg-white text-blue-900"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-blue-900 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="w-full border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500 bg-white text-blue-900"
              />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-blue-100 pt-4 mt-2">
            <button
              className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-base"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
            <div className="text-sm text-gray-600">{totalRecords} records found</div>
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
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-200">Location</th>
                  <th className="py-3 px-4 text-left font-semibold whitespace-nowrap border-b border-blue-200">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400 border-b border-blue-100">Loading...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-red-500 border-b border-blue-100">Error: {error}</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400 border-b border-blue-100">No records found.</td>
                  </tr>
                ) : (
                  auditLogs.map((log, idx) => (
                    <tr key={idx} className="border-b border-blue-50 last:border-b-0">
                      <td className="py-3 px-4 align-top text-blue-900">
                        {new Date(log.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-4 align-top text-blue-900 font-bold">
                        {log.userName}
                        <div className="text-xs text-gray-600 font-normal">ID: {log.userId}</div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-100 text-gray-800 font-semibold text-xs">
                          {getActionMeta(log.action).icon}
                          {getActionMeta(log.action).label}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-blue-900 text-xs">
                        {log.location ? (
                          <div>
                            <div className="font-semibold">{log.location.country}</div>
                            <div className="text-gray-500">{log.location.city}</div>
                            <div className="text-gray-400 text-xs">{log.ipAddress}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-gray-500">Unknown</div>
                            <div className="text-gray-400 text-xs">{log.ipAddress || 'N/A'}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top text-blue-900">
                        <div className="mb-1">{log.details}</div>
                        {log.changes && log.changes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {log.changes.map((change, changeIdx) => (
                              <div key={changeIdx} className="text-xs bg-blue-50 rounded p-2 border border-blue-100">
                                <div className="font-semibold text-blue-900 mb-1">{change.field}:</div>
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <div className="text-gray-500 text-xs mb-0.5">Before:</div>
                                    <div className="text-red-600 font-mono text-xs break-words">
                                      {change.before === null ? '<empty>' : String(change.before)}
                                    </div>
                                  </div>
                                  <div className="text-gray-400 self-center">→</div>
                                  <div className="flex-1">
                                    <div className="text-gray-500 text-xs mb-0.5">After:</div>
                                    <div className="text-green-600 font-mono text-xs break-words">
                                      {change.after === null ? '<empty>' : String(change.after)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-4 border-t border-blue-100 bg-blue-50 rounded-b-xl">
            <div className="text-sm text-gray-600">
              Showing {totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}
              -{Math.min(page * pageSize, totalRecords)} of {totalRecords}
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
            {summary.map((a, idx) => {
              const actionMeta = getActionMeta(a.value);
              return (
                <div key={a.value} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 text-base font-semibold text-blue-900">
                  <span className={`text-xl ${actionMeta.color}`}>{actionMeta.icon}</span>
                  <span>{a.label}</span>
                  <span className="ml-auto text-blue-700 font-black text-lg">{a.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
