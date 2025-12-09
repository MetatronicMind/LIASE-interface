// API Configuration
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
  };
};

// Use environment variable first, fallback to production URL
const PRODUCTION_URL = 'https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api';
const API_URL = process.env.NEXT_PUBLIC_API_URL || PRODUCTION_URL;

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
  console.log('=== API BASE URL DEBUG ===');
  console.log('Environment Variable NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('Final API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
  console.log('=========================');
  return API_CONFIG.BASE_URL;
};