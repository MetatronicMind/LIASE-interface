process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

async function simulateCreationAutoQC() {
  try {
    console.log("Simulating Creation-Time Auto-QC Logic on existing data...");

    // 1. Get all AOI and NoCase studies created today
    const today = new Date().toISOString().split("T")[0];
    const query = `
            SELECT *
            FROM c 
            WHERE (c.workflowTrack = 'AOI' OR c.workflowTrack = 'NoCase')
            AND c.createdAt >= '${today}'
        `;

    const studies = await cosmosService.queryItems("studies", query, []);
    console.log(`Found ${studies.length} studies (AOI/NoCase) created today.`);

    if (studies.length === 0) {
      console.log("No studies found. Please run Drug Config first.");
      return;
    }

    // 2. Reset ALL of them to a clean "just created" state (Triage) first
    // This ensures we have a clean baseline for the percentage split
    console.log("Resetting all to Triage state first...");
    for (const study of studies) {
      study.assignedTo = null;
      study.subStatus = "triage";
      study.status = "Under Triage Review";
      study.isAutoPassed = false; // Reset this too
      // Ensure workflowTrack matches classification if somehow missed
      if (study.icsrClassification === "No Case")
        study.workflowTrack = "NoCase";
      if (
        study.icsrClassification === "AOI" ||
        study.icsrClassification === "Probable AOI"
      )
        study.workflowTrack = "AOI";
    }

    // 3. Apply the 20% Auto-QC Logic
    const AUTO_QC_PERCENT = 0.2;

    // Shuffle the array to randomize which ones get auto-passed
    const shuffled = studies.sort(() => 0.5 - Math.random());

    const countToAssessment = Math.ceil(studies.length * AUTO_QC_PERCENT);
    const countToTriage = studies.length - countToAssessment;

    console.log(`Applying ${AUTO_QC_PERCENT * 100}% Auto-QC Rule:`);
    console.log(
      `- ${countToAssessment} cases will be AUTO-PASSED to Assessment (Ready for Allocation)`,
    );
    console.log(
      `- ${countToTriage} cases will remain in Triage (Manual Review)`,
    );

    // Process the Auto-Pass group
    for (let i = 0; i < countToAssessment; i++) {
      const study = shuffled[i];

      study.subStatus = "assessment";
      study.status = "Ready for Assessment Allocation";
      study.isAutoPassed = true;

      // Update stage for audit/tracking
      if (study.workflowTrack === "AOI") study.workflowStage = "ASSESSMENT_AOI";
      if (study.workflowTrack === "NoCase")
        study.workflowStage = "ASSESSMENT_NO_CASE";

      console.log(
        `[Auto-Pass] ${study.pmid} (${study.workflowTrack}) -> Assessment Allocation`,
      );
      await cosmosService.updateItem(
        "studies",
        study.id,
        study.organizationId,
        study,
      );
    }

    // Process the Triage group (just saving the reset state)
    for (let i = countToAssessment; i < studies.length; i++) {
      const study = shuffled[i];

      // They are already set to triage/null from step 2, but we need to save the unassign if they were assigned
      console.log(
        `[Manual QC] ${study.pmid} (${study.workflowTrack}) -> Triage Allocation`,
      );
      await cosmosService.updateItem(
        "studies",
        study.id,
        study.organizationId,
        study,
      );
    }

    console.log("-----------------------------------------");
    console.log("Simulation Complete.");
    console.log(
      "You can now go to 'No Case Assessment' and click 'Allocate Cases'.",
    );
    console.log("You should see pending cases available to claim.");
  } catch (error) {
    console.error("Error:", error);
  }
}

simulateCreationAutoQC();
