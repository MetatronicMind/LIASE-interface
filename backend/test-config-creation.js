// Test the search configuration creation
const DrugSearchConfig = require('./src/models/DrugSearchConfig');

console.log('=== Testing DrugSearchConfig Creation ===');

// Test data similar to what frontend sends
const testData = {
  name: 'Test Config',
  query: 'aspirin',
  sponsor: 'TestSponsor',
  frequency: 'custom',
  maxResults: 1000,
  includeAdverseEvents: true,
  includeSafety: true,
  sendToExternalApi: true,
  dateFrom: null,
  dateTo: null,
  organizationId: 'test-org-id',
  userId: 'test-user-id',
  createdBy: 'test-user-id'
};

console.log('Test data:', JSON.stringify(testData, null, 2));

try {
  const config = new DrugSearchConfig(testData);
  console.log('\n✓ DrugSearchConfig created successfully');
  
  const validationErrors = config.validate();
  if (validationErrors.length > 0) {
    console.log('\n❌ Validation errors:', validationErrors);
  } else {
    console.log('\n✓ Validation passed');
  }
  
  console.log('\nConfig object:', JSON.stringify(config.toObject(), null, 2));
  
} catch (error) {
  console.error('\n❌ Error creating config:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n=== Test Complete ===');