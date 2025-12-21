"use client";
import React, { useMemo, useState, useEffect } from "react";
import {
  ArrowPathIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { useDateTime } from "@/hooks/useDateTime";
import { auditService, AuditLog, AuditFilters } from "../../../services/auditService";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

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
  },
  fetch: {
    label: "View",
    icon: <ArrowPathIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-blue-500"
  },
  complete: {
    label: "Complete",
    icon: <CheckCircleIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-green-600"
  },
  approval: {
    label: "Approval",
    icon: <CheckCircleIcon className="w-4 h-4 mr-1 inline-block align-middle" />,
    color: "text-green-600"
  }
};

function getActionMeta(action: string) {
  return actionConfig[action] || { 
    label: action.charAt(0).toUpperCase() + action.slice(1), 
    icon: React.createElement(ArrowPathIcon, { className: "w-4 h-4 mr-1 inline-block align-middle" }),
    color: "text-gray-600"
  };
}

function normalizeAction(action?: string, method?: string) {
  const raw = (action || method || '').toLowerCase();

  // Backend auto-logger uses HTTP verbs as actions (put/post/etc). Map to user-friendly audit verbs.
  if (raw === 'post') return 'create';
  if (raw === 'put' || raw === 'patch') return 'update';
  if (raw === 'delete') return 'delete';
  if (raw === 'get') return 'read';

  // Common app-level verbs
  if (raw === 'fetch' || raw === 'list' || raw === 'query' || raw === 'search') return 'fetch';
  if (raw === 'approval') return 'approval';
  if (raw === 'complete' || raw === 'completed') return 'complete';
  if (raw === 'approved') return 'approve';
  if (raw === 'rejected') return 'reject';

  return raw || 'update';
}

function isTechnicalAutoLog(log: AuditLog) {
  const details = (log.details || '').trim();
  const hasHttpDetails = /^(GET|POST|PUT|PATCH|DELETE)\s+\/api\//i.test(details);
  const hasHttpAction = ['get', 'post', 'put', 'patch', 'delete'].includes((log.action || '').toLowerCase());
  const hasApiPath = typeof log.metadata?.path === 'string' && String(log.metadata.path).startsWith('/api/');

  // Heuristic: auto logs look like "PUT /api/..." and include metadata.path/method.
  return hasHttpDetails || (hasHttpAction && hasApiPath);
}

function formatFieldLabel(fieldName: string) {
  return String(fieldName)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function shortenUuids(text: string) {
  if (!text) return text;
  return text.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    (m) => `#${m.slice(0, 8)}`
  );
}

function expandCommonTerms(text: string) {
  if (!text) return text;
  return text
    .replace(/\bQC\b/g, 'Quality check')
    .replace(/\bR3\b/g, 'Medical review');
}

