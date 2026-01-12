const express = require('express');
const r3Controller = require('../controllers/r3Controller');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Proxy endpoint for R3 XML generation
// Uses authenticateToken to ensure only logged-in users can use this proxy
router.get('/generate', authenticateToken, r3Controller.generateR3Xml);

module.exports = router;
