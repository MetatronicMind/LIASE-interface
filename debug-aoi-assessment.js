const path = require("path");
const dotenv = require("dotenv");

// Disable TLS rejection for local development with self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Try loading .env.local first, then .env
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const cosmosService = require("./src/services/cosmosService");

async function checkAoiAssessment() {
  try {
    const query = `
      SELECT c.id, c.pmid, c.title, c.workflowTrack, c.subStatus, c.status, c.assignedTo, c.userTag
      FROM c 
      WHERE c.workflowTrack = 'AOI'
    `;

    console.log("Querying AOI studies...");
    const studies = await cosmosService.queryItems("studies", query, []);

    console.log(`Found ${studies.length} studies in AOI track.`);

    studies.forEach((s) => {
      console.log(`- ID: ${s.id}, PMID: ${s.pmid}`);
      console.log(
        `  Track: ${s.workflowTrack}, SubStatus: ${s.subStatus}, Status: ${s.status}`,
      );
      console.log(`  AssignedTo: ${s.assignedTo}, UserTag: ${s.userTag}`);
      console.log("---");
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

checkAoiAssessment();
