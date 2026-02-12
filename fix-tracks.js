process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

async function fixTracks() {
  try {
    console.log("Fixing Studies with missing Workflow Track...");
    const today = new Date().toISOString().split("T")[0];

    // Find studies with null workflowTrack created today (or recently)
    const query = `
            SELECT * FROM c 
            WHERE (IS_DEFINED(c.workflowTrack) = false OR c.workflowTrack = null)
            AND c.createdAt >= '${today}'
        `;

    const studies = await cosmosService.queryItems("studies", query, []);
    console.log(`Found ${studies.length} studies to fix.`);

    for (const study of studies) {
      let updated = false;
      const icsr = (study.icsrClassification || "").toLowerCase();
      const aoi = (study.aoiClassification || "").toLowerCase();

      // Same logic as studyCreationService.js
      const isProbableICSR =
        icsr.includes("probable icsr") ||
        icsr.includes("article requires manual review") ||
        icsr === "yes";

      const isProbableAOI =
        icsr.includes("probable aoi") ||
        aoi.includes("probable") ||
        aoi.includes("yes") ||
        aoi.includes("aoi");

      const isNoCase =
        icsr.includes("no case") || (icsr === "no" && (aoi === "no" || !aoi));

      if (isProbableICSR) {
        study.workflowTrack = "ICSR";
        study.subStatus = "triage";
        study.status = "Under Triage Review";
        study.workflowStage = "TRIAGE_ICSR";
        updated = true;
        console.log(`Fixing ${study.id}: Assigned to ICSR Track`);
      } else if (isProbableAOI) {
        study.workflowTrack = "AOI";
        study.subStatus = "allocation"; // Default to allocation for visibility
        study.status = "aoi_allocation";
        study.workflowStage = "ALLOCATION_AOI";
        updated = true;
        console.log(`Fixing ${study.id}: Assigned to AOI Track`);
      } else if (isNoCase) {
        study.workflowTrack = "NoCase";
        study.subStatus = "allocation"; // Default to allocation for visibility
        study.status = "no_case_allocation";
        study.workflowStage = "ALLOCATION_NO_CASE";
        updated = true;
        console.log(`Fixing ${study.id}: Assigned to NoCase Track`);
      } else {
        // Fallback
        study.workflowTrack = "ICSR";
        study.subStatus = "triage";
        study.status = "Under Triage Review";
        updated = true;
        console.log(`Fixing ${study.id}: Fallback to ICSR Track`);
      }

      if (updated) {
        await cosmosService.updateItem(
          "studies",
          study.id,
          study.organizationId,
          study,
        );
      }
    }
    console.log("Fix Complete.");
  } catch (error) {
    console.error("Error:", error);
  }
}

fixTracks();
