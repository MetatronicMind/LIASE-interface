# LIASE Three Module Implementation Guide

## Overview

This document provides comprehensive documentation for the three newly added modules to the LIASE application:

1. **Notifications Module** - Automated notification system with scheduling and delivery tracking
2. **Email Sender Module** - SMTP-based email system with template management
3. **Admin Configuration Module** - Comprehensive admin panel for system configuration

---

## Module 1: Notifications Module

### Features

- Create and manage notifications with multi-channel delivery (email, in-app)
- Configure notification rules with triggers (scheduled, event-based, manual)
- Automated retry logic with exponential backoff
- Notification queue for reliable delivery
- Comprehensive audit logging
- Tenant-specific notification preferences
- Real-time notification statistics

### Database Models

#### Notification Model

- **Location**: `backend/src/models/Notification.js`
- **Container**: `Notifications`
- **Key Fields**:
  - `type`: info, warning, error, success, report
  - `status`: pending, queued, sent, delivered, failed, retrying
  - `priority`: low, normal, high, urgent
  - `channels`: Array of delivery channels
  - `recipients`: Array of recipient objects
  - `retryCount`: Number of delivery attempts
  - `deliveryAttempts`: History of delivery attempts

#### NotificationRule Model

- **Location**: `backend/src/models/NotificationRule.js`
- **Container**: `Notifications`
- **Key Fields**:
  - `triggerType`: scheduled, event, manual
  - `scheduleType`: once, daily, weekly, monthly, cron
  - `recipientConfig`: Configuration for recipient selection
  - `conditions`: Array of conditions to evaluate
  - `nextScheduledAt`: Next execution time

### API Endpoints

#### Notifications

```
GET    /api/notifications                    - Get all notifications
GET    /api/notifications/:id                - Get notification by ID
POST   /api/notifications                    - Create notification
PATCH  /api/notifications/:id/status         - Update notification status
POST   /api/notifications/retry              - Retry failed notifications
GET    /api/notifications/stats/summary      - Get notification statistics
```

#### Notification Rules

```
GET    /api/notifications/rules/list         - Get all notification rules
GET    /api/notifications/rules/:id          - Get rule by ID
POST   /api/notifications/rules              - Create notification rule
PUT    /api/notifications/rules/:id          - Update notification rule
DELETE /api/notifications/rules/:id          - Delete notification rule
POST   /api/notifications/rules/:id/trigger  - Trigger rule manually
```

### Service Layer

- **Location**: `backend/src/services/notificationManagementService.js`
- **Key Methods**:
  - `createNotification()` - Create and validate notification
  - `getNotifications()` - Query with filters and pagination
  - `updateNotificationStatus()` - Update delivery status
  - `createNotificationRule()` - Create automated notification rule
  - `triggerNotificationRule()` - Execute notification rule
  - `cleanupOldNotifications()` - Remove old notifications

### Usage Examples

#### Create Notification

```javascript
POST /api/notifications
{
  "type": "info",
  "title": "System Maintenance",
  "message": "Scheduled maintenance will occur tonight",
  "recipients": [
    { "email": "user@example.com", "name": "John Doe" }
  ],
  "channels": ["email"],
  "priority": "high"
}
```

#### Create Notification Rule

```javascript
POST /api/notifications/rules
{
  "name": "Daily Report",
  "triggerType": "scheduled",
  "scheduleType": "daily",
  "scheduledTime": "09:00",
  "notificationTemplate": {
    "type": "report",
    "title": "Daily Summary",
    "message": "Your daily report is ready",
    "channels": ["email"]
  },
  "recipientConfig": {
    "type": "roles",
    "roles": ["admin", "manager"]
  }
}
```

---

## Module 2: Email Sender Module

### Features

- Email template management with variable substitution
- Template locking mechanism for approved templates
- SMTP configuration per organization
- Email queue with priority and scheduling
- Delivery tracking and status monitoring
- Rate limiting per SMTP provider
- Support for HTML and plain text formats
- Template versioning for locked templates

### Database Models

#### EmailTemplate Model

- **Location**: `backend/src/models/EmailTemplate.js`
- **Container**: `Emails`
- **Key Fields**:
  - `name`: Template name
  - `subject`: Email subject with variable placeholders
  - `bodyHtml`: HTML email body
  - `bodyPlain`: Plain text version
  - `variables`: Array of variable definitions
  - `isLocked`: Lock status (prevents editing)
  - `version`: Template version number

#### EmailLog Model

