const os = require("os");
const cosmosService = require("../services/cosmosService");
const emailSenderService = require("../services/emailSenderService");
const cacheService = require("../services/cacheService");
const fs = require("fs");
const path = require("path");
const axios = require("axios"); // Add axios for health checks

// Helper to get formatted duration
const getUptime = () => {
  const uptime = process.uptime();
  const days = Math.floor(uptime / (3600 * 24));
  const hours = Math.floor((uptime % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

exports.getSystemHealth = async (req, res) => {
  try {
    const cosmosStatus = cosmosService.getStatus
      ? cosmosService.getStatus()
      : { initialized: false };
    const dbStatus = cosmosStatus.initialized ? "connected" : "disconnected";
    const memoryUsage = process.memoryUsage();
    const systemLoad = os.loadavg();

    res.json({
      status: "success",
      data: {
        server: {
          uptime: getUptime(),
          platform: os.platform(),
          nodeVersion: process.version,
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          },
          loadAverage: systemLoad,
        },
        database: {
          status: dbStatus,
          host: process.env.COSMOS_DB_ENDPOINT || "unknown",
          name: process.env.COSMOS_DB_DATABASE_ID || "LIASE-Database",
        },
        cache: {
          status:
            cacheService && cacheService.client && cacheService.client.isOpen
              ? "connected"
              : "local/disconnected",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching system health:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    // Helper for basic execution
    const runQuery = async (container, query) => {
      try {
        return await cosmosService.queryItems(container, query);
      } catch (e) {
        console.error(`Query failed for ${container}: ${query}`, e.message);
        return [];
      }
    };

    // Study Stats
    const totalStudiesRes = await runQuery(
      "studies",
      "SELECT VALUE COUNT(1) FROM c",
    );
    const totalStudies = totalStudiesRes[0] || 0;

    const studiesByStatusRes = await runQuery(
      "studies",
      "SELECT c.status, COUNT(1) as count FROM c GROUP BY c.status",
    );
    const studiesByStatus = studiesByStatusRes;

    // User Stats
    const totalUsersRes = await runQuery(
      "users",
      "SELECT VALUE COUNT(1) FROM c",
    );
    const totalUsers = totalUsersRes[0] || 0;

    const usersByRoleRes = await runQuery(
      "users",
      "SELECT c.role, COUNT(1) as count FROM c GROUP BY c.role",
    );

    // Recent Activity (Last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Audit Logs (using container 'audit-logs' as per cosmosService)
    const recentAuditLogsRes = await runQuery(
      "audit-logs",
      `SELECT VALUE COUNT(1) FROM c WHERE c.createdAt >= '${oneDayAgo}'`,
    );
    const recentAuditLogs = recentAuditLogsRes[0] || 0;

    const recentErrorsRes = await runQuery(
      "audit-logs",
      `SELECT VALUE COUNT(1) FROM c WHERE c.createdAt >= '${oneDayAgo}' AND (CONTAINS(LOWER(c.action), "error") OR CONTAINS(LOWER(c.action), "fail"))`,
    );
    const recentErrors = recentErrorsRes[0] || 0;

    // Job Stats
    const failedJobsRes = await runQuery(
      "ScheduledJobs",
      "SELECT VALUE COUNT(1) FROM c WHERE c.status = 'failed'",
    );
    const failedJobs = failedJobsRes[0] || 0;

    // Email Stats - assuming 'Emails' container
    const failedEmailsRes = await runQuery(
      "Emails",
      `SELECT VALUE COUNT(1) FROM c WHERE c.status = 'failed' AND c.createdAt >= '${oneDayAgo}'`,
    );
    const failedEmails = failedEmailsRes[0] || 0;

    // Format breakdown for frontend
    const studyBreakdown = {};
    studiesByStatus.forEach((item) => {
      studyBreakdown[item.status || "unknown"] = item.count;
    });

    const userBreakdown = {};
    usersByRoleRes.forEach((item) => {
      userBreakdown[item.role || "unknown"] = item.count;
    });

    res.json({
      status: "success",
      data: {
        studies: {
          total: totalStudies,
          breakdown: studyBreakdown,
        },
        users: {
          total: totalUsers,
          breakdown: userBreakdown,
        },
        activity: {
          logsWithIn24h: recentAuditLogs,
          errorsIn24h: recentErrors,
          failedJobsTotal: failedJobs,
          failedEmails24h: failedEmails,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getRecentLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    // Cosmos DB SQL query
    const query = `SELECT TOP ${limit} * FROM c ORDER BY c.createdAt DESC`;
    const logs = await cosmosService.queryItems("audit-logs", query);

    // Transform purely for frontend compatibility if needed
    const formattedLogs = logs.map((log) => ({
      _id: log.id,
      createdAt: log.createdAt || log.timestamp,
      action: log.action,
      entityType: log.resource || "SYSTEM",
      details: log.details,
      userId: {
        username: log.userName || "Unknown",
        email: "N/A", // Audit log might not have email
      },
    }));

    res.json({
      status: "success",
      data: formattedLogs,
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getMaintenanceOptions = async (req, res) => {
  res.json({
    status: "success",
    data: [
      {
        id: "clear_cache",
        label: "Clear System Cache",
        description: "Flushes the Redis/Memory cache.",
        danger: false,
      },
      {
        id: "test_email",
        label: "Send Test Email",
        description: "Sends a test email to the current user.",
        danger: false,
      },
    ],
  });
};

exports.triggerMaintenance = async (req, res) => {
  const { action } = req.body;

  try {
    let result = { message: "Action completed" };

    switch (action) {
      case "clear_cache":
        if (cacheService.flushPattern) {
          await cacheService.flushPattern("*");
        } else if (cacheService.client) {
          await cacheService.client.flushAll(); // Fallback to direct client
        }
        result.message = "Cache cleared successfully";
        break;
      case "test_email":
        if (!req.user || !req.user.email) {
          throw new Error("User email not found in request");
        }

        // Use organizationId from user if available
        const orgId = req.user.organizationId;
        if (!orgId) {
          throw new Error("User organization ID not found");
        }

        // Call emailSenderService.sendEmail(organizationId, emailData)
        if (emailSenderService && emailSenderService.sendEmail) {
          await emailSenderService.sendEmail(orgId, {
            to: [req.user.email], // Expects array usually, or check service
            subject: "Test Email from Developer Dashboard",
            html: "<p>This is a test email sent from the Developer Dashboard.</p>",
            templateId: "system-test", // Optional or handled by service?
          });
          result.message = `Test email sent to ${req.user.email}`;
        } else {
          throw new Error("Email service not available");
        }
        break;
      default:
        throw new Error("Unknown maintenance action");
    }

    res.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error(`Error performing maintenance action ${action}:`, error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

const environmentsConfig = [
  {
    id: "production",
    name: "LIASE (Main)",
    url: process.env.PRODUCTION_URL || "https://liase.azurewebsites.net",
    apiUrl:
      process.env.PRODUCTION_API_URL ||
      "https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net",
    dbName: "liase-database",
    branch: "main",
    version: "1.0.0",
    azureName: "liase",
  },
  {
    id: "development",
    name: "LIASE Dev (Developer)",
    url: process.env.DEV_URL || "https://liase-dev.azurewebsites.net",
    apiUrl: process.env.DEV_API_URL || "https://liase-dev.azurewebsites.net",
    dbName: "liase-database-dev",
    branch: "dev",
    version: "1.1.0-beta",
    azureName: "liase-dev",
  },
  {
    id: "sandbox",
    name: "LIASE Sandbox",
    url: process.env.SANDBOX_URL || "https://liase-sandbox.azurewebsites.net",
    apiUrl:
      process.env.SANDBOX_API_URL ||
      "https://liase-backend-liase-sandbox.azurewebsites.net",
    dbName: "liase-database-sandbox",
    branch: "sandbox",
    version: "0.0.7-sandbox",
    azureName: "liase-sandbox",
  },
];

exports.getEnvironments = async (req, res) => {
  try {
    // Read deployment trigger status
    const deployTriggerPath = path.join(__dirname, "../../DEPLOY_TRIGGER.txt");
    let deployTrigger = "None";
    if (fs.existsSync(deployTriggerPath)) {
      deployTrigger = fs.readFileSync(deployTriggerPath, "utf8").trim();
    }

    // Add deployment status to config
    const configWithStatus = environmentsConfig.map((env) => ({
      ...env,
      lastDeploy: env.id === "sandbox" ? deployTrigger : "Managed by Pipeline",
    }));

    // Check health of each environment in parallel
    const envsWithStatus = await Promise.all(
      configWithStatus.map(async (env) => {
        try {
          // Attempt to fetch health endpoint
          // Use apiUrl for health check, fallback to url if not set
          const targetUrl = env.apiUrl || env.url;
          const healthUrl = `${targetUrl}/api/health`;

          await axios.get(healthUrl, { timeout: 5000 });
          return { ...env, status: "healthy" };
        } catch (error) {
          // If connection fails, mark as unhealthy/down
          // Log the url we tried to help debugging
          const targetUrl = env.apiUrl || env.url;
          console.error(
            `Health check failed for ${env.id} at ${targetUrl}: ${error.message}`,
          );
          return { ...env, status: "unhealthy", error: error.message };
        }
      }),
    );

    res.json({
      status: "success",
      data: envsWithStatus,
    });
  } catch (error) {
    console.error("Error fetching environments:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.restartEnvironment = async (req, res) => {
  try {
    const INTERNAL_RESTART_KEY = "liase-dev-restart-bypass-2026-secure";
    const providedKey = req.headers["x-liase-restart-key"];
    let isSystemAuth = false;

    if (providedKey === INTERNAL_RESTART_KEY) {
      isSystemAuth = true;
      console.log("[Restart] Authenticated via System Key");
    } else {
      // Perform standard auth check manually since we bypassed global middleware
      const authenticateToken = require("../middleware/auth");

      // Wrap middleware in promise to await it
      const runAuth = () =>
        new Promise((resolve) => {
          authenticateToken(req, res, () => {
            resolve("next");
          });
        });

      // If auth fails, it sends response. We check headersSent after.
      await runAuth();
      if (res.headersSent) return;
    }

    const { env } = req.body;
    const targetEnv = environmentsConfig.find((e) => e.id === env);

    if (!targetEnv) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid environment ID" });
    }

    // Determine if we are the target environment
    // Robust check: Azure Site Name OR Database Name match
    const currentAzureName = process.env.WEBSITE_SITE_NAME;
    const currentDbName = process.env.COSMOS_DB_DATABASE_ID;
    
    console.log(`[Restart Debug] Request for: ${env}`);
    console.log(`[Restart Debug] Current Site: ${currentAzureName}, Current DB: ${currentDbName}`);
    console.log(`[Restart Debug] Target Site: ${targetEnv.azureName}, Target DB: ${targetEnv.dbName}`);

    const isTarget = 
      (currentAzureName && currentAzureName.includes(targetEnv.azureName)) ||
      (currentDbName && currentDbName === targetEnv.dbName);

    if (isTarget) {
      // We are the target: Self-destruct to trigger restart
      console.log(`[Restart] Triggering self-restart for ${env}...`);

      res.json({
        status: "success",
        message: `Restarting ${env} server process immediately.`,
      });

      setTimeout(() => {
        process.exit(1);
      }, 1000);
      return;
    }

    // We are NOT the target: Proxy request to target environment
    console.log(
      `[Restart] Proxying restart request to ${targetEnv.id} (${targetEnv.apiUrl})...`,
    );

    try {
      const targetUrl = targetEnv.apiUrl || targetEnv.url;

      // Call the EXACT SAME endpoint on the remote server with the System Key
      const response = await axios.post(
        `${targetUrl}/api/developer/environments/restart`,
        { env },
        {
          headers: {
            Authorization: req.headers.authorization || "", // Pass user token just in case
            "x-liase-restart-key": INTERNAL_RESTART_KEY, // Pass system key for bypass
            "Content-Type": "application/json",
          },
          timeout: 10000, // Increased timeout to 10s
        },
      );

      return res.json(response.data);
    } catch (proxyError) {
      console.error(`[Restart] Proxy failed: ${proxyError.message}`);

      // Fallback: File Trigger (only works if sharing FS or pipeline watching repo)
      const triggerPath = path.join(
        __dirname,
        `../../RESTART_TRIGGER_${env.toUpperCase()}.txt`,
      );
      const content = `Restart Triggered for ${env}\nBy: ${req.user ? req.user.email : "Unknown"}\nDate: ${new Date().toISOString()}`;
      fs.writeFileSync(triggerPath, content);

      return res.json({
        status: "success",
        message: `Direct restart failed (${proxyError.response?.status || proxyError.message}). Fallback signal recorded.`,
      });
    }
  } catch (error) {
    console.error("Error restarting environment:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.deployEnvironment = async (req, res) => {
  try {
    const { env, version } = req.body;

    if (env === "sandbox") {
      const deployTriggerPath = path.join(
        __dirname,
        "../../DEPLOY_TRIGGER.txt",
      );
      const triggerContent = `Trigger Sandbox Deploy ${version || "latest"}\nBy: ${req.user ? req.user.email : "Unknown"}\nDate: ${new Date().toISOString()}`;

      // Update backend trigger
      fs.writeFileSync(deployTriggerPath, triggerContent);

      // Try to update frontend trigger if it exists (for local development/monorepo)
      const frontendTriggerPath = path.join(
        __dirname,
        "../../../crm-frontend/DEPLOY_TRIGGER.txt",
      );
      if (fs.existsSync(frontendTriggerPath)) {
        try {
          fs.writeFileSync(frontendTriggerPath, triggerContent);
        } catch (err) {
          console.warn("Could not update frontend trigger file:", err.message);
        }
      }

      res.json({
        status: "success",
        message: `Deployment triggered for ${env} version ${version || "latest"}`,
      });
    } else {
      // For now, only sandbox is automated
      res.status(400).json({
        status: "error",
        message:
          "Only sandbox deployment is supported via this interface currently. Contact DevOps for Staging/Prod.",
      });
    }
  } catch (error) {
    console.error("Error triggering deployment:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
};
