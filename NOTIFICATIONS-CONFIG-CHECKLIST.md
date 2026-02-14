# Notifications Module - Configuration Checklist

## 📋 Pre-Deployment Checklist

### 1. Environment Variables ⚙️

Ensure these are set in your `.env.local` file:

```bash
# Email Configuration (Required for notifications)
SMTP_HOST=smtp.example.com           # Your SMTP server
SMTP_PORT=587                        # Usually 587 or 465
SMTP_SECURE=false                    # true if using port 465
SMTP_USER=notifications@example.com  # SMTP username
SMTP_PASS=your_secure_password       # SMTP password
SMTP_FROM_NAME="LIASE Notifications" # Sender name
SMTP_FROM_EMAIL=noreply@example.com  # Sender email

# Already configured (verify these exist)
COSMOS_DB_ENDPOINT=your_endpoint
COSMOS_DB_KEY=your_key
COSMOS_DB_DATABASE_ID=your_database
JWT_SECRET=your_jwt_secret
```

**Status**: ⚠️ Configure email settings before first use

---

### 2. Database Containers 🗄️

Required Cosmos DB containers (should already exist):

- [x] `Notifications` - Stores notifications and rules
- [x] `AuditLogs` - Audit trail
- [x] `Organizations` - Organization data
- [x] `Users` - User data
- [x] `Studies` - Study data
- [x] `Reports` - Generated reports

**Status**: ✅ Should be auto-created on first run

---

### 3. Dependencies 📦

Check `backend/package.json` includes:

- [x] `node-cron: ^3.0.3` - Scheduler
- [x] `nodemailer: ^7.0.10` - Email sending
- [x] `express-validator: ^7.0.1` - Validation
- [x] `uuid: ^9.0.1` - ID generation

**Status**: ✅ All dependencies present

---

### 4. File Verification ✅

Confirm these files exist:

**Backend Services:**

- [x] `backend/src/services/dailyReportsService.js`
- [x] `backend/src/services/notificationQueueService.js`
- [x] `backend/src/services/notificationTriggerService.js`
- [x] `backend/src/services/azureSchedulerService.js`
- [x] `backend/src/services/notificationManagementService.js` (existing, enhanced)

**Backend Routes:**

- [x] `backend/src/routes/notificationRoutes.js` (existing, enhanced)

**Backend Integration:**

- [x] `backend/src/app.js` (updated with scheduler initialization)

**Frontend:**

- [x] `frontend/src/components/settings/NotificationsTab.tsx` (enhanced)

**Documentation:**

- [x] `NOTIFICATIONS-MODULE-GUIDE.md`
- [x] `NOTIFICATIONS-QUICK-START.md`
- [x] `NOTIFICATIONS-IMPLEMENTATION-SUMMARY.md`
- [x] `NOTIFICATIONS-CONFIG-CHECKLIST.md` (this file)

**Status**: ✅ All files created

---

## 🚀 Startup Verification

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

### 2. Check Server Logs

Look for these success messages:

```
✅ Cosmos DB initialized successfully
✅ Drug search scheduler started
✅ Job scheduler initialized successfully
🔔 Notification scheduler initialized successfully
📧 Daily reports will be sent at 9:00 AM UTC
🔔 Notification queue processor active
🚀 LIASE SaaS API Server running on port 8000
```

**If you see errors:**

- Email configuration issues: Check SMTP settings
- Database issues: Verify Cosmos DB connection
- Scheduler issues: Check node-cron dependency

---

### 3. Test API Endpoints

```bash
# Get notification statistics (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/notifications/stats/summary

# Get queue statistics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/notifications/queue/stats

# Get scheduler status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/notifications/scheduler/status
```

**Expected Response**: JSON with stats/status data

---

### 4. Access Frontend UI

1. Start frontend: `cd frontend && npm run dev`
2. Login as admin user
3. Navigate to: **Settings → Notifications**
4. Verify three tabs appear:
   - Notifications
   - Rules
   - Reports

**Expected**: UI loads without errors, shows statistics cards

---

## 🧪 Testing Checklist

### Basic Functionality Tests

#### Test 1: View Notifications ✅

- [ ] Go to Settings → Notifications
- [ ] Statistics cards display (may show zeros initially)
- [ ] Filter buttons work
- [ ] No errors in console

#### Test 2: Create Notification Rule ✅

- [ ] Go to Rules tab
- [ ] Click "Create Rule" button
- [ ] Modal opens (simplified form for now)
- [ ] Close modal

#### Test 3: Generate Daily Report ✅

- [ ] Go to Reports tab
- [ ] Click "Generate Now" on Daily Summary
- [ ] Check email for report delivery
- [ ] Check server logs for generation success

#### Test 4: Manual Rule Trigger ✅

- [ ] Create a simple rule (or use existing)
- [ ] Click "Trigger" button
- [ ] Notification appears in Notifications tab
- [ ] Email received (if configured)

### Advanced Tests

#### Test 5: Event Trigger (Code) ✅

Add to your code where a study is completed:

```javascript
const notificationTriggerService = require("./services/notificationTriggerService");

await notificationTriggerService.triggerEvent("study_completed", {
  organizationId: user.organizationId,
  study: studyData,
  completedBy: user.email,
  userId: user.id,
});
```

- [ ] Complete a study
- [ ] Notification appears if rule exists
- [ ] Check notification status

