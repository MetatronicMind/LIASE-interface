const { CosmosClient } = require("@azure/cosmos");
const { DefaultAzureCredential } = require("@azure/identity");
const { loadSecret } = require("../config/secretLoader");

class CosmosService {
  constructor() {
    this.client = null;
    this.database = null;
    this.masterDatabase = null;
    this.containers = {};
    this.initialized = false;
    this.initPromise = null;
    this.lastInitError = null; // Store last initialization error for diagnostics
  }

  /**
   * Get a reference to a specific database by ID
   * useful for multi-tenant or multi-environment management
   */
  getDatabase(databaseId) {
    if (!this.client) {
      throw new Error("Cosmos Client not initialized");
    }
    return this.client.database(databaseId);
  }

  /**
   * Run a query against a specific database and container
   */
  async queryItemsInDatabase(databaseId, containerId, query, parameters = []) {
    try {
      const database = this.getDatabase(databaseId);
      const container = database.container(containerId);

      const { resources } = await container.items
        .query({
          query,
          parameters,
        })
        .fetchAll();

      return resources;
    } catch (error) {
      console.error(
        `Error querying ${databaseId}/${containerId}:`,
        error.message,
      );
      // Don't throw for 404s on container/db, just return empty
      if (error.code === 404) return [];
      throw error;
    }
  }

  /**
   * Create an item in a specific database and container
   */
  async createItemInDatabase(databaseId, containerId, item) {
    try {
      const database = this.getDatabase(databaseId);
      const container = database.container(containerId);

      const { resource } = await container.items.create(item);
      return resource;
    } catch (error) {
      console.error(
        `Error creating item in ${databaseId}/${containerId}:`,
        error.message,
      );
      throw error;
    }
  }

  async initializeDatabase() {
    // Return existing initialization promise if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.initialized) {
      return;
    }

    // Create and store the initialization promise
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      // Use environment variables directly (Azure App Service app settings)
      const endpoint = process.env.COSMOS_DB_ENDPOINT;
      const key = process.env.COSMOS_DB_KEY;
      const dbId = process.env.COSMOS_DB_DATABASE_ID || "LIASE-Database";

      if (!endpoint) {
        throw new Error("COSMOS_DB_ENDPOINT environment variable is required");
      }

      if (!dbId) {
        throw new Error(
          "COSMOS_DB_DATABASE_ID environment variable is required",
        );
      }

      console.log("Cosmos initialization - endpoint available:", !!endpoint);
      console.log("Cosmos initialization - key available:", !!key);
      console.log("Cosmos initialization - NODE_ENV:", process.env.NODE_ENV);

      // Initialize Cosmos client
      const isProduction = process.env.NODE_ENV === "production";

      if (key) {
        // Use key-based auth when available (preferred for Azure App Service)
        console.log("Using key-based authentication for Cosmos DB");
        this.client = new CosmosClient({
          endpoint,
          key,
        });
      } else if (isProduction) {
        // Fall back to Managed Identity when no key is configured
        console.log("Using managed identity for Cosmos DB");
        const credential = new DefaultAzureCredential();
        this.client = new CosmosClient({
          endpoint,
          aadCredentials: credential,
        });
      } else {
        // Development mode fallback
        throw new Error("COSMOS_DB_KEY is required in development mode");
      }

      // Create database if it doesn't exist
      const { database } = await this.client.databases.createIfNotExists({
        id: dbId,
      });
      this.database = database;

      // Initialize Master DB if different and configured (or default to LIASE-Database)
      // This allows finding users in the main database even when running in sandbox
      const masterDbId =
        process.env.COSMOS_DB_MASTER_DATABASE_ID || "LIASE-Database";
      if (dbId !== masterDbId) {
        console.log(
          `Initializing Master Database fallback connection to: ${masterDbId}`,
        );
        try {
          const { database: mDb } =
            await this.client.databases.createIfNotExists({ id: masterDbId });
          this.masterDatabase = mDb;
          console.log(
            `Master Database ${masterDbId} connected for user fallback`,
          );
        } catch (masterErr) {
          console.warn(
            `Failed to connect to Master Database ${masterDbId}:`,
            masterErr.message,
          );
        }
      }

      // Create containers
      await this.createContainers();

