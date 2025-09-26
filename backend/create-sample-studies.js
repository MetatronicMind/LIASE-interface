// Script to create sample studies for testing
require('dotenv').config({ path: '.env.local' });

const cosmosService = require('./src/services/cosmosService');
const Study = require('./src/models/Study');
const { v4: uuidv4 } = require('uuid');

async function createSampleStudies() {
  try {
    console.log('Creating sample studies for testing...');
    
    // Initialize the database
    await cosmosService.initializeDatabase();
    console.log('Database initialized successfully');
    
    // Sample organization ID (you might need to adjust this)
    const organizationId = 'test-org-123';
    
    const sampleStudies = [
      {
        id: uuidv4(),
        organizationId,
        pmid: '38901234',
        title: 'Long-term cardiovascular effects of aspirin in elderly patients with diabetes',
        authors: 'Johnson R, Smith K, Brown L, Davis M, Wilson P',
        journal: 'New England Journal of Medicine',
        publicationDate: '2024-11-15',
        abstract: 'This large-scale randomized controlled trial examined the cardiovascular effects of low-dose aspirin in elderly patients with type 2 diabetes. We enrolled 1,250 participants aged 65-85 years and followed them for 3 years. The primary endpoint was major adverse cardiovascular events (MACE). Results showed a 15% reduction in MACE but a significant increase in gastrointestinal bleeding events (12% vs 6% in placebo group). The study provides important insights into the risk-benefit profile of aspirin in this vulnerable population.',
        drugName: 'Aspirin',
        adverseEvent: 'Gastrointestinal bleeding',
        status: 'Pending Review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        // AI inference data
        icsrClassification: 'Potential ICSR',
        aoiClassification: 'AOI',
        serious: true,
        confirmedPotentialICSR: true,
        summary: 'Elderly diabetes patients on aspirin showed increased GI bleeding risk requiring careful monitoring.',
        keyEvents: ['Gastrointestinal bleeding events', 'Emergency department visits', 'Medication discontinuation'],
        attributability: 'Probable',
        drugEffect: 'Adverse',
        substanceGroup: 'Antiplatelet agents',
        comments: []
      },
      {
        id: uuidv4(),
        organizationId,
        pmid: '38901235',
        title: 'Metformin-associated lactic acidosis in patients with chronic kidney disease: A systematic review and meta-analysis',
        authors: 'Garcia A, Martinez B, Rodriguez C, Lopez D',
        journal: 'Diabetes Care',
        publicationDate: '2024-11-10',
        abstract: 'Background: Metformin use in chronic kidney disease (CKD) patients remains controversial due to lactic acidosis risk. Methods: We systematically reviewed studies from 2010-2024 examining metformin-associated lactic acidosis in CKD patients. Results: 23 studies with 45,000 patients were included. Lactic acidosis incidence was 0.03% in CKD stage 3-4 patients on metformin vs 0.01% in controls. All cases occurred in patients with eGFR <30 mL/min/1.73m². Conclusion: Metformin carries minimal lactic acidosis risk in CKD stage 3-4 but should be avoided in advanced CKD.',
        drugName: 'Metformin',
        adverseEvent: 'Lactic acidosis',
        status: 'Under Review',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        createdBy: 'system',
        // AI inference data
        icsrClassification: 'Confirmed ICSR',
        aoiClassification: null,
        serious: true,
        confirmedPotentialICSR: true,
        summary: 'Systematic review confirms low but significant lactic acidosis risk with metformin in CKD patients.',
        keyEvents: ['Lactic acidosis cases', 'Hospitalization', 'Intensive care admission'],
        attributability: 'Certain',
        drugEffect: 'Adverse',
        substanceGroup: 'Antidiabetic agents',
        comments: []
      },
      {
        id: uuidv4(),
        organizationId,
        pmid: '38901236',
        title: 'Effectiveness and safety of lisinopril in hypertensive patients: Real-world evidence from electronic health records',
        authors: 'Thompson E, Anderson F, White G, Clark H',
        journal: 'Hypertension Research',
        publicationDate: '2024-11-05',
        abstract: 'This retrospective cohort study analyzed real-world effectiveness and safety of lisinopril in 12,500 hypertensive patients using electronic health records from 2020-2023. Primary outcomes were blood pressure control and adverse events. Lisinopril achieved target BP in 78% of patients. Dry cough occurred in 11% of patients, leading to discontinuation in 8%. No serious adverse events were attributed to lisinopril. The study confirms lisinopril\'s effectiveness with manageable side effect profile in routine clinical practice.',
        drugName: 'Lisinopril',
        adverseEvent: 'Dry cough',
        status: 'Approved',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
        createdBy: 'system',
        // AI inference data
        icsrClassification: null,
        aoiClassification: 'AOI',
        serious: false,
        confirmedPotentialICSR: false,
        summary: 'Common ACE inhibitor-induced dry cough with good management outcomes.',
        keyEvents: ['Dry cough onset', 'Medication discontinuation', 'Symptom resolution'],
        attributability: 'Probable',
        drugEffect: 'Adverse but manageable',
        substanceGroup: 'ACE inhibitors',
        comments: []
      }
    ];
    
    // Create studies in database
    for (const studyData of sampleStudies) {
      const study = new Study(studyData);
      await cosmosService.createItem('studies', study.toJSON());
      console.log(`Created study: ${study.pmid} - ${study.title.substring(0, 50)}...`);
    }
    
    console.log(`\n✅ Successfully created ${sampleStudies.length} sample studies!`);
    console.log('You should now see studies in the frontend.');
    
  } catch (error) {
    console.error('❌ Error creating sample studies:', error);
  }
}

createSampleStudies();