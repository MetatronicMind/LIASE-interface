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
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      // Get all organizations to process their queues
      const organizations = await this._getAllOrganizations();

      for (const org of organizations) {
        await this._processOrganizationQueue(org.id);
      }
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
        await emailSenderService.sendEmail({
          to: recipient.email,
          subject: notification.title,
          html: this._formatEmailContent(notification),
          organizationId: notification.organizationId,
          metadata: {
            notificationId: notification.id,
            notificationType: notification.type
          }
        });
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
    const priorityColors = {
      urgent: '#dc2626',
      high: '#ea580c',
      normal: '#2563eb',
      low: '#6b7280'
    };

    const color = priorityColors[notification.priority] || '#2563eb';

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
              <p>${notification.message}</p>
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
      const query = 'SELECT c.id FROM c WHERE c.type_doc = "organization"';
      const organizations = await cosmosService.queryItems('Organizations', query, []);
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
      const query = `
        SELECT 
          COUNT(1) as total,
          SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN c.status = 'queued' THEN 1 ELSE 0 END) as queued,
          SUM(CASE WHEN c.status = 'retrying' THEN 1 ELSE 0 END) as retrying,
          SUM(CASE WHEN c.status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN c.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM c 
        WHERE c.organizationId = @organizationId
        AND c.type_doc = 'notification'
      `;

      const parameters = [
        { name: '@organizationId', value: organizationId }
      ];

      const results = await cosmosService.queryItems('Notifications', query, parameters);
      
      return results[0] || {
        total: 0,
        pending: 0,
        queued: 0,
        retrying: 0,
        sent: 0,
        delivered: 0,
        failed: 0
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }
}

module.exports = new NotificationQueueService();
