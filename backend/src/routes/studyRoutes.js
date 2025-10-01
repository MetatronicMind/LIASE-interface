const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const cosmosService = require('../services/cosmosService');
const Study = require('../models/Study');
const Drug = require('../models/Drug');
const pubmedService = require('../services/pubmedService');
const studyCreationService = require('../services/studyCreationService');
const { authorizePermission } = require('../middleware/authorization');
const { auditLogger, auditAction } = require('../middleware/audit');

const router = express.Router();

// Apply audit logging to all routes
router.use(auditLogger());

// Get all studies in organization
router.get('/',
  authorizePermission('studies', 'read'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search, 
        status, 
        drugName,
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = req.query;
      
      let query = 'SELECT * FROM c WHERE c.organizationId = @orgId';
      const parameters = [{ name: '@orgId', value: req.user.organizationId }];

      // Add filters
      if (status && status !== 'all') {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: status });
      }

      if (drugName) {
        query += ' AND CONTAINS(UPPER(c.drugName), UPPER(@drugName))';
        parameters.push({ name: '@drugName', value: drugName });
      }

      if (search) {
        query += ' AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)) OR CONTAINS(UPPER(c.adverseEvent), UPPER(@search)))';
        parameters.push({ name: '@search', value: search });
      }

      // Add sorting
      query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;

      // Add pagination
      const offset = (page - 1) * limit;
      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const studies = await cosmosService.queryItems('studies', query, parameters);

      res.json({
        studies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: studies.length
        }
      });

    } catch (error) {
      console.error('Error fetching studies:', error);
      res.status(500).json({
        error: 'Failed to fetch studies',
        message: error.message
      });
    }
  }
);

// Get studies for data entry (ICSR classified only)
router.get('/data-entry',
  authorizePermission('studies', 'read'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search
      } = req.query;
      
      console.log('Data entry request - User organization ID:', req.user.organizationId);
      console.log('Data entry request - Query params:', { page, limit, search });
      
      // Test query to find the specific study mentioned in the issue
      const testQuery = 'SELECT * FROM c WHERE c.pmid = @pmid';
      const testParams = [{ name: '@pmid', value: '39234674' }];
      const testResult = await cosmosService.queryItems('studies', testQuery, testParams);
      console.log('Test query for PMID 39234674:', {
        found: testResult.resources?.length > 0,
        count: testResult.resources?.length || 0,
        studyOrgId: testResult.resources?.[0]?.organizationId,
        studyUserTag: testResult.resources?.[0]?.userTag,
        studyEffectiveClassification: testResult.resources?.[0]?.effectiveClassification
      });
      
      // Query for studies that are manually tagged as ICSR only
      let query = 'SELECT * FROM c WHERE c.organizationId = @orgId AND c.userTag = @userTag';
      const parameters = [
        { name: '@orgId', value: req.user.organizationId },
        { name: '@userTag', value: 'ICSR' }
      ];
      
      console.log('Data entry query:', query);
      console.log('Data entry parameters:', parameters);

      if (search) {
        query += ' AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))';
        parameters.push({ name: '@search', value: search });
      }

      query += ' ORDER BY c.createdAt DESC';

      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const result = await cosmosService.queryItems('studies', query, parameters);
      
      console.log('Data entry query result count:', result.resources?.length || 0);
      if (result.resources?.length > 0) {
        console.log('First study sample:', {
          id: result.resources[0].id,
          pmid: result.resources[0].pmid,
          title: result.resources[0].title?.substring(0, 50) + '...',
          userTag: result.resources[0].userTag,
          organizationId: result.resources[0].organizationId
        });
      }

      await auditAction(
        req.user,
        'list',
        'study',
        'data_entry',
        'Retrieved ICSR studies for data entry',
        { page, limit, search }
      );

      res.json({
        success: true,
        data: result.resources || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: result.resources?.length === parseInt(limit)
        },
        debug: {
          userOrgId: req.user.organizationId,
          queryParams: { page, limit, search },
          resultCount: result.resources?.length || 0,
          testQuery: testResult.resources?.length > 0 ? {
            found: true,
            studyOrgId: testResult.resources[0].organizationId,
            studyUserTag: testResult.resources[0].userTag,
            studyEffectiveClassification: testResult.resources[0].effectiveClassification,
            orgIdMatch: testResult.resources[0].organizationId === req.user.organizationId
          } : { found: false }
        }
      });
    } catch (error) {
      console.error('Data entry studies fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch data entry studies', 
        message: error.message 
      });
    }
  }
);

