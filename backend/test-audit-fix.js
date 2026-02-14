// const cosmosService = require('./services/cosmosService');
const Study = require('./src/models/Study');
// const { auditAction } = require('./middleware/audit');
const { v4: uuidv4 } = require('uuid');

async function testAuditLog() {
  try {
    console.log('Starting test...');
    
    // 1. Create a dummy study
    const studyId = uuidv4();
    const orgId = 'test-org';
    const userId = 'test-user';
    
    const studyData = {
      id: studyId,
      organizationId: orgId,
      pmid: '12345678',
      title: 'Test Study',
      status: 'Pending Review',
      fullTextAvailability: 'No',
      fullTextSource: null
    };
    
    // Simulate saving to DB (we won't actually save to DB to avoid pollution, 
    // but we will simulate the update logic)
    
    console.log('Initial Study:', studyData);
    
    // 2. Simulate Update Request
    const reqBody = {
      userTag: 'ICSR',
      fullTextAvailability: 'Yes',
      fullTextSource: 'This is a test source comment'
    };
    
    // 3. Construct Before/After values as in studyRoutes.js
    const beforeValue = { 
      userTag: studyData.userTag,
      status: studyData.status,
      justification: studyData.justification,
      listedness: studyData.listedness,
      seriousness: studyData.seriousness,
      fullTextAvailability: studyData.fullTextAvailability,
      fullTextSource: studyData.fullTextSource || null
    };
    
    const study = new Study(studyData);
    
    // Update
    if (reqBody.fullTextAvailability !== undefined) study.fullTextAvailability = reqBody.fullTextAvailability;
    if (reqBody.fullTextSource !== undefined) study.fullTextSource = reqBody.fullTextSource;
    study.userTag = reqBody.userTag;
    
    const afterValue = { 
      userTag: study.userTag, 
      status: study.status,
      justification: study.justification,
      listedness: study.listedness,
      seriousness: study.seriousness,
      fullTextAvailability: study.fullTextAvailability,
      fullTextSource: study.fullTextSource || null
    };
    
    console.log('Before Value:', beforeValue);
    console.log('After Value:', afterValue);
    
    // 4. Simulate Audit Action (extractChanges)
    const { extractChanges } = require('./src/utils/auditHelpers');
    const changes = extractChanges(beforeValue, afterValue);
    
    console.log('Changes Detected:', changes);
    
    const sourceChange = changes.find(c => c.field === 'fullTextSource');
    if (sourceChange) {
      console.log('SUCCESS: fullTextSource change detected!');
      console.log(sourceChange);
    } else {
      console.log('FAILURE: fullTextSource change NOT detected.');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAuditLog();
