// API Configuration
export interface Environment {
  id: string;
  name: string;
  url: string;
  badge: 'blue' | 'yellow' | 'green';
}

export const ENVIRONMENTS: Record<string, Environment> = {
  LOCAL: {
    id: 'local',
    name: 'Local Control Plane',
    url: 'http://localhost:8000/api',
    badge: 'yellow'
  },
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
    url: 'https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api',
    badge: 'blue'
  }
};

const STORAGE_KEY = 'crm_selected_env';

declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
  };
};

const DEFAULT_URL = ENVIRONMENTS.PROD.url;

// Helper to manage environment selection
export const environmentManager = {
  getCurrent: (): Environment => {
    if (typeof window !== 'undefined') {
      const storedEnvId = localStorage.getItem(STORAGE_KEY);

      // Check stored custom environments first
      const storedCustomEnvsStr = localStorage.getItem('crm_custom_environments');
      if (storedCustomEnvsStr) {
        const customEnvs = JSON.parse(storedCustomEnvsStr);
        if (customEnvs[storedEnvId!]) return customEnvs[storedEnvId!];
      }

      if (storedEnvId) {
        const env = Object.values(ENVIRONMENTS).find(e => e.id === storedEnvId);
        if (env) return env;
      }
    }
    return ENVIRONMENTS.LOCAL;
  },
  getAll: (): Environment[] => {
    let combined = { ...ENVIRONMENTS };
    if (typeof window !== 'undefined') {
      const storedCustom = localStorage.getItem('crm_custom_environments');
      if (storedCustom) {
        combined = { ...combined, ...JSON.parse(storedCustom) };
      }
    }
    return Object.values(combined);
  },
  merge: (newEnvs: any[]) => {
    if (typeof window !== 'undefined') {
      const currentCustom = JSON.parse(localStorage.getItem('crm_custom_environments') || '{}');
      newEnvs.forEach(env => {
        currentCustom[env.id] = {
          id: env.id,
          name: env.name,
          url: env.url || env.endpoint, // Handle both backend formats
          badge: env.type === 'production' ? 'red' : 'green'
        };
      });
      localStorage.setItem('crm_custom_environments', JSON.stringify(currentCustom));
    }
  },
  set: (envId: string) => {
    if (typeof window !== 'undefined') {
      // Clear auth tokens to prevent 401 errors against the new environment
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_organization');

      // Clear potential legacy or duplicate tokens
      localStorage.removeItem('crm_auth_token');
      localStorage.removeItem('crm_user');

      localStorage.setItem(STORAGE_KEY, envId);
      // Reload to apply changes across all singleton services
      window.location.reload();
    }
  }
};

// Helper function to get API base URL
export const getApiBaseUrl = () => {
  return environmentManager.getCurrent().url;
};

export const API_CONFIG = {
  BASE_URL: DEFAULT_URL, // Deprecated usage, but kept for compatibility. Use getApiBaseUrl() instead!
} as const;
