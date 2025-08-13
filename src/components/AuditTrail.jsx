import React, { useState, useEffect } from 'react';
import { demoApi, formatDate } from '../utils/demoApi';
import { useAuth } from '../context/AuthContext';
import './AuditTrail.css';

const AuditTrail = () => {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });
  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'comment', label: 'Comment' },
    { value: 'approval', label: 'Approval' },
    { value: 'drug_create', label: 'Drug Created' },
    { value: 'drug_update', label: 'Drug Updated' },
    { value: 'drug_delete', label: 'Drug Deleted' },
    { value: 'user_create', label: 'User Created' },
    { value: 'user_update', label: 'User Updated' },
    { value: 'user_delete', label: 'User Deleted' },
    { value: 'ai_processing', label: 'AI Processing' }
  ];

  useEffect(() => {
    loadAuditLog();
    loadUsers();
  }, [filters]);

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      const data = await demoApi.getAuditLog(filters);
      setAuditLog(data);
    } catch (error) {
      console.error('Error loading audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const userData = await demoApi.getUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const exportAuditLog = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Details'].join(','),
      ...auditLog.map(log => [
        formatDate(log.timestamp),
        log.userName,
        log.action,
        `"${log.details}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'login':
        return '🔐';
      case 'logout':
        return '🚪';
      case 'comment':
        return '💬';
      case 'approval':
        return '✅';
      case 'drug_create':
      case 'drug_update':
      case 'drug_delete':
        return '💊';
      case 'user_create':
      case 'user_update':
      case 'user_delete':
        return '👥';
      case 'ai_processing':
        return '🤖';
      default:
        return '📋';
    }
  };

  const getActionClass = (action) => {
    if (action.includes('delete')) return 'action-delete';
    if (action.includes('create') || action === 'approval') return 'action-create';
    if (action.includes('update')) return 'action-update';
    if (action === 'login') return 'action-login';
    if (action === 'logout') return 'action-logout';
    return 'action-default';
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner"></span>
        Loading audit trail...
      </div>
    );
  }

  return (
    <div className="audit-trail">
      <div className="audit-trail-header">
        <h1>Audit Trail</h1>
        <p>Complete log of all user activities and system events</p>
        <button onClick={exportAuditLog} className="btn btn-secondary">
          📊 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="form-group">
            <label className="form-label">User</label>
            <select
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              className="form-select"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.username})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Action</label>
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="form-select"
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date From</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date To</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>
        </div>

        <div className="filters-actions">
          <button onClick={clearFilters} className="btn btn-secondary">
            Clear Filters
          </button>
          <span className="results-count">
            {auditLog.length} record{auditLog.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card">
        <h3>Activity Log</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((log) => (
                <tr key={log.id}>
                  <td className="timestamp-cell">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="user-cell">
                    <div className="user-info">
                      <div className="user-name">{log.userName}</div>
                      <div className="user-id">ID: {log.userId}</div>
                    </div>
                  </td>
                  <td className="action-cell">
                    <span className={`action-badge ${getActionClass(log.action)}`}>
                      <span className="action-icon">{getActionIcon(log.action)}</span>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="details-cell">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {auditLog.length === 0 && (
            <div className="no-data">
              <p>No audit records found matching the current filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="card">
        <h3>Activity Summary</h3>
        <div className="summary-stats">
          {actionTypes
            .filter(type => type.value)
            .map(type => {
              const count = auditLog.filter(log => log.action === type.value).length;
              return (
                <div key={type.value} className="summary-item">
                  <span className="summary-icon">{getActionIcon(type.value)}</span>
                  <span className="summary-label">{type.label}</span>
                  <span className="summary-count">{count}</span>
                </div>
              );
            })
            .filter(item => item.props.children[2].props.children > 0)}
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
