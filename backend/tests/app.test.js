// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Setup test environment with SSL bypass
const { setupTestEnvironment } = require('./testSetup');
setupTestEnvironment();

const request = require('supertest');
const app = require('../src/app');
const cosmosService = require('../src/services/cosmosService');

beforeAll(async () => {
  await cosmosService.initializeDatabase();
});

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.status).toBe('healthy');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Authentication', () => {
  it('should reject login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(res.body.error).toBe('Invalid credentials');
  });
});

describe('Protected Routes', () => {
  it('should reject requests without token', async () => {
    const res = await request(app)
      .get('/api/users')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(res.body.error).toBe('Access token required');
  });
});