// Get studies for medical examiner (ICSR with completed R3 forms)
router.get('/medical-examiner',
  authorizePermission('studies', 'read'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search
      } = req.query;
      
      let query = 'SELECT * FROM c WHERE c.organizationId = @orgId AND c.userTag = @userTag AND c.r3FormStatus = @formStatus';
      const parameters = [
        { name: '@orgId', value: req.user.organizationId },
        { name: '@userTag', value: 'ICSR' },
        { name: '@formStatus', value: 'completed' }
      ];

      if (search) {
        query += ' AND (CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.pmid), UPPER(@search)))';
        parameters.push({ name: '@search', value: search });
      }

      query += ' ORDER BY c.r3FormCompletedAt DESC';

      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` OFFSET ${offset} LIMIT ${limit}`;

      const result = await cosmosService.queryItems('studies', query, parameters);

      await auditAction(
        req.user,
        'list',
        'study',
        'medical_examiner',
        'Retrieved completed ICSR studies for medical examination',
        { page, limit, search }
      );

      res.json({
        success: true,
        data: result.resources || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: result.resources?.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Medical examiner studies fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch medical examiner studies', 
        message: error.message 
      });
    }
  }
);

// Get specific study
router.get('/:studyId',
  authorizePermission('studies', 'read'),
  async (req, res) => {
    try {
      const study = await cosmosService.getItem('studies', req.params.studyId, req.user.organizationId);
      
      if (!study) {
        return res.status(404).json({
          error: 'Study not found'
        });
      }

      res.json(study);

    } catch (error) {
      console.error('Error fetching study:', error);
      res.status(500).json({
        error: 'Failed to fetch study',
        message: error.message
      });
    }
  }
);

// Create new study
router.post('/',
  authorizePermission('studies', 'write'),
  [
    body('pmid').matches(/^\d+$/),
    body('title').isLength({ min: 10 }),
    body('journal').isLength({ min: 3 }),
    body('publicationDate').isISO8601(),
    body('abstract').isLength({ min: 50 }),
    body('drugName').isLength({ min: 2 }),
    body('adverseEvent').isLength({ min: 5 })
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

      const studyData = {
        ...req.body,
        organizationId: req.user.organizationId,
        createdBy: req.user.id
      };

      // Validate study data
      const validationErrors = Study.validate(studyData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Study validation failed',
          details: validationErrors
        });
      }

      // Check if PMID already exists in organization
      const existingStudies = await cosmosService.queryItems(
        'studies',
        'SELECT * FROM c WHERE c.organizationId = @orgId AND c.pmid = @pmid',
        [
          { name: '@orgId', value: req.user.organizationId },
          { name: '@pmid', value: studyData.pmid }
        ]
      );

      if (existingStudies.length > 0) {
        return res.status(409).json({
          error: 'Study with this PMID already exists in your organization'
        });
      }

      // Create study instance
      const study = new Study(studyData);
      
      // Save to database
      const createdStudy = await cosmosService.createItem('studies', study.toJSON());

      // Create audit log
      await auditAction(
        req.user,
        'create',
        'study',
        createdStudy.id,
        `Created new study: PMID ${study.pmid}`,
        { pmid: study.pmid, drugName: study.drugName, adverseEvent: study.adverseEvent }
      );

      res.status(201).json({
        message: 'Study created successfully',
        study: createdStudy
      });

    } catch (error) {
      console.error('Error creating study:', error);
      res.status(500).json({
        error: 'Failed to create study',
        message: error.message
      });
    }
  }
);

// Update study
router.put('/:studyId',
  authorizePermission('studies', 'write'),
  async (req, res) => {
    try {
      const { studyId } = req.params;
      const updates = req.body;

      // Remove sensitive fields
      delete updates.id;
      delete updates.organizationId;
      delete updates.createdAt;
      delete updates.createdBy;
      delete updates.comments; // Comments should be updated via separate endpoint

      // Check if study exists
      const existingStudy = await cosmosService.getItem('studies', studyId, req.user.organizationId);
      if (!existingStudy) {
        return res.status(404).json({
          error: 'Study not found'
        });
      }

      // Update study
      const updatedStudy = await cosmosService.updateItem(
        'studies',
        studyId,
        req.user.organizationId,
        updates
      );

      // Create audit log
      await auditAction(
        req.user,
        'update',
        'study',
        studyId,
        `Updated study: PMID ${updatedStudy.pmid}`,
        { updates: Object.keys(updates) }
      );

      res.json({
        message: 'Study updated successfully',
        study: updatedStudy
      });

    } catch (error) {
      console.error('Error updating study:', error);
      res.status(500).json({
        error: 'Failed to update study',
        message: error.message
      });
    }
  }
);

