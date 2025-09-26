// API Configuration
export const API_CONFIG = {
  BASE_URL: typeof window !== 'undefined' 
    ? (window as any).ENV?.NEXT_PUBLIC_API_URL || 'https://liase-backend.azurewebsites.net/api'
    : 'https://liase-backend.azurewebsites.net/api',
} as const;

// Helper function to get API base URL
export const getApiBaseUrl = () => API_CONFIG.BASE_URL;