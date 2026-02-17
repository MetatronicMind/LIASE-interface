const cosmosService = require('../src/services/cosmosService');

describe('Cosmos Service', () => {
  beforeAll(async () => {
    await cosmosService.initializeDatabase();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (cosmosService.client) {
        await cosmosService.client.dispose();
      }
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  });

  describe('Database Initialization', () => {
    it('should initialize database and containers', () => {
      expect(cosmosService.client).toBeDefined();
      expect(cosmosService.database).toBeDefined();
      expect(cosmosService.containers).toBeDefined();
      expect(cosmosService.containers.organizations).toBeDefined();
      expect(cosmosService.containers.users).toBeDefined();
      expect(cosmosService.containers.drugs).toBeDefined();
      expect(cosmosService.containers.studies).toBeDefined();
      expect(cosmosService.containers['audit-logs']).toBeDefined();
    });
  });

  describe('CRUD Operations', () => {
    const testOrgId = 'test-org-' + Date.now();
    const testUserId = 'test-user-' + Date.now();
    const testDrugId = 'test-drug-' + Date.now();
    const testStudyId = 'test-study-' + Date.now();

    describe('Organizations', () => {
      it('should create an organization', async () => {
        const orgData = {
          id: testOrgId,
          name: 'Test Organization',
          description: 'Test organization for unit tests',
          settings: { timezone: 'UTC' },
          isActive: true,
          createdAt: new Date().toISOString()
        };

        const result = await cosmosService.createItem('organizations', orgData);
        
        expect(result).toMatchObject({
          id: testOrgId,
          name: 'Test Organization',
          isActive: true
        });
      });

      it('should get an organization by id', async () => {
        const result = await cosmosService.getItem('organizations', testOrgId);
        
        expect(result).toBeDefined();
        expect(result.id).toBe(testOrgId);
        expect(result.name).toBe('Test Organization');
      });

      it('should update an organization', async () => {
        const updates = {
          name: 'Updated Test Organization',
          description: 'Updated description'
        };

        const result = await cosmosService.updateItem('organizations', testOrgId, updates);
        
        expect(result.name).toBe('Updated Test Organization');
        expect(result.description).toBe('Updated description');
      });

      it('should list organizations', async () => {
        const result = await cosmosService.listItems('organizations');
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result.some(org => org.id === testOrgId)).toBe(true);
      });
    });

    describe('Users', () => {
      it('should create a user', async () => {
        const userData = {
          id: testUserId,
          organizationId: testOrgId,
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'researcher',
          permissions: {
            studies: ['read', 'write'],
            drugs: ['read']
          },
          isActive: true,
          createdAt: new Date().toISOString()
        };

        const result = await cosmosService.createItem('users', userData);
        
        expect(result).toMatchObject({
          id: testUserId,
          organizationId: testOrgId,
          username: 'testuser',
          email: 'test@example.com'
        });
      });

      it('should get user by email', async () => {
        const result = await cosmosService.getUserByEmail('test@example.com');
        
        expect(result).toBeDefined();
        expect(result.email).toBe('test@example.com');
        expect(result.organizationId).toBe(testOrgId);
      });

      it('should query users by organization', async () => {
        const result = await cosmosService.queryItems(
          'users',
          'SELECT * FROM c WHERE c.organizationId = @orgId',
          [{ name: '@orgId', value: testOrgId }]
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].organizationId).toBe(testOrgId);
      });
    });

    describe('Drugs', () => {
      it('should create a drug', async () => {
        const drugData = {
          id: testDrugId,
          organizationId: testOrgId,
          name: 'Test Drug',
          genericName: 'test-drug-generic',
          brandNames: ['TestBrand'],
          description: 'A test drug for unit testing',
          therapeuticClass: 'Test Class',
          mechanism: 'Test mechanism',
          indications: ['Test indication'],
          contraindications: ['Test contraindication'],
          adverseEvents: ['Test adverse event'],
          createdBy: testUserId,
          createdAt: new Date().toISOString()
        };

        const result = await cosmosService.createItem('drugs', drugData);
        
        expect(result).toMatchObject({
          id: testDrugId,
          organizationId: testOrgId,
          name: 'Test Drug',
          genericName: 'test-drug-generic'
        });
      });

      it('should search drugs by name', async () => {
        const result = await cosmosService.queryItems(
          'drugs',
          'SELECT * FROM c WHERE c.organizationId = @orgId AND CONTAINS(LOWER(c.name), LOWER(@search))',
          [
            { name: '@orgId', value: testOrgId },
            { name: '@search', value: 'test' }
          ]
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].name).toContain('Test');
      });
    });

    describe('Studies', () => {
      it('should create a study', async () => {
        const studyData = {
          id: testStudyId,
          organizationId: testOrgId,
          pmid: '12345678',
          title: 'Test Study Title',
          authors: ['John Doe', 'Jane Smith'],
          journal: 'Test Journal',
          publicationDate: '2023-01-01',
          abstract: 'This is a test study abstract.',
          drugName: 'Test Drug',
          adverseEvent: 'Test Adverse Event',
          status: 'Pending Review',
          createdBy: testUserId,
          createdAt: new Date().toISOString()
        };

        const result = await cosmosService.createItem('studies', studyData);
        
        expect(result).toMatchObject({
          id: testStudyId,
          organizationId: testOrgId,
          pmid: '12345678',
          title: 'Test Study Title',
          status: 'Pending Review'
        });
      });

      it('should query studies by drug name', async () => {
        const result = await cosmosService.queryItems(
          'studies',
          'SELECT * FROM c WHERE c.organizationId = @orgId AND c.drugName = @drugName',
          [
            { name: '@orgId', value: testOrgId },
            { name: '@drugName', value: 'Test Drug' }
          ]
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].drugName).toBe('Test Drug');
      });

      it('should update study status', async () => {
        const updates = {
          status: 'Approved',
          reviewedBy: testUserId,
          reviewedAt: new Date().toISOString(),
          reviewNotes: 'Study approved after review'
        };

        const result = await cosmosService.updateItem('studies', testStudyId, testOrgId, updates);
        
        expect(result.status).toBe('Approved');
        expect(result.reviewedBy).toBe(testUserId);
        expect(result.reviewNotes).toBe('Study approved after review');
      });

      it('should query studies by status', async () => {
        const result = await cosmosService.queryItems(
          'studies',
          'SELECT * FROM c WHERE c.organizationId = @orgId AND c.status = @status',
          [
            { name: '@orgId', value: testOrgId },
            { name: '@status', value: 'Approved' }
          ]
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].status).toBe('Approved');
      });

      it('should check for duplicate PMID', async () => {
        const result = await cosmosService.queryItems(
          'studies',
          'SELECT VALUE COUNT(1) FROM c WHERE c.organizationId = @orgId AND c.pmid = @pmid',
          [
            { name: '@orgId', value: testOrgId },
            { name: '@pmid', value: '12345678' }
          ]
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toBe(1); // Should find exactly one study with this PMID
      });
    });

    describe('Audit Logs', () => {
      it('should create audit log', async () => {
        const auditData = {
          id: 'audit-' + Date.now(),
          organizationId: testOrgId,
          userId: testUserId,
          userName: 'Test User',
          action: 'create',
          resource: 'study',
          resourceId: testStudyId,
          details: 'Created test study',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          timestamp: new Date().toISOString()
        };

        const result = await cosmosService.createItem('audit-logs', auditData);
        
        expect(result).toMatchObject({
          organizationId: testOrgId,
          action: 'create',
          resource: 'study',
          resourceId: testStudyId
        });
      });

      it('should query audit logs by user', async () => {
        const result = await cosmosService.queryItems(
          'audit-logs',
          'SELECT * FROM c WHERE c.organizationId = @orgId AND c.userId = @userId ORDER BY c.timestamp DESC',
          [
            { name: '@orgId', value: testOrgId },
            { name: '@userId', value: testUserId }
          ]
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].userId).toBe(testUserId);
      });
    });

    // Cleanup
    describe('Cleanup', () => {
      it('should delete test study', async () => {
        await cosmosService.deleteItem('studies', testStudyId, testOrgId);
        
        const result = await cosmosService.getItem('studies', testStudyId, testOrgId);
        expect(result).toBeNull();
      });

      it('should delete test drug', async () => {
        await cosmosService.deleteItem('drugs', testDrugId, testOrgId);
        
        const result = await cosmosService.getItem('drugs', testDrugId, testOrgId);
        expect(result).toBeNull();
      });

      it('should delete test user', async () => {
        await cosmosService.deleteItem('users', testUserId, testOrgId);
        
        const result = await cosmosService.getItem('users', testUserId, testOrgId);
        expect(result).toBeNull();
      });

      it('should delete test organization', async () => {
        await cosmosService.deleteItem('organizations', testOrgId);
        
        const result = await cosmosService.getItem('organizations', testOrgId);
        expect(result).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle getting non-existent item', async () => {
      const result = await cosmosService.getItem('organizations', 'non-existent-id');
      expect(result).toBeNull();
    });

    it('should handle invalid container name', async () => {
      await expect(cosmosService.createItem('invalid-container', { id: 'test' }))
        .rejects.toThrow();
    });

    it('should handle malformed query', async () => {
      await expect(cosmosService.queryItems('organizations', 'INVALID SQL'))
        .rejects.toThrow();
    });
  });
});