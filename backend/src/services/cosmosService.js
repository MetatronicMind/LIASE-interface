const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const { loadSecret } = require('../config/secretLoader');

class CosmosService {
  constructor() {
    this.client = null;
    this.database = null;
    this.containers = {};
    this.initialized = false;
    this.initPromise = null;
    this.lastInitError = null; // Store last initialization error for diagnostics
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
      // Resolve endpoint & key (supports direct env or Key Vault secret names)
      const endpoint = await loadSecret({
        directEnv: 'COSMOS_DB_ENDPOINT',
        secretNameEnv: 'COSMOS_DB_ENDPOINT_SECRET_NAME',
        required: true
      });

      const key = process.env.NODE_ENV === 'production'
        ? await loadSecret({
            directEnv: 'COSMOS_DB_KEY',
            secretNameEnv: 'COSMOS_DB_KEY_SECRET_NAME',
            // In production we might use Managed Identity (no key). So not strictly required
            required: false
          })
        : await loadSecret({
            directEnv: 'COSMOS_DB_KEY',
            secretNameEnv: 'COSMOS_DB_KEY_SECRET_NAME',
            required: true
          });

      // Initialize Cosmos client
      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction && key) {
        // Prefer key-based auth when explicitly provided via settings/secrets
        this.client = new CosmosClient({
          endpoint,
          key
        });
      } else if (isProduction) {
        // Fall back to Managed Identity when no key is configured
        const credential = new DefaultAzureCredential();
        this.client = new CosmosClient({
          endpoint,
          aadCredentials: credential
        });
      } else {
        // Use connection string for development with SSL verification disabled
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        this.client = new CosmosClient({
          endpoint,
          key,
          agent: process.env.NODE_ENV === 'development' ? new (require('https').Agent)({
            rejectUnauthorized: false
          }) : undefined
        });
      }

      // Create database if it doesn't exist
      const dbId = process.env.COSMOS_DB_DATABASE_ID || 'liase-saas';
      const { database } = await this.client.databases.createIfNotExists({ id: dbId });
      this.database = database;

      // Create containers
      await this.createContainers();
      
