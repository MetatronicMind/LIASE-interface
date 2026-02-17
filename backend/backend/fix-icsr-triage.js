const cosmosService = require("./src/services/cosmosService");

async function fixStudySubStatus() {
  try {
    console.log("Starting fix for study subStatus...");

    // Find studies that are in qc_triage but still have subStatus 'triage'
    const query = `
      SELECT * FROM c 
      WHERE c.workflowTrack = 'ICSR' 
      AND c.status = 'qc_triage' 
      AND c.subStatus = 'triage'
    `;

    const studies = await cosmosService.queryItems("studies", query, []);
    console.log(`Found ${studies.length} studies to fix.`);

    for (const study of studies) {
      console.log(`Fixing study ${study.pmid} (${study.id})...`);

      // Update the study
      study.subStatus = "assessment";

      await cosmosService.updateItem(
        "studies",
        study.id,
        study.organizationId,
        study,
      );
      console.log(`Fixed study ${study.pmid}`);
    }

    console.log("Fix complete.");
  } catch (error) {
    console.error("Error fixing studies:", error);
  }
}

fixStudySubStatus();