#### Test 6: Scheduled Reports ✅

- [ ] Wait for scheduled time (9:00 AM UTC)
- [ ] OR temporarily modify cron schedule for testing
- [ ] Check admin email for daily report
- [ ] Verify report content is accurate

#### Test 7: Retry Logic ✅

- [ ] Temporarily misconfigure email settings
- [ ] Create a notification
- [ ] Notification status shows "retrying"
- [ ] Fix email settings
- [ ] Notification eventually delivers

---

## 🔧 Configuration Fine-Tuning

### Adjust Scheduler Times

Edit `backend/src/services/azureSchedulerService.js`:

```javascript
// Daily reports (change from 9 AM to 8 AM)
this.scheduleJob("daily_reports", "0 8 * * *", async () => {
  await this._generateDailyReports();
});

// Process notifications more frequently
this.scheduleJob("process_scheduled", "*/1 * * * *", async () => {
  await this._processScheduledNotifications();
});
```

### Adjust Queue Processing

Edit `backend/src/services/notificationQueueService.js`:

```javascript
// Process every 5 seconds instead of 10
notificationQueueService.start(5000);

// Increase concurrent processing
this.maxConcurrent = 10; // Default is 5
```

### Adjust Retry Logic

Edit `backend/src/models/Notification.js`:

```javascript
constructor({
  maxRetries = 5, // Increase from 3 to 5
  // ...
}) {
```

---

## 🎯 Common Configuration Scenarios

### Scenario 1: Small Organization (< 50 users)

```javascript
// Notification Queue (more frequent processing)
notificationQueueService.start(5000); // 5 seconds

// Scheduler (same schedule, but lighter load)
// Default settings work well
```

### Scenario 2: Large Organization (> 500 users)

```javascript
// Notification Queue (increase concurrency)
this.maxConcurrent = 20;

// Scheduler (less frequent health checks)
this.scheduleJob('health_check', '0 */2 * * *', ...); // Every 2 hours
```

### Scenario 3: High-Volume Notifications

```javascript
// Queue processing (every 3 seconds)
notificationQueueService.start(3000);

// Increase batch size
const pendingNotifications =
  await notificationManagementService.getPendingNotifications(
    organizationId,
    100
  ); // Increase from 50
```

---

## 📧 Email Provider Examples

### Gmail Configuration

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
SMTP_FROM_NAME="LIASE Notifications"
SMTP_FROM_EMAIL=your-email@gmail.com
```

### SendGrid Configuration

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_NAME="LIASE Notifications"
SMTP_FROM_EMAIL=verified-sender@yourdomain.com
```

### Office 365 Configuration

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM_NAME="LIASE Notifications"
SMTP_FROM_EMAIL=your-email@yourdomain.com
```

---

## 🔐 Security Checklist

- [ ] SMTP password stored securely in environment variables
- [ ] JWT_SECRET is strong and unique
- [ ] Email rate limiting configured
- [ ] Admin-only access to notification settings
- [ ] Email addresses validated before sending
- [ ] No sensitive data in email bodies (use links)

---

## 📊 Monitoring Setup

### Daily Monitoring

- Check `/api/notifications/queue/stats` for queue health
- Review failed notification count
- Monitor email delivery rates

### Weekly Monitoring

- Review audit logs for notification activities
- Check scheduler job success rates
- Verify reports are being generated

### Monthly Monitoring

- Clean up old notifications (auto-done after 90 days)
- Review notification rule effectiveness
- Update recipient lists as needed

---

## ✅ Final Verification

Before going to production:

1. **Email Configuration**

   - [ ] SMTP settings tested and working
   - [ ] Test email received successfully
   - [ ] Sender email verified with provider

2. **Scheduler**

   - [ ] Server logs show scheduler initialized
   - [ ] Jobs are running on schedule
   - [ ] No errors in cron execution

3. **UI Access**

   - [ ] Notifications tab loads properly
   - [ ] Admin users can access settings
   - [ ] No console errors

4. **Notification Flow**

   - [ ] Create notification → appears in list
   - [ ] Notification sends via email
   - [ ] Status updates correctly
   - [ ] Retry works for failures

5. **Reports**
   - [ ] Manual generation works
   - [ ] Automated reports sent on schedule
   - [ ] Report content is accurate
   - [ ] Admins receive emails

---

## 🚨 Troubleshooting

### Issue: Scheduler Not Starting

**Solution**: Check server logs for initialization errors, verify node-cron dependency

### Issue: Emails Not Sending

**Solution**: Verify SMTP settings, test with a simple email tool, check firewall

### Issue: Notifications Stuck in "Pending"

**Solution**: Check queue processor is running, review server logs, verify database connection

### Issue: Rules Not Triggering

**Solution**: Confirm rule is active, check event is being fired, review rule conditions

---

## 📞 Support Resources

- **Full Documentation**: `NOTIFICATIONS-MODULE-GUIDE.md`
- **Quick Start**: `NOTIFICATIONS-QUICK-START.md`
- **Implementation Summary**: `NOTIFICATIONS-IMPLEMENTATION-SUMMARY.md`
- **Server Logs**: Check backend console for detailed error messages

---

**Configuration Status**: ⚠️ Pending SMTP Setup
**Next Step**: Configure email settings and test
**Est. Setup Time**: 15-30 minutes

---

✅ **Ready to configure and deploy!**
