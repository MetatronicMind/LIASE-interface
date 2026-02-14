const cosmosService = require("./backend/src/services/cosmosService");
require("dotenv").config({ path: "./backend/.env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
async function debugAllocation() {
  console.log("Starting debug allocation...");

  // fetch all studies to inspect their status distribution
  const query = `
        SELECT c.id, c.pmid, c.title, c.workflowTrack, c.userTag, c.subStatus, c.assignedTo 
        FROM c 
        WHERE c.organizationId = 'org1' 
    `;

  // We are guessing org1 based on prev context, but better to be safe.
  // Actually, I'll remove the org filter to see everything if org1 is wrong,
  // but usually in dev it is consistent.
  // Let's just limit to 20 recent ones.

  try {
    const studies = await cosmosService.queryItems(
      "studies",
      `SELECT TOP 50 c.id, c.pmid, c.workflowTrack, c.userTag, c.subStatus, c.assignedTo, c.status
             FROM c 
             ORDER BY c._ts DESC`,
      [],
    );

    console.log(`Found ${studies.length} studies.`);
    console.table(studies);

    console.log("\n--- Analysis ---");
    const potentialICSR = studies.filter(
      (s) => s.userTag === "ICSR" || s.workflowTrack === "ICSR",
    );
    console.log(`Potential ICSR cases: ${potentialICSR.length}`);
    potentialICSR.forEach((s) => {
      console.log(
        `ID: ${s.id} | PMID: ${s.pmid} | Track: ${s.workflowTrack} | Tag: ${s.userTag} | SubStatus: ${s.subStatus} | Assigned: ${s.assignedTo} | Status: ${s.status}`,
      );
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

debugAllocation();
