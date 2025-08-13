import express from 'express';
import acknowledgementController from '../controllers/acknowledgement/acknowledgementController.js';
import userIdentify from '../middlewares/userValidationMiddleware.js';

const router = express.Router();

// @route   GET /labour/v1/acknowledgement?id=<document_id>
// @desc    GET Acknowledgement Certificate
// @access  Public
router.get('/applications/acknowledgement', userIdentify, acknowledgementController.acknowledgement);

// @route   GET /download
// @desc    ack of an application by ID
// @access  Public
router.get('/applications/acknowledgement/download', acknowledgementController.acknowledgementDownload);


export default router;