      this.initialized = true;
      this.initPromise = null; // Clear the promise
      this.lastInitError = null; // Clear any previous error
      console.log("Cosmos DB initialized successfully");
    } catch (error) {
      this.initPromise = null; // Clear the promise on error so it can be retried
      console.error("Error initializing Cosmos DB:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      // Classify error for upstream error handler / health checks
      error.code = error.code || "COSMOS_INIT_FAILED";
      error.status = 503;
      this.lastInitError = {
        message: error.message,
        code: error.code,
        time: new Date().toISOString(),
      };
      throw error;
    }
  }

  async createContainers() {
    const containerConfigs = [
      {
        id: "organizations",
        partitionKey: "/id",
        uniqueKeyPolicy: {
          uniqueKeys: [{ paths: ["/domain"] }, { paths: ["/name"] }],
        },
      },
      {
        id: "users",
        partitionKey: "/organizationId",
        uniqueKeyPolicy: {
          uniqueKeys: [{ paths: ["/email"] }, { paths: ["/username"] }],
        },
      },
      {
        id: "roles",
        partitionKey: "/organizationId",
        uniqueKeyPolicy: {
          uniqueKeys: [{ paths: ["/name"] }],
        },
      },
      {
        id: "drugs",
        partitionKey: "/organizationId",
      },
      {
        id: "studies",
        partitionKey: "/organizationId",
      },
      {
        id: "drugSearchConfigs",
        partitionKey: "/organizationId",
      },
      {
        id: "jobs",
        partitionKey: "/organizationId",
        defaultTtl: 604800, // 7 days in seconds - auto-delete old jobs
      },
      {
        id: "audit-logs",
        partitionKey: "/organizationId",
        defaultTtl: 2592000, // 30 days in seconds
      },
      {
        id: "ScheduledJobs",
        partitionKey: "/organizationId",
      },
      {
        id: "Notifications",
        partitionKey: "/organizationId",
      },
      {
        id: "Emails",
        partitionKey: "/organizationId",
      },
      {
        id: "EmailTemplates",
        partitionKey: "/organizationId",
      },
      {
        id: "SMTPConfigs",
        partitionKey: "/organizationId",
      },
      {
        id: "Reports",
        partitionKey: "/organizationId",
        defaultTtl: 7776000, // 90 days in seconds - auto-delete old reports
      },
      {
        id: "AdminConfigs",
        partitionKey: "/organizationId",
      },
      {
        id: "Settings",
        partitionKey: "/organizationId",
      },
      {
        id: "Archives",
        partitionKey: "/organizationId",
      },
      {
        id: "legacyData",
        partitionKey: "/organizationId",
      },
      // Container for managing multiple CRM Environments (Tenants/Clients)
      {
        id: "crm-environments",
        partitionKey: "/type", // Partition by type
      },
    ];

    for (const config of containerConfigs) {
      console.log(`Creating/ensuring container: ${config.id}`);
      const { container } =
        await this.database.containers.createIfNotExists(config);
      this.containers[config.id] = container;
      console.log(`Container ${config.id} ready`);
    }
    console.log(`All containers initialized:`, Object.keys(this.containers));
  }

  getContainer(containerName) {
    return this.containers[containerName];
  }

  // Expose a quick status snapshot (used by middleware / health endpoint)
  getStatus() {
    return {
      initialized: this.initialized,
      containers: Object.keys(this.containers),
      lastInitError: this.lastInitError,
    };
  }

  // Helper method to determine partition key based on container and item data
  getPartitionKey(containerName, item, providedPartitionKey) {
    if (providedPartitionKey) {
      return providedPartitionKey;
    }

    switch (containerName) {
      case "organizations":
        return item.id || item;
      case "roles":
      case "users":
      case "drugs":
      case "studies":
      case "drugSearchConfigs":
      case "jobs":
      case "audit-logs":
      case "ScheduledJobs":
      case "Notifications":
      case "Emails":
      case "EmailTemplates":
      case "SMTPConfigs":
      case "Reports":
      case "Settings":
      case "Archives":
      case "legacyData":
        return item.organizationId || item;
      case "crm-environments":
        return item.type || "sandbox"; // Default partition key for environments      default:
        return item.id || item;
    }
  }

  // Generic CRUD operations
  async createItem(containerName, item) {
    try {
      // Ensure database is initialized
      if (!this.initialized) {
        console.log("Database not initialized, initializing now...");
        await this.initializeDatabase();
      }

      console.log(`Creating item in container: ${containerName}`);
      console.log(`Available containers:`, Object.keys(this.containers));

      const container = this.getContainer(containerName);
      console.log(`Container found:`, !!container);

      if (!container) {
        throw new Error(
          `Container ${containerName} not found. Available containers: ${Object.keys(this.containers).join(", ")}`,
        );
      }

      console.log(`Creating item:`, JSON.stringify(item, null, 2));
      const { resource } = await container.items.create(item);
      console.log(`Item created successfully:`, resource.id);
      return resource;
    } catch (error) {
      console.error(`Error creating item in ${containerName}:`, error);
      throw error;
    }
  }

  async getItem(containerName, id, partitionKey) {
    try {
      const container = this.getContainer(containerName);

      // Determine the correct partition key
      const actualPartitionKey = this.getPartitionKey(
        containerName,
        id,
        partitionKey,
      );

      const response = await container.item(id, actualPartitionKey).read();

      // Check if item was found
      if (response.statusCode === 404 || !response.resource) {
        return null;
      }

      return response.resource;
    } catch (error) {
      if (error.code === 404 || error.statusCode === 404) {
        return null;
      }
      console.error(`Error getting item from ${containerName}:`, error);
      throw error;
    }
  }

  async updateItem(containerName, id, partitionKeyOrUpdates, updates) {
    try {
      const container = this.getContainer(containerName);

      // Handle both old signature (id, partitionKey, updates) and new (id, updates)
      let partitionKey, actualUpdates;
      if (typeof partitionKeyOrUpdates === "object" && updates === undefined) {
        // New signature: updateItem(containerName, id, updates)
        actualUpdates = partitionKeyOrUpdates;
        partitionKey = null; // Will be determined automatically
      } else {
        // Old signature: updateItem(containerName, id, partitionKey, updates)
        partitionKey = partitionKeyOrUpdates;
        actualUpdates = updates;
      }

      // Determine the correct partition key using the updates object
      const actualPartitionKey = this.getPartitionKey(
        containerName,
        actualUpdates,
        partitionKey,
      );

      const { resource: existingItem } = await container
        .item(id, actualPartitionKey)
        .read();

      const updatedItem = {
        ...existingItem,
        ...actualUpdates,
        updatedAt: new Date().toISOString(),
      };

      const { resource } = await container
        .item(id, actualPartitionKey)
        .replace(updatedItem);
      return resource;
    } catch (error) {
      console.error(`Error updating item in ${containerName}:`, error);
      throw error;
    }
  }

  async patchItem(
    containerName,
    id,
    partitionKey,
    operations,
    filterPredicate,
    etag,
  ) {
    try {
      const container = this.getContainer(containerName);

      // Determine the correct partition key
      const actualPartitionKey = this.getPartitionKey(
        containerName,
        id,
        partitionKey,
      );

      const options = {};
      if (filterPredicate) {
        options.filterPredicate = filterPredicate;
      }
      if (etag) {
        // Use older Azure Cosmos SDK syntax for optimistic concurrency
        // "ifMatch" top-level property is ignored in some environments/versions
        options.accessCondition = { type: "IfMatch", condition: etag };
      }

      // Note: container.item returns an Item object.
      // patch returns { resource: ... }
      const { resource } = await container
        .item(id, actualPartitionKey)
        .patch(operations, options);
      return resource;
    } catch (error) {
      if (error.code === 412 || error.statusCode === 412) {
        // We throw a standardized error so the caller can detect it easily
        const err = new Error("PreconditionFailed");
        err.statusCode = 412;
        throw err;
      }
      console.error(`Error patching item in ${containerName}:`, error);
      throw error;
    }
  }

  async deleteItem(containerName, id, partitionKey) {
    try {
      const container = this.getContainer(containerName);

      // Determine the correct partition key
      const actualPartitionKey = this.getPartitionKey(
        containerName,
        id,
        partitionKey,
      );

      await container.item(id, actualPartitionKey).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting item from ${containerName}:`, error);
      throw error;
    }
  }

  async upsertItem(containerName, item, partitionKey) {
    try {
      const container = this.getContainer(containerName);

      // Determine the correct partition key
      const actualPartitionKey = this.getPartitionKey(
        containerName,
        item,
        partitionKey,
      );

      // Add timestamps
      const itemWithTimestamp = {
        ...item,
        updatedAt: new Date().toISOString(),
      };

      // If no createdAt exists, add it (for new items)
      if (!itemWithTimestamp.createdAt) {
        itemWithTimestamp.createdAt = itemWithTimestamp.updatedAt;
      }

      const { resource } = await container.items.upsert(itemWithTimestamp);
      return resource;
    } catch (error) {
      console.error(`Error upserting item in ${containerName}:`, error);
      throw error;
    }
  }

  async queryItems(containerName, query, parameters = []) {
    try {
      // Ensure database is initialized
      if (!this.initialized) {
        console.log("Database not initialized, initializing now...");
        await this.initializeDatabase();
      }

      const container = this.getContainer(containerName);

      if (!container) {
        throw new Error(
          `Container '${containerName}' not found. Available containers: ${Object.keys(this.containers).join(", ")}`,
        );
      }

      const { resources } = await container.items
        .query({
          query,
          parameters,
        })
        .fetchAll();
      return resources;
    } catch (error) {
      console.error(`Error querying items from ${containerName}:`, error);
      throw error;
    }
  }

  // Organization-specific queries
  async getOrganizationById(organizationId) {
    // Try local database first
    const org = await this.getItem(
      "organizations",
      organizationId,
      organizationId,
    );
    if (org) return org;

    // Fallback to Master DB if configured
    // This allows users from Master DB (like SuperAdmin) to sign in even if their org structure isn't in Sandbox
    if (this.masterDatabase) {
      try {
        console.log(
          `Organization ${organizationId} not found in current DB. Checking Master DB...`,
        );
        const { resource } = await this.masterDatabase
          .container("organizations")
          .item(organizationId, organizationId) // Partition Key is usually ID for organizations
          .read();

        if (resource) {
          console.log(`Organization found in Master DB: ${resource.name}`);
          return resource;
        }
      } catch (err) {
        // Ignore 404s from master, log others
        if (err.code !== 404 && err.statusCode !== 404) {
          console.warn(
            `Error fetching organization from Master DB: ${err.message}`,
          );
        }
      }
    }
    return null;
  }
  async getOrganizationByDomain(domain) {
    return await this.queryItems(
      "organizations",
      "SELECT * FROM c WHERE c.domain = @domain",
      [{ name: "@domain", value: domain }],
    );
  }

  async getUsersByOrganization(organizationId) {
    return await this.queryItems(
      "users",
      "SELECT * FROM c WHERE c.organizationId = @orgId",
      [{ name: "@orgId", value: organizationId }],
    );
  }

  async getDrugsByOrganization(organizationId) {
    return await this.queryItems(
      "drugs",
      "SELECT * FROM c WHERE c.organizationId = @orgId ORDER BY c.createdAt DESC",
      [{ name: "@orgId", value: organizationId }],
    );
  }

  async getStudiesByOrganization(organizationId) {
    return await this.queryItems(
      "studies",
      "SELECT * FROM c WHERE c.organizationId = @orgId ORDER BY c.createdAt DESC",
      [{ name: "@orgId", value: organizationId }],
    );
  }

  async getAuditLogsByOrganization(organizationId, limit = 100) {
    return await this.queryItems(
      "audit-logs",
      "SELECT * FROM c WHERE c.organizationId = @orgId ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit",
      [
        { name: "@orgId", value: organizationId },
        { name: "@limit", value: limit },
      ],
    );
  }

  // User authentication queries
  async getUserByEmail(email) {
    const users = await this.queryItems(
      "users",
      "SELECT * FROM c WHERE c.email = @email",
      [{ name: "@email", value: email }],
    );

    if (users.length > 0) return users[0];

    // Fallback to master database if not found in current environment
    if (this.masterDatabase) {
      try {
        console.log(
          `User not found in current DB, checking master database for email: ${email}`,
        );
        const { resources } = await this.masterDatabase
          .container("users")
          .items.query({
            query: "SELECT * FROM c WHERE c.email = @email",
            parameters: [{ name: "@email", value: email }],
          })
          .fetchAll();

        if (resources.length > 0) {
          console.log(`User found in master database: ${email}`);
          return resources[0];
        }
      } catch (err) {
        console.error("Error querying master database for user:", err);
      }
    }

    return null;
  }

  async getUserByUsernameGlobal(username) {
    const users = await this.queryItems(
      "users",
      "SELECT * FROM c WHERE c.username = @username",
      [{ name: "@username", value: username }],
    );

    if (users.length > 0) return users[0];

    // Fallback to master database if not found in current environment
    if (this.masterDatabase) {
      try {
        console.log(
          `User not found in current DB, checking master database for username: ${username}`,
        );
        const { resources } = await this.masterDatabase
          .container("users")
          .items.query({
            query: "SELECT * FROM c WHERE c.username = @username",
            parameters: [{ name: "@username", value: username }],
          })
          .fetchAll();

        if (resources.length > 0) {
          console.log(`User found in master database: ${username}`);
          return resources[0];
        }
      } catch (err) {
        console.error("Error querying master database for user:", err);
      }
    }

    return null;
  }

  async getUserByUsername(username, organizationId) {
    const users = await this.queryItems(
      "users",
      "SELECT * FROM c WHERE c.username = @username AND c.organizationId = @orgId",
      [
        { name: "@username", value: username },
        { name: "@orgId", value: organizationId },
      ],
    );
    return users.length > 0 ? users[0] : null;
  }

  async listItems(containerName, partitionKey) {
    try {
      const container = this.getContainer(containerName);
      let query = "SELECT * FROM c";
      let parameters = [];

      if (partitionKey) {
        query += " WHERE c.organizationId = @partitionKey";
        parameters.push({ name: "@partitionKey", value: partitionKey });
      }

      const { resources } = await container.items
        .query({
          query,
          parameters,
        })
        .fetchAll();

      return resources;
    } catch (error) {
      console.error(`Error listing items from ${containerName}:`, error);
      throw error;
    }
  }
}

module.exports = new CosmosService();