// Add comment to study
router.post('/:studyId/comments',
  authorizePermission('studies', 'write'),
  [
    body('comment').isLength({ min: 1 }),
    body('type').optional().isIn(['review', 'approval', 'rejection', 'general'])
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

      const { studyId } = req.params;
      const { comment, type = 'general' } = req.body;

      // Get existing study
      const study = await cosmosService.getItem('studies', studyId, req.user.organizationId);
      if (!study) {
        return res.status(404).json({
          error: 'Study not found'
        });
      }

      // Create study instance and add comment
      const studyInstance = new Study(study);
      const newComment = studyInstance.addComment({
        userId: req.user.id,
        userName: new (require('../models/User'))(req.user).getFullName(),
        text: comment,
        type
      });

      // Update study in database
      const updatedStudy = await cosmosService.updateItem(
        'studies',
        studyId,
        req.user.organizationId,
        {
          comments: studyInstance.comments,
          updatedAt: studyInstance.updatedAt
        }
      );

      // Create audit log
      await auditAction(
        req.user,
        'comment',
        'study',
        studyId,
        `Added comment to study PMID ${study.pmid}`,
        { commentType: type }
      );

      res.status(201).json({
        message: 'Comment added successfully',
        comment: newComment,
        study: updatedStudy
      });

    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({
        error: 'Failed to add comment',
        message: error.message
      });
    }
  }
);

// Update study status
router.patch('/:studyId/status',
  authorizePermission('studies', 'write'),
  [
    body('status').isIn(['Pending Review', 'Under Review', 'Approved', 'Rejected']),
    body('reviewDetails').optional().isObject()
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

      const { studyId } = req.params;
      const { status, reviewDetails = {} } = req.body;

      // Get existing study
      const study = await cosmosService.getItem('studies', studyId, req.user.organizationId);
      if (!study) {
        return res.status(404).json({
          error: 'Study not found'
        });
      }

      // Create study instance and update status
      const studyInstance = new Study(study);
      studyInstance.updateStatus(status, req.user.id, new (require('../models/User'))(req.user).getFullName());
      
      if (Object.keys(reviewDetails).length > 0) {
        studyInstance.updateReviewDetails(reviewDetails);
      }

      // Update study in database
      const updatedStudy = await cosmosService.updateItem(
        'studies',
        studyId,
        req.user.organizationId,
        studyInstance.toJSON()
      );

      // Create audit log
      await auditAction(
        req.user,
        status === 'Approved' ? 'approve' : status === 'Rejected' ? 'reject' : 'update',
        'study',
        studyId,
        `${status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Updated status of'} study PMID ${study.pmid}`,
        { newStatus: status, previousStatus: study.status }
      );

      res.json({
        message: 'Study status updated successfully',
        study: updatedStudy
      });

    } catch (error) {
      console.error('Error updating study status:', error);
      res.status(500).json({
        error: 'Failed to update study status',
        message: error.message
      });
    }
  }
);

// Delete study
router.delete('/:studyId',
  authorizePermission('studies', 'delete'),
  async (req, res) => {
    try {
      const { studyId } = req.params;

      // Check if study exists
      const study = await cosmosService.getItem('studies', studyId, req.user.organizationId);
      if (!study) {
        return res.status(404).json({
          error: 'Study not found'
        });
      }

      // Delete study
      await cosmosService.deleteItem('studies', studyId, req.user.organizationId);

      // Create audit log
      await auditAction(
        req.user,
        'delete',
        'study',
        studyId,
        `Deleted study: PMID ${study.pmid}`,
        { pmid: study.pmid, drugName: study.drugName }
      );

      res.json({
        message: 'Study deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting study:', error);
      res.status(500).json({
        error: 'Failed to delete study',
        message: error.message
      });
    }
  }
);

// Get study statistics
router.get('/stats/summary',
  authorizePermission('studies', 'read'),
  async (req, res) => {
    try {
      const stats = {
        total: 0,
        pendingReview: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        byDrug: {},
        byMonth: {}
      };

      const studies = await cosmosService.getStudiesByOrganization(req.user.organizationId);
      
      stats.total = studies.length;

      studies.forEach(study => {
        // Count by status
        switch (study.status) {
          case 'Pending Review':
            stats.pendingReview++;
            break;
          case 'Under Review':
            stats.underReview++;
            break;
          case 'Approved':
            stats.approved++;
            break;
          case 'Rejected':
            stats.rejected++;
            break;
        }

        // Count by drug
        if (study.drugName) {
          stats.byDrug[study.drugName] = (stats.byDrug[study.drugName] || 0) + 1;
        }

        // Count by month
        if (study.createdAt) {
          const month = new Date(study.createdAt).toISOString().slice(0, 7); // YYYY-MM
          stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
        }
      });

      res.json(stats);

    } catch (error) {
      console.error('Error fetching study statistics:', error);
      res.status(500).json({
        error: 'Failed to fetch study statistics',
        message: error.message
      });
    }
  }
);

// Job tracking routes
router.get('/jobs/:jobId/status',
  authorizePermission('studies', 'read'),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const status = studyCreationService.getJobStatus(jobId);
      
      if (!status) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Only return job data if it belongs to the requesting user
      if (status.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(status);
    } catch (error) {
      console.error('Error getting job status:', error);
      res.status(500).json({
        error: 'Failed to get job status',
        message: error.message
      });
    }
  }
);

