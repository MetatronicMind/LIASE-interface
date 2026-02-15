// Migration script to add AI inference data to existing studies
require('dotenv').config({ path: '.env.local' });

const cosmosService = require('./src/services/cosmosService');
const externalApiService = require('./src/services/externalApiService');
const Study = require('./src/models/Study');

async function migrateStudiesWithAI() {
  try {
    console.log('🔄 Starting AI inference migration for existing studies...');
    
    // Initialize the database
    await cosmosService.initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Get all studies that don't have AI inference data
    const query = 'SELECT * FROM c WHERE c.type = "study" AND (NOT IS_DEFINED(c.aiInferenceData) OR c.aiInferenceData = null)';
    const studies = await cosmosService.queryItems('studies', query, []);
    
    console.log(`📊 Found ${studies.length} studies without AI inference data`);
    
    if (studies.length === 0) {
      console.log('✅ All studies already have AI inference data. Migration complete!');
      return;
    }
    
    let processed = 0;
    let updated = 0;
    let errors = 0;
    
    for (const studyData of studies) {
      try {
        processed++;
        console.log(`\n🔍 Processing study ${processed}/${studies.length}: PMID ${studyData.pmid}`);
        
        // Get AI inference data for this study
        const aiResponse = await externalApiService.sendDrugData([{
          pmid: studyData.pmid,
          drugName: studyData.drugName,
          title: studyData.title
        }], {
          sponsor: studyData.sponsor || 'Unknown',
          query: studyData.drugName
        });

        if (aiResponse.success && aiResponse.results.length > 0) {
          const aiInferenceData = aiResponse.results[0].aiInference;
          console.log(`✅ AI inference data received for PMID: ${studyData.pmid}`);
          
          // Create Study instance with existing data
          const study = new Study(studyData);
          
          // Update with AI inference data
          study.aiInferenceData = aiInferenceData; // Store raw AI response
          study.doi = aiInferenceData.DOI;
          study.specialCase = aiInferenceData.special_case;
          study.countryOfFirstAuthor = aiInferenceData.Country_of_first_author;
          study.countryOfOccurrence = aiInferenceData.Country_of_occurrence;
          study.patientDetails = aiInferenceData.Patient_details;
          study.keyEvents = Array.isArray(aiInferenceData.Key_events) ? aiInferenceData.Key_events : 
                           (aiInferenceData.Key_events ? [aiInferenceData.Key_events] : []);
          study.relevantDates = aiInferenceData.Relevant_dates;
          study.administeredDrugs = Array.isArray(aiInferenceData.Administered_drugs) ? aiInferenceData.Administered_drugs : 
                                   (aiInferenceData.Administered_drugs ? [aiInferenceData.Administered_drugs] : []);
          study.attributability = aiInferenceData.Attributability;
          study.drugEffect = aiInferenceData.Drug_effect;
          study.summary = aiInferenceData.Summary;
          study.identifiableHumanSubject = aiInferenceData.Identifiable_human_subject === 'Yes' || aiInferenceData.Identifiable_human_subject === true;
          study.textType = aiInferenceData.Text_type;
          study.authorPerspective = aiInferenceData.Author_perspective;
          study.confirmedPotentialICSR = aiInferenceData.Confirmed_potential_ICSR === 'Yes' || aiInferenceData.Confirmed_potential_ICSR === true;
          study.icsrClassification = aiInferenceData.ICSR_classification;
          study.substanceGroup = aiInferenceData.Substance_group;
          study.vancouverCitation = aiInferenceData.Vancouver_citation;
          study.leadAuthor = aiInferenceData.Lead_author;
          study.serious = aiInferenceData.Serious === 'Yes' || aiInferenceData.Serious === true;
          study.testSubject = aiInferenceData.Test_subject;
          study.aoiDrugEffect = aiInferenceData.AOI_drug_effect;
          study.approvedIndication = aiInferenceData.Approved_indication;
          study.aoiClassification = aiInferenceData.AOI_classification;
          study.justification = aiInferenceData.Justification;
          study.clientName = aiInferenceData.Client_name;
          study.sponsor = aiInferenceData.Sponsor || study.sponsor;
          
          // Override adverseEvent if AI provides better data
          if (aiInferenceData.Adverse_event && aiInferenceData.Adverse_event !== 'Not specified') {
            study.adverseEvent = aiInferenceData.Adverse_event;
          }
          
          // Update timestamp
          study.updatedAt = new Date().toISOString();
          
          // Save updated study
          await cosmosService.updateItem('studies', study.id, study.toJSON());
          updated++;
          console.log(`✅ Updated study PMID ${studyData.pmid} with AI inference data`);
          
        } else {
          console.log(`⚠️  No AI inference data received for PMID: ${studyData.pmid}`);
        }
        
        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errors++;
        console.error(`❌ Error processing PMID ${studyData.pmid}:`, error.message);
        continue;
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`📈 Statistics:`);
    console.log(`   Total studies processed: ${processed}`);
    console.log(`   Successfully updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Success rate: ${((updated / processed) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateStudiesWithAI();