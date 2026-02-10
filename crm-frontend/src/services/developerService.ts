import { getApiBaseUrl } from '../config/api';
import { authService } from './authService';

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

export interface Environment {
    id: string;
    name: string;
    url: string;
    branch: string;
    status: 'healthy' | 'unhealthy' | 'deploying';
    lastDeploy: string;
    version: string;
    dbName?: string;
    error?: string;
}

export interface EnvironmentUser {
    id: string;
    email: string;
    role: string;
    status: 'active' | 'invited' | 'disabled';
    lastLogin?: string;
}

export interface EnvironmentSettings {
    maintenanceMode: boolean;
    debugLogging: boolean;
    allowedIPs: string[];
    featureFlags: Record<string, boolean>;
    apiRateLimit: number;
}

export interface EnvironmentMetrics {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
    requestRate: number;
    errorRate: number;
    responseTime: number;
    timestamp: string;
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
        const response = await fetch(`${getApiBaseUrl()}/developer/health`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('System health fetch failed:', response.status, errorText);
            throw new Error(`Failed to fetch system health: ${response.status}`);
        }
        const result = await response.json();
        return result.data;
    }

    async getAnalytics(): Promise<AnalyticsData> {
        const response = await fetch(`${getApiBaseUrl()}/developer/analytics`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Analytics fetch failed:', response.status, errorText);
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.message || `Failed to fetch analytics: ${response.status}`);
            } catch (e) {
                throw new Error(`Failed to fetch analytics: ${response.status} - ${errorText}`);
            }
        }
        const result = await response.json();
        return result.data;
    }

    async getLogs(limit: number = 50): Promise<any[]> {
        const response = await fetch(`${getApiBaseUrl()}/developer/logs?limit=${limit}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Logs fetch failed:', response.status, errorText);
            throw new Error(`Failed to fetch logs: ${response.status}`);
        }
        const result = await response.json();
        return result.data;
    }

    async getMaintenanceOptions(): Promise<MaintenanceAction[]> {
        const response = await fetch(`${getApiBaseUrl()}/developer/maintenance`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Maintenance options fetch failed:', response.status, errorText);
            throw new Error(`Failed to fetch maintenance options: ${response.status}`);
        }
        const result = await response.json();
        return result.data;
    }

    async triggerMaintenance(action: string): Promise<{ message: string }> {
        const response = await fetch(`${getApiBaseUrl()}/developer/maintenance`, {
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

    async getEnvironments(): Promise<Environment[]> {
        try {
            const response = await fetch(`${getApiBaseUrl()}/developer/environments`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Environments fetch failed:', response.status, errorText);
                throw new Error(`Failed to fetch environments: ${response.status}`);
            }
            const result = await response.json();
            return result.data;
        } catch (error) {
            // Mock fallback
            return [
                { id: 'main', name: 'LIASE (Main)', url: 'https://liase.com', branch: 'main', status: 'healthy', lastDeploy: 'Managed by Pipeline', version: '1.0.0', dbName: 'liase-database' },
                { id: 'dev', name: 'LIASE Dev (Developer)', url: 'https://dev.liase.com', branch: 'dev', status: 'healthy', lastDeploy: 'Managed by Pipeline', version: '1.1.0-beta', dbName: 'liase-database-dev' },
                { id: 'sandbox', name: 'LIASE Sandbox', url: 'https://sandbox.liase.com', branch: 'sandbox', status: 'unhealthy', lastDeploy: 'Check failed', version: '0.0.7-sandbox', dbName: 'liase-database-sandbox', error: 'Check failed' }
            ];
        }
    }

    async getEnvironment(id: string): Promise<Environment> {
        // Fallback for demo/mock if API not ready
        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            return this.getMockEnvironment(id);
        }

        try {
            const response = await fetch(`${getApiBaseUrl()}/developer/environments/${id}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch environment details');
            }
            const result = await response.json();
            return result.data;
        } catch (error) {
            return this.getMockEnvironment(id);
        }
    }

    private getMockEnvironment(id: string): Environment {
        const isDev = id === 'dev' || id === 'development';
        const isMain = id === 'main' || id === 'production';

        return {
            id,
            name: isMain ? 'LIASE (Main)' : isDev ? 'LIASE Dev (Developer)' : 'LIASE Sandbox',
            url: `https://${isMain ? 'app' : isDev ? 'dev' : 'sandbox'}.liase.com`,
            branch: isMain ? 'main' : isDev ? 'dev' : 'sandbox',
            status: 'healthy',
            lastDeploy: new Date().toISOString(),
            version: isMain ? '1.0.0' : isDev ? '1.1.0-beta' : '0.0.7-sandbox',
            dbName: `liase-database-${id}`
        };
    }

    async getEnvironmentUsers(envId: string): Promise<EnvironmentUser[]> {
        const response = await fetch(`${getApiBaseUrl()}/developer/environments/${envId}/users`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch environment users');
        }
        const result = await response.json();
        return result.data;
    }

    async addEnvironmentUser(envId: string, email: string, role: string): Promise<EnvironmentUser> {
        const response = await fetch(`${getApiBaseUrl()}/developer/environments/${envId}/users`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ email, role }),
        });

        if (!response.ok) {
            throw new Error('Failed to add user to environment');
        }
        const result = await response.json();
        return result.data;
    }

    async getEnvironmentSettings(envId: string): Promise<EnvironmentSettings> {
        const response = await fetch(`${getApiBaseUrl()}/developer/environments/${envId}/settings`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch environment settings');
        }
        const result = await response.json();
        return result.data;
    }

    async updateEnvironmentSettings(envId: string, settings: Partial<EnvironmentSettings>): Promise<EnvironmentSettings> {
        const response = await fetch(`${getApiBaseUrl()}/developer/environments/${envId}/settings`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(settings),
        });

        if (!response.ok) {
            throw new Error('Failed to update environment settings');
        }
        const result = await response.json();
        return result.data;
    }

    async getEnvironmentMetrics(envId: string): Promise<EnvironmentMetrics[]> {
        const response = await fetch(`${getApiBaseUrl()}/developer/environments/${envId}/metrics`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch environment metrics');
        }
        const result = await response.json();
        return result.data;
    }

    async deployEnvironment(env: string, version?: string): Promise<{ message: string }> {
        const response = await fetch(`${getApiBaseUrl()}/developer/environments/deploy`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ env, version }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to trigger deployment');
        }
        return await response.json();
    }

    async restartEnvironment(env: string): Promise<{ message: string }> {
        const response = await fetch(`${getApiBaseUrl()}/developer/environments/restart`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ env }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to trigger restart');
        }
        return await response.json();
    }
}

export const developerService = new DeveloperService();