      this.initialized = true;
      this.initPromise = null; // Clear the promise
      this.lastInitError = null; // Clear any previous error
      console.log('Cosmos DB initialized successfully');
    } catch (error) {
      this.initPromise = null; // Clear the promise on error so it can be retried
      console.error('Error initializing Cosmos DB:', error);
      // Classify error for upstream error handler / health checks
      error.code = error.code || 'COSMOS_INIT_FAILED';
      error.status = 503;
      this.lastInitError = {
        message: error.message,
        code: error.code,
        time: new Date().toISOString()
      };
      throw error;
    }
  }

  async createContainers() {
    const containerConfigs = [
      {
        id: 'organizations',
        partitionKey: '/id',
        uniqueKeyPolicy: {
          uniqueKeys: [
            { paths: ['/domain'] },
            { paths: ['/name'] }
          ]
        }
      },
      {
        id: 'users',
        partitionKey: '/organizationId',
        uniqueKeyPolicy: {
          uniqueKeys: [
            { paths: ['/email'] },
            { paths: ['/username'] }
          ]
        }
      },
      {
        id: 'drugs',
        partitionKey: '/organizationId'
      },
      {
        id: 'studies',
        partitionKey: '/organizationId'
      },
      {
        id: 'drugSearchConfigs',
        partitionKey: '/organizationId'
      },
      {
        id: 'jobs',
        partitionKey: '/organizationId',
        defaultTtl: 604800 // 7 days in seconds - auto-delete old jobs
      },
      {
        id: 'audit-logs',
        partitionKey: '/organizationId',
        defaultTtl: 2592000 // 30 days in seconds
      }
    ];

    for (const config of containerConfigs) {
      console.log(`Creating/ensuring container: ${config.id}`);
      const { container } = await this.database.containers.createIfNotExists(config);
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
      lastInitError: this.lastInitError
    };
  }

  // Helper method to determine partition key based on container and item data
  getPartitionKey(containerName, item, providedPartitionKey) {
    if (providedPartitionKey) {
      return providedPartitionKey;
    }

    switch (containerName) {
      case 'organizations':
        return item.id || item;
      case 'users':
      case 'drugs':
      case 'studies':
      case 'drugSearchConfigs':
      case 'jobs':
      case 'audit-logs':
        return item.organizationId || item;
      default:
        return item.id || item;
    }
  }

  // Generic CRUD operations
  async createItem(containerName, item) {
    try {
      // Ensure database is initialized
      if (!this.initialized) {
        console.log('Database not initialized, initializing now...');
        await this.initializeDatabase();
      }
      
      console.log(`Creating item in container: ${containerName}`);
      console.log(`Available containers:`, Object.keys(this.containers));
      
      const container = this.getContainer(containerName);
      console.log(`Container found:`, !!container);
      
      if (!container) {
        throw new Error(`Container ${containerName} not found. Available containers: ${Object.keys(this.containers).join(', ')}`);
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
      const actualPartitionKey = this.getPartitionKey(containerName, id, partitionKey);
      
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
      if (typeof partitionKeyOrUpdates === 'object' && updates === undefined) {
        // New signature: updateItem(containerName, id, updates)
        actualUpdates = partitionKeyOrUpdates;
        partitionKey = null; // Will be determined automatically
      } else {
        // Old signature: updateItem(containerName, id, partitionKey, updates)
        partitionKey = partitionKeyOrUpdates;
        actualUpdates = updates;
      }

      // Determine the correct partition key
      const actualPartitionKey = this.getPartitionKey(containerName, id, partitionKey);

      const { resource: existingItem } = await container.item(id, actualPartitionKey).read();
      
      const updatedItem = {
        ...existingItem,
        ...actualUpdates,
        updatedAt: new Date().toISOString()
      };

      const { resource } = await container.item(id, actualPartitionKey).replace(updatedItem);
      return resource;
    } catch (error) {
      console.error(`Error updating item in ${containerName}:`, error);
      throw error;
    }
  }

  async deleteItem(containerName, id, partitionKey) {
    try {
      const container = this.getContainer(containerName);
      
      // Determine the correct partition key
      const actualPartitionKey = this.getPartitionKey(containerName, id, partitionKey);
      
      await container.item(id, actualPartitionKey).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting item from ${containerName}:`, error);
      throw error;
    }
  }

  async queryItems(containerName, query, parameters = []) {
    try {
      const container = this.getContainer(containerName);
      const { resources } = await container.items.query({
        query,
        parameters
      }).fetchAll();
      return resources;
    } catch (error) {
      console.error(`Error querying items from ${containerName}:`, error);
      throw error;
    }
  }

  // Organization-specific queries
  async getOrganizationByDomain(domain) {
    return await this.queryItems(
      'organizations',
      'SELECT * FROM c WHERE c.domain = @domain',
      [{ name: '@domain', value: domain }]
    );
  }

  async getUsersByOrganization(organizationId) {
    return await this.queryItems(
      'users',
      'SELECT * FROM c WHERE c.organizationId = @orgId',
      [{ name: '@orgId', value: organizationId }]
    );
  }

  async getDrugsByOrganization(organizationId) {
    return await this.queryItems(
      'drugs',
      'SELECT * FROM c WHERE c.organizationId = @orgId ORDER BY c.createdAt DESC',
      [{ name: '@orgId', value: organizationId }]
    );
  }

  async getStudiesByOrganization(organizationId) {
    return await this.queryItems(
      'studies',
      'SELECT * FROM c WHERE c.organizationId = @orgId ORDER BY c.createdAt DESC',
      [{ name: '@orgId', value: organizationId }]
    );
  }

  async getAuditLogsByOrganization(organizationId, limit = 100) {
    return await this.queryItems(
      'audit-logs',
      'SELECT * FROM c WHERE c.organizationId = @orgId ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
      [
        { name: '@orgId', value: organizationId },
        { name: '@limit', value: limit }
      ]
    );
  }

  // User authentication queries
  async getUserByEmail(email) {
    const users = await this.queryItems(
      'users',
      'SELECT * FROM c WHERE c.email = @email',
      [{ name: '@email', value: email }]
    );
    return users.length > 0 ? users[0] : null;
  }

  async getUserByUsernameGlobal(username) {
    const users = await this.queryItems(
      'users',
      'SELECT * FROM c WHERE c.username = @username',
      [{ name: '@username', value: username }]
    );
    return users.length > 0 ? users[0] : null;
  }

  async getUserByUsername(username, organizationId) {
    const users = await this.queryItems(
      'users',
      'SELECT * FROM c WHERE c.username = @username AND c.organizationId = @orgId',
      [
        { name: '@username', value: username },
        { name: '@orgId', value: organizationId }
      ]
    );
    return users.length > 0 ? users[0] : null;
  }

  async listItems(containerName, partitionKey) {
    try {
      const container = this.getContainer(containerName);
      let query = 'SELECT * FROM c';
      let parameters = [];
      
      if (partitionKey) {
        query += ' WHERE c.organizationId = @partitionKey';
        parameters.push({ name: '@partitionKey', value: partitionKey });
      }
      
      const { resources } = await container.items.query({
        query,
        parameters
      }).fetchAll();
      
      return resources;
    } catch (error) {
      console.error(`Error listing items from ${containerName}:`, error);
      throw error;
    }
  }
}

module.exports = new CosmosService();
