const cosmosService = require("./src/services/cosmosService");
const User = require("./src/models/User");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs"); // Assuming bcryptjs is used
require("dotenv").config();

// The fixed SuperAdmin Org ID from authorization.js
const SUPER_ADMIN_ORG_ID = "94b7e106-1e86-4805-9725-5bdec4a4375f";

async function bootstrapSuperAdmin() {
  try {
    console.log("Connecting to database...");
    // Ensure we are connecting to the correct environment (set via .env or process env)
    if (!process.env.COSMOS_DB_ENDPOINT) {
      console.error("Error: COSMOS_DB_ENDPOINT is not set.");
      process.exit(1);
    }
    await cosmosService.initializeDatabase();

    // 1. Check/Create Super Admin Organization
    console.log(
      `Checking for Super Admin Organization (${SUPER_ADMIN_ORG_ID})...`,
    );
    let superOrg = await cosmosService.getItem(
      "organizations",
      SUPER_ADMIN_ORG_ID,
      SUPER_ADMIN_ORG_ID,
    );

    if (!superOrg) {
      console.log("Creating Super Admin Organization...");
      superOrg = {
        id: SUPER_ADMIN_ORG_ID,
        organizationId: SUPER_ADMIN_ORG_ID, // Partition Key usually matches ID for orgs
        name: "LIASE System Administration",
        type: "organization",
        type_doc: "organization", // Legacy support
        tenantId: "system-admin",
        adminEmail: "superadmin@liase.com",
        createdAt: new Date().toISOString(),
      };
      await cosmosService.createItem("organizations", superOrg);
      console.log("✓ Super Admin Organization created.");
    } else {
      console.log("✓ Super Admin Organization exists.");
    }

    // 2. Create Super Admin User
    const email = "superadmin@liase.com";
    const password = "ChangeMe123!";
    const username = "superadmin";

    console.log(`Checking for Super Admin User (${email})...`);
    const existingUser = await cosmosService.getUserByEmail(email);

    if (existingUser) {
      console.log("User already exists.");
      // Ensure role is correct
      if (
        existingUser.organizationId !== SUPER_ADMIN_ORG_ID ||
        existingUser.role !== "superadmin"
      ) {
        console.log("Updating user role to superadmin...");
        existingUser.organizationId = SUPER_ADMIN_ORG_ID;
        existingUser.role = "superadmin";
        await cosmosService.upsertItem("users", existingUser);
        console.log("✓ User promoted to Super Admin.");
      } else {
        console.log("✓ User is already a Super Admin.");
      }

      // Reset password if requested (optional)
      // const hashedPassword = await bcrypt.hash(password, 12);
      // existingUser.password = hashedPassword;
      // await cosmosService.upsertItem('users', existingUser);
    } else {
      console.log("Creating new Super Admin User...");
      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = {
        id: uuidv4(),
        organizationId: SUPER_ADMIN_ORG_ID,
        email: email,
        username: username,
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        role: "superadmin",
        isActive: true,
        type: "user",
        createdAt: new Date().toISOString(),
      };

      await cosmosService.createItem("users", newUser);
      console.log("✓ Super Admin User created.");
    }

    console.log("\n==================================================");
    console.log("BOOTSTRAP COMPLETE");
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log("Endpoint:", process.env.COSMOS_DB_ENDPOINT);
    console.log("--------------------------------------------------");
    console.log("You can now log in to the CRM with:");
    console.log("Email:    " + email);
    console.log("Password: " + password);
    console.log("==================================================\n");
  } catch (error) {
    console.error("Bootstrap failed:", error);
  }
}

bootstrapSuperAdmin();
