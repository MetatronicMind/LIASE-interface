const express = require('express');
const router = express.Router();
const legacyDataController = require('../controllers/legacyDataController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', legacyDataController.uploadData);
router.get('/', legacyDataController.getData);
router.delete('/', legacyDataController.resetData);

module.exports = router;
