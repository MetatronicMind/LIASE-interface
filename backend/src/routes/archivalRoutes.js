const express = require('express');
const router = express.Router();
const archivalService = require('../services/archivalService');
const authenticateToken = require('../middleware/auth');

/**
 * @route   GET /api/archival/config
 * @desc    Get archival configuration
 * @access  Private (Admin)
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    const config = await archivalService.getArchivalConfig(organizationId);
    
    if (!config) {
      // Return default configuration
      return res.json({
        isEnabled: false,
        autoArchiveEnabled: false,
        archiveAfterDays: 90,
        googleDrive: { enabled: false },
        emailNotification: { enabled: true, adminEmails: [] },
        fileGeneration: { generatePDF: true, generateCSV: true },
        dataRetention: { deleteFromCosmosDB: false }
      });
    }

    // Return sanitized config (without sensitive data)
    const sanitized = config.googleDrive?.serviceAccountKey 
      ? { ...config, googleDrive: { ...config.googleDrive, serviceAccountKey: '********' }}
      : config;

    res.json(sanitized);
  } catch (error) {
    console.error('Error getting archival config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/archival/config
 * @desc    Create or update archival configuration
 * @access  Private (Admin)
 */
router.post('/config', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const configData = req.body;

    // Validate admin role
    if (!req.user.role || !['Super Admin', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await archivalService.saveArchivalConfig(
      organizationId,
      configData,
      userId
    );

    res.json({
      success: true,
      message: 'Archival configuration saved successfully',
      config: result
    });
  } catch (error) {
    console.error('Error saving archival config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/archival/test-google-drive
 * @desc    Test Google Drive connection
 * @access  Private (Admin)
 */
router.post('/test-google-drive', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { googleDrive } = req.body;

    // Validate admin role
    if (!req.user.role || !['Super Admin', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!googleDrive) {
      return res.status(400).json({ error: 'Google Drive configuration is required' });
    }

    const result = await archivalService.testGoogleDriveConnection(
      organizationId,
      googleDrive
    );

    res.json(result);
  } catch (error) {
    console.error('Error testing Google Drive connection:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/archival/archive-study/:studyId
 * @desc    Archive a single study
 * @access  Private (Admin)
 */
router.post('/archive-study/:studyId', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { studyId } = req.params;

    // Validate admin role
    if (!req.user.role || !['Super Admin', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await archivalService.archiveStudy(
      studyId,
      organizationId,
      userId,
      req.body.options || {}
    );

    res.json({
      success: true,
      message: 'Study archived successfully',
      record: result.record
    });
  } catch (error) {
    console.error('Error archiving study:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/archival/archive-batch
 * @desc    Archive multiple studies in batch
 * @access  Private (Admin)
 */
router.post('/archive-batch', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const { studyIds } = req.body;

    // Validate admin role
    if (!req.user.role || !['Super Admin', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!studyIds || !Array.isArray(studyIds) || studyIds.length === 0) {
      return res.status(400).json({ error: 'studyIds array is required' });
    }

    const result = await archivalService.archiveBatch(
      studyIds,
      organizationId,
      userId
    );

    res.json({
      success: true,
      message: `Batch archival completed: ${result.successful.length}/${result.total} successful`,
      results: result
    });
  } catch (error) {
    console.error('Error in batch archival:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/archival/auto-archive
 * @desc    Run auto-archival process for eligible studies
 * @access  Private (Admin)
 */
router.post('/auto-archive', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    // Validate admin role
    if (!req.user.role || !['Super Admin', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await archivalService.autoArchiveStudies(
      organizationId,
      userId
    );

    res.json({
      success: true,
      message: 'Auto-archival process completed',
      results: result
    });
  } catch (error) {
    console.error('Error in auto-archival:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/archival/records
 * @desc    Get archival records with filters
 * @access  Private (Admin)
 */
router.get('/records', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, startDate, endDate, studyId, drugName, page = 1, limit = 50 } = req.query;

    // Validate admin role
    if (!req.user.role || !['Super Admin', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const filters = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (studyId) filters.studyId = studyId;
    if (drugName) filters.drugName = drugName;

    const result = await archivalService.getArchivalRecords(
      organizationId,
      filters,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);
  } catch (error) {
    console.error('Error getting archival records:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/archival/stats
 * @desc    Get archival statistics
 * @access  Private (Admin)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Validate admin role
    if (!req.user.role || !['Super Admin', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = await archivalService.getArchivalConfig(organizationId);
    
    const stats = {
      isEnabled: config?.isEnabled || false,
      autoArchiveEnabled: config?.autoArchiveEnabled || false,
      totalArchived: config?.totalArchived || 0,
      totalFailed: config?.totalFailed || 0,
      lastArchivedAt: config?.lastArchivedAt || null,
      lastStatus: config?.lastStatus || null,
      archiveAfterDays: config?.archiveAfterDays || 90
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting archival stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
