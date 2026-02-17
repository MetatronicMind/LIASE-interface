const express = require("express");
const { body, validationResult } = require("express-validator");
const environmentProvisioningService = require("../services/environmentProvisioningService");
const { authorizePermission } = require("../middleware/authorization");

const router = express.Router();

/**
 * @route GET /api/environments/public
 * @desc Get public list of environments for login selector
 * @access Public
 */
router.get("/public", async (req, res) => {
  try {
    const environments =
      await environmentProvisioningService.getAllEnvironments();
    // Return minimal info for login selector
    const publicEnvs = environments.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      // We do NOT send endpoint or keys here.
      // The frontend will need the endpoint to make requests.
      // WARNING: If the frontend talks DIRECTLY to the DB API, it needs the URL.
      url: e.endpoint,
    }));
    res.json(publicEnvs);
  } catch (error) {
    console.error("Failed to list public environments:", error);
    res.status(500).json({ error: "Failed" });
  }
});

/**
 * @route GET /api/environments
 * @desc Get all registered environments
 * @access Admin only
 */
router.get(
  "/",
  authorizePermission("admin_config", "write"),
  async (req, res) => {
    try {
      const environments =
        await environmentProvisioningService.getAllEnvironments();
      // Don't return keys purely
      const safeEnvs = environments.map((e) => ({
        ...e,
        accessKey: e.accessKey ? "******" : null, // Mask key
      }));
      res.json(safeEnvs);
    } catch (error) {
      console.error("Failed to list environments:", error);
      res.status(500).json({ error: "Failed to fetch environments" });
    }
  },
);

/**
 * @route POST /api/environments
 * @desc Register a new external environment (DB)
 * @access Admin only
 */
router.post(
  "/",
  authorizePermission("admin_config", "write"), // Use existing relevant permission
  [
    body("name").isLength({ min: 3 }),
    body("endpoint").isURL(),
    body("key").isString().notEmpty(),
    body("databaseId").isString().notEmpty(),
    body("type").isIn(["sandbox", "production", "staging", "client"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const environment =
        await environmentProvisioningService.registerEnvironment(req.body);
      res.status(201).json(environment);
    } catch (error) {
      console.error("Environment registration failed:", error);
      res.status(500).json({ error: "Failed to register environment" });
    }
  },
);

/**
 * @route POST /api/environments/:id/provision
 * @desc Seed the environment with SuperAdmin/Bootstrap data
 * @access Admin only
 */
router.post(
  "/:id/provision",
  authorizePermission("admin_config", "write"),
  [
    body("username").notEmpty(),
    body("email").isEmail(),
    body("password").notEmpty(), // Currently expecting hash for simplicity, or plain text to hash
  ],
  async (req, res) => {
    try {
      const superAdminData = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password, // Be careful handling passwords here
        firstName: req.body.firstName,
        lastName: req.body.lastName,
      };

      const result = await environmentProvisioningService.provisionEnvironment(
        req.params.id,
        superAdminData,
      );
      res.json(result);
    } catch (error) {
      console.error("Provisioning failed:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

module.exports = router;
