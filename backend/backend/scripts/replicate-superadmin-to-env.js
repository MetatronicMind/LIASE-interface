// Script to replicate the Super Admin Log In to any environment
// Usage: node scripts/replicate-superadmin-to-env.js
// MAKE SURE TO SET ENV VARS BEFORE RUNNING:
// Example (PowerShell):
// $env:COSMOS_DB_ENDPOINT="https://your-sandbox.documents.azure.com:443/"
// $env:COSMOS_DB_KEY="your-key"
// $env:COSMOS_DB_DATABASE_ID="LIASE-Database-Sandbox"
// node backend/scripts/replicate-superadmin-to-env.js

require("dotenv").config({ path: ".env.local" }); // Falls back to local if not set
const cosmosService = require("../src/services/cosmosService");

async function replicateSuperAdmin() {
  console.log("--- Replicating Super Admin to Environment ---");
  console.log("Target Endpoint:", process.env.COSMOS_DB_ENDPOINT);
  console.log("Target Database:", process.env.COSMOS_DB_DATABASE_ID);

  if (!process.env.COSMOS_DB_ENDPOINT || !process.env.COSMOS_DB_KEY) {
    console.error(
      "ERROR: Missing credentials. Please set COSMOS_DB_ENDPOINT and COSMOS_DB_KEY.",
    );
    process.exit(1);
  }

  try {
    await cosmosService.initializeDatabase();

    // 1. Replicate Organization
    const orgData = {
      id: "94b7e106-1e86-4805-9725-5bdec4a4375f",
      name: "MetatronicMind", // Inferred
      adminEmail: "testadmin10012026@gmail.com",
      plan: "enterprise",
      isActive: true,
      type: "organization",
      settings: {
        maxUsers: 1000,
        features: {
          auditRetention: 365,
          exportData: true,
          apiAccess: true,
        },
      },
      createdAt: "2026-01-10T03:52:25.269Z",
    };

    console.log(`Upserting Organization: ${orgData.id}`);
    await cosmosService.upsertItem("organizations", orgData, orgData.id);

    // 2. Replicate Role
    const roleData = {
      id: "role_72be9f41-e760-440e-9b24-c51178575a0b",
      organizationId: "94b7e106-1e86-4805-9725-5bdec4a4375f",
      name: "SuperAdmin",
      displayName: "Super Admin",
      isSystemRole: true,
      isActive: true,
      permissions: {
        dashboard: { read: true },
        users: {
          read: true,
          write: true,
          delete: true,
          create: true,
          update: true,
        },
        roles: { read: true, write: true, delete: true },
        drugs: { read: true, write: true, delete: true },
        studies: { read: false, write: false, delete: false },
        audit: { read: true, write: true, delete: true, export: true },
        settings: {
          read: true,
          write: true,
          viewDateTime: true,
          viewRoleManagement: true,
          viewOrganization: true,
          viewWorkflow: true,
          viewNotifications: true,
          viewEmail: true,
          viewArchival: true,
          viewAdminConfig: true,
          viewStudyQueue: true,
          viewSystemConfig: true,
        },
        organizations: { read: true, write: true, delete: true },
        reports: { read: true, write: true, delete: true, export: true },
        triage: {
          read: true,
          write: true,
          classify: true,
          manual_drug_test: false,
        },
        QA: { read: true, write: true, approve: true, reject: true },
        QC: { read: true, write: true, approve: true, reject: true },
        data_entry: {
          read: true,
          write: true,
          r3_form: true,
          revoke_studies: true,
        },
        medical_examiner: {
          read: true,
          write: true,
          comment_fields: true,
          edit_fields: true,
          revoke_studies: true,
        },
        notifications: { read: true, write: true, delete: true },
        email: { read: true, write: true, delete: true },
        admin_config: { read: true, write: true, manage_jobs: true },
        aoiAssessment: { read: true, save: true },
        legacyData: { read: true, create: true },
        archive: { read: true, archive: true },
      },
      createdAt: "2026-01-10T03:52:25.269Z",
      type: "role",
    };

    console.log(`Upserting Role: ${roleData.id}`);
    await cosmosService.upsertItem("users", roleData, roleData.organizationId);

    // 3. Replicate User
    // Note: Password provided is "$2a$12$Wwna7dpx9AEASXfPO6Eq8OXCHZDtJG8NPfVc/VxCVNHV7XI2MGRXi"
    const userData = {
      id: "user_5e2b8ae4-6911-49e9-baf8-cf8e9e620d7e",
      organizationId: "94b7e106-1e86-4805-9725-5bdec4a4375f",
      username: "test_admin_10_01_2026",
      email: "testadmin10012026@gmail.com",
      password: "$2a$12$Wwna7dpx9AEASXfPO6Eq8OXCHZDtJG8NPfVc/VxCVNHV7XI2MGRXi", // Hashed
      firstName: "Test",
      lastName: "Admin",
      roleId: "role_72be9f41-e760-440e-9b24-c51178575a0b",
      role: "SuperAdmin",
      permissions: roleData.permissions, // Denormalized just in case
      isActive: true,
      createdAt: "2026-01-10T03:52:25.269Z",
      updatedAt: new Date().toISOString(),
      createdBy: "8ecfefd9-2cbe-4ffd-8040-64bf6c875e84",
      type: "user",
    };

    console.log(`Upserting User: ${userData.username}`);
    await cosmosService.upsertItem("users", userData, userData.organizationId);

    console.log(
      "\nSUCCESS! Super Admin and Organization replicated to target environment.",
    );
    console.log("You should now be able to login as this user.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

replicateSuperAdmin();
