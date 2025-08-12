// Azure Web App startup script
console.log('=== Azure Startup Script ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('PWD:', process.env.PWD);
console.log('Current directory:', process.cwd());

// List files in current directory for debugging
const fs = require('fs');
console.log('Files in current directory:');
try {
  const files = fs.readdirSync(process.cwd());
  console.log(files.filter(f => !f.startsWith('.')).slice(0, 10));
} catch (err) {
  console.error('Could not list directory:', err.message);
}

// Set production environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Start the main server
console.log('Loading server.js...');
try {
  require('./server.js');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
