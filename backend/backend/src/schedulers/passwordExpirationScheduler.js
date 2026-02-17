const cron = require('node-cron');
const cosmosService = require('../services/cosmosService');
const User = require('../models/User');
const Notification = require('../models/Notification');

const checkPasswordExpiration = async () => {
  console.log('Running password expiration check...');
  try {
    // Query all active users
    const query = `
      SELECT * FROM c 
      WHERE c.type = 'user' 
      AND c.isActive = true
    `;
    const users = await cosmosService.queryItems('users', query, []);
    
    const now = new Date();
    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    
    for (const userData of users) {
      const user = new User(userData);
      
      // Skip if user is not active (already filtered by query but good to be safe)
      if (!user.isActive) continue;

      const passwordChangedAt = new Date(user.passwordChangedAt || user.createdAt);
      const expiryDate = new Date(passwordChangedAt.getTime() + threeMonthsMs);
      const notificationDate = new Date(expiryDate.getTime() - oneWeekMs);
      
      // Check if today is the notification date (ignoring time)
      const isNotificationDay = 
        now.getDate() === notificationDate.getDate() &&
        now.getMonth() === notificationDate.getMonth() &&
        now.getFullYear() === notificationDate.getFullYear();
        
      if (isNotificationDay) {
        console.log(`Sending password expiration warning to user ${user.username}`);
        
        const notification = new Notification({
          organizationId: user.organizationId,
          type: 'warning',
          title: 'Password Expiration Warning',
          message: 'Your password will expire in 1 week. Please reset your password.',
          recipients: [{ userId: user.id, email: user.email, name: user.getFullName() }],
          channels: ['email', 'in-app'],
          priority: 'high'
        });
        
        await cosmosService.createItem('Notifications', notification.toJSON());
      }
    }
  } catch (error) {
    console.error('Error in password expiration check:', error);
  }
};

// Run daily at 00:00
const task = cron.schedule('0 0 * * *', checkPasswordExpiration);


// --- ADD THIS BLOCK FOR TESTING ---
// Run the check 5 seconds after server start to test immediately
// setTimeout(() => {
//   console.log('--- TESTING SCHEDULER ---');
//   checkPasswordExpiration();
// }, 5000);


module.exports = task;
