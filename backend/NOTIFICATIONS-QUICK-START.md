# Notifications Module - Quick Start Guide

## 🚀 Quick Start

The Notifications Module is now fully integrated into your LIASE Interface admin panel. Access it via:

**Settings → Notifications Tab**

## 📋 Features Summary

### ✅ What's Implemented

1. **Notification Queue System**

   - Automatic processing every 10 seconds
   - Retry logic with exponential backoff (max 3 retries)
   - Multi-channel delivery: Email, In-App, SMS (extensible)
   - Priority-based processing

2. **Daily Reports Service**

   - Daily summary reports (9:00 AM UTC)
   - Weekly summary reports (Monday 9:00 AM UTC)
   - Study completion reports
   - Auto-sent to all administrators

3. **Notification Rules**

   - Time-based scheduling (daily, weekly, monthly, cron)
   - Event-based triggers (study events, user events, system events)
   - Flexible recipient configuration (by role, user, or email)
   - Conditional logic for advanced filtering

4. **Azure Scheduler Integration**

   - Automated job scheduling
   - Health monitoring
   - Queue management
   - Graceful startup and shutdown

5. **Admin Panel UI**

   - Three-tab interface (Notifications, Rules, Reports)
   - Real-time statistics dashboard
   - Rule management (create, edit, delete, trigger)
   - On-demand report generation

6. **Audit Trail**
   - Complete logging of all notification activities
   - Event tracking
   - Delivery status monitoring

## 🎯 Common Use Cases

### 1. Send Daily Reports to Admins

**Already configured!** Reports are automatically sent every day at 9:00 AM UTC.

To generate manually:

- Go to Settings → Notifications → Reports tab
- Click "Generate Now" on Daily Summary Report

### 2. Notify When Studies are Completed

Create a rule in the admin panel:

1. Settings → Notifications → Rules tab
2. Click "Create Rule"
3. Configure:
   - Trigger Type: Event
   - Event Type: study_completed
   - Recipients: Admins or Medical Examiners
   - Channels: Email, In-App

### 3. Alert on System Errors

Already handled automatically! System errors trigger high-priority notifications to administrators.

### 4. Weekly Performance Reports

**Already configured!** Weekly reports are sent every Monday at 9:00 AM UTC.

## 📊 Monitoring

### View Notification Statistics

1. Go to Settings → Notifications
2. View dashboard cards:
   - Total notifications
   - Successfully sent
   - Pending in queue
   - Failed deliveries

### Check Queue Health

API Endpoint: `GET /api/notifications/queue/stats`

### View Scheduler Status

API Endpoint: `GET /api/notifications/scheduler/status`

## 🔧 Configuration

### Email Settings

Notifications use your existing email configuration from Settings → Email Settings.

Required environment variables:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=your_password
```

### Scheduler Times

Default schedules (modify in `azureSchedulerService.js` if needed):

- Daily reports: 9:00 AM UTC
- Weekly reports: Monday 9:00 AM UTC
- Notification cleanup: 2:00 AM UTC
- Queue processing: Every 10 seconds
- Health checks: Every hour

## 🎨 Supported Event Types

Use these in notification rules:

**User Events:**

- `user_created` - New user added
- `user_updated` - User profile updated
- `user_deleted` - User removed

**Study Events:**

- `study_created` - New study created
- `study_completed` - Study finished
- `study_assigned` - Study assigned to user
- `study_status_changed` - Study status updated

**Report Events:**

- `report_generated` - Report created successfully
- `report_failed` - Report generation failed

**System Events:**

- `system_error` - System error occurred
- `threshold_exceeded` - Metric exceeded limit
- `job_completed` - Scheduled job finished
- `job_failed` - Scheduled job error

## 🔐 Permissions

To access Notifications settings, users need:

- Resource: `notifications`
- Action: `read`

Administrators have full access by default.

## 📝 Backend Triggers

Trigger notifications from your code:

```javascript
const notificationTriggerService = require("./services/notificationTriggerService");

// Trigger event
await notificationTriggerService.triggerEvent("study_completed", {
  organizationId: user.organizationId,
  study: studyData,
  completedBy: user.email,
  userId: user.id,
});
```

## 🧪 Testing

1. **Test Notification Rule:**

   - Create a test rule
   - Click "Trigger" button
   - Check email and notification list

2. **Test Daily Report:**

   - Go to Reports tab
   - Click "Generate Now"
   - Check admin email

3. **Test Event Trigger:**
   - Complete a study
   - Check if notification appears (if rule is configured)

## 🐛 Troubleshooting

### Notifications not sending?

- ✅ Check email settings are configured
- ✅ Verify SMTP credentials are correct
- ✅ Check notification status in admin panel
- ✅ Review server logs for errors

### Reports not generating?

- ✅ Ensure admin users have email addresses
- ✅ Check scheduler is running (server logs)
- ✅ Try manual generation first
- ✅ Review error logs

### Rules not triggering?

- ✅ Verify rule is active
- ✅ Check event is being fired in code
- ✅ Review rule conditions
- ✅ Check scheduler status

## 📞 Quick Reference

### API Endpoints

```bash
# Notifications
GET    /api/notifications
GET    /api/notifications/:id
POST   /api/notifications
GET    /api/notifications/stats/summary
GET    /api/notifications/queue/stats

# Rules
GET    /api/notifications/rules/list
POST   /api/notifications/rules
PUT    /api/notifications/rules/:id
DELETE /api/notifications/rules/:id
POST   /api/notifications/rules/:id/trigger

# Reports
POST   /api/notifications/reports/daily
GET    /api/notifications/scheduler/status
```

### Priority Levels

- `urgent` - Immediate attention required (red)
- `high` - Important, send ASAP (orange)
- `normal` - Standard priority (blue)
- `low` - Can be delayed (gray)

### Notification Types

- `info` - Informational message
- `success` - Successful operation
- `warning` - Warning message
- `error` - Error occurred
- `report` - Generated report

## 🎓 Next Steps

1. ✅ Review the notifications in your admin panel
2. ✅ Create your first custom notification rule
3. ✅ Test manual report generation
4. ✅ Configure notification preferences for your organization
5. ✅ Review the full documentation: `NOTIFICATIONS-MODULE-GUIDE.md`

## 📚 Documentation

- **Full Guide**: `NOTIFICATIONS-MODULE-GUIDE.md`
- **API Reference**: See endpoints section above
- **Event Types**: See supported events section

---

**Quick Access**: Settings → Notifications → Rules/Reports/Notifications

Need help? Check server logs or the full documentation guide!