router.get('/jobs/active',
  authorizePermission('studies', 'read'),
  async (req, res) => {
    try {
      const activeJobs = studyCreationService.getUserActiveJobs(req.user.id);
      res.json({ jobs: activeJobs });
    } catch (error) {
      console.error('Error getting active jobs:', error);
      res.status(500).json({
        error: 'Failed to get active jobs',
        message: error.message
      });
    }
  }
);

// Update study user tag
router.patch('/:id/tag',
  authorizePermission('studies', 'write'),
  [
    body('userTag').isIn(['ICSR', 'AOI', 'No Case']).withMessage('User tag must be ICSR, AOI, or No Case')
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

      const { id } = req.params;
      const { userTag } = req.body;

      // Get the study
      const existingStudy = await cosmosService.getItem('Studies', id, req.user.organizationId);
      if (!existingStudy) {
        return res.status(404).json({ error: 'Study not found' });
      }

      // Create Study instance and update tag
      const study = new Study(existingStudy);
      study.updateUserTag(userTag, req.user.id, req.user.name);

      // Save to database
      await cosmosService.upsertItem('Studies', study.toJSON());

      auditAction(req, 'study_tag_updated', { 
        studyId: id, 
        userTag,
        previousTag: existingStudy.userTag 
      });

      res.json({
        message: 'Study tag updated successfully',
        study: study.toJSON()
      });
    } catch (error) {
      console.error('Error updating study tag:', error);
      res.status(500).json({
        error: 'Failed to update study tag',
        message: error.message
      });
    }
  }
);

// Get R3 form data for a study
router.get('/:id/r3-form-data',
  authorizePermission('studies', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { pmid, drug_code, drugname } = req.query;

      if (!pmid || !drug_code || !drugname) {
        return res.status(400).json({ 
          error: 'Missing required parameters: pmid, drug_code, drugname' 
        });
      }

      // Call external API to get R3 field data
      const axios = require('axios');
      const apiUrl = `http://20.75.201.207/get_r3_fields/?PMID=${pmid}&drug_code=${drug_code}&drugname=${drugname}`;
      
      const response = await axios.get(apiUrl);
      
      await auditAction(
        req.user,
        'fetch',
        'study',
        'r3_form_data',
        `Fetched R3 form data for study ${id}`,
        { pmid, drug_code, drugname }
      );

      res.json({
        success: true,
        data: response.data
      });
    } catch (error) {
      console.error('R3 form data fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch R3 form data', 
        message: error.message 
      });
    }
  }
);

// Update R3 form data for a study
router.put('/:id/r3-form',
  authorizePermission('studies', 'write'),
  [
    body('formData').isObject().withMessage('Form data must be an object')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;
      const { formData } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem('studies', id, req.user.organizationId);
      if (!studyData) {
        return res.status(404).json({ error: 'Study not found' });
      }

      const study = new Study(studyData);
      study.updateR3FormData(formData, req.user.id, req.user.name);

      // Save updated study
      await cosmosService.upsertItem('studies', study.toJSON());

      await auditAction(
        req.user,
        'update',
        'study',
        'r3_form_data',
        `Updated R3 form data for study ${id}`,
        { studyId: id }
      );

      res.json({
        success: true,
        message: 'R3 form data updated successfully',
        study: study.toJSON()
      });
    } catch (error) {
      console.error('R3 form update error:', error);
      res.status(500).json({ 
        error: 'Failed to update R3 form data', 
        message: error.message 
      });
    }
  }
);

