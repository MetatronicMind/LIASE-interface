const os = require("os");
const cosmosService = require("../services/cosmosService");
const emailSenderService = require("../services/emailSenderService");
const cacheService = require("../services/cacheService");

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
