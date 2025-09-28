// API Configuration - HARDCODED PRODUCTION URL TO ELIMINATE LOCALHOST
// This eliminates ANY possibility of localhost references in compiled code
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
  };
};

// HARDCODED PRODUCTION URL - NO FALLBACKS ALLOWED
const HARDCODED_PRODUCTION_URL = 'https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api';

// Always use production URL - environment variable is secondary
const API_URL = HARDCODED_PRODUCTION_URL;

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
  console.log('Fallback URL:', 'https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api');
  console.log('Final API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
  console.log('=========================');
  return API_CONFIG.BASE_URL;
};