const request = require('supertest');
const express = require('express');

// Create a simple app for testing
const app = express();
app.use(express.json());

// Test routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to LIASE Test Application!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working correctly!',
    method: req.method,
    url: req.url
  });
});

describe('LIASE Test App', () => {
  describe('GET /', () => {
    it('should return welcome message', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Welcome to LIASE Test Application!');
      expect(response.body.status).toBe('success');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /test', () => {
    it('should return test message', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Test endpoint working correctly!');
      expect(response.body.method).toBe('GET');
      expect(response.body.url).toBe('/test');
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/nonexistent');
      
      expect(response.status).toBe(404);
    });
  });
});
