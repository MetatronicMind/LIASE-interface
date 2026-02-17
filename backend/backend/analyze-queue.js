
require('dotenv').config({ path: './backend/.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Disable SSL verification for local Cosmos DB
const cosmosService = require('./src/services/cosmosService');

async function analyzeStudyQueue() {
  try {
    console.log('Analyzing Study Queue...');
    
    // Fetch all pending studies
    const query = 'SELECT * FROM c WHERE c.status = "Pending Review" OR c.status = "Under Triage Review"';
    const studies = await cosmosService.queryItems('studies', query, []);
    
    console.log(`Total Pending Studies: ${studies.length}`);
    
    const stats = {
      'Probable ICSR': 0,
      'Probable AOI': 0,
      'Probable ICSR/AOI': 0,
      'Potential ICSR': 0,
      'Potential AOI': 0,
      'Potential ICSR/AOI': 0,
      'No Case': 0,
      'Manual Review': 0,
      'Unknown': 0
    };

    // Use the EXACT logic from the backend
    const getStudyType = (study) => {
        const icsr = study.icsrClassification || study.ICSR_classification || study.aiInferenceData?.ICSR_classification || '';
        const aoi = study.aoiClassification || study.AOI_classification || study.aiInferenceData?.AOI_classification || '';
        const userTag = study.userTag || '';

        const icsrLower = String(icsr).toLowerCase();
        const aoiLower = String(aoi).toLowerCase();

        // Explicit Manual Review check
        if (icsrLower.includes('manual review')) return 'Manual Review';

        const isProbableICSR = icsrLower.includes('probable') || icsrLower === 'yes' || icsrLower.includes('yes (icsr)');
        const isProbableAOI = aoiLower.includes('probable') || aoiLower === 'yes' || aoiLower.includes('yes (aoi)');
        
        const isPotentialICSR = icsrLower.includes('potential');
        const isPotentialAOI = aoiLower.includes('potential');

        if (isProbableICSR && isProbableAOI) return 'Probable ICSR/AOI';
        if (isProbableICSR) return 'Probable ICSR';
        if (isProbableAOI) return 'Probable AOI';
        
        if (isPotentialICSR && isPotentialAOI) return 'Potential ICSR/AOI';
        if (isPotentialICSR) return 'Potential ICSR';
        if (isPotentialAOI) return 'Potential AOI';

        if (userTag === 'No Case' || icsrLower === 'no case') return 'No Case';

        return 'Manual Review'; // Default fallback
    };

    studies.forEach(study => {
        const type = getStudyType(study);
        if (stats[type] !== undefined) {
            stats[type]++;
        } else {
            stats['Unknown']++;
        }
        
        // Log the first few "Manual Review" cases to see WHY they are manual review
        if (type === 'Manual Review' && stats['Manual Review'] <= 3) {
             console.log('\n--- Sample Manual Review Case ---');
             console.log(`ID: ${study.id}`);
             console.log(`ICSR Raw: ${study.icsrClassification || study.ICSR_classification}`);
             console.log(`AOI Raw: ${study.aoiClassification || study.AOI_classification}`);
        }

        if (type === 'Probable ICSR' && stats['Probable ICSR'] <= 3) {
             console.log('\n--- Sample Probable ICSR Case ---');
             console.log(`ID: ${study.id}`);
             console.log(`ICSR Raw: ${study.icsrClassification || study.ICSR_classification}`);
             console.log(`AOI Raw: ${study.aoiClassification || study.AOI_classification}`);
             console.log(`AOI Lower: ${(study.aoiClassification || study.AOI_classification || '').toLowerCase()}`);
        }
    });

    console.log('\n--- Queue Distribution ---');
    console.table(stats);

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeStudyQueue();
