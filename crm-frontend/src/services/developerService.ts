import { getApiBaseUrl } from '../config/api';
import { authService } from './authService';

const API_BASE_URL = getApiBaseUrl();

export interface SystemHealth {
    server: {
        uptime: string;
        platform: string;
        nodeVersion: string;
        memory: {
            rss: string;
            heapTotal: string;
            heapUsed: string;
        };
        loadAverage: number[];
    };
    database: {
        status: string;
        host: string;
        name: string;
    };
    cache: {
        status: string;
    };
}

export interface AnalyticsData {
    studies: {
        total: number;
        breakdown: Record<string, number>;
    };
    users: {
        total: number;
        breakdown: Record<string, number>;
    };
    activity: {
        logsWithIn24h: number;
        errorsIn24h: number;
        failedJobsTotal: number;
        failedEmails24h: number;
    };
}

export interface MaintenanceAction {
    id: string;
    label: string;
    description: string;
    danger: boolean;
}

class DeveloperService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    async getSystemHealth(): Promise<SystemHealth> {
        const response = await fetch(`${API_BASE_URL}/developer/health`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch system health');
        }
        const result = await response.json();
        return result.data;
    }

    async getAnalytics(): Promise<AnalyticsData> {
        const response = await fetch(`${API_BASE_URL}/developer/analytics`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch analytics');
        }
        const result = await response.json();
        return result.data;
    }

    async getLogs(limit: number = 50): Promise<any[]> {
        const response = await fetch(`${API_BASE_URL}/developer/logs?limit=${limit}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch logs');
        }
        const result = await response.json();
        return result.data;
    }

    async getMaintenanceOptions(): Promise<MaintenanceAction[]> {
        const response = await fetch(`${API_BASE_URL}/developer/maintenance`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch maintenance options');
        }
        const result = await response.json();
        return result.data;
    }

    async triggerMaintenance(action: string): Promise<{ message: string }> {
        const response = await fetch(`${API_BASE_URL}/developer/maintenance`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ action }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Maintenance action failed');
        }
        const result = await response.json();
        return result.data;
    }
}

export const developerService = new DeveloperService();
