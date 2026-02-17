process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

async function diagnoseStudies() {
  try {
    console.log("Diagnosing Studies Created Today...");
    const today = new Date().toISOString().split("T")[0];

    const query = `
            SELECT 
                c.id, 
                c.pmid, 
                c.icsrClassification, 
                c.aoiClassification, 
                c.workflowTrack, 
                c.subStatus, 
                c.status,
                c.assignedTo,
                c.userTag
            FROM c 
            WHERE c.createdAt >= '${today}'
        `;

    const studies = await cosmosService.queryItems("studies", query, []);
    console.log(`Found ${studies.length} studies created today.`);

    if (studies.length > 0) {
      console.table(studies);
    } else {
      console.log("No studies found for today. Checking all pending...");
      const allQuery = `
                SELECT TOP 10
                    c.id, 
                    c.icsrClassification, 
                    c.workflowTrack, 
                    c.subStatus
                FROM c 
                WHERE c.workflowTrack = null OR IS_DEFINED(c.workflowTrack) = false
            `;
      const pending = await cosmosService.queryItems("studies", allQuery, []);
      console.log("Sample of studies with NO workflowTrack:", pending);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

diagnoseStudies();
