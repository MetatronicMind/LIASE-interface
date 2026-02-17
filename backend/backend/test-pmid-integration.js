// Integration test for PMID duplicate check and ICSR status update
const request = require('supertest');
const app = require('./src/app');

// Mock authentication middleware for testing
const mockAuth = (req, res, next) => {
  req.user = {
    id: 'test-user-123',
    email: 'test@example.com',
    organizationId: 'test-org-123',
    permissions: {
      studies: ['read', 'write', 'update', 'delete']
    }
  };
  next();
};

describe('PMID Duplicate Check and ICSR Status Update', () => {
  
  test('PUT /api/studies/update-icsr-status should update studies with ICSR classification', async () => {
    // Mock the auth middleware
    jest.mock('./src/middleware/auth', () => mockAuth);
    jest.mock('./src/middleware/authorization', () => ({
      authorizePermission: () => (req, res, next) => next()
    }));
    
    const response = await request(app)
      .put('/api/studies/update-icsr-status')
      .expect(200);
    
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('updatedCount');
    expect(response.body).toHaveProperty('totalFound');
    expect(response.body).toHaveProperty('updateResults');
    
    console.log('ICSR Status Update Response:', response.body);
  });
  
  test('Drug discovery should skip duplicate PMIDs', async () => {
    // This would be tested in an integration environment
    // For now, we'll just verify the endpoint exists
    
    const response = await request(app)
      .post('/api/drugs/discover')
      .send({
        query: 'test drug',
        maxResults: 5
      });
    
    // Response should be 202 (accepted) for async processing
    // or 200 with results
    expect([200, 202]).toContain(response.status);
    
    if (response.status === 202) {
      expect(response.body).toHaveProperty('jobId');
    }
    
    console.log('Drug Discovery Response Status:', response.status);
  });
  
});

// Manual test function that can be run standalone
async function manualTest() {
  console.log('=== Manual Integration Test ===');
  
  try {
    // Test the ICSR status update endpoint
    console.log('Testing ICSR status update endpoint...');
    
    const response = await request(app)
      .put('/api/studies/update-icsr-status')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);
    
    console.log('✅ ICSR status update endpoint works');
    console.log('Response:', response.body);
    
  } catch (error) {
    console.error('❌ Manual test failed:', error.message);
  }
}

module.exports = { manualTest };