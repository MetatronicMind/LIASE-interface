const express = require('express');
const { migrateAdminPermissions } = require('../../scripts/migrate-admin-permissions');
const { authorizeRole } = require('../middleware/authorization');

const router = express.Router();

// Migrate admin permissions - only superadmin can trigger this
router.post('/migrate-admin-permissions', 
  authorizeRole('superadmin', 'admin'),
  async (req, res) => {
    try {
      const result = await migrateAdminPermissions();
      res.json({
        message: 'Admin permissions migration completed successfully',
        result
      });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({
        error: 'Migration failed',
        message: error.message
      });
    }
  }
);

module.exports = router;