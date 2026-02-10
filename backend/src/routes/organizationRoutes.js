const express = require("express");
const { body, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const cosmosService = require("../services/cosmosService");
const Organization = require("../models/Organization");
const User = require("../models/User");
const roleService = require("../services/roleService");
const Role = require("../models/Role"); // Import Role model if needed for default roles
const { authorizeRole } = require("../middleware/authorization");
const { auditAction } = require("../middleware/audit");

const router = express.Router();

// Create new organization (Super Admin only) - CRM Onboarding
router.post(
  "/",
  authorizeRole("superadmin"),
  [
    body("name").isLength({ min: 2 }),
    body("adminEmail").isEmail(),
    body("databaseId")
      .notEmpty()
      .withMessage("Database ID (Tenant ID) is required"),
    body("adminPassword").optional().isLength({ min: 8 }), // If not provided, will be generated
  ],
  async (req, res) => {
    let createdOrg = null;
    let createdRole = null;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { name, adminEmail, databaseId, adminPassword } = req.body;

      // Check if tenant ID (databaseId) already exists
      const existingOrgs = await cosmosService.queryItems(
        "organizations",
        "SELECT * FROM c WHERE c.tenantId = @tenantId",
        [{ name: "@tenantId", value: databaseId }]
      );

      if (existingOrgs && existingOrgs.length > 0) {
        return res
          .status(409)
          .json({ error: "Organization with this Database ID (Tenant ID) already exists" });
      }

      // Check if admin email is already in use
      const existingUser = await cosmosService.getUserByEmail(adminEmail);
      if (existingUser) {
        return res
          .status(409)
          .json({ error: "Admin email is already registered" });
      }

      // Generate a new UUID for the organization
      const organizationId = uuidv4();

      // 1. Create Organization
      const newOrg = new Organization({
        id: organizationId,
        name,
        contactEmail: adminEmail,
        tenantId: databaseId, // Store databaseId as tenantId
        settings: {
          maxUsers: 5,
          maxDrugs: 10,
          maxStudies: 100,
        },
        plan: "Standard",
      });

      await cosmosService.createItem("organizations", newOrg.toJSON());
      createdOrg = newOrg;
      console.log(`Organization created: ${organizationId} (Tenant: ${databaseId})`);

      // 2. Create Admin Role for this Org using proper system role template
      // First check if Admin role already exists (unlikely with new UUID but good practice)
      let adminRole;
      const existingRoles = await cosmosService.queryItems(
        "roles",
        `SELECT * FROM c WHERE c.organizationId = @orgId AND c.name = @roleName`,
        [
          { name: "@orgId", value: organizationId },
          { name: "@roleName", value: "admin" },
        ]
      );

      if (existingRoles && existingRoles.length > 0) {
        console.log(`Admin role already exists for org: ${organizationId}, using existing`);
        adminRole = new Role(existingRoles[0]);
      } else {
        // Create new Admin role using system template (proper permissions)
        adminRole = Role.createFromSystemRole("admin", organizationId);
        await cosmosService.createItem("roles", adminRole.toJSON());
        createdRole = adminRole;
        console.log(`Admin role created for org: ${organizationId}`);
      }

      // 3. Create Admin User
      const generatedPassword =
        adminPassword || Math.random().toString(36).slice(-10) + "A1!";

      const newUser = new User({
        email: adminEmail,
        username: adminEmail.split("@")[0],
        firstName: "Admin",
        lastName: "User",
        role: "Admin",
        roleId: adminRole.id,
        organizationId: organizationId,
        isActive: true,
        password: generatedPassword, // Set password directly
      });

      // Hash the password before saving
      await newUser.hashPassword();
      await cosmosService.createItem("users", newUser.toJSON());
      console.log(`Admin user created for org: ${organizationId}`);

      res.status(201).json({
        message: "Organization created successfully",
        organization: newOrg.toJSON(),
        adminUser: {
          email: newUser.email,
          password: generatedPassword,
        },
      });
    } catch (error) {
      console.error("Error creating organization:", error);

      // Rollback: Delete created items if partial failure
      try {
        if (createdRole) {
          await cosmosService.deleteItem("roles", createdRole.id, createdRole.organizationId);
          console.log("Rolled back: Deleted role");
        }
        if (createdOrg) {
          await cosmosService.deleteItem("organizations", createdOrg.id, createdOrg.id);
          console.log("Rolled back: Deleted organization");
        }
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }

      res.status(500).json({
        error: "Failed to create organization",
        message: error.message,
      });
    }
  },
);

