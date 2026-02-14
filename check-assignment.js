require("dotenv").config({ path: "./backend/.env.local" });
const cosmosService = require("./backend/src/services/cosmosService");

// Disable SSL verification for self-signed certs (local emulator)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function checkUserAndOrg() {
  try {
    await cosmosService.initializeDatabase();

    // Find the user who has cases assigned
    const caseQuery = `
        SELECT TOP 1 c.organizationId, c.assignedTo 
        FROM c 
        WHERE c.workflowTrack = 'ICSR' 
        AND IS_DEFINED(c.assignedTo) 
        AND c.assignedTo != null 
        AND c.assignedTo != ""
    `;

    // Use "studies" directly based on previous findings
    const cases = await cosmosService.queryItems("studies", caseQuery, []);

    if (cases.length === 0) {
      console.log("No assigned cases found to inspect.");
      return;
    }

    const sampleCase = cases[0];
    const userId = sampleCase.assignedTo;
    const orgId = sampleCase.organizationId;

    console.log(`Checking User ID from case: ${userId}`);
    console.log(`Checking Org ID from case: ${orgId}`);

    // Now fetch the user details
    const user = await cosmosService.getItem("users", userId, userId);

    if (!user) {
      console.log("User NOT FOUND in 'users' container!");
      // Try query by id just in case partition key structure is weird
      const uQuery = `SELECT * FROM c WHERE c.id = @id`;
      const uRes = await cosmosService.queryItems("users", uQuery, [
        { name: "@id", value: userId },
      ]);
      if (uRes.length > 0) {
        console.log(
          "User FOUND by query:",
          uRes[0].email,
          "Org:",
          uRes[0].organizationId,
        );
        if (uRes[0].organizationId !== orgId) {
          console.error(
            "MISMATCH! User Org:",
            uRes[0].organizationId,
            "vs Case Org:",
            orgId,
          );
        } else {
          console.log("Organization Match Confirmed.");
        }
      }
    } else {
      console.log("User Found:", user.email);
      console.log("User Org:", user.organizationId);

      if (user.organizationId !== orgId) {
        console.error(
          "MISMATCH! User Org:",
          user.organizationId,
          "vs Case Org:",
          orgId,
        );
      } else {
        console.log("Organization Match Confirmed.");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkUserAndOrg();
