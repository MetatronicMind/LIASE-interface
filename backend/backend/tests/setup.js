// Test setup file for Jest
require('dotenv').config({ path: '.env.test' });

// Setup test environment with SSL bypass
const { setupTestEnvironment } = require('./testSetup');
setupTestEnvironment();