// Get all organizations (Super Admin only)
router.get("/", authorizeRole("superadmin"), async (req, res) => {
  try {
    const query = 'SELECT * FROM c WHERE c.type = "organization"';
    const organizations = await cosmosService.queryItems(
      "organizations",
      query,
      [],
    );
    res.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({
      error: "Failed to fetch organizations",
      message: error.message,
    });
  }
});

// Get aggregated summary for CRM Dashboard (Super Admin only)
router.get("/summary", authorizeRole("superadmin"), async (req, res) => {
  try {
    // Get all organizations
    const query = 'SELECT * FROM c WHERE c.type = "organization"';
    const organizations = await cosmosService.queryItems(
      "organizations",
      query,
      [],
    );

    // Gather stats for each organization in parallel
    const clientsWithStats = await Promise.all(
      organizations.map(async (org) => {
        try {
          const [users, studies, drugs, auditLogs] = await Promise.all([
            cosmosService.getUsersByOrganization(org.id),
            cosmosService.getStudiesByOrganization(org.id),
            cosmosService.getDrugsByOrganization(org.id),
            cosmosService.getAuditLogsByOrganization(org.id, 10), // Just recent ones
          ]);

          // Get last activity timestamp
          const lastActivity = auditLogs.length > 0
            ? auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]?.timestamp
            : org.createdAt;

          return {
            id: org.id,
            name: org.name,
            plan: org.plan || "Standard",
            contactEmail: org.contactEmail || org.adminEmail,
            createdAt: org.createdAt,
            userCount: users.length,
            activeUsers: users.filter(u => u.isActive).length,
            studyCount: studies.length,
            pendingStudies: studies.filter(s => 
              ["Pending Review", "Pending", "Under Triage Review"].includes(s.status)
            ).length,
            drugCount: drugs.length,
            activeDrugs: drugs.filter(d => d.status === "Active").length,
            lastActivity: lastActivity,
            recentActions: auditLogs.slice(0, 3).map(log => ({
              action: log.action,
              resource: log.resource,
              timestamp: log.timestamp,
              userName: log.userName || "System"
            }))
          };
        } catch (err) {
          console.error(`Error fetching stats for org ${org.id}:`, err);
          return {
            id: org.id,
            name: org.name,
            plan: org.plan || "Standard",
            contactEmail: org.contactEmail || org.adminEmail,
            createdAt: org.createdAt,
            userCount: 0,
            activeUsers: 0,
            studyCount: 0,
            pendingStudies: 0,
            drugCount: 0,
            activeDrugs: 0,
            lastActivity: org.createdAt,
            recentActions: []
          };
        }
      })
    );

    // Calculate totals
    const totals = clientsWithStats.reduce(
      (acc, client) => ({
        totalUsers: acc.totalUsers + client.userCount,
        totalActiveUsers: acc.totalActiveUsers + client.activeUsers,
        totalStudies: acc.totalStudies + client.studyCount,
        totalPendingStudies: acc.totalPendingStudies + client.pendingStudies,
        totalDrugs: acc.totalDrugs + client.drugCount,
        totalActiveDrugs: acc.totalActiveDrugs + client.activeDrugs,
      }),
      { totalUsers: 0, totalActiveUsers: 0, totalStudies: 0, totalPendingStudies: 0, totalDrugs: 0, totalActiveDrugs: 0 }
    );

    // Get recent activity across all orgs (for activity feed)
    let recentActivity = [];
    for (const client of clientsWithStats) {
      recentActivity.push(
        ...client.recentActions.map(action => ({
          ...action,
          clientId: client.id,
          clientName: client.name
        }))
      );
    }
    recentActivity = recentActivity
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json({
      totalClients: organizations.length,
      ...totals,
      clients: clientsWithStats.sort((a, b) => 
        new Date(b.lastActivity) - new Date(a.lastActivity)
      ),
      recentActivity
    });
  } catch (error) {
    console.error("Error fetching organizations summary:", error);
    res.status(500).json({
      error: "Failed to fetch organizations summary",
      message: error.message,
    });
  }
});

// ============================================================
// CRM-SPECIFIC ENDPOINTS (Superadmin access to any organization)
// ============================================================

// Get users for a specific organization (Super Admin only - for CRM)
router.get("/:orgId/users", authorizeRole("superadmin"), async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify org exists
    const org = await cosmosService.getItem("organizations", orgId, orgId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Get all users for this organization
    const users = await cosmosService.getUsersByOrganization(orgId);

    // Remove passwords and format response
    const safeUsers = users.map(user => {
      const u = new User(user);
      return u.toSafeJSON ? u.toSafeJSON() : {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      };
    });

    res.json({
      users: safeUsers,
      total: safeUsers.length,
      organizationId: orgId,
    });
  } catch (error) {
    console.error("Error fetching organization users:", error);
    res.status(500).json({
      error: "Failed to fetch organization users",
      message: error.message,
    });
  }
});

