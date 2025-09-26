const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });

// Disable SSL verification for local Cosmos DB emulator
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const cosmosService = require('./services/cosmosService');
const drugSearchScheduler = require('./services/drugSearchScheduler');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const drugRoutes = require('./routes/drugRoutes');
const studyRoutes = require('./routes/studyRoutes');
const auditRoutes = require('./routes/auditRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const migrationRoutes = require('./routes/migrationRoutes');

console.log('drugRoutes loaded:', typeof drugRoutes);
console.log('drugRoutes methods:', drugRoutes.stack ? drugRoutes.stack.length : 'no stack');

const errorHandler = require('./middleware/errorHandler');
const authenticateToken = require('./middleware/auth');

const app = express();

// Trust proxy for Azure App Service (disabled for local development)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit write operations
  message: {
    error: 'Too many write operations from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very permissive limit for job polling (read-only operations)
const jobPollingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // 30 requests per minute (one every 2 seconds)
  message: {
    error: 'Too many job status requests, please slow down polling.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Test endpoint for drug discovery without auth
app.get('/api/test-discover', async (req, res) => {
  try {
    const pubmedService = require('./services/pubmedService');
    console.log('Test discover endpoint called');
    
    const service = new pubmedService();
    const results = await service.discoverDrugs({ maxResults: 10 });
    
    console.log('Test discover results:', results);
    res.json(results);
  } catch (error) {
    console.error('Test discover error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); // Remove authentication middleware - routes handle it individually
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/roles', authenticateToken, roleRoutes);

// Apply specific rate limiting for drug routes
app.use('/api/drugs/jobs', jobPollingLimiter); // Rate limit job polling specifically
app.use('/api/drugs/search-configs/run', writeLimiter); // Rate limit intensive operations
app.use('/api/drugs/discover', writeLimiter); // Rate limit drug discovery
app.use('/api/drugs', authenticateToken, drugRoutes);

app.use('/api/studies', authenticateToken, studyRoutes);
app.use('/api/audit', authenticateToken, auditRoutes);
app.use('/api/organizations', authenticateToken, organizationRoutes);
app.use('/api/migrate', authenticateToken, migrationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'LIASE SaaS API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 8000;

// Initialize Cosmos DB and start server
async function startServer() {
  try {
    await cosmosService.initializeDatabase();
    console.log('✅ Cosmos DB initialized successfully');
    
    // Start the drug search scheduler
    drugSearchScheduler.start();
    console.log('✅ Drug search scheduler started');
    
    server = app.listen(PORT, () => {
      console.log(`🚀 LIASE SaaS API Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`⏰ Drug search scheduler: Running every 12 hours`);
      console.log(`🔍 Queue status: http://localhost:${PORT}/api/drugs/queue-status`);
      console.log(`💾 Memory monitoring active`);
    });
    
    // Track connections for graceful shutdown
    server.on('connection', (connection) => {
      connections.push(connection);
      connection.on('close', () => {
        connections = connections.filter(c => c !== connection);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Process monitoring and crash prevention
let server;

// Track active connections for graceful shutdown
let connections = [];

// Enhanced health monitoring
const healthMetrics = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  lastError: null,
  memoryUsage: process.memoryUsage()
};

// Middleware to track requests
app.use((req, res, next) => {
  healthMetrics.requestCount++;
  
  // Track response errors
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      healthMetrics.errorCount++;
      healthMetrics.lastError = {
        timestamp: new Date().toISOString(),
        status: res.statusCode,
        path: req.path,
        method: req.method
      };
    }
    return originalSend.call(this, data);
  };
  
  next();
});

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  const cpuUsage = process.cpuUsage();
  
  // Calculate memory usage percentage (assume 512MB limit for basic warning)
  const memoryLimit = 512 * 1024 * 1024; // 512MB
  const memoryUsagePercent = (memUsage.heapUsed / memoryLimit) * 100;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    metrics: {
      requests: healthMetrics.requestCount,
      errors: healthMetrics.errorCount,
      errorRate: healthMetrics.requestCount > 0 ? (healthMetrics.errorCount / healthMetrics.requestCount * 100).toFixed(2) + '%' : '0%',
      lastError: healthMetrics.lastError,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        usage: Math.round(memoryUsagePercent) + '%',
        warning: memoryUsagePercent > 80
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000) + 'ms',
        system: Math.round(cpuUsage.system / 1000) + 'ms'
      }
    }
  };
  
  // Determine overall health status
  if (memoryUsagePercent > 90) {
    health.status = 'critical';
  } else if (memoryUsagePercent > 80 || (healthMetrics.requestCount > 100 && (healthMetrics.errorCount / healthMetrics.requestCount) > 0.1)) {
    health.status = 'warning';
  }
  
  const statusCode = health.status === 'critical' ? 503 : health.status === 'warning' ? 200 : 200;
  res.status(statusCode).json(health);
});

// Memory monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memoryLimit = 512 * 1024 * 1024; // 512MB
  const memoryUsagePercent = (memUsage.heapUsed / memoryLimit) * 100;
  
  if (memoryUsagePercent > 90) {
    console.error(`⚠️  CRITICAL: Memory usage at ${Math.round(memoryUsagePercent)}% (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB)`);
    
    // Force garbage collection if available
    if (global.gc) {
      console.log('🧹 Running garbage collection...');
      global.gc();
    }
  } else if (memoryUsagePercent > 80) {
    console.warn(`⚠️  WARNING: Memory usage at ${Math.round(memoryUsagePercent)}% (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB)`);
  }
}, 30000); // Check every 30 seconds

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  healthMetrics.errorCount++;
  healthMetrics.lastError = {
    timestamp: new Date().toISOString(),
    type: 'uncaughtException',
    message: error.message,
    stack: error.stack
  };
  
  // Don't exit immediately - try to finish current requests
  console.log('🔄 Attempting graceful shutdown...');
  gracefulShutdown('uncaughtException');
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED PROMISE REJECTION:', reason);
  healthMetrics.errorCount++;
  healthMetrics.lastError = {
    timestamp: new Date().toISOString(),
    type: 'unhandledRejection',
    reason: reason?.message || reason,
    stack: reason?.stack
  };
  
  // Don't exit for promise rejections, just log them
  console.log('⚠️  Continuing execution after unhandled promise rejection');
});

// Graceful shutdown function
function gracefulShutdown(signal) {
  console.log(`📴 ${signal} received, initiating graceful shutdown...`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('❌ Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('🛑 HTTP server closed');
      
      // Stop drug search scheduler
      try {
        drugSearchScheduler.stop();
        console.log('🛑 Drug search scheduler stopped');
      } catch (error) {
        console.error('❌ Error stopping scheduler:', error);
      }
      
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('⏰ Forced shutdown after 10 seconds');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = app;
