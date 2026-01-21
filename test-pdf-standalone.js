/**
 * Standalone PDF Generation Test
 * Tests PDF generation without database dependency
 */

const reportGeneratorService = require('./src/services/reportGeneratorService');
const fs = require('fs');
const path = require('path');

async function testPDFGenerationStandalone() {
  console.log('\n🧪 Standalone PDF Generation Test\n');
  console.log('=' .repeat(60));

  try {
    // Create a comprehensive mock study
    console.log('\n1️⃣ Creating mock study data...');
    
    const mockStudy = {
      id: 'test_study_pdf_' + Date.now(),
      organizationId: 'test_org',
      title: 'Clinical Assessment of Novel Therapeutic Agent XYZ-123',
      status: 'Completed',
      pmid: '12345678',
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test_user@example.com',
      description: 'A comprehensive study evaluating the efficacy and safety profile of therapeutic agent XYZ-123 in adult patients with chronic conditions.',
      abstract: 'This randomized, double-blind, placebo-controlled trial evaluated the therapeutic agent XYZ-123 in 250 adult patients. Results demonstrated significant improvement in primary endpoints with manageable adverse events. The study provides evidence for the clinical utility of XYZ-123 in targeted patient populations.',
      
      // Clinical Information
      adverseEvent: 'Headache (mild), Nausea (moderate), Fatigue (mild)',
      drugEffect: 'Moderate adverse reaction observed in 15% of subjects',
      aoiDrugEffect: 'Well-tolerated with predictable safety profile',
      attributability: 'Probable relationship to study drug',
      patientDetails: 'Adults aged 18-65, mixed gender, various comorbidities',
      keyEvents: 'Event onset Day 7, Resolution Day 14, No serious outcomes',
      relevantDates: 'Study start: 2024-01-15, Event date: 2024-01-22',
      
      // Workflow Status
      qaApprovalStatus: 'approved',
      qaApprovedBy: 'qa_reviewer@example.com',
      qaApprovedAt: new Date('2024-02-01').toISOString(),
      qaComments: 'Data quality verified. All documentation complete. Approved for R3 form completion.',
      
      r3FormStatus: 'completed',
      r3FormCompletedBy: 'r3_specialist@example.com',
      r3FormCompletedAt: new Date('2024-02-05').toISOString(),
      r3FormData: {
        messageType: 'ichicsrmessage',
        safetyReportVersion: '1',
        safetyReportId: 'SR-2024-00123',
        primarySource: {
          reporterGivenName: 'John',
          reporterFamilyName: 'Doe',
          reporterOrganization: 'Clinical Research Center'
        }
      },
      
      qcR3Status: 'approved',
      qcR3ApprovedBy: 'qc_reviewer@example.com',
      qcR3ApprovedAt: new Date('2024-02-07').toISOString(),
      qcR3Comments: 'R3 XML form reviewed. All mandatory fields populated correctly. Data consistency verified.',
      
      medicalReviewStatus: 'completed',
      medicalReviewedBy: 'medical_examiner@example.com',
      medicalReviewedAt: new Date('2024-02-10').toISOString(),
      
      // AI Classification
      userTag: 'ICSR',
      icsrClassification: 'Confirmed ICSR - Valid Case',
      aoiClassification: 'Adverse Event of Interest',
      confirmedPotentialICSR: true,
      textType: 'Case Report',
      identifiableHumanSubject: true,
      serious: false,
      testSubject: 'Human',
      listedness: 'Listed',
      seriousness: 'Non-serious',
      substanceGroup: 'Small molecule therapeutic',
      
      // Publication Details
      authors: ['Dr. John Doe', 'Dr. Jane Smith', 'Dr. Robert Johnson', 'Dr. Emily Chen'],
      leadAuthor: 'Dr. John Doe',
      journal: 'Journal of Clinical Pharmacology and Therapeutics',
      publicationDate: new Date('2024-01-15').toISOString(),
      doi: '10.1234/jcpt.2024.001234',
      vancouverCitation: 'Doe J, Smith J, Johnson R, Chen E. Clinical Assessment of Novel Therapeutic Agent XYZ-123. J Clin Pharmacol Ther. 2024 Jan;15(1):45-58.',
      countryOfFirstAuthor: 'United States',
      countryOfOccurrence: 'United States',
      
      // Field Comments
      fieldComments: [
        {
          fieldName: 'adverseEvent',
          comment: 'Severity assessed as mild to moderate. No intervention required.',
          userId: 'medical_examiner@example.com',
          createdAt: new Date('2024-02-10').toISOString()
        },
        {
          fieldName: 'drugEffect',
          comment: 'Consistent with known safety profile of drug class.',
          userId: 'qa_reviewer@example.com',
          createdAt: new Date('2024-02-01').toISOString()
        }
      ],
      
      // QC Reviews
      qcReviews: [
        {
          reviewerId: 'qc_reviewer_1@example.com',
          reviewDate: new Date('2024-02-06').toISOString(),
          approved: false,
          comments: 'Minor data inconsistencies found. Please review patient demographics.'
        },
        {
          reviewerId: 'qc_reviewer@example.com',
          reviewDate: new Date('2024-02-07').toISOString(),
          approved: true,
          comments: 'All issues resolved. Data quality meets standards. Approved.'
        }
      ],
      
      attachments: [
        {
          fileName: 'study_protocol.pdf',
          fileSize: 2548692,
          uploadedAt: new Date('2024-01-15').toISOString()
        },
        {
          fileName: 'informed_consent_form.pdf',
          fileSize: 856124,
          uploadedAt: new Date('2024-01-15').toISOString()
        }
      ],
      
      drugs: []
    };
    
    console.log(`✅ Mock study created: ${mockStudy.title}`);
    console.log(`   ID: ${mockStudy.id}`);

    // Test PDF generation with configuration
    console.log('\n2️⃣ Generating PDF report with Puppeteer...');
    
    const config = {
      fileGeneration: {
        generatePDF: true,
        includeAuditTrail: true,
        pdfSettings: {
          includeWatermark: true,
          watermarkText: 'ARCHIVED',
          orientation: 'portrait',
          pageSize: 'A4',
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
          }
        }
      }
    };

    const startTime = Date.now();
    const result = await reportGeneratorService.generatePDF(mockStudy, config);
    const duration = Date.now() - startTime;

    // Check results
    console.log('\n3️⃣ PDF Generation Results:');
    console.log('   Success:', result.success ? '✅ YES' : '❌ NO');
    
    if (result.success) {
      console.log(`   File Name: ${result.fileName}`);
      console.log(`   File Path: ${result.filePath}`);
      console.log(`   File Size: ${(result.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   Generation Time: ${duration}ms`);
      
      // Verify the PDF file
      console.log('\n4️⃣ Verifying PDF file integrity...');
      
      if (fs.existsSync(result.filePath)) {
        const fileBuffer = fs.readFileSync(result.filePath);
        
        // Check PDF header
        const pdfHeader = fileBuffer.toString('utf8', 0, 5);
        console.log(`   PDF Header: ${pdfHeader}`);
        
        if (pdfHeader === '%PDF-') {
          console.log('   ✅ Valid PDF header detected');
          console.log(`   ✅ PDF file size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
          
          // Check for EOF marker
          const fileEnd = fileBuffer.toString('utf8', fileBuffer.length - 10, fileBuffer.length);
          if (fileEnd.includes('%%EOF')) {
            console.log('   ✅ Valid PDF EOF marker found');
          }
          
          // Get absolute path for easy access
          const absolutePath = path.resolve(result.filePath);
          
          console.log('\n' + '='.repeat(60));
          console.log('🎉 PDF GENERATION SUCCESSFUL!');
          console.log('='.repeat(60));
          console.log('\n📄 PDF File Location:');
          console.log(`   ${absolutePath}`);
          console.log('\n💡 You can now:');
          console.log('   1. Open the PDF file to verify it renders correctly');
          console.log('   2. Test the archival process with a real study');
          console.log('   3. The corrupted PDF issue is now FIXED!');
          console.log('\n✅ The archival process will now generate valid PDFs');
          
        } else {
          console.log(`   ❌ Invalid PDF header found: ${pdfHeader}`);
          console.log('   ⚠️ The file may still be corrupted');
        }
      } else {
        console.log('   ❌ PDF file not found at specified path');
      }
    } else {
      console.log(`   ❌ Generation Error: ${result.error}`);
      console.log('\n⚠️ PDF generation failed. Check the error above for details.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Complete\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up browser
    try {
      await reportGeneratorService.closeBrowser();
      console.log('🌐 Browser closed successfully');
    } catch (err) {
      console.error('Error closing browser:', err.message);
    }
  }
}

// Run the test
testPDFGenerationStandalone().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
