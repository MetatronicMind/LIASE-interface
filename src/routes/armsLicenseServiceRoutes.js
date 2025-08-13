import express from 'express';
import commonController from '../controllers/common/commonController.js';
import sanitizeBodyMiddleware from '../middlewares/sanitizeBodyMiddleware.js';
import validationMiddleware from '../middlewares/validationMiddleware.js';
import ContentTypeCheck from '../middlewares/contentTypeCheckMiddleware.js';
import armsLicenseController from '../controllers/armsLicense/armsLicenseController.js';
import pageThree from '../validators/armsLicense/pageThree.js';
import updateStatus from '../validators/armsLicense/updateStatus.js';
import userIdentify from '../middlewares/userValidationMiddleware.js';
import homePoliticValidationMiddleware from '../middlewares/homePoliticValidationMiddleware.js';

const router = express.Router();



// @route   POST /home&Political/v1/arms-license
// @desc    Create an application for Arms License
// @access  Public
router.post(
  '/special',
  ContentTypeCheck(),
  // sanitizeBodyMiddleware,
  pageThree,
  validationMiddleware,
  armsLicenseController.createDoc,
);

// @route   GET /home&Political/v1/arms-license/:id
// @desc    Retrieve an application for Arms License
// @access  Public
router.get(
  '/special/:id',
  userIdentify,
  armsLicenseController.fetchDocById,
);

// @route   PATCH /home&Political/v1/arms-license/:id/documents
// @desc    Upload documents for Arms License application
// @access  Public
router.patch(
  '/special/:id/documents',
  userIdentify,
  ContentTypeCheck(),
  // sanitizeBodyMiddleware,
  armsLicenseController.uploadDocById,
);

// @route   GET /home&Political/v1/arms-license/:id/query-submit //BAD PRACTICE
// @desc    Query Submit of the application by ID for Arms License
// @access  Public
router.get(
  '/special/:id/query-submit',
  userIdentify,
  armsLicenseController.querySubmitById,
);

// @route   PATCH /home&Political/v1/arms-license/update-status
// @desc    Update status of an arms license application
// @access  Public
router.post(
  '/special/update-status',
  ContentTypeCheck(),
  // sanitizeBodyMiddleware,
  updateStatus,
  validationMiddleware,
  armsLicenseController.updateStatus,
);

// @route   PATCH /home&Political/v1/arms-license/:id/:pageId
// @desc    Update an application by ID for Arms License
// @access  Public
router.patch(
  '/special/:id/:pageId',
  userIdentify,
  ContentTypeCheck(),
  // sanitizeBodyMiddleware,
  homePoliticValidationMiddleware,
  validationMiddleware,
  armsLicenseController.updateDocById,
);

export default router;
