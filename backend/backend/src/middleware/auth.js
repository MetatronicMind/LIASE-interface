const jwt = require('jsonwebtoken');
const cosmosService = require('../services/cosmosService');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details with role permissions using userService
    const userService = require('../services/userService');
    const user = await userService.getUserById(decoded.userId, decoded.organizationId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }

    // Get organization details
    const organization = await cosmosService.getItem('organizations', decoded.organizationId, decoded.organizationId);
    
    if (!organization || !organization.isActive) {
      return res.status(401).json({ 
        error: 'Organization not found or inactive',
        code: 'ORGANIZATION_INVALID'
      });
    }

    // Attach user and organization to request
    req.user = user;
    req.organization = organization;
    req.token = decoded;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = authenticateToken;
