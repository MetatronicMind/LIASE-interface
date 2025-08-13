// Set payload limit in bytes (adjust as needed)
export const payloadSizeLimit = '1mb'; // 1 MB

// Configure rate limiting options
export const requestLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10000000, // Limit to 100 requests per window
  message: 'Too many requests from this IP, please try again later', // Customize message for blocked requests
};
