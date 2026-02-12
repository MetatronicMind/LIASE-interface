process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

async function diagnoseTracks() {
  try {
    console.log("Diagnosing Studies Created Today...");
    const today = new Date().toISOString().split("T")[0];

    const query = `
            SELECT *
            FROM c 
            WHERE c.createdAt >= '${today}'
        `;

    const studies = await cosmosService.queryItems("studies", query, []);
    console.log(`Found ${studies.length} studies.`);

    console.log(
      "---------------------------------------------------------------------------------------------",
    );
    console.log(
      "| PMID | Track | Status | UserTag | QAStatus | ICSR_Class | AOI_Class |",
    );
    console.log(
      "---------------------------------------------------------------------------------------------",
    );

    studies.forEach((s) => {
      console.log(
        `| ${s.pmid} | ${s.workflowTrack} | ${s.status} | ${s.userTag} | ${s.qaApprovalStatus} | ${s.icsrClassification} | ${s.aoiClassification} |`,
      );
    });
    console.log(
      "---------------------------------------------------------------------------------------------",
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

diagnoseTracks();
