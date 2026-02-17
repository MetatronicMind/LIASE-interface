const express = require('express');
const path = require('path');
const pubmedService = require('./src/services/pubmedService');

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

// Test drug discovery route
app.get('/test-discover', async (req, res) => {
    console.log('Test discover route called');
    
    try {
        const results = await pubmedService.getDrugArticles('aspirin', 3);
        console.log('Results from PubMed:', results.length);
        
        res.json({
            success: true,
            totalFound: results.length,
            drugs: results.map(article => ({
                drugName: article.DrugName,
                pmid: article.PMID,
                sponsor: article.Sponsor,
                title: article.Title,
                journal: article.Journal,
                publicationDate: article.PublicationDate
            }))
        });
    } catch (error) {
        console.error('Error in test discover:', error);
        res.status(500).json({ error: error.message });
    }
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
