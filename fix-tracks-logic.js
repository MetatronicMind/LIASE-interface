process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

async function fixTracks() {
  try {
    console.log("Fixing Studies Created Today...");
    const today = new Date().toISOString().split("T")[0];

    // Get all studies created today
    const query = `
            SELECT *
            FROM c 
            WHERE c.createdAt >= '${today}'
        `;

    const studies = await cosmosService.queryItems("studies", query, []);
    console.log(`Found ${studies.length} studies to check.`);

    let fixedCount = 0;

    for (const study of studies) {
      let needsUpdate = false;
      const rawClassification = study.icsrClassification || "";
      const classification = rawClassification.toString().trim();

      const oldTrack = study.workflowTrack;

      // 1. ICSR Track Logic
      if (
        classification === "Probable ICSR" ||
        classification === "Probable ICSR/AOI" ||
        classification === "Article requires manual review" ||
        study.confirmedPotentialICSR === true ||
        study.confirmedPotentialICSR === "true"
      ) {
        if (!study.userTag || study.userTag !== "ICSR") {
          study.userTag = "ICSR";
          needsUpdate = true;
        }

        if (study.workflowTrack !== "ICSR" || study.subStatus !== "triage") {
          study.workflowTrack = "ICSR";
          study.subStatus = "triage";
          study.status = "Under Triage Review";
          study.userTag = "ICSR";
          needsUpdate = true;
        }
      }
      // 2. AOI Track Logic
      else if (classification === "Probable AOI" || classification === "AOI") {
        if (study.userTag !== "AOI") {
          study.userTag = "AOI";
          needsUpdate = true;
        }

        if (
          study.workflowTrack !== "AOI" ||
          study.status === "Under Triage Review"
        ) {
          study.workflowTrack = "AOI";
          // Move to QC Triage (Manual QC) if not already in Assessment
          if (study.status !== "Ready for Assessment Allocation") {
            study.status = "qc_triage";
            study.qaApprovalStatus = "pending";
            study.subStatus = "triage";
            study.isAutoPassed = false;
          }
          needsUpdate = true;
        }
      }
      // 3. No Case Track Logic
      else if (classification === "No Case") {
        if (study.userTag !== "No Case") {
          study.userTag = "No Case";
          needsUpdate = true;
        }

        if (
          study.workflowTrack !== "NoCase" ||
          study.status === "Under Triage Review"
        ) {
          study.workflowTrack = "NoCase";
          // Move to QC Triage (Manual QC) if not already in Assessment
          if (study.status !== "Ready for Assessment Allocation") {
            study.status = "qc_triage";
            study.qaApprovalStatus = "pending";
            study.subStatus = "triage";
            study.isAutoPassed = false;
          }
          needsUpdate = true;
        }
      }

      // Fix potential "null" assignedTo if it's string "null"
      if (study.assignedTo === "null") {
        study.assignedTo = null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(
          `Fixing ${study.pmid} (ID: ${study.id}, Org: ${study.organizationId}): ${oldTrack} -> ${study.workflowTrack} (Status: ${study.status}, Tag: ${study.userTag})`,
        );
        try {
          const result = await cosmosService.updateItem(
            "studies",
            study.id,
            study.organizationId,
            {
              workflowTrack: study.workflowTrack,
              status: study.status,
              subStatus: study.subStatus,
              userTag: study.userTag,
              qaApprovalStatus: study.qaApprovalStatus,
              isAutoPassed: study.isAutoPassed,
              assignedTo: study.assignedTo,
            },
          );
          console.log(
            `Update success for ${study.pmid}. Etag: ${result?.etag}`,
          );
        } catch (updateErr) {
          console.error(`FAILED to update ${study.pmid}:`, updateErr);
        }
        fixedCount++;
      }
    }

    console.log(`Fixed ${fixedCount} studies.`);
  } catch (error) {
    console.error("Error:", error);
  }
}

fixTracks();