- **Location**: `backend/src/models/EmailLog.js`
- **Container**: `Emails`
- **Key Fields**:
  - `status`: queued, sending, sent, delivered, failed, bounced
  - `to/cc/bcc`: Recipients
  - `sentAt/deliveredAt`: Timestamps
  - `errorMessage`: Failure reason
  - `retryCount`: Retry attempts

#### SMTPConfig Model

- **Location**: `backend/src/models/SMTPConfig.js`
- **Container**: `Emails`
- **Key Fields**:
  - `provider`: gmail, sendgrid, ses, custom
  - `host/port/secure`: Connection settings
  - `username/password`: Authentication
  - `fromEmail/fromName`: Sender details
  - `maxEmailsPerHour`: Rate limit

### API Endpoints

#### Email Templates

```
GET    /api/emails/templates                 - Get all templates
GET    /api/emails/templates/:id             - Get template by ID
POST   /api/emails/templates                 - Create template
PUT    /api/emails/templates/:id             - Update template
POST   /api/emails/templates/:id/lock        - Lock template
POST   /api/emails/templates/:id/unlock      - Unlock template (admin)
POST   /api/emails/templates/:id/version     - Create new version
DELETE /api/emails/templates/:id             - Delete template
POST   /api/emails/templates/:id/render      - Render template preview
```

#### SMTP Configuration

```
GET    /api/emails/smtp                      - Get all SMTP configs
POST   /api/emails/smtp                      - Create SMTP config
PUT    /api/emails/smtp/:id                  - Update SMTP config
POST   /api/emails/smtp/:id/test             - Test SMTP config
DELETE /api/emails/smtp/:id                  - Delete SMTP config
```

#### Email Sending

```
POST   /api/emails/send                      - Send email immediately
POST   /api/emails/queue                     - Queue email for sending
GET    /api/emails/logs                      - Get email delivery logs
```

### Service Layer

- **Location**: `backend/src/services/emailSenderService.js`
- **Dependencies**: `nodemailer`
- **Key Methods**:
  - `createEmailTemplate()` - Create template with validation
  - `lockEmailTemplate()` - Lock template after approval
  - `renderTemplate()` - Render template with data
  - `sendEmail()` - Send email via SMTP
  - `queueEmail()` - Add email to delivery queue
  - `processEmailQueue()` - Process queued emails

### Usage Examples

#### Create Email Template

```javascript
POST /api/emails/templates
{
  "name": "Welcome Email",
  "subject": "Welcome to {companyName}, {username}!",
  "bodyHtml": "<h1>Hey {username}</h1><p>{content_of_email}</p>",
  "variables": [
    { "name": "username", "required": true },
    { "name": "companyName", "required": true },
    { "name": "content_of_email", "required": false, "defaultValue": "" }
  ],
  "category": "general",
  "status": "draft"
}
```

#### Lock Template

```javascript
POST /api/emails/templates/{templateId}/lock
{
  "reason": "Approved for production use"
}
```

#### Send Email with Template

```javascript
POST /api/emails/send
{
  "to": ["user@example.com"],
  "subject": "Welcome to LIASE!",
  "bodyHtml": "<rendered html>",
  "bodyPlain": "rendered plain text"
}
```

#### Configure SMTP

```javascript
POST /api/emails/smtp
{
  "name": "SendGrid Production",
  "provider": "sendgrid",
  "host": "smtp.sendgrid.net",
  "port": 587,
  "secure": false,
  "username": "apikey",
  "password": "SG.xxxxx",
  "fromEmail": "noreply@liase.com",
  "fromName": "LIASE System",
  "maxEmailsPerHour": 100,
  "isDefault": true
}
```

---

## Module 3: Admin Configuration Module

### Features

- Personalization settings (branding, colors, themes)
- Custom starter screen builder
- Session management configuration
- Notification preferences
- Cron job scheduler with visual interface
- Data migration tools with ID matching
- Security and password policies
- Real-time configuration updates

### Database Models

#### AdminConfig Model

- **Location**: `backend/src/models/AdminConfig.js`
- **Container**: `AdminConfigs`
- **Config Types**:
  - `personalization`: Branding and UI customization
  - `session`: Session timeout and management
  - `notification`: Notification preferences
  - `scheduler`: Cron job settings
  - `migration`: Data import/export configuration
  - `security`: Password policies and security settings

#### ScheduledJob Model

