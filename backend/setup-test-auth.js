// Script to test authentication and create a sample user if needed
require('dotenv').config({ path: '.env.local' });

const cosmosService = require('./src/services/cosmosService');
const User = require('./src/models/User');
const Organization = require('./src/models/Organization');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

async function setupTestAuth() {
  try {
    console.log('Setting up test authentication...');
    
    // Initialize the database
    await cosmosService.initializeDatabase();
    console.log('Database initialized successfully');
    
    const orgId = 'test-org-123';
    const userId = 'test-user-123';
    
    // Check if organization exists
    let organization = await cosmosService.getItem('organizations', orgId, orgId);
    
    if (!organization) {
      console.log('Creating test organization...');
      organization = new Organization({
        id: orgId,
        name: 'Test Organization',
        domain: 'test.com',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await cosmosService.createItem('organizations', organization.toJSON());
      console.log('Test organization created');
    } else {
      console.log('Test organization already exists');
    }
    
    // Check if user exists
    let user = await cosmosService.getItem('users', userId, orgId);
    
    if (!user) {
      console.log('Creating test user...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      user = new User({
        id: userId,
        organizationId: orgId,
        username: 'testuser',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        password: hashedPassword,
        isActive: true,
        roleId: 'admin-role',
        permissions: {
          studies: { read: true, write: true, delete: true },
          drugs: { read: true, write: true, delete: true },
          users: { read: true, write: true, delete: true }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await cosmosService.createItem('users', user.toJSON());
      console.log('Test user created');
    } else {
      console.log('Test user already exists');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userId,
        organizationId: orgId,
        email: 'test@test.com'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    console.log('\n🎉 Authentication setup complete!');
    console.log('\n📋 Test Credentials:');
    console.log('Username: testuser');
    console.log('Email: test@test.com');
    console.log('Password: password123');
    console.log('\n🔑 JWT Token (for testing):');
    console.log(token);
    console.log('\n💡 You can use this token in the frontend localStorage as "auth_token"');
    
    return { user: user.toJSON(), organization: organization.toJSON(), token };
    
  } catch (error) {
    console.error('❌ Error setting up test auth:', error);
  }
}

setupTestAuth();