function humanizeNonTechnicalDetails(log: AuditLog) {
  let text = String(log.details || '').trim();

  // 5. Bulk Approve / QC Allocation
  // Check action OR text content
  if (log.action === 'Bulk_approve' || text.includes('Auto approved Quality check') || text.includes('moved to data_entry')) {
    return "User clicked QC Process Allocation (Auto-approved and moved to Data Entry as ICSR)";
  }

  // Remove technical prefixes like "update study <uuid>:"
  text = text.replace(/^\w+\s+\w+\s+[0-9a-f-]{8,36}:\s*/i, '');
  text = text.replace(/^\w+\s+study\s+[0-9a-f-]{8,36}:\s*/i, '');

  // Make common verbs more readable
  text = text.replace(/^Retrieved\b/i, 'Viewed');
  text = text.replace(/^Fetched\b/i, 'Viewed');
  text = text.replace(/^Query\b/i, 'Viewed');

  // 3. Locked / Released Case
  if (text.includes('Locked the case for study')) {
    // Use the resourceId (which is the Study ID)
    // Update regex to support non-hex IDs (like DEXA_Synt_...)
    const id = log.resourceId || text.match(/study #?([\w-]+)/i)?.[1];
    
    if (id) {
        // If it's a UUID, shorten it. If it's a custom ID (like DEXA_Synt_...), show it as is.
        return `Locked Case ${shortenUuids(id)}`;
    }
    return 'Locked Case';
  }
  if (text.includes('Released the case for study')) {
    const id = log.resourceId || text.match(/study #?([\w-]+)/i)?.[1];
    
    if (id) {
        return `Released Case ${shortenUuids(id)}`;
    }
    return 'Released Case';
  }

  // 4. Classification
  if (text.includes('classification') || text.includes('Classified as')) {
    // Check if it was "First classified" (previous value was empty/null)
    // Check raw field names (user_tag, userTag) and formatted names just in case
    const tagChange = log.changes?.find(c => 
        c.field === 'user_tag' || 
        c.field === 'userTag' || 
        c.field === 'User Tag' || 
        c.field === 'classification' ||
        c.field === 'Classification'
    );
    
    // Robust check for "empty" previous value
    const isFirst = tagChange && (
      tagChange.before === 'empty' || 
      tagChange.before === null || 
      tagChange.before === undefined || 
      tagChange.before === '' ||
      String(tagChange.before).toLowerCase() === 'null'
    );
    
    // Extract classification value
    const match = text.match(/(?:Updated study classification to|Classified as) (.+)/i);
    if (match) {
      const classification = match[1];
      let result = isFirst ? `First classified as ${classification}` : `Classified as ${classification}`;

      // Add details about other changed fields
      if (log.changes && log.changes.length > 0) {
          const details = [];
          
          const fullTextChange = log.changes.find(c => c.field === 'fullTextAvailability');
          if (fullTextChange) details.push(`Full Text Option: ${fullTextChange.after}`);

          const fullTextSourceChange = log.changes.find(c => c.field === 'fullTextSource');
          if (fullTextSourceChange && fullTextSourceChange.after !== undefined && fullTextSourceChange.after !== null) {
            details.push(`Full Text Source: "${fullTextSourceChange.after}"`);
          }

          const justificationChange = log.changes.find(c => c.field === 'justification');
          if (justificationChange) details.push(`Justification: "${justificationChange.after}"`);

          const seriousnessChange = log.changes.find(c => c.field === 'seriousness');
          if (seriousnessChange) details.push(`Seriousness: ${seriousnessChange.after}`);

          const listednessChange = log.changes.find(c => c.field === 'listedness');
          if (listednessChange) details.push(`Listedness: ${listednessChange.after}`);

          if (details.length > 0) {
              result += ` (${details.join(', ')})`;
          }
      }
      return result;
    }
    
    // 7. Approved Classification
    if (text.startsWith('Approved classification')) {
       const id = text.match(/study ([^ ]+)/i)?.[1] || log.resourceId;
       return id ? `Approved classification for Case ${shortenUuids(id)}` : 'Approved classification for Case';
    }
  }

  // 6. Manual QC - Try to add Case ID if missing
  if (text.includes('Selected for Quality check Triage')) {
     if (log.resourceId && !text.includes(log.resourceId)) {
         return `Selected Case ${shortenUuids(log.resourceId)} for Manual Quality Check`;
     }
     return text.replace('Selected for Quality check Triage (Manual Quality check)', 'Selected for Manual Quality Check');
  }

  // Handle specific "Viewed Triage Cases" request
  if (text.match(/Viewed.*studies for data entry/i) || text.match(/Viewed.*cases for data entry/i)) {
    return 'Viewed Triage Cases';
  }
  
  // 2. Configuration Updates
  if (text.includes('Updated drug configuration')) {
      // If we have changes, we can be more specific, otherwise just return the text
      if (log.changes && log.changes.length > 0) {
          const changedFields = log.changes.map(c => formatFieldLabel(c.field)).join(', ');
          return `Updated drug configuration (${changedFields})`;
      }
      return 'Updated drug configuration';
  }

  return expandCommonTerms(shortenUuids(text));
}

function formatValueForHumans(value: unknown) {
  if (value === null || value === undefined) return 'empty';
  if (typeof value === 'string') return shortenUuids(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  // Objects/arrays tend to look technical; keep it simple.
  return 'updated';
}

function humanizeTechnicalDetails(log: AuditLog) {
  // Prefer metadata.path because details might include query strings
  const details = (log.details || '').trim();
  const method = String(log.metadata?.method || details.split(' ')[0] || '').toUpperCase();
  // Keep query params for filter detection
  const fullPath = String(log.metadata?.path || (details.split(' ')[1] || ''));
  const rawPath = fullPath.split('?')[0];
  const queryParams = fullPath.split('?')[1] || '';

  const studyIdFromPath = (path: string) => {
    const m = path.match(/\/api\/studies\/(?:lock-case|release-case)\/([^/?#]+)/i);
    if (m?.[1]) return m[1];
    const m2 = path.match(/\/api\/studies\/([^/?#]+)/i);
    return m2?.[1] || null;
  };

  // Studies
  if (/^\/api\/studies\/lock-case\//i.test(rawPath)) {
    const studyId = studyIdFromPath(rawPath);
    // 3. Locked Case - clearer formatting
    return studyId ? `Locked Case ${shortenUuids(studyId)}` : 'Locked a case';
  }
  if (/^\/api\/studies\/release-case\//i.test(rawPath)) {
    const studyId = studyIdFromPath(rawPath);
    return studyId ? `Released Case ${shortenUuids(studyId)}` : 'Released a case';
  }

  // QA Specific Routes
  if (/^\/api\/studies\/QA\/bulk-process\/?$/i.test(rawPath)) {
    return 'Initiated Quality Check Process';
  }
  if (/^\/api\/studies\/[^/]+\/QA\/approve\/?$/i.test(rawPath)) {
    const studyId = studyIdFromPath(rawPath);
    return studyId ? `QA Approved Case ${shortenUuids(studyId)}` : 'QA Approved Case';
  }
  if (/^\/api\/studies\/[^/]+\/QA\/reject\/?$/i.test(rawPath)) {
    const studyId = studyIdFromPath(rawPath);
    return studyId ? `QA Rejected Case ${shortenUuids(studyId)}` : 'QA Rejected Case';
  }

  if (/^\/api\/studies\//i.test(rawPath)) {
    const studyId = studyIdFromPath(rawPath);
    if (method === 'PUT' || method === 'PATCH') {
      return studyId ? `Updated Case ${shortenUuids(studyId)}` : 'Updated a case';
    }
    if (method === 'POST') {
      return studyId ? `Created Case ${shortenUuids(studyId)}` : 'Created a case';
    }
    return studyId ? `Viewed Case ${shortenUuids(studyId)}` : 'Viewed a case';
  }

  // Study List / Filtering
  if (/^\/api\/studies\/?$/i.test(rawPath) && method === 'GET') {
    const pageMatch = queryParams.match(/page=(\d+)/);
    const pageNum = pageMatch ? ` (Page ${pageMatch[1]})` : '';

    if (queryParams) {
      if (queryParams.includes('status=data_entry')) return `Viewed Data Entry Cases${pageNum}`;
      if (queryParams.includes('status=manual_qc')) return `Viewed QC Triage Cases${pageNum}`;
      if (queryParams.includes('status=triage')) return `Viewed Triage Cases${pageNum}`;
      if (queryParams.includes('status=completed')) return `Viewed Completed Cases${pageNum}`;
      if (queryParams.includes('status=archived')) return `Viewed Archived Cases${pageNum}`;
      
      return `Used filter on studies list${pageNum}`;
    }
    return `Viewed Triage Cases${pageNum}`;
  }

  // Drug Configuration
  if (/^\/api\/drugs\/?$/i.test(rawPath)) {
    if (method === 'POST') return 'Created drug configuration';
    if (method === 'GET') return 'Viewed drug configuration';
  }
  if (/^\/api\/drugs\//i.test(rawPath)) {
    // 2. Updated Configuration - try to be more specific if possible, otherwise rely on changes
    if (method === 'PUT' || method === 'PATCH') return 'Updated drug configuration';
    if (method === 'DELETE') return 'Deleted drug configuration';
    if (method === 'GET') return 'Viewed drug configuration';
  }

  // Users
  if (/^\/api\/users\/?$/i.test(rawPath) && method === 'POST') {
    return 'Created a new user';
  }
  if (/^\/api\/users\//i.test(rawPath)) {
    const userId = rawPath.split('/').pop();
    if (method === 'PUT' || method === 'PATCH') return userId ? `Updated user ${userId}` : 'Updated a user';
    if (method === 'DELETE') return userId ? `Deleted user ${userId}` : 'Deleted a user';
  }

  // Auth
  if (/^\/api\/auth\/login\/?$/i.test(rawPath)) return 'Logged in';
  if (/^\/api\/auth\/logout\/?$/i.test(rawPath)) return 'Logged out';

  // Fallback
  const actionVerb = normalizeAction(log.action, log.metadata?.method);
  const actionLabel = getActionMeta(actionVerb).label.toLowerCase();
  return rawPath ? `${actionLabel} (${rawPath.replace(/^\/api\//, '')})` : (details || 'Performed an action');
}

export default function AuditTrailPage() {
  const selectedOrganizationId = useSelector((state: RootState) => state.filter.selectedOrganizationId);
  const { formatDate, formatTime } = useDateTime();
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
        ...(selectedOrganizationId && { organizationId: selectedOrganizationId }),
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
  }, [page, pageSize, user, action, dateFrom, dateTo, selectedOrganizationId]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Calculate pagination
  const pageCount = Math.ceil(totalRecords / pageSize);

  const displayLogs = useMemo(() => {
    if (!auditLogs || auditLogs.length === 0) return [];

    const meaningful = auditLogs.filter((l) => !isTechnicalAutoLog(l));

    const hasMeaningfulSibling = (technicalLog: AuditLog) => {
      const tTime = Date.parse(technicalLog.timestamp);
      return meaningful.some((m) => {
        if (m.userId !== technicalLog.userId) return false;
        
        // For bulk operations or general actions, resourceId might be missing in both
        const isBulkOrGeneral = !m.resourceId && !technicalLog.resourceId;
        
        // If not bulk/general, require matching resourceIds
        if (!isBulkOrGeneral) {
            if (!m.resourceId || !technicalLog.resourceId) return false;
            if (m.resourceId !== technicalLog.resourceId) return false;
        }
        
        const mTime = Date.parse(m.timestamp);
        return Number.isFinite(tTime) && Number.isFinite(mTime) && Math.abs(mTime - tTime) <= 5000;
      });
    };

    // Keep the original API order, but drop technical rows when a meaningful row exists.
    return auditLogs.filter((l) => {
      const path = l.metadata?.path || '';
      
      // Filter out "Initiated Quality Check Process"
      if (/^\/api\/studies\/QA\/bulk-process\/?$/i.test(String(path))) {
        return false;
      }

      // Filter out "Viewed Triage Cases" and other study list views (GET /api/studies)
      if (/^\/api\/studies\/?$/i.test(String(path)) && (l.action === 'get' || l.metadata?.method === 'GET')) {
        return false;
      }

      return !isTechnicalAutoLog(l) || !hasMeaningfulSibling(l);
    });
  }, [auditLogs]);

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
                  displayLogs.map((log, idx) => {
                    // Use the timezone from location data, fallback to UTC
                    // Handle invalid timezone values (like "Unknown") by using UTC
                    let userTimezone = 'UTC';
                    if (log.location?.timezone && log.location.timezone !== 'Unknown') {
                      try {
                        // Validate timezone by attempting to use it
                        new Date().toLocaleString('en-US', { timeZone: log.location.timezone });
                        userTimezone = log.location.timezone;
                      } catch (e) {
                        // Invalid timezone, use UTC
                        userTimezone = 'UTC';
                      }
                    }
                    return (
                    <tr key={idx} className="border-b border-blue-50 last:border-b-0">
                      <td className="py-3 px-4 align-top text-blue-900">
                        <div>{formatDate(log.timestamp)}</div>
                        <div className="text-xs text-gray-600">
                          {formatTime(log.timestamp)}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-blue-900 font-bold">
                        {log.userName}
                      </td>
                      <td className="py-3 px-4 align-top">
                        {(() => {
                          const normalized = normalizeAction(log.action, log.metadata?.method);
                          const meta = getActionMeta(normalized);
                          return (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-100 text-gray-800 font-semibold text-xs">
                          {meta.icon}
                          {meta.label}
                        </span>
                          );
                        })()}
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
                        <div className="mb-1">
                          {expandCommonTerms(
                            isTechnicalAutoLog(log) ? humanizeTechnicalDetails(log) : humanizeNonTechnicalDetails(log)
                          )}
                        </div>
                        {log.changes && log.changes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {log.changes
                              .filter(change => {
                                const field = change.field.toLowerCase();
                                const technicalFields = ['rid', 'self', 'etag', 'attachments', 'ts', '_rid', '_self', '_etag', '_ts'];
                                return !technicalFields.includes(field);
                              })
                              .map((change, changeIdx) => (
                              <div key={changeIdx} className="text-xs bg-blue-50 rounded p-2 border border-blue-100">
                                {(() => {
                                  const label = formatFieldLabel(change.field);
                                  const before = formatValueForHumans(change.before);
                                  const after = formatValueForHumans(change.after);

                                  const simpleBefore = expandCommonTerms(before);
                                  const simpleAfter = expandCommonTerms(after);
                                  
                                  const sentence = `${label}: changed from "${simpleBefore}" to "${simpleAfter}".`;

                                  return <div className="text-blue-900">{sentence}</div>;
                                })()}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })
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
