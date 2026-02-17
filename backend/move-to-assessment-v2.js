process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

async function manualAutoPass() {
  try {
    console.log(
      "Simulating Auto-QC: Moving random % of Triage cases to Assessment...",
    );

    // Get all AOI and NoCase studies currently in triage
    const query = `
            SELECT *
            FROM c 
            WHERE (c.workflowTrack = 'AOI' OR c.workflowTrack = 'NoCase')
            AND c.subStatus = 'triage'
        `;

    const studies = await cosmosService.queryItems("studies", query, []);
    console.log(`Found ${studies.length} candidates in Triage.`);

    let movedCount = 0;
    // Target ~20% (minimum 1 if we have any)
    const targetPercent = 0.2;

    // Shuffle array to pick randomly
    const shuffled = studies.sort(() => 0.5 - Math.random());

    // Determine how many to move. If we have cases but < 5, move at least 1 so user sees something.
    let countToMove = Math.ceil(studies.length * targetPercent);
    if (studies.length > 0 && countToMove === 0) countToMove = 1;

    // Safety cap - don't move all of them if we have many
    if (studies.length > 3 && countToMove >= studies.length) {
      countToMove = Math.floor(studies.length / 2); // Keep half in triage
    }

    console.log(`Moving ${countToMove} cases to Assessment...`);

    for (let i = 0; i < countToMove; i++) {
      if (i >= shuffled.length) break;

      const study = shuffled[i];

      study.subStatus = "assessment";
      study.status = "Ready for Assessment Allocation";
      study.isAutoPassed = true;
      study.workflowStage =
        study.workflowTrack === "AOI" ? "ASSESSMENT_AOI" : "ASSESSMENT_NO_CASE";

      console.log(
        `Moving ${study.pmid} (${study.workflowTrack}) -> Assessment`,
      );
      await cosmosService.updateItem(
        "studies",
        study.id,
        study.organizationId,
        study,
      );
      movedCount++;
    }

    console.log(`Successfully moved ${movedCount} studies to Assessment.`);
  } catch (error) {
    console.error("Error:", error);
  }
}

manualAutoPass();
