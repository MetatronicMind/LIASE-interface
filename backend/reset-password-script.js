const { CosmosClient } = require('@azure/cosmos');
const bcrypt = require('bcryptjs');

// Config from your logs/portal
const endpoint = process.env.COSMOS_DB_ENDPOINT || "https://liase-database.documents.azure.com:443/";
const key = process.env.COSMOS_DB_KEY || "nzJpfsZCwElYRMOutlmGQB9i47yar23v0OeGFd63XmCdTKzCyfRFyryBbLrJR6cRww9ZKz7B2hEQACDbgFR98w==";
const databaseId = "liase-database"; // Production DB
const containerId = "users";

const targetUsername = "test_admin_10_01_2026";
const newPassword = "Password123!"; // Simple temporary password

async function resetPassword() {
  console.log(`Connecting to Cosmos DB: ${endpoint}`);
  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);

  try {
    // 1. Find User
    console.log(`Looking for user: ${targetUsername}`);
    const { resources: users } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.username = @username",
        parameters: [{ name: "@username", value: targetUsername }]
      })
      .fetchAll();

    if (users.length === 0) {
      console.error("❌ User not found!");
      return;
    }

    const user = users[0];
    console.log(`✅ User found: ${user.id} (${user.email || 'No Email'})`);

    // 2. Hash New Password
    console.log("Hashing new password...");
    // Using bcryptjs specifically to ensure compatibility
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 3. Update User
    user.password = hashedPassword;
    
    // Explicitly update partition key if needed (assuming 'id' or 'organizationId' or 'userId')
    // Cosmos replacement requires the ID and partition key.
    
    console.log("Updating user record...");
    // We try to replace using the item's partition key (likely organizationId based on previous logs)
    const { resource: updatedUser } = await container
      .item(user.id, user.organizationId) 
      .replace(user);

    console.log("✅ Password updated successfully!");
    console.log(`New Password: ${newPassword}`);
    console.log("Please try logging in with this password on Dev.");

  } catch (error) {
    console.error("❌ Error updating password:", error.message);
  }
}

resetPassword();
