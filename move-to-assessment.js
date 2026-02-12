process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

async function moveAllocationToAssessment() {
  try {
    console.log("Moving Allocation items to Assessment...");

    // Find studies in allocation for AOI or NoCase
    const query = `
            SELECT * FROM c 
            WHERE (c.workflowTrack = 'AOI' OR c.workflowTrack = 'NoCase')
            AND c.subStatus = 'allocation'
        `;

    const studies = await cosmosService.queryItems("studies", query, []);
    console.log(`Found ${studies.length} studies in allocation to move.`);

    for (const study of studies) {
      study.subStatus = "assessment";

      // Update status string for UI consistency
      if (study.workflowTrack === "AOI") {
        study.status = "aoi_assessment";
        study.workflowStage = "ASSESSMENT_AOI";
      } else if (study.workflowTrack === "NoCase") {
        study.status = "no_case_assessment";
        study.workflowStage = "ASSESSMENT_NO_CASE";
      }

      study.isAutoPassed = true; // Mark as auto-passed since we skipped manual allocation

      await cosmosService.updateItem(
        "studies",
        study.id,
        study.organizationId,
        study,
      );
      console.log(`Moved ${study.id} to Assessment`);
    }
    console.log("Migration Complete.");
  } catch (error) {
    console.error("Error:", error);
  }
}

moveAllocationToAssessment();
