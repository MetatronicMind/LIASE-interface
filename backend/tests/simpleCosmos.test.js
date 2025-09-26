const cosmosService = require('../src/services/cosmosService');

describe('Simple Cosmos Test', () => {
  const testOrgId = 'simple-test-org-' + Date.now();

  beforeAll(async () => {
    await cosmosService.initializeDatabase();
  });

  it('should perform basic CRUD operations', async () => {
    try {
      // Create
      const orgData = {
        id: testOrgId,
        name: 'Simple Test Organization',
        description: 'Simple test org',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      console.log('Creating organization with ID:', testOrgId);
      const created = await cosmosService.createItem('organizations', orgData);
      console.log('Created organization:', created ? created.id : 'null');
      expect(created).toBeDefined();
      expect(created.id).toBe(testOrgId);

    // Read
    const retrieved = await cosmosService.getItem('organizations', testOrgId);
    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(testOrgId);
    expect(retrieved.name).toBe('Simple Test Organization');

    // Update
    const updates = { name: 'Updated Simple Test Organization' };
    const updated = await cosmosService.updateItem('organizations', testOrgId, updates);
    expect(updated).toBeDefined();
    expect(updated.name).toBe('Updated Simple Test Organization');

    // List
    const list = await cosmosService.listItems('organizations');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);

    // Delete
    const deleted = await cosmosService.deleteItem('organizations', testOrgId);
    expect(deleted).toBe(true);

      // Verify deleted
      const verifyDeleted = await cosmosService.getItem('organizations', testOrgId);
      expect(verifyDeleted).toBeNull();
    } catch (error) {
      console.error('Test error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  });
});