const cosmosService = require('./cosmosService');
const notificationManagementService = require('./notificationManagementService');
const emailSenderService = require('./emailSenderService');
const AuditLog = require('../models/AuditLog');

/**
 * DailyReportsService
 * Generates automated daily reports and notifications
 */
class DailyReportsService {
  constructor() {
    this.containerName = 'studies';  // Use lowercase to match cosmosService container definition
  }

  /**
   * Generate daily summary report for an organization
   */
  async generateDailySummaryReport(organizationId, date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get various metrics
      const [
        studyMetrics,
        userActivityMetrics,
        systemMetrics,
        errorMetrics
      ] = await Promise.all([
        this._getStudyMetrics(organizationId, startOfDay, endOfDay),
        this._getUserActivityMetrics(organizationId, startOfDay, endOfDay),
        this._getSystemMetrics(organizationId, startOfDay, endOfDay),
        this._getErrorMetrics(organizationId, startOfDay, endOfDay)
      ]);

      const report = {
        organizationId,
        reportDate: date.toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        reportType: 'daily_summary',
        data: {
          studyMetrics,
          userActivityMetrics,
          systemMetrics,
          errorMetrics
        },
        summary: this._generateSummaryText({
          studyMetrics,
          userActivityMetrics,
          systemMetrics,
          errorMetrics
        })
      };

      // Store report
      await this._storeReport(report);

      return report;
    } catch (error) {
      console.error('Error generating daily summary report:', error);
      throw error;
    }
  }

  /**
   * Generate weekly summary report
   */
  async generateWeeklySummaryReport(organizationId, weekStartDate = new Date()) {
    try {
      const startOfWeek = new Date(weekStartDate);
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const dailyMetrics = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(day.getDate() + i);
        
        const dayMetrics = await this._getStudyMetrics(
          organizationId,
          new Date(day.setHours(0, 0, 0, 0)),
          new Date(day.setHours(23, 59, 59, 999))
        );
        
        dailyMetrics.push({
          date: day.toISOString().split('T')[0],
          metrics: dayMetrics
        });
      }

      const report = {
        organizationId,
        weekStartDate: startOfWeek.toISOString().split('T')[0],
        weekEndDate: endOfWeek.toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        reportType: 'weekly_summary',
        data: {
          dailyMetrics,
          weeklyTotals: this._calculateWeeklyTotals(dailyMetrics)
        }
      };

      await this._storeReport(report);

      return report;
    } catch (error) {
      console.error('Error generating weekly summary report:', error);
      throw error;
    }
  }

  /**
   * Generate study completion report
   */
  async generateStudyCompletionReport(organizationId, startDate, endDate) {
    try {
      const query = `
        SELECT * FROM c 
        WHERE c.organizationId = @organizationId
        AND c.type_doc = 'study'
        AND c.status = 'completed'
        AND c.completedAt >= @startDate
        AND c.completedAt <= @endDate
        ORDER BY c.completedAt DESC
      `;

      const parameters = [
        { name: '@organizationId', value: organizationId },
        { name: '@startDate', value: startDate.toISOString() },
        { name: '@endDate', value: endDate.toISOString() }
      ];

      const completedStudies = await cosmosService.queryItems(
        this.containerName,
        query,
        parameters
      );

      const report = {
        organizationId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        reportType: 'study_completion',
        data: {
          totalCompleted: completedStudies.length,
          studies: completedStudies.map(study => ({
            id: study.id,
            title: study.title,
            pmid: study.pmid,
            completedAt: study.completedAt,
            completedBy: study.lastModifiedBy,
            workflowStage: study.workflowStage
          })),
          averageCompletionTime: this._calculateAverageCompletionTime(completedStudies)
        }
      };

      await this._storeReport(report);

      return report;
    } catch (error) {
      console.error('Error generating study completion report:', error);
      throw error;
    }
  }

  /**
   * Send daily report via notification system
   */
  async sendDailyReport(organizationId, recipients, reportType = 'daily_summary') {
    try {
      // Generate the report
      let report;
      switch (reportType) {
        case 'daily_summary':
          report = await this.generateDailySummaryReport(organizationId);
          break;
        case 'weekly_summary':
          report = await this.generateWeeklySummaryReport(organizationId);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // If no recipients provided, get admin users from the organization
      let finalRecipients = recipients;
      if (!finalRecipients || finalRecipients.length === 0) {
        finalRecipients = await this._getAdminEmails(organizationId);
      }

      // If still no recipients, skip notification but return the report
      if (!finalRecipients || finalRecipients.length === 0) {
        console.log('No recipients found for daily report, skipping notification');
        return {
          report,
          notification: null,
          sentTo: [],
          message: 'Report generated but not sent (no recipients configured)'
        };
      }

      // Create notification for the report
      const notification = await notificationManagementService.createNotification({
        organizationId,
        type: 'report',
        title: `${reportType === 'daily_summary' ? 'Daily' : 'Weekly'} Summary Report`,
        message: report.summary || 'Report has been generated successfully.',
        recipients: finalRecipients.map(email => ({ email, name: email })),
        channels: ['email'],
        priority: 'normal',
        metadata: {
          reportId: report.id,
          reportType: report.reportType,
          reportData: report.data
        }
      }, 'system');

      // Send via email service
      await this._sendReportEmail(report, recipients);

      return {
        report,
        notification,
        sentTo: recipients
      };
    } catch (error) {
      console.error('Error sending daily report:', error);
      throw error;
    }
  }

  /**
   * Private: Get study metrics for a date range
   */
  async _getStudyMetrics(organizationId, startDate, endDate) {
    const query = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'study'
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId }
    ];

    const studies = await cosmosService.queryItems(
      this.containerName,
      query,
      parameters
    );

    // Calculate metrics in code
    const metrics = {
      total: studies.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      newStudies: 0
    };

    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    studies.forEach(study => {
      if (study.status === 'completed') metrics.completed++;
      if (study.status === 'in_progress') metrics.inProgress++;
      if (study.status === 'pending') metrics.pending++;
      
      if (study.createdAt) {
        const createdTime = new Date(study.createdAt).getTime();
        if (createdTime >= startTime && createdTime <= endTime) {
          metrics.newStudies++;
        }
      }
    });

    return metrics;
  }

  /**
   * Private: Get user activity metrics
   */
  async _getUserActivityMetrics(organizationId, startDate, endDate) {
    const query = `
      SELECT c.userId FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'audit_log'
      AND c.timestamp >= @startDate
      AND c.timestamp <= @endDate
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@startDate', value: startDate.toISOString() },
      { name: '@endDate', value: endDate.toISOString() }
    ];

    const results = await cosmosService.queryItems(
      'audit-logs',
      query,
      parameters
    );

    // Calculate unique users in code
    const uniqueUsers = new Set(results.map(r => r.userId).filter(Boolean));

    return {
      activeUsers: uniqueUsers.size,
      totalActions: results.length
    };
  }

  /**
   * Private: Get system metrics
   */
  async _getSystemMetrics(organizationId, startDate, endDate) {
    // Get notification metrics
    const notificationQuery = `
      SELECT * FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'notification'
      AND c.createdAt >= @startDate
      AND c.createdAt <= @endDate
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@startDate', value: startDate.toISOString() },
      { name: '@endDate', value: endDate.toISOString() }
    ];

    const notifications = await cosmosService.queryItems(
      'Notifications',
      notificationQuery,
      parameters
    );

    // Calculate metrics in code
    const metrics = {
      totalNotifications: notifications.length,
      delivered: 0,
      failed: 0
    };

    notifications.forEach(notif => {
      if (notif.status === 'delivered') metrics.delivered++;
      if (notif.status === 'failed') metrics.failed++;
    });

    return {
      notifications: metrics
    };
  }

  /**
   * Private: Get error metrics
   */
  async _getErrorMetrics(organizationId, startDate, endDate) {
    const query = `
      SELECT c.action FROM c 
      WHERE c.organizationId = @organizationId
      AND c.type_doc = 'audit_log'
      AND c.timestamp >= @startDate
      AND c.timestamp <= @endDate
    `;

    const parameters = [
      { name: '@organizationId', value: organizationId },
      { name: '@startDate', value: startDate.toISOString() },
      { name: '@endDate', value: endDate.toISOString() }
    ];

    const results = await cosmosService.queryItems(
      'audit-logs',
      query,
      parameters
    );

    // Count errors in code (filter for actions containing 'error')
    const errorCount = results.filter(r => 
      r.action && r.action.toLowerCase().includes('error')
    ).length;

    return { totalErrors: errorCount };
  }

  /**
   * Private: Generate summary text from metrics
   */
  _generateSummaryText(metrics) {
    const { studyMetrics, userActivityMetrics, systemMetrics, errorMetrics } = metrics;
    
    return `
Daily Summary Report:

Studies:
- Total Studies: ${studyMetrics.total}
- New Studies Today: ${studyMetrics.newStudies}
- Completed: ${studyMetrics.completed}
- In Progress: ${studyMetrics.inProgress}
- Pending: ${studyMetrics.pending}

User Activity:
- Active Users: ${userActivityMetrics.activeUsers}
- Total Actions: ${userActivityMetrics.totalActions}

System Health:
- Notifications Sent: ${systemMetrics.notifications.totalNotifications}
- Successfully Delivered: ${systemMetrics.notifications.delivered}
- Failed Notifications: ${systemMetrics.notifications.failed}
- System Errors: ${errorMetrics.totalErrors}
    `.trim();
  }

  /**
   * Private: Store report in database
   */
  async _storeReport(report) {
    const reportDoc = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...report,
      type_doc: 'report'
    };

    await cosmosService.createItem('Reports', reportDoc);
    
    return reportDoc;
  }

  /**
   * Private: Calculate weekly totals
   */
  _calculateWeeklyTotals(dailyMetrics) {
    return dailyMetrics.reduce((totals, day) => {
      return {
        total: totals.total + (day.metrics.total || 0),
        completed: totals.completed + (day.metrics.completed || 0),
        inProgress: totals.inProgress + (day.metrics.inProgress || 0),
        pending: totals.pending + (day.metrics.pending || 0),
        newStudies: totals.newStudies + (day.metrics.newStudies || 0)
      };
    }, { total: 0, completed: 0, inProgress: 0, pending: 0, newStudies: 0 });
  }

  /**
   * Private: Calculate average completion time
   */
  _calculateAverageCompletionTime(studies) {
    if (studies.length === 0) return 0;

    const totalTime = studies.reduce((sum, study) => {
      if (study.createdAt && study.completedAt) {
        const created = new Date(study.createdAt);
        const completed = new Date(study.completedAt);
        return sum + (completed - created);
      }
      return sum;
    }, 0);

    // Return average in hours
    return Math.round((totalTime / studies.length) / (1000 * 60 * 60));
  }

  /**
   * Private: Send report via email
   */
  async _sendReportEmail(report, recipients) {
    const emailContent = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${report.reportType === 'daily_summary' ? 'Daily' : 'Weekly'} Summary Report</h2>
          <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
          <div style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">
            ${report.summary || JSON.stringify(report.data, null, 2)}
          </div>
        </body>
      </html>
    `;

    for (const email of recipients) {
      try {
        await emailSenderService.sendEmail({
          to: email,
          subject: `${report.reportType === 'daily_summary' ? 'Daily' : 'Weekly'} Summary Report - ${report.reportDate || report.weekStartDate}`,
          html: emailContent,
          organizationId: report.organizationId
        });
      } catch (error) {
        console.error(`Failed to send report email to ${email}:`, error);
      }
    }
  }

  /**
   * Private: Get admin user emails for an organization
   */
  async _getAdminEmails(organizationId) {
    try {
      // Query users with admin role
      const query = `
        SELECT c.email, c.username, c.role
        FROM c 
        WHERE c.organizationId = @organizationId 
        AND c.type = 'user'
        AND (
          c.role = 'Admin' OR
          c.role = 'admin' OR
          c.role = 'superadmin' OR
          c.role = 'Super Admin'
        )
      `;
      
      const parameters = [
        { name: '@organizationId', value: organizationId }
      ];

      console.log('Querying admin emails with:', { organizationId, query });
      const adminUsers = await cosmosService.queryItems('users', query, parameters);
      console.log('Found admin users:', adminUsers);
      
      // Return email addresses
      const emails = adminUsers.map(user => user.email).filter(email => email);
      console.log('Admin emails found:', emails);
      return emails;
    } catch (error) {
      console.error('Error fetching admin emails:', error);
      return [];
    }
  }
}

module.exports = new DailyReportsService();