- **Location**: `backend/src/models/ScheduledJob.js`
- **Container**: `ScheduledJobs`
- **Job Types**: report, notification, cleanup, backup, custom
- **Schedule Types**: cron, interval, once

### API Endpoints

#### Admin Configuration

```
GET    /api/admin-config                         - Get all configs
GET    /api/admin-config/:configType             - Get specific config
PUT    /api/admin-config/:configType             - Update config
GET    /api/admin-config/:configType/value       - Get config value
POST   /api/admin-config/:configType/value       - Set config value
POST   /api/admin-config/personalization/branding/upload  - Upload asset
GET    /api/admin-config/export                  - Export all configs
POST   /api/admin-config/import                  - Import configs
```

#### Scheduled Jobs

```
GET    /api/admin-config/scheduler/jobs          - Get all jobs
GET    /api/admin-config/scheduler/jobs/:id      - Get job by ID
POST   /api/admin-config/scheduler/jobs          - Create job
PUT    /api/admin-config/scheduler/jobs/:id      - Update job
DELETE /api/admin-config/scheduler/jobs/:id      - Delete job
POST   /api/admin-config/scheduler/jobs/:id/execute  - Execute manually
PATCH  /api/admin-config/scheduler/jobs/:id/toggle   - Pause/resume job
GET    /api/admin-config/scheduler/jobs/:id/history  - Get execution history
```

#### Security

```
POST   /api/admin-config/security/validate-password        - Validate password
GET    /api/admin-config/security/password-change-required/:userId  - Check if password change needed
```

### Service Layers

#### AdminConfigService

- **Location**: `backend/src/services/adminConfigService.js`
- **Key Methods**:
  - `getConfig()` - Get or create config
  - `updateConfig()` - Update configuration
  - `getConfigValue()` / `setConfigValue()` - Path-based access
  - `validatePassword()` - Check against password policy
  - `exportConfigs()` / `importConfigs()` - Backup/restore

#### SchedulerService

- **Location**: `backend/src/services/schedulerService.js`
- **Dependencies**: `node-cron`, `cron-parser`
- **Key Methods**:
  - `initialize()` - Load and schedule all active jobs
  - `createScheduledJob()` - Create new job
  - `executeJob()` - Run job manually or via schedule
  - `processReportJob()` - Generate and send reports
  - `processCleanupJob()` - Clean up old data

### Configuration Examples

#### Personalization Config

```javascript
PUT /api/admin-config/personalization
{
  "configData": {
    "branding": {
      "logoUrl": "https://...",
      "primaryColor": "#3B82F6",
      "secondaryColor": "#10B981"
    },
    "starterScreen": {
      "enabled": true,
      "title": "Welcome to LIASE",
      "quickLinks": [
        { "title": "Dashboard", "url": "/dashboard" }
      ]
    },
    "locale": {
      "defaultLanguage": "en",
      "defaultTimezone": "America/New_York"
    }
  }
}
```

#### Session Config

```javascript
PUT /api/admin-config/session
{
  "configData": {
    "timeout": 30,
    "autoLogout": true,
    "captureTimestamp": true,
    "showWarningBefore": 5
  }
}
```

#### Security Config

```javascript
PUT /api/admin-config/security
{
  "configData": {
    "passwordPolicy": {
      "minLength": 12,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSpecialChars": true,
      "expiryDays": 90
    }
  }
}
```

#### Create Scheduled Job

```javascript
POST /api/admin-config/scheduler/jobs
{
  "name": "Daily Report Generation",
  "jobType": "report",
  "scheduleType": "cron",
  "cronExpression": "0 9 * * *",
  "timezone": "America/New_York",
  "payload": {
    "reportType": "daily_summary",
    "recipients": ["admin@example.com"]
  }
}
```

---

## Integration Flow

### Notification + Email Integration

1. Admin creates notification rule via Notifications Module
2. Rule specifies email as delivery channel
3. When rule triggers:
   - Notification Management Service creates notification
   - Email Sender Service queues email with template
   - SMTP service delivers email
   - Status updates flow back to notification

### Scheduler + Notification Integration

1. Admin configures scheduled job for daily reports
2. Scheduler Service triggers at specified time
3. Report job generates report data
4. Email Sender Service sends report via email
5. Notification Management Service tracks delivery

### Admin Config + All Modules

1. Admin sets notification preferences in Admin Config
2. All notification operations respect these settings
3. Session config enforces automatic logout
4. Security config validates passwords on user creation
5. Scheduler config controls retention policies

---

## Testing the Implementation

### 1. Test Notification Creation

