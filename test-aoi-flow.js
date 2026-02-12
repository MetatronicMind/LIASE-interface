process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

async function setupAOITestData() {
  try {
    console.log("Setting up AOI Track Test Data...");
    const today = new Date().toISOString().split("T")[0];

    // Get any studies created today to convert for testing
    // We'll grab 5 studies to convert to AOI
    const query = `
            SELECT *
            FROM c 
            WHERE c.createdAt >= '${today}'
    `;

    const allStudies = await cosmosService.queryItems("studies", query, []);

    // Take the first 5 available studies
    const testBatch = allStudies.slice(0, 5);

    if (testBatch.length === 0) {
      console.log("No studies found created today to use for test.");
      return;
    }

    console.log(
      `Converting ${testBatch.length} studies to 'Probable AOI' (AOI Track)...`,
    );

    // 1. Convert them to the starting state of an AOI case
    for (const study of testBatch) {
      study.icsrClassification = "Probable AOI"; // AI Classification
      study.workflowTrack = "AOI"; // Track
      study.subStatus = "triage"; // Initial State
      study.status = "Under Triage Review";
      study.assignedTo = null; // Unassigned
      study.isAutoPassed = false;
      study.workflowStage = null;

      await cosmosService.updateItem(
        "studies",
        study.id,
        study.organizationId,
        study,
      );
      console.log(`Converted ${study.pmid} to AOI Track (Triage)`);
    }

    console.log("-----------------------------------------");
    console.log("Applying Creation-Time Auto-QC Logic (20% Pass)...");

    const AUTO_QC_PERCENT = 0.2;

    // Shuffle the array
    const shuffled = testBatch.sort(() => 0.5 - Math.random());

    const countToAssessment = Math.ceil(testBatch.length * AUTO_QC_PERCENT);
    const countToTriage = testBatch.length - countToAssessment;

    console.log(
      `Policy: ${countToAssessment} cases to Assessment, ${countToTriage} cases stay in Triage.`,
    );

    // Process Auto-Pass (Assessment)
    for (let i = 0; i < countToAssessment; i++) {
      const study = shuffled[i];

      study.subStatus = "assessment";
      study.status = "Ready for Assessment Allocation";
      study.isAutoPassed = true;
      study.workflowStage = "ASSESSMENT_AOI";

      console.log(
        `[Auto-Pass] ${study.pmid} -> AOI Assessment Allocation bucket`,
      );
      await cosmosService.updateItem(
        "studies",
        study.id,
        study.organizationId,
        study,
      );
    }

    // Process the rest (ensure they stay Triage)
    for (let i = countToAssessment; i < testBatch.length; i++) {
      const study = shuffled[i];
      // Ensure strictly triage state
      study.subStatus = "triage";
      study.status = "Under Triage Review";
      study.workflowStage = "TRIAGE_AOI"; // Optional, but good for tracking

      console.log(`[Manual QC] ${study.pmid} -> AOI Triage Allocation bucket`);
      await cosmosService.updateItem(
        "studies",
        study.id,
        study.organizationId,
        study,
      );
    }

    console.log("-----------------------------------------");
    console.log("AOI Test Setup Complete.");
    console.log("1. Go to 'AOI Assessment' -> 'Allocate' (Expect 1 case)");
    console.log("2. Go to 'AOI Triage' -> 'Allocate' (Expect 4 cases)");
  } catch (error) {
    console.error("Error:", error);
  }
}

setupAOITestData();
