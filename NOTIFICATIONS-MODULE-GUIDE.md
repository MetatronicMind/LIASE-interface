# Notifications Module - Implementation Guide

## Overview

The Notifications Module is a comprehensive system for managing automated notifications, daily reports, and event-based alerts in the LIASE Interface application. It provides administrators with powerful tools to configure notification rules, schedule reports, and monitor delivery status.

## Architecture

### Core Components

1. **Daily Reports Service** (`dailyReportsService.js`)

   - Generates automated daily and weekly summary reports
   - Aggregates metrics from studies, users, and system health
   - Sends reports via email to administrators

2. **Notification Queue Service** (`notificationQueueService.js`)

   - Manages notification queue with retry logic
   - Processes notifications through multiple channels (email, in-app, SMS)
   - Handles concurrent processing with configurable limits
   - Implements exponential backoff for failed deliveries

3. **Notification Trigger Service** (`notificationTriggerService.js`)

   - Responds to system events (user actions, study completions, errors)
   - Evaluates notification rules and conditions
   - Creates notifications based on event triggers
   - Supports custom event handlers

4. **Azure Scheduler Service** (`azureSchedulerService.js`)

   - Integrates with Azure Scheduler for scheduled jobs
   - Uses node-cron for local scheduling
   - Manages notification rules and daily reports
   - Provides health monitoring and queue management

5. **Notification Management Service** (`notificationManagementService.js`)
   - CRUD operations for notifications and rules
   - Statistics and analytics
   - Recipient resolution (by role, user, or custom email)
   - Audit logging

## Features

### ✅ Notification System

- **Multi-channel delivery**: Email, in-app, SMS (extensible)
- **Priority levels**: Low, normal, high, urgent
- **Status tracking**: Pending, queued, sent, delivered, failed, retrying
- **Retry logic**: Configurable retry attempts with exponential backoff
- **Audit trail**: Complete logging of all notification activities

### ✅ Daily Reports

- **Daily Summary**: Comprehensive overview of studies, user activity, and system health
- **Weekly Summary**: Aggregated weekly metrics and trends
- **Study Completion Report**: Detailed reports on completed studies
- **Automated Scheduling**: Daily reports at 9:00 AM UTC, weekly reports on Mondays

### ✅ Notification Rules

- **Trigger Types**:

  - **Scheduled**: Time-based notifications (daily, weekly, monthly, cron)
  - **Event-based**: Triggered by system events
  - **Manual**: On-demand notifications

- **Event Types Supported**:

  - User created/updated/deleted
  - Study created/completed/assigned/status changed
  - Report generated/failed
  - System errors
  - Threshold exceeded
  - Job completed/failed

- **Recipient Configuration**:

  - By role (e.g., all administrators)
  - Specific users
  - Custom email addresses
  - Mix of all above

- **Conditions**: Rule-based filtering with operators (equals, contains, greater than, etc.)

### ✅ Admin Panel Integration

- **Three-tab interface**:

  1. **Notifications**: View and filter all notifications
  2. **Rules**: Create, edit, delete, and trigger notification rules
  3. **Reports**: Generate daily and weekly reports on-demand

- **Statistics Dashboard**: Real-time metrics on notifications sent, pending, and failed

## API Endpoints

### Notifications

```
GET    /api/notifications                    - Get all notifications (with filters)
GET    /api/notifications/:id                - Get notification by ID
POST   /api/notifications                    - Create notification
PATCH  /api/notifications/:id/status         - Update notification status
POST   /api/notifications/retry              - Retry failed notifications
GET    /api/notifications/stats/summary      - Get notification statistics
GET    /api/notifications/queue/stats        - Get queue statistics
```

### Notification Rules

```
GET    /api/notifications/rules/list         - Get all notification rules
GET    /api/notifications/rules/:id          - Get rule by ID
POST   /api/notifications/rules              - Create notification rule
PUT    /api/notifications/rules/:id          - Update notification rule
DELETE /api/notifications/rules/:id          - Delete notification rule
POST   /api/notifications/rules/:id/trigger  - Manually trigger a rule
```

### Daily Reports

```
POST   /api/notifications/reports/daily             - Generate daily/weekly report
POST   /api/notifications/reports/study-completion  - Generate study completion report
```

### Scheduler

```
GET    /api/notifications/scheduler/status   - Get scheduler status and jobs
```

## Database Schema

### Notification Document

```javascript
{
  id: "notification_<uuid>",
  organizationId: "org_123",
  type: "info|warning|error|success|report",
  title: "Notification Title",
  message: "Notification message content",
  recipients: [
    { userId: "user_123", email: "user@example.com", name: "User Name" }
  ],
  channels: ["email", "in-app"],
  priority: "normal|low|high|urgent",
  status: "pending|queued|sent|delivered|failed|retrying",
  scheduleType: "immediate|scheduled|recurring",
  scheduledAt: "2025-11-23T09:00:00Z",
  retryCount: 0,
  maxRetries: 3,
  deliveryAttempts: [...],
  metadata: {},
  createdBy: "user_123",
  createdAt: "2025-11-23T08:00:00Z",
  sentAt: "2025-11-23T08:01:00Z",
  type_doc: "notification"
}
```

### Notification Rule Document

