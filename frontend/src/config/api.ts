// API Configuration
// Note: Next.js replaces process.env.NEXT_PUBLIC_* at build time
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api';

// Debug logging
console.log('API Configuration:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  FINAL_API_URL: API_URL
});

export const API_CONFIG = {
  BASE_URL: API_URL,
} as const;

// Helper function to get API base URL
export const getApiBaseUrl = () => {
  console.log('getApiBaseUrl called, returning:', API_CONFIG.BASE_URL);
  return API_CONFIG.BASE_URL;
};