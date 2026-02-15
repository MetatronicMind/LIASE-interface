const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require("uuid");
const cosmosService = require("./cosmosService");

class EnvironmentProvisioningService {
  /**
   * Stores a new Environment configuration in the CRM database
   */
  async registerEnvironment(envData) {
    const environmentConfig = {
      id: envData.id || uuidv4(),
      name: envData.name,
      type: envData.type || "sandbox", // sandbox, production, staging
      endpoint: envData.endpoint,
      // Encrypt key in a real app! For now storing as provided.
      accessKey: envData.key,
      databaseId: envData.databaseId,
      status: "registered",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await cosmosService.createItem(
      "crm-environments",
      environmentConfig,
    );
  }

  async getAllEnvironments() {
    try {
      return await cosmosService.listItems("crm-environments", null);
    } catch (e) {
      console.error("Error listing environments:", e);
      return [];
    }
  }

  /**
   * Connects to a remote environment and seeds the SuperAdmin + Org + Role
   * effectively replicating the "bootstrap" logic to any target DB.
   */
  async provisionEnvironment(envId, superAdminData) {
    let client = null;

    try {
      // 1. Get Environment Details
      const envConfig = await cosmosService.getItem(
        "crm-environments",
        envId,
        null,
      );
      if (!envConfig) throw new Error("Environment configuration not found");

      // 2. Connect to the Target Database
      console.log(
        `Connecting to target environment: ${envConfig.name} (${envConfig.endpoint})`,
      );
      client = new CosmosClient({
        endpoint: envConfig.endpoint,
        key: envConfig.accessKey,
      });

      const { database } = await client.databases.createIfNotExists({
        id: envConfig.databaseId,
      });
      console.log(`Target Database '${envConfig.databaseId}' verified.`);

      // 3. Ensure Containers Exist (Minimal set for Auth)
      const containers = ["organizations", "users", "roles", "audit-logs"];
      for (const c of containers) {
        // Determine simple partition key logic for bootstrapping
        // Main app uses /organizationId, so we stick to that
        const pk = c === "organizations" ? "/id" : "/organizationId";
        await database.containers.createIfNotExists({
          id: c,
          partitionKey: pk,
        });
      }

      // 4. Seed Organization
      const orgContainer = database.container("organizations");
      const orgData = {
        id:
          superAdminData.organizationId ||
          "94b7e106-1e86-4805-9725-5bdec4a4375f",
        name: superAdminData.organizationName || "MetatronicMind",
        adminEmail: superAdminData.email,
        plan: "enterprise",
        isActive: true,
        type: "organization",
        settings: {
          maxUsers: 1000,
          features: { auditRetention: 365, exportData: true, apiAccess: true },
        },
        createdAt: new Date().toISOString(),
      };
      const { resource: org } = await orgContainer.items.upsert(orgData);
      console.log(`Organization seeded: ${org.id}`);

      // 5. Seed SuperAdmin Role
      const usersContainer = database.container("users");
      const roleId = "role_72be9f41-e760-440e-9b24-c51178575a0b";

      // Full permissions object (copied from system default)
      const fullPermissions = {
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
        triage: { read: true, write: true, classify: true },
        QA: { read: true, write: true, approve: true, reject: true },
        QC: { read: true, write: true, approve: true, reject: true },
        data_entry: {
          read: true,
          write: true,
          r3_form: true,
          revoke_studies: true,
        },
        notifications: { read: true, write: true, delete: true },
        email: { read: true, write: true, delete: true },
        admin_config: { read: true, write: true, manage_jobs: true },
      };

      const roleData = {
        id: roleId,
        organizationId: org.id,
        name: "SuperAdmin",
        displayName: "Super Admin",
        isSystemRole: true,
        isActive: true,
        permissions: fullPermissions,
        createdAt: new Date().toISOString(),
        type: "role",
      };
      await usersContainer.items.upsert(roleData);
      console.log("SuperAdmin Role seeded.");

      // 6. Seed SuperAdmin User
      const userId =
        superAdminData.id || "user_5e2b8ae4-6911-49e9-baf8-cf8e9e620d7e";
      const userData = {
        id: userId,
        organizationId: org.id,
        username: superAdminData.username,
        email: superAdminData.email,
        password: superAdminData.password, // Expecting HASHED password or we hash it here
        firstName: superAdminData.firstName || "Super",
        lastName: superAdminData.lastName || "Admin",
        roleId: roleId,
        role: "SuperAdmin",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system-provisioning",
        type: "user",
      };
      await usersContainer.items.upsert(userData);
      console.log(`SuperAdmin User seeded: ${userData.username}`);

      // Update status locally
      envConfig.status = "active";
      envConfig.lastProvisionedAt = new Date().toISOString();
      await cosmosService.updateItem("crm-environments", envId, {
        status: "active",
        lastProvisionedAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Environment ${envConfig.name} fully provisioned.`,
      };
    } catch (error) {
      console.error("Provisioning failed:", error);
      throw error;
    } finally {
      if (client) client.dispose();
    }
  }
}

module.exports = new EnvironmentProvisioningService();