```javascript
{
  id: "notification_rule_<uuid>",
  organizationId: "org_123",
  name: "Daily Summary Report",
  description: "Send daily summary to admins",
  isActive: true,
  triggerType: "scheduled|event|manual",
  eventType: "study_completed|user_created|...",
  scheduleType: "daily|weekly|monthly|cron",
  scheduledTime: "09:00",
  scheduledDays: ["monday", "friday"],
  notificationTemplate: {
    type: "report",
    title: "Daily Summary",
    message: "Your daily summary is ready",
    channels: ["email"]
  },
  recipientConfig: {
    type: "roles",
    roles: ["admin", "super_admin"],
    users: [],
    customEmails: []
  },
  conditions: [...],
  priority: "normal",
  lastTriggeredAt: "2025-11-23T09:00:00Z",
  nextScheduledAt: "2025-11-24T09:00:00Z",
  type_doc: "notification_rule"
}
```

## Configuration

### Environment Variables

```bash
# Email Configuration (for notification delivery)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@example.com
SMTP_PASS=your_password
SMTP_FROM_NAME="LIASE Notifications"
SMTP_FROM_EMAIL=noreply@example.com
```

### Scheduler Configuration

The scheduler is configured with these default jobs:

- **Daily Reports**: 9:00 AM UTC daily
- **Weekly Reports**: 9:00 AM UTC every Monday
- **Cleanup Old Notifications**: 2:00 AM UTC daily
- **Process Scheduled Notifications**: Every 5 minutes
- **Health Check**: Every hour

## Usage Examples

### Creating a Notification Rule (Frontend)

```typescript
const createNotificationRule = async () => {
  const token = localStorage.getItem("token");

  const rule = {
    name: "Study Completion Alert",
    description: "Notify admins when a study is completed",
    triggerType: "event",
    eventType: "study_completed",
    notificationTemplate: {
      type: "success",
      title: "Study Completed",
      message: "A study has been completed and requires review",
      channels: ["email", "in-app"],
    },
    recipientConfig: {
      type: "roles",
      roles: ["admin", "medical_examiner"],
      users: [],
      customEmails: [],
    },
    priority: "high",
    isActive: true,
  };

  const response = await fetch(`${API_BASE_URL}/notifications/rules`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rule),
  });

  return await response.json();
};
```

### Triggering an Event (Backend)

```javascript
const notificationTriggerService = require("./services/notificationTriggerService");

// When a study is completed
await notificationTriggerService.triggerEvent("study_completed", {
  organizationId: "org_123",
  study: studyData,
  completedBy: user.email,
  userId: user.id,
});
```

### Generating a Report Manually

```javascript
const dailyReportsService = require("./services/dailyReportsService");

// Generate and send daily report
const result = await dailyReportsService.sendDailyReport(
  organizationId,
  ["admin@example.com", "supervisor@example.com"],
  "daily_summary"
);
```

## Monitoring and Maintenance

### Queue Statistics

Monitor queue health via the API:

```bash
GET /api/notifications/queue/stats
```

Response:

```json
{
  "stats": {
    "total": 150,
    "pending": 5,
    "queued": 2,
    "retrying": 1,
    "sent": 120,
    "delivered": 115,
    "failed": 7
  }
}
```

### Scheduler Status

Check scheduler health:

```bash
GET /api/notifications/scheduler/status
```

Response:

```json
{
  "initialized": true,
  "totalJobs": 8,
  "jobs": [
    {
      "name": "daily_reports",
      "running": true,
      "nextRun": "2025-11-24T09:00:00Z"
    }
  ]
}
```

### Audit Logs

All notification activities are logged to the `AuditLogs` container with these actions:

- `notification_created`
- `notification_rule_created`
- `notification_rule_updated`
- `notification_rule_deleted`
- `notification_event_triggered`

## Troubleshooting

### Notifications Not Being Sent

1. Check queue processor status: Ensure `notificationQueueService` is running
2. Review failed notifications: Check `/api/notifications?status=failed`
3. Verify email configuration: Test SMTP settings
4. Check retry count: Failed notifications are retried up to 3 times

### Rules Not Triggering

1. Verify rule is active: `isActive: true`
2. Check conditions: Ensure event data meets rule conditions
3. Review scheduler status: Confirm scheduled jobs are running
4. Check event triggers: Ensure events are being fired correctly

### Reports Not Generating

1. Verify scheduler is initialized: Check server logs
2. Check admin emails: Ensure organization has admin users with emails
3. Review report generation logs: Check for errors in daily report service
4. Test manual generation: Use the Reports tab to trigger manually

## Security Considerations

- All API endpoints require authentication via JWT token
- Notifications can only be viewed by users in the same organization
- Email addresses are validated before sending
- Rate limiting prevents abuse of notification creation
- Sensitive data is not included in email bodies (use links instead)

## Performance Optimization

- Queue processor runs concurrently (max 5 notifications at once)
- Notifications are batched for efficiency
- Old notifications are automatically cleaned up after 90 days
- Database queries are optimized with proper indexing
- Retry logic uses exponential backoff to reduce load

## Future Enhancements

- [ ] SMS integration via Twilio
- [ ] Push notifications for mobile apps
- [ ] Rich email templates with HTML/CSS
- [ ] Notification preferences per user
- [ ] A/B testing for notification effectiveness
- [ ] Advanced analytics dashboard
- [ ] Webhook support for third-party integrations
- [ ] Multi-language support for notifications

## Testing

### Unit Tests

```bash
npm test -- notifications
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

1. Create a test notification rule
2. Trigger the rule manually
3. Verify email delivery
4. Check notification status in admin panel
5. Generate a daily report
6. Review audit logs

## Support

For issues or questions:

- Check server logs for errors
- Review API documentation
- Contact system administrator
- Submit issue to development team

---

**Version**: 1.0.0  
**Last Updated**: November 23, 2025  
**Author**: LIASE Development Team
