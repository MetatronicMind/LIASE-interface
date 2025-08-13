import express from 'express';
const router = express.Router();
import commonController from '../controllers/common/commonController.js';
import updateStatus from '../validators/armsLicense/updateStatus.js';
import ContentTypeCheck from '../middlewares/contentTypeCheckMiddleware.js';
import sanitizeBodyMiddleware from '../middlewares/sanitizeBodyMiddleware.js';
import validationMiddleware from '../middlewares/validationMiddleware.js';
/**
 * @swagger
 * tags:
 *   name: Common
 *   description: Common API endpoints for Home & Political Services
 */

// @route   GET /homepolitical/v1/genders
// @desc    Retrieve genders
// @access  Public
router.get('/genders', commonController.genders);

// @route   GET /homepolitical/v1/states
// @desc    Get states for Home & Political
// @access  Public
router.get('/states', commonController.states);

// @route   GET /homepolitical/v1/states/:id/districts
// @desc    Get districts for Home & Political
// @access  Public
router.get('/states/:id/districts', commonController.districts);

// @route   GET /homepolitical/v1/districts/:districtId/police-stations
// @desc    Get police stations for a district
// @access  Public
router.get('/districts/:districtId/police-stations', commonController.policeStations);

// @route   GET /homepolitical/v1/application-validator/:objId
// @desc    Validate an application by ID for Home & Political
// @access  Public
router.get(
    '/:serviceId/application-validator/:objId',
    commonController.applicationValidator,
);

// @route   GET /homepolitical/v1/registration-classes
// @desc    Get registration classes for Home & Political
// @access  Public
router.get('/registration-classes', commonController.registrationClasses);

// @route   GET /homepolitical/v1/departments
// @desc    Get departments for Home & Political
// @access  Public
router.get('/departments', commonController.departments);

// @route   PATCH /home&Political/v1/arms-license/update-status
// @desc    Update status of an arms license application
// @access  Public
router.post(
    '/arms-license/update-status',
    ContentTypeCheck(),
    sanitizeBodyMiddleware,
    updateStatus,
    validationMiddleware,
    commonController.updateStatus,
);


// // @route   POST /homepolitical/v1/office-locations
// // @desc    Get office locations by department code and registration class
// // @access  Public
// router.post(
//   '/office-locations',
//   ContentTypeCheck(),
//   sanitizeBodyMiddleware,
//   commonController.getOfficeLocations,
// );

export default router;
