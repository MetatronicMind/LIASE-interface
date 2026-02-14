const jwt = require('jsonwebtoken');
require('dotenv').config();

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('Usage: node check-user-role.js YOUR_TOKEN');
  console.log('Get token from localStorage.getItem(\'auth_token\') in browser');
  process.exit(1);
}

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Decoded token:', JSON.stringify(decoded, null, 2));
  
  // Now fetch the actual user
  const cosmosService = require('./src/services/cosmosService');
  const userService = require('./src/services/userService');
  
  (async () => {
    try {
      const user = await userService.getUserById(decoded.userId, decoded.organizationId);
      console.log('\n=== User Details ===');
      console.log('Username:', user.username);
      console.log('Role:', user.role);
      console.log('Role ID:', user.roleId);
      console.log('Role Display Name:', user.roleDisplayName);
      console.log('Is Admin?', ['Super Admin', 'Admin'].includes(user.role));
      console.log('\nPermissions:', JSON.stringify(user.permissions, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('Error fetching user:', error);
      process.exit(1);
    }
  })();
} catch (error) {
  console.error('Error decoding token:', error.message);
  process.exit(1);
}