```bash
curl -X POST http://localhost:8000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "info",
    "title": "Test Notification",
    "message": "This is a test",
    "recipients": [{"email": "test@example.com", "name": "Test User"}],
    "channels": ["email"]
  }'
```

### 2. Test Email Template

```bash
curl -X POST http://localhost:8000/api/emails/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "subject": "Hello {username}",
    "bodyHtml": "<p>Welcome {username}!</p>",
    "variables": [{"name": "username", "required": true}]
  }'
```

### 3. Test Admin Config

```bash
curl -X PUT http://localhost:8000/api/admin-config/session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "configData": {
      "timeout": 30,
      "autoLogout": true
    }
  }'
```

### 4. Test Scheduled Job

```bash
curl -X POST http://localhost:8000/api/admin-config/scheduler/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Job",
    "jobType": "cleanup",
    "scheduleType": "cron",
    "cronExpression": "0 2 * * *",
    "payload": {"entityType": "notifications", "retentionDays": 30}
  }'
```

---

## Environment Variables

Add these to your `.env.local`:

```env
# Email Configuration (Optional - can be configured via UI)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_EMAIL=noreply@yourapp.com
SMTP_FROM_NAME=Your App Name

# Scheduler Configuration
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=UTC
SCHEDULER_RETENTION_DAYS=30
```

---

## Next Steps for Frontend Implementation

### Required Frontend Components

1. **Notifications Dashboard** (`frontend/src/components/notifications/`)

   - NotificationList.tsx
   - NotificationRuleManager.tsx
   - NotificationStatsCard.tsx

2. **Email Templates** (`frontend/src/components/emails/`)

   - EmailTemplateEditor.tsx
   - EmailTemplateList.tsx
   - SMTPConfigForm.tsx
   - EmailLogsViewer.tsx

3. **Admin Configuration** (`frontend/src/components/admin-config/`)

   - PersonalizationSettings.tsx
   - SessionManagement.tsx
   - SchedulerJobManager.tsx
   - SecuritySettings.tsx

4. **Shared Components**
   - VariableEditor.tsx (for email template variables)
   - CronExpressionBuilder.tsx (visual cron editor)
   - ColorPicker.tsx (for branding)

---

## Database Containers

The implementation creates/uses these Cosmos DB containers:

1. **Notifications** - Notifications and notification rules
2. **Emails** - Email templates, SMTP configs, and email logs
3. **AdminConfigs** - All admin configuration types
4. **ScheduledJobs** - Cron jobs and scheduled tasks
5. **AuditLogs** - Audit trail for all operations

---

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Admin endpoints require admin permissions
3. **SMTP Passwords**: Should be encrypted in production
4. **Rate Limiting**: Applied to prevent abuse
5. **Input Validation**: All inputs validated with express-validator
6. **Audit Logging**: All actions logged to AuditLogs container

---

## Performance Optimization

1. **Caching**: Admin configs cached for 5 minutes
2. **Connection Pooling**: SMTP connections cached and reused
3. **Batch Processing**: Email queue processes in batches
4. **Pagination**: All list endpoints support pagination
5. **Indexing**: Cosmos DB queries optimized with proper indexing

---

## Monitoring and Debugging

### Check Scheduler Status

```javascript
GET / api / health;
// Response includes scheduler status
```

### View Job Execution History

```javascript
GET /api/admin-config/scheduler/jobs/:id/history
// Returns last 50 executions
```

### Email Delivery Tracking

```javascript
GET /api/emails/logs?status=failed
// View failed email deliveries
```

### Notification Statistics

```javascript
GET /api/notifications/stats/summary?startDate=2024-01-01&endDate=2024-01-31
// View notification metrics
```

---

## Support and Troubleshooting

### Common Issues

1. **Emails not sending**: Check SMTP configuration and test connection
2. **Jobs not running**: Verify cron expression and timezone
3. **Template variables not rendering**: Check variable names match exactly
4. **Rate limit exceeded**: Adjust maxEmailsPerHour in SMTP config

### Logs to Check

- Console logs show scheduler initialization
- Email delivery errors logged to EmailLog
- Audit logs track all configuration changes

---

## API Documentation Summary

Total Endpoints Added: **40+**

- Notifications: 13 endpoints
- Email Templates: 10 endpoints
- Email Sending: 3 endpoints
- Admin Config: 9 endpoints
- Scheduled Jobs: 7 endpoints

All endpoints follow RESTful conventions and return consistent JSON responses.
