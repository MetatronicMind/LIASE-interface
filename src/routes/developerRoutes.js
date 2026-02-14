const express = require("express");
const router = express.Router();
const developerController = require("../controllers/developerController");
const { authorizePermission } = require("../middleware/authorization");

// Protect all developer routes - require admin or developer role
// Assuming 'admin' role or a specific 'system:read/write' permission is needed.
// For now, I'll restrict to users with 'users' 'write' permission as a proxy for admin,
// OR check specifically for an admin role if the middleware supports it.
// The context shows `authorizePermission` takes resource and action.
router.use(authorizePermission("users", "write")); // Restrict to admins

router.get("/health", developerController.getSystemHealth);
router.get("/analytics", developerController.getAnalytics);
router.get("/logs", developerController.getRecentLogs);
router.get("/maintenance", developerController.getMaintenanceOptions);
router.post("/maintenance", developerController.triggerMaintenance);

// Environment Management
router.get("/environments", developerController.getEnvironments);
router.get("/environments/:id", developerController.getEnvironment);
router.get("/environments/:id/users", developerController.getEnvironmentUsers);
router.post("/environments/:id/users", developerController.addEnvironmentUser);
router.get(
  "/environments/:id/settings",
  developerController.getEnvironmentSettings,
);
router.patch(
  "/environments/:id/settings",
  developerController.updateEnvironmentSettings,
);
router.get(
  "/environments/:id/metrics",
  developerController.getEnvironmentMetrics,
);
router.post("/environments/deploy", developerController.deployEnvironment);
router.post("/environments/restart", developerController.restartEnvironment);

module.exports = router;
