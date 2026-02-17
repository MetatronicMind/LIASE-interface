/**
 * Test PDF Generation for Archival Process
 * This script tests the fixed PDF generation functionality
 */

require('dotenv').config();
const reportGeneratorService = require('./src/services/reportGeneratorService');
const cosmosService = require('./src/services/cosmosService');

async function testPDFGeneration() {
  console.log('\n🧪 Testing PDF Generation Fix\n');
  console.log('=' .repeat(60));

  try {
    // 1. Get a sample study from the database
    console.log('\n1️⃣ Fetching a sample study...');
    
    const query = `
      SELECT TOP 1 * FROM c 
      WHERE c.type_doc IS NULL OR NOT IS_DEFINED(c.type_doc)
      ORDER BY c.createdAt DESC
    `;
    
    const studies = await cosmosService.queryItems('studies', query, []);
    
    if (studies.length === 0) {
      console.log('❌ No studies found in database');
      console.log('\n💡 Creating a mock study for testing...');
      
      // Create a mock study for testing
      const mockStudy = {
        id: 'test_study_pdf_' + Date.now(),
        organizationId: 'test_org',
        title: 'Test Study for PDF Generation',
        status: 'Completed',
        pmid: '12345678',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test_user',
        description: 'This is a test study to verify PDF generation functionality',
        abstract: 'This abstract contains important information about the study that should appear in the PDF report.',
        adverseEvent: 'Headache, Nausea',
        drugEffect: 'Moderate adverse reaction',
        qaApprovalStatus: 'approved',
        qaApprovedBy: 'qa_user',
        qaApprovedAt: new Date().toISOString(),
        r3FormStatus: 'completed',
        r3FormCompletedBy: 'r3_user',
        r3FormCompletedAt: new Date().toISOString(),
        qcR3Status: 'approved',
        qcR3ApprovedBy: 'qc_user',
        qcR3ApprovedAt: new Date().toISOString(),
        medicalReviewStatus: 'completed',
        medicalReviewedBy: 'medical_user',
        medicalReviewedAt: new Date().toISOString(),
        userTag: 'ICSR',
        icsrClassification: 'Confirmed ICSR',
        serious: true,
        listedness: 'Listed',
        authors: ['Dr. John Doe', 'Dr. Jane Smith'],
        journal: 'Journal of Medical Research',
        doi: '10.1234/jmr.2024.001',
        drugs: []
      };
      
      console.log(`✅ Created mock study: ${mockStudy.id}`);
      study = mockStudy;
    } else {
      study = studies[0];
      console.log(`✅ Found study: ${study.title}`);
      console.log(`   ID: ${study.id}`);
      console.log(`   Status: ${study.status}`);
    }

    // 2. Test PDF generation with default config
    console.log('\n2️⃣ Generating PDF report...');
    
    const config = {
      fileGeneration: {
        generatePDF: true,
        includeAuditTrail: true,
        pdfSettings: {
          includeWatermark: true,
          watermarkText: 'TEST ARCHIVAL',
          orientation: 'portrait',
          pageSize: 'A4'
        }
      }
    };

    const result = await reportGeneratorService.generatePDF(study, config);

    // 3. Check results
    console.log('\n3️⃣ PDF Generation Results:');
    console.log('   Success:', result.success ? '✅ YES' : '❌ NO');
    
    if (result.success) {
      console.log(`   File Name: ${result.fileName}`);
      console.log(`   File Path: ${result.filePath}`);
      console.log(`   File Size: ${(result.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   Duration: ${result.duration}ms`);
      
      // 4. Verify the PDF file exists and is valid
      console.log('\n4️⃣ Verifying PDF file...');
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(result.filePath);
      
      // Check if it's a valid PDF (starts with %PDF)
      const pdfHeader = fileBuffer.toString('utf8', 0, 5);
      if (pdfHeader === '%PDF-') {
        console.log('   ✅ Valid PDF header detected');
        console.log(`   ✅ PDF file is ${fileBuffer.length} bytes`);
        console.log(`   📄 PDF saved at: ${result.filePath}`);
        console.log('\n   🎉 PDF generation is working correctly!');
        console.log('   💡 Try opening the PDF file to verify it renders properly.');
      } else {
        console.log(`   ❌ Invalid PDF header: ${pdfHeader}`);
        console.log('   ⚠️ The file may be corrupted');
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PDF Generation Test Complete\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connections
    await cosmosService.close();
    
    // Close browser if still open
    await reportGeneratorService.closeBrowser();
    
    console.log('\n🔒 Cleanup complete');
  }
}

// Run the test
testPDFGeneration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
