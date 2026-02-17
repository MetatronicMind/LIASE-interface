const cosmosService = require('./src/services/cosmosService');

async function checkR3FormCompletionStatus() {
  try {
    console.log('🔍 Checking R3 Form completion status in database...\n');

    // Query all studies with ICSR tag
    const icsrQuery = 'SELECT * FROM c WHERE c.userTag = "ICSR"';
    const icsrStudies = await cosmosService.queryItems('studies', icsrQuery, []);

    console.log(`📊 Found ${icsrStudies.length} studies with ICSR tag\n`);

    if (icsrStudies.length === 0) {
      console.log('❌ No ICSR studies found. This means no studies have been tagged as ICSR yet.');
      return;
    }

    // Categorize by R3 form status
    const statusCategories = {
      not_started: [],
      in_progress: [],
      completed: []
    };

    icsrStudies.forEach(study => {
      const status = study.r3FormStatus || 'not_started';
      statusCategories[status].push(study);
    });

    console.log('📈 R3 Form Status Breakdown:');
    console.log(`  ✅ Completed: ${statusCategories.completed.length}`);
    console.log(`  🔄 In Progress: ${statusCategories.in_progress.length}`);
    console.log(`  ⏳ Not Started: ${statusCategories.not_started.length}\n`);

    // Show details of completed forms
    if (statusCategories.completed.length > 0) {
      console.log('✅ Completed R3 Forms:');
      statusCategories.completed.forEach((study, index) => {
        console.log(`  ${index + 1}. PMID: ${study.pmid} | Title: ${study.title?.substring(0, 50)}...`);
        console.log(`     🕒 Completed: ${study.r3FormCompletedAt || 'Unknown'}`);
        console.log(`     👤 By: ${study.r3FormCompletedBy || 'Unknown'}`);
        console.log(`     📝 Form Data: ${study.r3FormData ? 'Present' : 'Missing'}`);
        console.log(`     🏢 Org ID: ${study.organizationId}`);
        console.log('');
      });
    } else {
      console.log('❌ No completed R3 forms found!');
      console.log('');
      console.log('This explains why the Full Report page shows "none".');
      console.log('The medical examiner endpoint only shows studies with:');
      console.log('  - userTag = "ICSR"');
      console.log('  - r3FormStatus = "completed"');
      console.log('');
    }

    // Show in-progress forms
    if (statusCategories.in_progress.length > 0) {
      console.log('🔄 In Progress R3 Forms:');
      statusCategories.in_progress.forEach((study, index) => {
        console.log(`  ${index + 1}. PMID: ${study.pmid} | Title: ${study.title?.substring(0, 50)}...`);
        console.log(`     📝 Form Data: ${study.r3FormData ? 'Present' : 'Missing'}`);
        console.log('');
      });
    }

    // Query for the medical examiner endpoint specifically
    console.log('🔬 Testing medical examiner query directly...');
    const medicalExaminerQuery = 'SELECT * FROM c WHERE c.userTag = "ICSR" AND c.r3FormStatus = "completed"';
    const medicalExaminerResults = await cosmosService.queryItems('studies', medicalExaminerQuery, []);
    
    console.log(`📊 Medical examiner query returned: ${medicalExaminerResults.length} studies`);
    
    if (medicalExaminerResults.length === 0) {
      console.log('');
      console.log('🔍 DIAGNOSIS:');
      console.log('The Full Report page shows "none" because:');
      console.log('  1. No studies have BOTH userTag="ICSR" AND r3FormStatus="completed"');
      console.log('  2. Either the R3 form was not properly completed, or');
      console.log('  3. The completion process has a bug');
      console.log('');
      console.log('💡 SOLUTIONS:');
      console.log('  1. Complete the R3 form properly by clicking "Complete R3 Form" button');
      console.log('  2. Check if there are any JavaScript errors during completion');
      console.log('  3. Verify the study is tagged as ICSR before completing the form');
    }

    // Check recent activity
    console.log('\n📅 Recent study activity (last 10 studies):');
    const recentQuery = 'SELECT TOP 10 * FROM c ORDER BY c._ts DESC';
    const recentStudies = await cosmosService.queryItems('studies', recentQuery, []);
    
    recentStudies.forEach((study, index) => {
      console.log(`  ${index + 1}. PMID: ${study.pmid} | Tag: ${study.userTag || 'None'} | R3: ${study.r3FormStatus || 'not_started'}`);
    });

  } catch (error) {
    console.error('❌ Error checking R3 form status:', error);
  }
}

// Run the diagnostic
checkR3FormCompletionStatus();