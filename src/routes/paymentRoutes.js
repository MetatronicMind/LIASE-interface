import express from 'express';
import paymentController from '../controllers/common/paymentController.js';
import userIdentify from '../middlewares/userValidationMiddleware.js';

const router = express.Router();
// @route   POST /:serviceId/payment-initiate/:id
// @desc    Payment initialization of the application by service ID and application ID
// @access  Public
router.post('/:serviceId/payment-initiate/:id', userIdentify, paymentController.paymentInitiateById);

// @route   GET /:serviceId/final-submission/:id
// @desc    Final submission of the application by service ID and application ID
// @access  Public
router.get('/:serviceId/final-submission/:id', userIdentify, paymentController.finalSubmissionById);

export default router;
