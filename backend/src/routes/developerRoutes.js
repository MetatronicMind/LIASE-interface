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

module.exports = router;
