// API Configuration
export interface Environment {
  id: string;
  name: string;
  url: string;
  badge: 'blue' | 'yellow' | 'green';
}

export const ENVIRONMENTS: Record<string, Environment> = {
  DEV: {
    id: 'dev',
    name: 'Development',
    url: 'https://liase-backend-liase-dev-a3btbhewhmddgjbm.centralindia-01.azurewebsites.net/api',
    badge: 'yellow'
  },
  SANDBOX: {
    id: 'sandbox',
    name: 'Sandbox',
    url: 'https://liase-backend-liase-sandbox-akbkcfgyc0bkdhfs.centralindia-01.azurewebsites.net/api',
    badge: 'green'
  },
  PROD: {
    id: 'prod',
    name: 'Production',
    url: 'https://liase-backend.azurewebsites.net/api',
    badge: 'blue'
  }
};

const STORAGE_KEY = 'crm_selected_env';

declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
  };
};

const DEFAULT_URL = process.env.NEXT_PUBLIC_API_URL || ENVIRONMENTS.PROD.url;

// Helper function to get API base URL
export const getApiBaseUrl = () => {
    // Check localStorage for environment override
    if (typeof window !== 'undefined') {
        const storedEnvId = localStorage.getItem(STORAGE_KEY);
        if (storedEnvId) {
            const env = Object.values(ENVIRONMENTS).find(e => e.id === storedEnvId);
            if (env) {
                // console.log(`[API] Using overridden environment: ${env.name}`);
                return env.url;
            }
        }
    }
  return DEFAULT_URL;
};

// Helper to manage environment selection
export const environmentManager = {
    getCurrent: (): Environment => {
        if (typeof window !== 'undefined') {
            const storedEnvId = localStorage.getItem(STORAGE_KEY);
            if (storedEnvId) {
                const env = Object.values(ENVIRONMENTS).find(e => e.id === storedEnvId);
                if (env) return env;
            }
        }
        // Fallback: try to match DEFAULT_URL to an environment
        const match = Object.values(ENVIRONMENTS).find(e => e.url === DEFAULT_URL);
        return match || ENVIRONMENTS.PROD;
    },
    set: (envId: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, envId);
            // Reload to apply changes across all singleton services
            window.location.reload();
        }
    }
};

export const API_CONFIG = {
  BASE_URL: DEFAULT_URL, // Deprecated usage, but kept for compatibility. Use getApiBaseUrl() instead!
} as const;
