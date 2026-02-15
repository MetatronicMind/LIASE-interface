// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Setup test environment with SSL bypass
const { setupTestEnvironment } = require('./testSetup');
setupTestEnvironment();

const request = require('supertest');
const app = require('../src/app');
const cosmosService = require('../src/services/cosmosService');
const pubmedService = require('../src/services/pubmedService');

// Mock PubMed service
jest.mock('../src/services/pubmedService');
const mockedPubmedService = pubmedService;

describe('Study Management Integration Tests', () => {
  let authToken;
  let organizationId;
  let userId;
  let drugId;
  let studyId;

  beforeAll(async () => {
    await cosmosService.initializeDatabase();
    
    // Create test organization and user with unique names to avoid conflicts
    const timestamp = Date.now();
    const orgResponse = await request(app)
      .post('/api/admin/create-organization')
      .send({
        name: `Test Integration Org ${timestamp}`,
        description: 'Organization for integration tests',
        adminUser: {
          username: `integrationadmin${timestamp}`,
          email: `integration${timestamp}@test.com`,
          password: 'TestPass123!',
          firstName: 'Integration',
          lastName: 'Admin'
        }
      });

    expect(orgResponse.status).toBe(201);
    authToken = orgResponse.body.token;
    organizationId = orgResponse.body.organization.id;
    userId = orgResponse.body.user.id;

    // Create a test drug
    const drugResponse = await request(app)
      .post('/api/drugs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Integration Test Drug',
        genericName: 'integration-test-drug',
        description: 'Drug for integration testing',
        therapeuticClass: 'Test Class',
        indications: ['Test indication']
      });

    expect(drugResponse.status).toBe(201);
    drugId = drugResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup
    try {
      if (studyId) {
        await cosmosService.deleteItem('studies', studyId, organizationId);
      }
      if (drugId) {
        await cosmosService.deleteItem('drugs', drugId, organizationId);
      }
      if (userId) {
        await cosmosService.deleteItem('users', userId, organizationId);
      }
      if (organizationId) {
        await cosmosService.deleteItem('organizations', organizationId);
      }
      if (cosmosService.client) {
        await cosmosService.client.dispose();
      }
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  });

  describe('PubMed Integration and Study Creation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should ingest studies from PubMed by query', async () => {
      // Mock PubMed service responses
      mockedPubmedService.search.mockResolvedValue(['12345678', '87654321']);
      mockedPubmedService.fetchDetails.mockResolvedValue([
        {
          pmid: '12345678',
          title: 'Test Study 1: Adverse Events of Test Drug',
          authors: ['John Doe', 'Jane Smith'],
          journal: 'Test Journal',
          publicationDate: '2023-01-01',
          abstract: 'This study examines adverse events related to the test drug.'
        },
        {
          pmid: '87654321',
          title: 'Test Study 2: Safety Profile Analysis',
          authors: ['Alice Johnson', 'Bob Wilson'],
          journal: 'Safety Journal',
          publicationDate: '2023-02-01',
          abstract: 'A comprehensive safety profile analysis of the test medication.'
        }
      ]);

      const response = await request(app)
        .post('/api/studies/ingest/pubmed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'test drug adverse events',
          maxResults: 10,
          adverseEvent: 'General Adverse Events'
        });

      expect(response.status).toBe(201);
      expect(response.body.createdCount).toBe(2);
      expect(response.body.skippedCount).toBe(0);
      expect(response.body.created).toHaveLength(2);

      // Verify PubMed service was called correctly
      expect(mockedPubmedService.search).toHaveBeenCalledWith(
        'test drug adverse events',
        { maxResults: 10 }
      );
      expect(mockedPubmedService.fetchDetails).toHaveBeenCalledWith(['12345678', '87654321']);

      // Store first study ID for later tests
      studyId = response.body.created[0].id;
    });

    it('should ingest studies from PubMed by drugId', async () => {
      // Mock PubMed service responses
      mockedPubmedService.search.mockResolvedValue(['99999999']);
      mockedPubmedService.fetchDetails.mockResolvedValue([
        {
          pmid: '99999999',
          title: 'Drug-specific Study',
          authors: ['Dr. Test'],
          journal: 'Drug Journal',
          publicationDate: '2023-03-01',
          abstract: 'A study specific to the test drug.'
        }
      ]);

      const response = await request(app)
        .post('/api/studies/ingest/pubmed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          drugId: drugId,
          maxResults: 5,
          adverseEvent: 'Specific Adverse Event'
        });

      expect(response.status).toBe(201);
      expect(response.body.createdCount).toBe(1);

      // Verify the search used the drug name
      expect(mockedPubmedService.search).toHaveBeenCalledWith(
        'Integration Test Drug adverse events',
        { maxResults: 5 }
      );
    });

    it('should skip duplicate PMIDs', async () => {
      // Mock PubMed service to return existing PMID
      mockedPubmedService.search.mockResolvedValue(['12345678']); // Same as first test
      mockedPubmedService.fetchDetails.mockResolvedValue([
        {
          pmid: '12345678',
          title: 'Duplicate Study',
          authors: ['Test Author'],
          journal: 'Test Journal',
          publicationDate: '2023-01-01',
          abstract: 'This should be skipped as duplicate.'
        }
      ]);

      const response = await request(app)
        .post('/api/studies/ingest/pubmed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'duplicate test',
          maxResults: 5
        });

      expect(response.status).toBe(201);
      expect(response.body.createdCount).toBe(0);
      expect(response.body.skippedCount).toBe(1);
    });

    it('should handle PubMed service errors', async () => {
      mockedPubmedService.search.mockRejectedValue(new Error('PubMed API Error'));

      const response = await request(app)
        .post('/api/studies/ingest/pubmed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'error test',
          maxResults: 5
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to ingest from PubMed');
    });

    it('should validate ingestion request', async () => {
      const response = await request(app)
        .post('/api/studies/ingest/pubmed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          maxResults: 300 // Over limit
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Study CRUD Operations', () => {
    it('should list studies', async () => {
      const response = await request(app)
        .get('/api/studies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.studies)).toBe(true);
      expect(response.body.studies.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should get study by id', async () => {
      const response = await request(app)
        .get(`/api/studies/${studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(studyId);
      expect(response.body.pmid).toBe('12345678');
      expect(response.body.title).toContain('Test Study 1');
    });

    it('should update study', async () => {
      const updates = {
        status: 'Under Review',
        reviewNotes: 'Study is now under review',
        tags: ['important', 'test']
      };

      const response = await request(app)
        .put(`/api/studies/${studyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Under Review');
      expect(response.body.reviewNotes).toBe('Study is now under review');
      expect(response.body.tags).toEqual(['important', 'test']);
    });

    it('should search studies', async () => {
      const response = await request(app)
        .get('/api/studies')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          search: 'adverse events',
          status: 'Under Review'
        });

      expect(response.status).toBe(200);
      expect(response.body.studies.length).toBeGreaterThan(0);
      expect(response.body.studies[0].status).toBe('Under Review');
    });

    it('should filter studies by drug name', async () => {
      const response = await request(app)
        .get('/api/studies')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          drugName: 'Integration Test Drug'
        });

      expect(response.status).toBe(200);
      expect(response.body.studies.length).toBeGreaterThan(0);
      expect(response.body.studies[0].drugName).toBe('Integration Test Drug');
    });

    it('should sort studies', async () => {
      const response = await request(app)
        .get('/api/studies')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          sortBy: 'publicationDate',
          sortOrder: 'desc'
        });

      expect(response.status).toBe(200);
      expect(response.body.studies.length).toBeGreaterThan(0);
      
      // Verify sorting
      if (response.body.studies.length > 1) {
        const firstDate = new Date(response.body.studies[0].publicationDate);
        const secondDate = new Date(response.body.studies[1].publicationDate);
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
      }
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/studies')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.studies.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    it('should delete study', async () => {
      const response = await request(app)
        .delete(`/api/studies/${studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/studies/${studyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
      
      // Clear studyId so cleanup doesn't try to delete it again
      studyId = null;
    });
  });

  describe('Authorization and Error Handling', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/studies');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should handle invalid study ID', async () => {
      const response = await request(app)
        .get('/api/studies/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Study not found');
    });

    it('should handle invalid drug ID in ingestion', async () => {
      const response = await request(app)
        .post('/api/studies/ingest/pubmed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          drugId: 'non-existent-drug-id',
          maxResults: 5
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Drug not found');
    });

    it('should validate study updates', async () => {
      // First create a study to update
      const createResponse = await request(app)
        .post('/api/studies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pmid: '99999998',
          title: 'Test Study for Update Validation',
          authors: ['Test Author'],
          journal: 'Test Journal',
          publicationDate: '2023-01-01',
          abstract: 'Test abstract',
          adverseEvent: 'Test Event',
          status: 'Pending Review'
        });

      expect(createResponse.status).toBe(201);
      const testStudyId = createResponse.body.id;

      // Try invalid update
      const updateResponse = await request(app)
        .put(`/api/studies/${testStudyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'Invalid Status' // Invalid status
        });

      expect(updateResponse.status).toBe(400);

      // Cleanup
      await request(app)
        .delete(`/api/studies/${testStudyId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should handle missing required fields in study creation', async () => {
      const response = await request(app)
        .post('/api/studies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pmid: '99999997'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});