// Get statistics for a specific organization (Super Admin only - for CRM)
router.get("/:orgId/stats", authorizeRole("superadmin"), async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify org exists
    const org = await cosmosService.getItem("organizations", orgId, orgId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Get all data for this organization
    const [users, drugs, studies, auditLogs] = await Promise.all([
      cosmosService.getUsersByOrganization(orgId),
      cosmosService.getDrugsByOrganization(orgId),
      cosmosService.getStudiesByOrganization(orgId),
      cosmosService.getAuditLogsByOrganization(orgId, 1000),
    ]);

    const stats = {
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        createdAt: org.createdAt,
      },
      users: {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
        byRole: users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}),
      },
      drugs: {
        total: drugs.length,
        active: drugs.filter(d => d.status === "Active").length,
        inactive: drugs.filter(d => d.status === "Inactive").length,
      },
      studies: {
        total: studies.length,
        pending: studies.filter(s =>
          ["Pending Review", "Pending", "Under Triage Review"].includes(s.status)
        ).length,
        underReview: studies.filter(s => s.status === "Under Review").length,
        approved: studies.filter(s => s.status === "Approved").length,
        rejected: studies.filter(s => s.status === "Rejected").length,
      },
      activity: {
        totalActions: auditLogs.length,
        recentLogins: auditLogs.filter(log =>
          log.action === "login" &&
          new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching organization stats:", error);
    res.status(500).json({
      error: "Failed to fetch organization statistics",
      message: error.message,
    });
  }
});

// Get change requests for a specific organization (Super Admin only - for CRM Gatekeeper)
router.get("/:orgId/requests", authorizeRole("superadmin"), async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify org exists
    const org = await cosmosService.getItem("organizations", orgId, orgId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Try to get change requests for this organization
    // Note: This depends on having a 'change_requests' container or similar
    let requests = [];
    try {
      const query = `SELECT * FROM c WHERE c.organizationId = @orgId AND c.type = "change_request" ORDER BY c.createdAt DESC`;
      requests = await cosmosService.queryItems("change_requests", query, [
        { name: "@orgId", value: orgId },
      ]);
    } catch (e) {
      // If container doesn't exist, return empty array
      console.log("Change requests container may not exist:", e.message);
    }

    res.json({
      requests: requests,
      total: requests.length,
      pending: requests.filter(r => r.status === "pending").length,
      organizationId: orgId,
    });
  } catch (error) {
    console.error("Error fetching organization requests:", error);
    res.status(500).json({
      error: "Failed to fetch organization requests",
      message: error.message,
    });
  }
});

// Get organization details by ID (Super Admin only - for CRM)
router.get("/:orgId/details", authorizeRole("superadmin"), async (req, res) => {
  try {
    const { orgId } = req.params;

    const org = await cosmosService.getItem("organizations", orgId, orgId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json(org);
  } catch (error) {
    console.error("Error fetching organization details:", error);
    res.status(500).json({
      error: "Failed to fetch organization details",
      message: error.message,
    });
  }
});

// ------------------------------------------------------------------
// ROLE MANAGEMENT ENDPOINTS (CRM Superadmin managing client roles)
// ------------------------------------------------------------------

// Get roles for a specific organization
router.get("/:orgId/roles", authorizeRole("superadmin"), async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify org exists
    const org = await cosmosService.getItem("organizations", orgId, orgId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const roles = await roleService.getRolesByOrganization(orgId);

    res.json({
      roles: roles.map(role => role.toJSON()),
      total: roles.length
    });

  } catch (error) {
    console.error("Error fetching organization roles:", error);
    res.status(500).json({
      error: "Failed to fetch roles",
      message: error.message
    });
  }
});

