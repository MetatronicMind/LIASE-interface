const cosmosService = require('./cosmosService');
const emailSenderService = require('./emailSenderService');
const notificationManagementService = require('./notificationManagementService');
const Notification = require('../models/Notification');

/**
 * NotificationQueueService
 * Handles notification queue processing with retry logic
 */
class NotificationQueueService {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
    this.retryInterval = null;
    this.maxConcurrent = 5;
  }

  /**
   * Start the queue processor
   */
  start(intervalMs = 10000) {
    if (this.processingInterval) {
      console.log('Queue processor is already running');
      return;
    }

    console.log('Starting notification queue processor...');
    
    // Process queue immediately
    this.processQueue();
    
    // Then process at regular intervals
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);

    // Start retry processor (runs less frequently)
    this.retryInterval = setInterval(() => {
      this.processRetries();
    }, 60000); // Every minute

    console.log(`Queue processor started with ${intervalMs}ms interval`);
  }

  /**
   * Stop the queue processor
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    
    console.log('Queue processor stopped');
  }

  /**
   * Process pending notifications in queue
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log('Queue processor already running, skipping...');
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      console.log('Starting queue processing...');
      // Get all organizations to process their queues
      const organizations = await this._getAllOrganizations();
      console.log(`Found ${organizations.length} organizations to process`);

      for (const org of organizations) {
        await this._processOrganizationQueue(org.id);
      }
      
      console.log('Queue processing completed');
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process notifications for a specific organization
   */
  async _processOrganizationQueue(organizationId) {
    try {
      // Get pending notifications
      const pendingNotifications = await notificationManagementService.getPendingNotifications(
        organizationId,
        this.maxConcurrent
      );

      if (pendingNotifications.length === 0) {
        return;
      }

      console.log(`Processing ${pendingNotifications.length} pending notifications for org ${organizationId}`);

      // Process notifications in parallel (up to maxConcurrent)
      const promises = pendingNotifications.map(notification => 
        this._processNotification(notification)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.error(`Error processing queue for org ${organizationId}:`, error);
    }
  }

  /**
   * Process a single notification
   */
  async _processNotification(notificationData) {
    const notification = new Notification(notificationData);

    try {
      console.log(`Processing notification ${notification.id} - ${notification.title}`);

      // Mark as queued
      await notificationManagementService.updateNotificationStatus(
        notification.id,
        notification.organizationId,
        'queued'
      );

      // Send through each channel
      const results = await this._sendToChannels(notification);

      // Check if all channels succeeded
      const allSuccessful = results.every(r => r.success);

      if (allSuccessful) {
        // Mark as sent/delivered
        await notificationManagementService.updateNotificationStatus(
          notification.id,
          notification.organizationId,
          'delivered'
        );
        
        console.log(`✓ Notification ${notification.id} delivered successfully`);
      } else {
        // Some channels failed
        const failedChannels = results.filter(r => !r.success);
        const errorMessage = failedChannels.map(r => `${r.channel}: ${r.error}`).join('; ');
        
        await notificationManagementService.updateNotificationStatus(
          notification.id,
          notification.organizationId,
          'failed',
          { error: errorMessage }
        );
        
        console.error(`✗ Notification ${notification.id} failed:`, errorMessage);
      }
    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      
      // Mark as failed with retry
      await notificationManagementService.updateNotificationStatus(
        notification.id,
        notification.organizationId,
        'failed',
        { error: error.message }
      );
    }
  }

  /**
   * Send notification through all configured channels
   */
  async _sendToChannels(notification) {
    const results = [];

    for (const channel of notification.channels) {
      try {
        let success = false;

        switch (channel.toLowerCase()) {
          case 'email':
            success = await this._sendEmail(notification);
            break;
          
          case 'in-app':
            success = await this._sendInApp(notification);
            break;
          
          case 'sms':
            success = await this._sendSMS(notification);
            break;
          
          default:
            console.warn(`Unknown channel: ${channel}`);
            success = false;
        }

        results.push({
          channel,
          success,
          error: success ? null : 'Delivery failed'
        });
      } catch (error) {
        results.push({
          channel,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Send notification via email
   */
  async _sendEmail(notification) {
    try {
      for (const recipient of notification.recipients) {
        await emailSenderService.sendEmail(
          notification.organizationId,
          {
            to: recipient.email,
            subject: notification.title,
            bodyHtml: this._formatEmailContent(notification),
            metadata: {
              notificationId: notification.id,
              notificationType: notification.type
            }
          }
        );
      }
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  /**
   * Send in-app notification
   */
  async _sendInApp(notification) {
    try {
      // Store notification for in-app display
      const inAppNotification = {
        id: `in_app_${notification.id}`,
        notificationId: notification.id,
        organizationId: notification.organizationId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        recipients: notification.recipients.map(r => r.userId || r.email),
        isRead: false,
        createdAt: new Date().toISOString(),
        expiresAt: this._calculateExpiryDate(30), // 30 days
        type_doc: 'in_app_notification'
      };

      await cosmosService.createItem('Notifications', inAppNotification);
      return true;
    } catch (error) {
      console.error('In-app notification error:', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  async _sendSMS(notification) {
    // SMS implementation would go here
    // For now, just log
    console.log(`SMS sending not yet implemented for notification ${notification.id}`);
    return false;
  }

  /**
   * Process notifications that need retry
   */
  async processRetries() {
    try {
      const organizations = await this._getAllOrganizations();

      for (const org of organizations) {
        const retriedIds = await notificationManagementService.retryFailedNotifications(
          org.id
        );

        if (retriedIds.length > 0) {
          console.log(`Retrying ${retriedIds.length} notifications for org ${org.id}`);
        }
      }
    } catch (error) {
      console.error('Error processing retries:', error);
    }
  }

  /**
   * Format email content
   */
  _formatEmailContent(notification) {
    console.log('📧 Formatting email content:');
    console.log('   Title:', notification.title);
    console.log('   Message:', notification.message);
    console.log('   Template Data:', JSON.stringify(notification.templateData));
    
    const priorityColors = {
      urgent: '#dc2626',
      high: '#ea580c',
      normal: '#2563eb',
      low: '#6b7280'
    };

    const color = priorityColors[notification.priority] || '#2563eb';

    // Replace template variables in the message
    let message = notification.message;
    if (notification.templateData && typeof notification.templateData === 'object') {
      Object.entries(notification.templateData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, value);
      });
    }
    
    console.log('   Final message:', message);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
            .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            .priority { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; background: ${color}; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">${notification.title}</h2>
              <span class="priority">${notification.priority.toUpperCase()}</span>
            </div>
            <div class="content">
              <p>${message}</p>
              ${notification.metadata && Object.keys(notification.metadata).length > 0 ? `
                <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 5px;">
                  <strong>Additional Information:</strong>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    ${Object.entries(notification.metadata).map(([key, value]) => 
                      `<li><strong>${key}:</strong> ${value}</li>`
                    ).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>This is an automated notification from LIASE Interface System</p>
              <p style="margin: 5px 0 0 0;">Sent: ${new Date(notification.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Calculate expiry date
   */
  _calculateExpiryDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  /**
   * Get all organizations
   */
  async _getAllOrganizations() {
    try {
      // Query without type_doc filter in case organizations don't have it
      const query = 'SELECT c.id FROM c';
      const organizations = await cosmosService.queryItems('organizations', query, []);
      console.log(`Retrieved ${organizations.length} organizations from database`);
      return organizations;
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(organizationId) {
    try {
      // Cosmos DB doesn't support CASE in aggregations, so we need to fetch and count in JS
      const query = `
        SELECT c.status
        FROM c 
        WHERE c.organizationId = @organizationId
        AND c.type_doc = 'notification'
      `;

      const parameters = [
        { name: '@organizationId', value: organizationId }
      ];

      const notifications = await cosmosService.queryItems('Notifications', query, parameters);
      
      // Count by status in JavaScript
      const stats = {
        total: notifications.length,
        pending: 0,
        queued: 0,
        retrying: 0,
        sent: 0,
        delivered: 0,
        failed: 0
      };

      notifications.forEach(n => {
        if (stats.hasOwnProperty(n.status)) {
          stats[n.status]++;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }
}

module.exports = new NotificationQueueService();
