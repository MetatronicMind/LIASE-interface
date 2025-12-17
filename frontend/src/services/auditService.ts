import { getApiBaseUrl } from '../config/api';
import { formatDateTime } from '../utils/dateTimeFormatter';

const API_BASE_URL = getApiBaseUrl();

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    timezone?: string;
    isp?: string;
  };
  timestamp: string;
  metadata?: any;
  beforeValue?: any;
  afterValue?: any;
  changes?: Array<{
    field: string;
    before: any;
    after: any;
  }>;
  type: string;
}

export interface AuditLogsResponse {
  auditLogs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AuditStats {
  total: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  byUser: Record<string, number>;
  byDay: Record<string, number>;
  topActions: { action: string; count: number }[];
  topUsers: { user: string; count: number }[];
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
  organizationId?: string;
}

class AuditService {
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async getAuditLogs(filters: AuditFilters = {}): Promise<AuditLogsResponse> {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    try {
      const response = await fetch(`${API_BASE_URL}/audit?${queryParams.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        if (response.status === 403) {
          throw new Error('You do not have permission to view audit logs');
        }
        if (response.status === 401) {
          throw new Error('Please log in to view audit logs');
        }
        throw new Error(data.error || `Failed to fetch audit logs (${response.status})`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please ensure the backend is running and accessible');
      }
      throw error;
    }
  }

  async getAuditStats(days: number = 30): Promise<AuditStats> {
    const response = await fetch(`${API_BASE_URL}/audit/stats?days=${days}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch audit statistics');
    }

    return data;
  }

  async getAuditLog(auditId: string): Promise<AuditLog> {
    const response = await fetch(`${API_BASE_URL}/audit/${auditId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch audit log');
    }

    return data;
  }

  // Helper method to get unique users from audit logs
  async getUsers(): Promise<{ id: string; name: string }[]> {
    try {
      const response = await this.getAuditLogs({ limit: 1000 });
      const uniqueUsers = new Map<string, string>();
      
      response.auditLogs.forEach(log => {
        if (!uniqueUsers.has(log.userId)) {
          uniqueUsers.set(log.userId, log.userName);
        }
      });
      
      return Array.from(uniqueUsers.entries()).map(([id, name]) => ({ id, name }));
    } catch (error) {
      // If we can't fetch audit logs (permission issues), return empty array
      console.error('Error fetching users from audit logs:', error);
      return [];
    }
  }

  // Helper method to get available actions
  getAvailableActions(): { value: string; label: string }[] {
    return [
      { value: 'login', label: 'Login' },
      { value: 'logout', label: 'Logout' },
      { value: 'create', label: 'Create' },
      { value: 'read', label: 'Read' },
      { value: 'update', label: 'Update' },
      { value: 'delete', label: 'Delete' },
      { value: 'approve', label: 'Approve' },
      { value: 'reject', label: 'Reject' },
      { value: 'comment', label: 'Comment' },
    ];
  }

  // Helper method to export audit logs as CSV
  async exportAuditLogsCSV(filters: AuditFilters = {}): Promise<void> {
    try {
      // Get all logs with the filters (increase limit for export)
      const response = await this.getAuditLogs({ ...filters, limit: 10000 });
      
      const header = ['Timestamp', 'User', 'Action', 'Resource', 'Country', 'City', 'IP Address', 'Details', 'Changes'];
      const rows = response.auditLogs.map(log => {
        // Format changes as a readable string
        let changesText = '';
        if (log.changes && log.changes.length > 0) {
          changesText = log.changes.map(change => 
            `${change.field}: "${change.before || '<empty>'}" → "${change.after || '<empty>'}"`
          ).join('; ');
        }
        
        return [
          formatDateTime(log.timestamp),
          log.userName,
          log.action,
          log.resource,
          log.location?.country || 'Unknown',
          log.location?.city || 'Unknown',
          log.ipAddress || 'N/A',
          log.details,
          changesText
        ];
      });
      
      const csv = [header, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }
}

export const auditService = new AuditService();
export default auditService;