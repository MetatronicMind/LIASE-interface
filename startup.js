// This file ensures that the server.js file is properly executed on Azure
// Azure Web App will use this as the entry point

console.log('Azure startup script executing...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Current directory:', process.cwd());

// Require the main server file
require('./server.js');
