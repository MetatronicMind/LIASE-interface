import express from 'express';
import enclosureController from '../controllers/common/enclosureController.js';

const router = express.Router();

// @route   GET /enclosure/retrieve
// @desc    Retrieve an enclosure by its path
// @access  Public
router.get('/', enclosureController.retrieveByPath);

export default router;
