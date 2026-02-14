const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const cosmosService = require("../services/cosmosService");
const User = require("../models/User");
const Role = require("../models/Role");
const AuditLog = require("../models/AuditLog");
const authenticateToken = require("../middleware/auth");
const geolocationService = require("../services/geolocationService");
const emailSenderService = require("../services/emailSenderService");
const crypto = require("crypto");

const router = express.Router();

// Login endpoint
router.post(
  "/login",
  [
    body("email").optional().isEmail().normalizeEmail(),
    body("username").optional().isLength({ min: 3 }),
    body("password").isLength({ min: 8 }),
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

      const { email, username, password, organizationId } = req.body;

      console.log("Login attempt:", {
        email,
        username,
        organizationId,
        hasPassword: !!password,
      });

      // Check that either email or username is provided
      if (!email && !username) {
        return res.status(400).json({
          error: "Either email or username is required",
        });
      }

      // Find user by email or username
      let user;
      const loginIdentifier = email || username;

      // Try email lookup first (handles cases where username field contains email)
      if (loginIdentifier.includes("@")) {
        console.log("Looking up user by email:", loginIdentifier);
        user = await cosmosService.getUserByEmail(loginIdentifier);
      } else {
        console.log("Looking up user by username:", loginIdentifier);
        user = await cosmosService.getUserByUsernameGlobal(loginIdentifier);
      }

      console.log(
        "User found:",
        user ? "Yes" : "No",
        user ? `ID: ${user.id}` : "",
      );

      if (!user || !user.isActive) {
        // Get location information
        const location = await geolocationService
          .getCountryFromIP(req.ip)
          .catch(() => null);

        // Create failed login audit log
        const auditLog = new AuditLog({
          organizationId: "unknown",
          userId: "unknown",
          userName: email || username,
          action: "login_failed",
          resource: "auth",
          resourceId: "unknown",
          details: `Failed login attempt for ${email ? "email" : "username"} ${email || username}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          location,
        });

        await cosmosService
          .createItem("audit-logs", auditLog.toJSON())
          .catch(console.error);

        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      // Validate password
      const userInstance = new User(user);
      console.log("Validating password for user:", user.id);
      const isValidPassword = await userInstance.validatePassword(password);
      console.log("Password validation result:", isValidPassword);

      if (!isValidPassword) {
        // Get location information
        const location = await geolocationService
          .getCountryFromIP(req.ip)
          .catch(() => null);

        // Create failed login audit log
        const auditLog = AuditLog.createLoginLog(
          userInstance,
          req.ip,
          req.get("User-Agent"),
          false,
          location,
        );
        await cosmosService
          .createItem("audit-logs", auditLog.toJSON())
          .catch(console.error);

        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      // Fetch user with populated role permissions using userService
      const userService = require("../services/userService");
      const userWithPermissions = await userService.getUserById(
        user.id,
        user.organizationId,
      );
      console.log(
        "User permissions populated:",
        userWithPermissions ? "Yes" : "No",
      );

      // Update last login
      userWithPermissions.updateLastLogin();
      await cosmosService.updateItem("users", user.id, user.organizationId, {
        lastLogin: userWithPermissions.lastLogin,
        updatedAt: userWithPermissions.updatedAt,
      });

      // Create JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
      );

      // Get location information
      const location = await geolocationService
        .getCountryFromIP(req.ip)
        .catch(() => null);

      // Create successful login audit log
      const auditLog = AuditLog.createLoginLog(
        userWithPermissions,
        req.ip,
        req.get("User-Agent"),
        true,
        location,
      );
      await cosmosService
        .createItem("audit-logs", auditLog.toJSON())
        .catch(console.error);

      // Get organization details with fallback support
      const organization = await cosmosService.getOrganizationById(
        user.organizationId,
      );

      // Check for password expiration warning
      let passwordWarning = false;
      // Check if user is within the 1 week warning period before 3 months expiration
      const passwordChangedAt = new Date(
        userWithPermissions.passwordChangedAt || userWithPermissions.createdAt,
      );
      const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const expiryDate = new Date(passwordChangedAt.getTime() + threeMonthsMs);
      const warningDate = new Date(expiryDate.getTime() - oneWeekMs);

      // If current time is past the warning date (1 week before expiry)
      if (Date.now() >= warningDate.getTime()) {
        passwordWarning = true;
      }

      res.json({
        message: "Login successful",
        token,
        user: userWithPermissions.toSafeJSON(),
        organization: organization
          ? {
              id: organization.id,
              name: organization.name,
              plan: organization.plan,
              settings: organization.settings,
            }
          : null,
        passwordWarning,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Login failed",
        message: error.message,
      });
    }
  },
);

// Register organization and admin user
router.post(
  "/register",
  [
    body("organizationName").isLength({ min: 2 }),
    body("adminEmail").isEmail().normalizeEmail(),
    body("adminPassword").isLength({ min: 8, max: 12 }),
    body("adminFirstName").isLength({ min: 1 }),
    body("adminLastName").isLength({ min: 1 }),
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

      const {
        organizationName,
        adminEmail,
        adminPassword,
        adminFirstName,
        adminLastName,
        plan = "basic",
      } = req.body;

      // Validate required fields
      if (
        !organizationName ||
        !adminEmail ||
        !adminPassword ||
        !adminFirstName ||
        !adminLastName
      ) {
        return res.status(400).json({
          error: "Missing required fields",
          details: {
            organizationName: !organizationName ? "required" : "ok",
            adminEmail: !adminEmail ? "required" : "ok",
            adminPassword: !adminPassword ? "required" : "ok",
            adminFirstName: !adminFirstName ? "required" : "ok",
            adminLastName: !adminLastName ? "required" : "ok",
          },
        });
      }

      // Check if user with email already exists
      const existingUser = await cosmosService.getUserByEmail(adminEmail);
      if (existingUser) {
        return res.status(409).json({
          error: "User with this email already exists",
        });
      }

      // Create organization
      const Organization = require("../models/Organization");
      const organization = new Organization({
        name: organizationName,
        adminEmail,
        plan,
      });

      const orgValidationErrors = Organization.validate(organization);
      if (orgValidationErrors.length > 0) {
        return res.status(400).json({
          error: "Organization validation failed",
          details: orgValidationErrors,
        });
      }

      const createdOrg = await cosmosService.createItem(
        "organizations",
        organization.toJSON(),
      );

      // Create superadmin role for this organization
      const superadminRole = Role.createFromSystemRole(
        "superadmin",
        createdOrg.id,
        "system",
      );
      const createdRole = await cosmosService.createItem(
        "users",
        superadminRole.toJSON(),
      );

      // Create superadmin user
      const username = `${adminEmail.split("@")[0]}_${createdOrg.id.substring(0, 6)}`;
      const adminUser = new User({
        organizationId: createdOrg.id,
        username: username, // Use email prefix + org ID for uniqueness
        email: adminEmail,
        password: adminPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: "superadmin",
        roleId: createdRole.id,
        permissions: superadminRole.permissions,
        createdBy: "system",
      });

      const userValidationErrors = User.validate(adminUser);
      if (userValidationErrors.length > 0) {
        // Cleanup: delete organization if user creation fails
        await cosmosService.deleteItem(
          "organizations",
          createdOrg.id,
          createdOrg.id,
        );
        return res.status(400).json({
          error: "User validation failed",
          details: userValidationErrors,
        });
      }

      console.log(
        "Password before hashing:",
        adminPassword.substring(0, 3) + "***",
      );
      await adminUser.hashPassword();
      console.log(
        "Password after hashing:",
        adminUser.password.substring(0, 10) + "***",
      );
      const createdUser = await cosmosService.createItem(
        "users",
        adminUser.toJSON(),
      );

      // Create initial audit log
      const auditLog = new AuditLog({
        organizationId: createdOrg.id,
        userId: createdUser.id,
        userName: adminUser.getFullName(),
        action: "create",
        resource: "organization",
        resourceId: createdOrg.id,
        details: `Organization ${organizationName} registered with superadmin user`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        metadata: { plan },
      });

      await cosmosService.createItem("audit-logs", auditLog.toJSON());

      res.status(201).json({
        message: "Organization and superadmin user created successfully",
        organization: {
          id: createdOrg.id,
          name: createdOrg.name,
          plan: createdOrg.plan,
        },
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: adminUser.getFullName(),
          role: createdUser.role,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Registration failed",
        message: error.message,
      });
    }
  },
);

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({
        error: "Refresh token required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user to ensure they still exist and are active
    const user = await cosmosService.getItem(
      "users",
      decoded.userId,
      decoded.organizationId,
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "User not found or inactive",
      });
    }

    // Create new token
    const newToken = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
    );

    res.json({
      token: newToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      error: "Invalid refresh token",
    });
  }
});

// Logout endpoint
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    // Get location information
    const location = await geolocationService
      .getCountryFromIP(req.ip)
      .catch(() => null);

    // Create logout audit log
    const auditLog = AuditLog.createLogoutLog(
      req.user,
      req.ip,
      req.get("User-Agent"),
      location,
    );
    await cosmosService
      .createItem("audit-logs", auditLog.toJSON())
      .catch(console.error);

    res.json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    // Even if audit logging fails, we should still return success for logout
    res.json({
      message: "Logout successful",
    });
  }
});

// Forgot Password endpoint
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const { email } = req.body;
      const userDoc = await cosmosService.getUserByEmail(email);

      if (!userDoc) {
        // Return 200 security
        return res
          .status(200)
          .json({
            message:
              "If an account exists with that email, a password reset link has been sent.",
          });
      }

      const userInstance = new User(userDoc);
      const resetToken = userInstance.createPasswordResetToken();

      // Update user in DB
      await cosmosService.updateUser(userInstance.id, userInstance.toJSON());

      // Create reset URL
      const resetUrl = `${req.headers.origin}/reset-password/${resetToken}`;

      const message = `Forgot your password? Click the link to reset your password: ${resetUrl}.\nIf you didn't forget your password, please ignore this email!`;
      const html = `<p>Forgot your password? Click <a href="${resetUrl}">here</a> to reset it.</p><p>If you didn't forget your password, please ignore this email!</p>`;

      try {
        await emailSenderService.sendEmail(userInstance.organizationId, {
          to: userInstance.email,
          subject: "Your password reset request (valid for 10 min)",
          text: message,
          html: html,
        });

        res
          .status(200)
          .json({ status: "success", message: "Token sent to email!" });
      } catch (err) {
        userInstance.passwordResetToken = undefined;
        userInstance.passwordResetExpires = undefined;
        await cosmosService.updateUser(userInstance.id, userInstance.toJSON());
        console.error("Email send error:", err);
        return res
          .status(500)
          .json({
            error: "There was an error sending the email. Try again later!",
          });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Reset Password endpoint
router.post(
  "/reset-password/:token",
  [body("password").isLength({ min: 8 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

      const query = `
            SELECT * FROM c 
            WHERE c.passwordResetToken = @token 
            AND c.passwordResetExpires > @now
        `;
      const parameters = [
        { name: "@token", value: hashedToken },
        { name: "@now", value: new Date().toISOString() },
      ];

      const users = await cosmosService.queryItems("users", query, parameters);
      const userDoc = users[0];

      if (!userDoc) {
        return res
          .status(400)
          .json({ error: "Token is invalid or has expired" });
      }

      const userInstance = new User(userDoc);
      userInstance.password = req.body.password;
      await userInstance.hashPassword(); // Hash the new password

      userInstance.passwordResetToken = undefined;
      userInstance.passwordResetExpires = undefined;
      userInstance.passwordChangedAt = new Date().toISOString();

      await cosmosService.updateUser(userInstance.id, userInstance.toJSON());

      res
        .status(200)
        .json({ status: "success", message: "Password reset successful" });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

module.exports = router;
