// Test setup utility to ensure proper SSL bypass for Cosmos DB emulator
const https = require('https');

// Setup test environment for Cosmos DB emulator
function setupTestEnvironment() {
  // Force SSL bypass
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  process.env.NODE_ENV = 'development';
  
  // Set test database name
  process.env.COSMOS_DB_DATABASE_ID = 'liase-saas-test';
  
  // Ensure emulator defaults if not set
  if (!process.env.COSMOS_DB_ENDPOINT) {
    process.env.COSMOS_DB_ENDPOINT = 'https://localhost:8081';
  }
  if (!process.env.COSMOS_DB_KEY) {
    process.env.COSMOS_DB_KEY = 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';
  }
  
  // Create a custom HTTPS agent that accepts self-signed certificates
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    requestCert: false,
    agent: false
  });
  
  // Override the default HTTPS global agent for tests
  https.globalAgent = httpsAgent;
  
  return httpsAgent;
}

module.exports = { setupTestEnvironment };