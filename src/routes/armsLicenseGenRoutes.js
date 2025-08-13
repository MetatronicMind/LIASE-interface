import express from 'express';
import commonController from '../controllers/common/commonController.js';
import sanitizeBodyMiddleware from '../middlewares/sanitizeBodyMiddleware.js';
import validationMiddleware from '../middlewares/validationMiddleware.js';
import ContentTypeCheck from '../middlewares/contentTypeCheckMiddleware.js';
import armsLicenseGenController from '../controllers/armsLicenseGeneral/armsLicenseGenController.js';
import pageFour from '../validators/armsLicense/pageFour.js';
// import updateStatus from '../validators/armsLicense/updateStatus.js';
import userIdentify from '../middlewares/userValidationMiddleware.js';
import armsLicenseGenValidationMiddleware from '../middlewares/armsLicenseGenValidationMw.js';

const router = express.Router();


// @route   POST /home&Political/v1/arms-license
// @desc    Create an application for Arms License
// @access  Public
router.post(
  '/general',
  ContentTypeCheck(),
  // sanitizeBodyMiddleware,
  pageFour,
  validationMiddleware,
  armsLicenseGenController.createDoc,
);

// @route   GET /home&Political/v1/arms-license/:id
// @desc    Retrieve an application for Arms License
// @access  Public
router.get(
  '/general/:id',
  userIdentify,
  armsLicenseGenController.fetchDocById,
);

// @route   PATCH /home&Political/v1/arms-license/:id/documents
// @desc    Upload documents for Arms License application
// @access  Public
router.patch(
  '/general/:id/documents',
  userIdentify,
  ContentTypeCheck(),
  // sanitizeBodyMiddleware,
  armsLicenseGenController.uploadDocById,
);

// @route   GET /home&Political/v1/arms-license/:id/query-submit
// @desc    Query Submit of the application by ID for Arms License
// @access  Public
router.get(
  '/general/:id/query-submit',
  userIdentify,
  armsLicenseGenController.querySubmitById,
);


// @route   PATCH /home&Political/v1/arms-license/:id/:pageId
// @desc    Update an application by ID for Arms License
// @access  Public
router.patch(
  '/general/:id/:pageId',
  userIdentify,
  ContentTypeCheck(),
  // sanitizeBodyMiddleware,
  armsLicenseGenValidationMiddleware,
  validationMiddleware,
  armsLicenseGenController.updateDocById,
);

export default router;