// Get role details for a specific organization
router.get("/:orgId/roles/:roleId", authorizeRole("superadmin"), async (req, res) => {
  try {
    const { orgId, roleId } = req.params;

    // Verify org exists
    const org = await cosmosService.getItem("organizations", orgId, orgId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Role service might expect permissions/context, but here we just want the item
    // We can reuse getRoleById if updated or just query manually/use cosmosService
    // Using cosmosService directly is safest for Admin View as roleService often implies "my org" context
    const role = await cosmosService.getItem("roles", roleId, orgId);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json({ role });

  } catch (error) {
    console.error("Error fetching organization role:", error);
    res.status(500).json({
      error: "Failed to fetch role",
      message: error.message
    });
  }
});

// Create role for a specific organization
router.post("/:orgId/roles",
  authorizeRole("superadmin"),
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Role name must be 2-50 characters, lowercase letters, numbers, and underscores only'),
    body('displayName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Display name must be 2-100 characters'),
    body('permissions')
      .isObject()
      .withMessage('Permissions must be an object')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { orgId } = req.params;

      // Verify org exists
      const org = await cosmosService.getItem("organizations", orgId, orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const roleData = {
        organizationId: orgId,
        name: req.body.name,
        displayName: req.body.displayName,
        description: req.body.description || '',
        permissions: req.body.permissions,
        isSystemRole: false
      };

      const role = await roleService.createRole(roleData, req.user);

      // Log the action
      await auditAction(req, 'CREATE', 'role', role.id, {
        roleName: role.name,
        displayName: role.displayName,
        targetOrganizationId: orgId
      });

      res.status(201).json({
        message: 'Role created successfully',
        role: role.toJSON()
      });

    } catch (error) {
      console.error('Error creating organization role:', error);

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to create role',
        message: error.message
      });
    }
  }
);

// Update role for a specific organization
router.put("/:orgId/roles/:roleId",
  authorizeRole("superadmin"),
  [
    body('displayName').optional().trim().isLength({ min: 2 }),
    body('permissions').optional().isObject()
  ],
  async (req, res) => {
    try {
      const { orgId, roleId } = req.params;

      const updateData = {};
      ['name', 'displayName', 'description', 'permissions'].forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const role = await roleService.updateRole(
        roleId,
        orgId,
        updateData,
        req.user
      );

      // Log the action
      await auditAction(req, 'UPDATE', 'role', role.id, {
        roleName: role.name,
        displayName: role.displayName,
        targetOrganizationId: orgId
      });

      res.json({
        message: 'Role updated successfully',
        role: role.toJSON()
      });

    } catch (error) {
      console.error('Error updating organization role:', error);

      if (error.message === 'Role not found') {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes('Cannot modify')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Failed to update role',
        message: error.message
      });
    }
  }
);

// Delete role for a specific organization
router.delete("/:orgId/roles/:roleId",
  authorizeRole("superadmin"),
  async (req, res) => {
    try {
      const { orgId, roleId } = req.params;

      const role = await roleService.deleteRole(roleId, orgId, req.user);

      // Log the action
      await auditAction(req, 'DELETE', 'role', role.id, {
        roleName: role.name,
        targetOrganizationId: orgId
      });

      res.json({
        message: 'Role deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting organization role:', error);

      if (error.message === 'Role not found') {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes('Cannot delete') || error.message.includes('user(s) are assigned')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Failed to delete role',
        message: error.message
      });
    }
  }
);

// ============================================================
// END CRM-SPECIFIC ENDPOINTS
// ============================================================

// Get organization details
router.get("/me", async (req, res) => {
  try {
    const organization = await cosmosService.getItem(
      "organizations",
      req.user.organizationId,
      req.user.organizationId,
    );

    if (!organization) {
      return res.status(404).json({
        error: "Organization not found",
      });
    }

    res.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    res.status(500).json({
      error: "Failed to fetch organization",
      message: error.message,
    });
  }
});

// Update organization settings (Admin only)
router.put(
  "/me",
  authorizeRole("Admin"),
  [
    body("name").optional().isLength({ min: 2 }),
    body("settings").optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const updates = req.body;

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.domain;
      delete updates.adminEmail;
      delete updates.plan; // Plan changes should go through billing
      delete updates.createdAt;

      const updatedOrganization = await cosmosService.updateItem(
        "organizations",
        req.user.organizationId,
        req.user.organizationId,
        updates,
      );

      // Create audit log
      await auditAction(
        req.user,
        "update",
        "organization",
        req.user.organizationId,
        "Updated organization settings",
        { updates: Object.keys(updates) },
      );

      res.json({
        message: "Organization updated successfully",
        organization: updatedOrganization,
      });
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({
        error: "Failed to update organization",
        message: error.message,
      });
    }
  },
);

