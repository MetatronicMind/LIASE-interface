const cosmosService = require("../services/cosmosService");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const SUPER_ADMIN_ID = "user_5e2b8ae4-6911-49e9-baf8-cf8e9e620d7e";
const ORG_ID = "94b7e106-1e86-4805-9725-5bdec4a4375f";
const ROLE_ID = "role_72be9f41-e760-440e-9b24-c51178575a0b";

async function ensureSuperAdmin() {
  console.log("--- Admin Bootstrap Check ---");
  try {
    await cosmosService.initializeDatabase();

    // 1. Check Organization
    const org = await cosmosService.getItem("organizations", ORG_ID, ORG_ID);
    if (!org) {
      console.log("⚡ Bootstrap: Creating missing Organization...");
      const orgData = {
        id: ORG_ID,
        name: "MetatronicMind",
        adminEmail: "testadmin10012026@gmail.com",
        plan: "enterprise",
        isActive: true,
        type: "organization",
        settings: {
          maxUsers: 1000,
          features: { auditRetention: 365, exportData: true, apiAccess: true },
        },
        createdAt: new Date().toISOString(),
      };
      await cosmosService.createItem("organizations", orgData);
    } else {
      console.log("✔ Organization exists");
    }

    // 2. Check Role
    const role = await cosmosService.getItem("users", ROLE_ID, ORG_ID);
    if (!role) {
      console.log("⚡ Bootstrap: Creating missing SuperAdmin Role...");
      const roleData = {
        id: ROLE_ID,
        organizationId: ORG_ID,
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
        createdAt: new Date().toISOString(),
        type: "role",
      };
      await cosmosService.createItem("users", roleData);
    } else {
      console.log("✔ SuperAdmin Role exists");
    }

    // 3. User Handling (Create or Reset)
    const user = await cosmosService.getItem("users", SUPER_ADMIN_ID, ORG_ID);

    // Hash known password for local access
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("TestAdmin123!", salt);

    if (!user) {
      console.log("⚡ Bootstrap: Creating missing SuperAdmin User...");
      const userData = {
        id: SUPER_ADMIN_ID,
        organizationId: ORG_ID,
        username: "test_admin_10_01_2026",
        email: "testadmin10012026@gmail.com",
        password: hashedPassword,
        firstName: "Test",
        lastName: "Admin",
        roleId: ROLE_ID,
        role: "SuperAdmin",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system",
        type: "user",
      };
      await cosmosService.createItem("users", userData);
      console.log("✔ SuperAdmin User created successfully");
    } else {
      // Force Reset Password to ensure access
      await cosmosService.updateItem("users", SUPER_ADMIN_ID, ORG_ID, {
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      });
      console.log(
        "✔ SuperAdmin User exists (Password reset to 'TestAdmin123!')",
      );
    }
  } catch (error) {
    console.error("Bootstrap Error:", error.message);
  }
}

module.exports = ensureSuperAdmin;