// Complete R3 form for a study
router.post('/:id/r3-form/complete',
  authorizePermission('studies', 'write'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get the study
      const studyData = await cosmosService.getItem('studies', id, req.user.organizationId);
      if (!studyData) {
        return res.status(404).json({ error: 'Study not found' });
      }

      const study = new Study(studyData);
      study.completeR3Form(req.user.id, req.user.name);

      // Save updated study
      await cosmosService.upsertItem('studies', study.toJSON());

      await auditAction(
        req.user,
        'complete',
        'study',
        'r3_form',
        `Completed R3 form for study ${id}`,
        { studyId: id }
      );

      res.json({
        success: true,
        message: 'R3 form completed successfully',
        study: study.toJSON()
      });
    } catch (error) {
      console.error('R3 form completion error:', error);
      res.status(500).json({ 
        error: 'Failed to complete R3 form', 
        message: error.message 
      });
    }
  }
);

// Update study classification
router.put('/:id',
  authorizePermission('studies', 'write'),
  [
    body('userTag').optional().isIn(['ICSR', 'AOI', 'No Case']).withMessage('Invalid classification tag')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;
      const { userTag } = req.body;

      // Get the study
      const studyData = await cosmosService.getItem('studies', id, req.user.organizationId);
      if (!studyData) {
        return res.status(404).json({ error: 'Study not found' });
      }

      const study = new Study(studyData);
      
      if (userTag) {
        study.updateUserTag(userTag, req.user.id, req.user.name);
      }

      // Save updated study
      await cosmosService.upsertItem('studies', study.toJSON());

      await auditAction(
        req.user,
        'update',
        'study',
        'classification',
        `Updated study classification to ${userTag}`,
        { studyId: id, userTag }
      );

      res.json({
        success: true,
        message: 'Study updated successfully',
        study: study.toJSON()
      });
    } catch (error) {
      console.error('Study update error:', error);
      res.status(500).json({ 
        error: 'Failed to update study', 
        message: error.message 
      });
    }
  }
);

module.exports = router;

// Ingest studies from PubMed for a given drug
router.post('/ingest/pubmed',
  authorizePermission('studies', 'write'),
  [
    body('drugId').optional().isString(),
    body('query').optional().isString().isLength({ min: 3 }),
    body('maxResults').optional().isInt({ min: 1, max: 200 }),
    body('adverseEvent').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { drugId, query, maxResults = 50, adverseEvent } = req.body;

      let searchQuery = query;
      if (drugId) {
        const drug = await cosmosService.getItem('drugs', drugId, req.user.organizationId);
        if (!drug) {
          return res.status(404).json({ error: 'Drug not found' });
        }
        // Default PubMed query: drug name + RSI + optional filters
        searchQuery = searchQuery || `${drug.name} adverse events`;
      }

      if (!searchQuery) {
        return res.status(400).json({ error: 'Either drugId or query is required' });
      }

      // 1) Search PubMed to get PMIDs
      const ids = await pubmedService.search(searchQuery, { maxResults });

      if (!ids || ids.length === 0) {
        return res.status(200).json({
          message: 'No articles found for the search query',
          jobId: null,
          totalFound: 0
        });
      }

      // 2) Start asynchronous study creation job
      const jobId = uuidv4();
      const drugName = drugId ? (await cosmosService.getItem('drugs', drugId, req.user.organizationId))?.name : 'Unknown';
      
      await studyCreationService.startStudyCreationJob(
        jobId,
        ids,
        {
          drugName: drugName,
          adverseEvent: adverseEvent || 'Not specified'
        },
        req.user.id,
        req.user.organizationId
      );

      await auditAction(
        req.user,
        'ingest',
        'study',
        'pubmed_async',
        `Started async processing of ${ids.length} studies from PubMed`,
        { query: searchQuery, jobId, total: ids.length }
      );

      // Return job ID immediately so user can track progress
      return res.status(202).json({
        message: `Started processing ${ids.length} articles from PubMed`,
        jobId: jobId,
        totalFound: ids.length,
        status: 'processing',
        trackingUrl: `/api/studies/jobs/${jobId}/status`
      });
    } catch (error) {
      console.error('PubMed ingestion error:', error);
      return res.status(500).json({ error: 'Failed to ingest from PubMed', message: error.message });
    }
  }
);