// Get organization statistics (Admin only)
router.get("/stats", authorizeRole("Admin"), async (req, res) => {
  try {
    const [users, drugs, studies, auditLogs] = await Promise.all([
      cosmosService.getUsersByOrganization(req.user.organizationId),
      cosmosService.getDrugsByOrganization(req.user.organizationId),
      cosmosService.getStudiesByOrganization(req.user.organizationId),
      cosmosService.getAuditLogsByOrganization(req.user.organizationId, 1000),
    ]);

    const stats = {
      users: {
        total: users.length,
        active: users.filter((u) => u.isActive).length,
        byRole: users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {}),
      },
      drugs: {
        total: drugs.length,
        active: drugs.filter((d) => d.status === "Active").length,
        inactive: drugs.filter((d) => d.status === "Inactive").length,
        suspended: drugs.filter((d) => d.status === "Suspended").length,
      },
      studies: {
        total: studies.length,
        pendingReview: studies.filter((s) =>
          ["Pending Review", "Pending", "Under Triage Review"].includes(
            s.status,
          ),
        ).length,
        underReview: studies.filter((s) => s.status === "Under Review").length,
        approved: studies.filter((s) => s.status === "Approved").length,
        rejected: studies.filter((s) => s.status === "Rejected").length,
      },
      activity: {
        totalActions: auditLogs.length,
        recentLogins: auditLogs.filter(
          (log) =>
            log.action === "login" &&
            new Date(log.timestamp) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        ).length,
        topActions: Object.entries(
          auditLogs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
          }, {}),
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5),
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching organization statistics:", error);
    res.status(500).json({
      error: "Failed to fetch organization statistics",
      message: error.message,
    });
  }
});

// Get usage metrics (Admin only)
router.get("/usage", authorizeRole("Admin"), async (req, res) => {
  try {
    const organization = await cosmosService.getItem(
      "organizations",
      req.user.organizationId,
      req.user.organizationId,
    );

    if (!organization) {
      return res.status(404).json({
        error: "Organization not found",
      });
    }

    const [users, drugs, studies] = await Promise.all([
      cosmosService.getUsersByOrganization(req.user.organizationId),
      cosmosService.getDrugsByOrganization(req.user.organizationId),
      cosmosService.getStudiesByOrganization(req.user.organizationId),
    ]);

    const usage = {
      plan: organization.plan,
      limits: organization.settings,
      current: {
        users: users.length,
        drugs: drugs.length,
        studies: studies.length,
      },
      percentages: {
        users: Math.round(
          (users.length / organization.settings.maxUsers) * 100,
        ),
        drugs: Math.round(
          (drugs.length / organization.settings.maxDrugs) * 100,
        ),
        studies: Math.round(
          (studies.length / organization.settings.maxStudies) * 100,
        ),
      },
      warnings: [],
    };

    // Add warnings for approaching limits
    if (usage.percentages.users > 80) {
      usage.warnings.push(`User limit is ${usage.percentages.users}% full`);
    }
    if (usage.percentages.drugs > 80) {
      usage.warnings.push(`Drug limit is ${usage.percentages.drugs}% full`);
    }
    if (usage.percentages.studies > 80) {
      usage.warnings.push(`Study limit is ${usage.percentages.studies}% full`);
    }

    res.json(usage);
  } catch (error) {
    console.error("Error fetching usage metrics:", error);
    res.status(500).json({
      error: "Failed to fetch usage metrics",
      message: error.message,
    });
  }
});

// Validate if organization can add more resources
router.post(
  "/validate-limit",
  [
    body("resource").isIn(["users", "drugs", "studies"]),
    body("count").optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { resource, count = 1 } = req.body;

      const organization = await cosmosService.getItem(
        "organizations",
        req.user.organizationId,
        req.user.organizationId,
      );

      if (!organization) {
        return res.status(404).json({
          error: "Organization not found",
        });
      }

      // Get current count
      let currentCount = 0;
      const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
      const limit = organization.settings[limitKey];

      switch (resource) {
        case "users":
          const users = await cosmosService.getUsersByOrganization(
            req.user.organizationId,
          );
          currentCount = users.length;
          break;
        case "drugs":
          const drugs = await cosmosService.getDrugsByOrganization(
            req.user.organizationId,
          );
          currentCount = drugs.length;
          break;
        case "studies":
          const studies = await cosmosService.getStudiesByOrganization(
            req.user.organizationId,
          );
          currentCount = studies.length;
          break;
      }

      const canAdd = currentCount + count <= limit;
      const remaining = limit - currentCount;

      res.json({
        resource,
        currentCount,
        limit,
        requestedCount: count,
        canAdd,
        remaining,
        wouldExceed: !canAdd,
        plan: organization.plan,
      });
    } catch (error) {
      console.error("Error validating limit:", error);
      res.status(500).json({
        error: "Failed to validate limit",
        message: error.message,
      });
    }
  },
);

module.exports = router;
