
require('dotenv').config({ path: '.env.local' });
const cosmosService = require('./services/cosmosService');

async function debugStudies() {
  try {
    console.log('Fetching pending studies...');
    
    // Fetch a few pending studies
    const query = 'SELECT TOP 20 * FROM c WHERE c.status = "Pending Review" OR c.status = "Under Triage Review"';
    const studies = await cosmosService.queryItems('studies', query, []);
    
    console.log(`Found ${studies.length} pending studies.`);
    
    // Define the classification logic (copied from studyRoutes.js)
    const getStudyType = (study) => {
        // Check multiple fields for classification to ensure we catch all data variations
        const icsr = study.icsrClassification || study.ICSR_classification || study.aiInferenceData?.ICSR_classification || '';
        const aoi = study.aoiClassification || study.AOI_classification || study.aiInferenceData?.AOI_classification || '';
        const userTag = study.userTag || '';

        console.log(`   - ID: ${study.id}`);
        console.log(`   - icsrClassification: ${study.icsrClassification}`);
        console.log(`   - ICSR_classification: ${study.ICSR_classification}`);
        console.log(`   - aiInferenceData.ICSR: ${study.aiInferenceData?.ICSR_classification}`);
        console.log(`   - aoiClassification: ${study.aoiClassification}`);
        console.log(`   - AOI_classification: ${study.AOI_classification}`);
        console.log(`   - aiInferenceData.AOI: ${study.aiInferenceData?.AOI_classification}`);
        console.log(`   - userTag: ${study.userTag}`);

        const isProbableICSR = icsr && icsr.includes('Probable');
        const isProbableAOI = aoi && aoi.includes('Probable');
        
        const isPotentialICSR = icsr && icsr.includes('Potential');
        const isPotentialAOI = aoi && aoi.includes('Potential');

        if (isProbableICSR && isProbableAOI) return 'Probable ICSR/AOI';
        if (isProbableICSR) return 'Probable ICSR';
        if (isProbableAOI) return 'Probable AOI';
        
        if (isPotentialICSR && isPotentialAOI) return 'Potential ICSR/AOI';
        if (isPotentialICSR) return 'Potential ICSR';
        if (isPotentialAOI) return 'Potential AOI';

        if (userTag === 'No Case') return 'No Case';

        return 'Manual Review';
    };

    console.log('\n--- Analyzing Classifications ---');
    studies.forEach((study, index) => {
        console.log(`\nStudy #${index + 1}:`);
        const type = getStudyType(study);
        console.log(`   => CALCULATED TYPE: ${type}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

debugStudies();
