const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic routes for testing
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to LIASE Test Application!',
    status: 'success',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: port
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working correctly!',
    data: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query
    }
  });
});

app.post('/test', (req, res) => {
  res.json({
    message: 'POST request received successfully!',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'LIASE Test API',
    version: '1.0.0',
    description: 'Simple Node.js boilerplate for Azure deployment testing',
    endpoints: {
      'GET /': 'Welcome message',
      'GET /health': 'Health check',
      'GET /test': 'Test endpoint',
      'POST /test': 'Test POST endpoint',
      'GET /api/info': 'API information'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 LIASE Test Server is running on port ${port}`);
  console.log(`📊 Health check available at: http://localhost:${port}/health`);
  console.log(`🔍 API info available at: http://localhost:${port}/api/info`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
