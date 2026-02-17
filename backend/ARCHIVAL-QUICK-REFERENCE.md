# 🗄️ Study Archival System - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Google Drive Setup (2 min)

```bash
# 1. Create service account at console.cloud.google.com
# 2. Enable Google Drive API
# 3. Download JSON key
# 4. Convert to base64:
base64 -i service-account-key.json
```

### 2. Configure in UI (2 min)

1. Go to **Dashboard > Settings > Archival Settings**
2. Toggle "Enable Archival" ON
3. Paste service account email
4. Paste base64 key
5. Add Google Drive folder ID
6. Click "Test Connection"
7. Add admin emails
8. Click "Save Configuration"

### 3. Done! (1 min)

✅ Auto-archival runs daily at 2 AM UTC  
✅ Manual archival available via API  
✅ Email notifications with PDF/CSV attachments

---

## 📌 Essential API Endpoints

```javascript
// Archive single study
POST /api/archival/archive-study/:studyId

// Archive multiple studies
POST /api/archival/archive-batch
Body: { "studyIds": ["id1", "id2"] }

// Trigger auto-archival now
POST /api/archival/auto-archive

// Get archival records
GET /api/archival/records?page=1&limit=50

// Get statistics
GET /api/archival/stats

// Test Google Drive
POST /api/archival/test-google-drive
Body: { "googleDrive": { ... } }
```

---

## 🎯 Default Settings

| Setting             | Default Value        |
| ------------------- | -------------------- |
| Archive After Days  | 90 days              |
| Generate PDF        | ✅ Yes               |
| Generate CSV        | ✅ Yes               |
| Upload to Drive     | ✅ Yes               |
| Email Notifications | ✅ Yes               |
| Include Attachments | ✅ Yes               |
| Delete from DB      | ❌ No (safe default) |
| Create Backup       | ✅ Yes               |
| Batch Size          | 10 studies           |
| Max Concurrent      | 3 operations         |

---

## 📧 Email Example

**Subject:** Study Archived: [Study Title]

**Body:**

```
🗄️ Study Archived Successfully

Study: Sample Drug Study
Study ID: study_123
Status: ✅ Archived

Archival Details:
- PDF Generated: ✅ Yes
- CSV Generated: ✅ Yes
- Uploaded to Google Drive: ✅ Yes

Google Drive Links:
- 📄 View PDF Report
- 📊 View CSV Data

Duration: 12,450ms
Timestamp: 2024-12-02T10:30:00Z
```

**Attachments:**

- Study_123_Sample_Drug_Study_2024-12-02.pdf
- Study_123_Sample_Drug_Study_2024-12-02.csv

---

## 🔥 Common Use Cases

### Manual Archival (Admin)

```javascript
// From frontend or API client
await axios.post(
  `/api/archival/archive-study/${studyId}`,
  {},
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
```

### Batch Archive Old Studies

```javascript
// Get studies older than 180 days and archive
const studyIds = await getOldStudies(180);
await axios.post(
  "/api/archival/archive-batch",
  { studyIds },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Schedule Custom Archival

```javascript
// Run auto-archival on-demand
await axios.post(
  "/api/archival/auto-archive",
  {},
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
```

---

## 🗂️ Google Drive Folder Structure

```
Archive Root Folder/
├── 2024/
│   ├── 12/
│   │   ├── 01/
│   │   │   ├── Study_123_..._2024-12-01.pdf
│   │   │   ├── Study_123_..._2024-12-01.csv
│   │   │   ├── Study_456_..._2024-12-01.pdf
│   │   │   └── Study_456_..._2024-12-01.csv
│   │   └── 02/
│   │       ├── Study_789_..._2024-12-02.pdf
│   │       └── Study_789_..._2024-12-02.csv
```

**Subfolder Pattern:** `YYYY/MM/DD` (customizable)

---

## ⚙️ Configuration Checklist

- [ ] Enable Archival (master switch)
- [ ] Set archive threshold (days)
- [ ] Configure Google Drive
  - [ ] Service account email
  - [ ] Service account key (base64)
  - [ ] Folder ID
  - [ ] Test connection ✅
- [ ] Add admin emails (at least one)
- [ ] Choose file formats (PDF/CSV)
- [ ] Configure data retention
- [ ] Save configuration

---

## 🔍 Monitoring

### Check Logs

```bash
# Server logs
tail -f backend/logs/app.log

# Look for:
🗄️ Starting archival process for study: study_123
📄 Generating PDF...
✅ PDF generated: Study_123_..._.pdf
☁️ Uploading to Google Drive...
✅ Uploaded 2 files to Google Drive
📧 Sending email notification...
✅ Email notification sent to 3 recipients
✅ Archival completed successfully for study: study_123
```

### API Monitoring

```javascript
// Get recent archival activity
GET /api/archival/records?limit=10

// Check success rate
GET /api/archival/stats
```

---

## 🛠️ Troubleshooting Quick Fixes

### ❌ Google Drive Connection Failed

```
Solution:
1. Check service account key is valid
2. Verify folder is shared with service account email
3. Grant "Editor" permissions to service account
```

### ❌ Email Not Sending

```
Solution:
1. Verify SMTP config exists and is active
2. Check admin emails are valid format
3. Test with: GET /api/emails/test-connection
```

### ❌ Archival Stuck

```
Solution:
1. Check study status is eligible ("Completed", etc.)
2. Verify archival is enabled in settings
3. Check age threshold (must be older than X days)
4. Look for errors in server logs
```

---

## 📱 Admin UI Navigation

```
Dashboard
└── Settings
    └── Archival Settings
        ├── Auto-Archive Settings
        ├── Google Drive Storage
        ├── Email Notifications
        ├── File Generation
        └── Data Retention & Cleanup
```

---

## 🎓 Best Practices

1. **Start with Safe Settings**

   - ❌ Don't enable "Delete from DB" initially
   - ✅ Test with manual archival first
   - ✅ Verify Google Drive uploads work

2. **Email Configuration**

   - Add multiple admin emails
   - Test with one study first
   - Enable attachments only if needed (large files)

3. **Performance Tuning**

   - Batch size: 10 for small orgs, 5 for large
   - Max concurrent: 3 is optimal
   - Increase timeout for slow networks

4. **Google Drive Management**
   - Create separate folders per organization
   - Use date-based subfolders for easy browsing
   - Periodically check folder size limits

---

## 📊 Statistics Dashboard

**Total Archived:** 🟢 142 studies  
**Total Failed:** 🔴 3 studies  
**Success Rate:** 98%  
**Last Archived:** 2 hours ago  
**Last Status:** ✅ Success

---

## 🎉 Success Indicators

✅ **Green Light:** Everything working

- Stats showing archived studies
- Google Drive contains files
- Emails received by admins
- No errors in logs

⚠️ **Yellow Light:** Needs attention

- Some failures (check error messages)
- Email delays (check SMTP)
- Google Drive quota warning

🔴 **Red Light:** Action required

- Authentication failures
- No files in Google Drive
- Emails not sending
- Server errors in logs

---

## 🚨 Emergency Commands

```javascript
// Stop auto-archival (if needed)
// Temporarily disable in UI: Toggle "Enable Archival" OFF

// Check current operations
GET /api/archival/records?status=processing

// View failed archival attempts
GET /api/archival/records?status=failed

// Re-try failed archival
POST /api/archival/archive-study/:studyId
```

---

## 💡 Pro Tips

1. **Schedule Maintenance Windows**

   - Auto-archival runs at 2 AM UTC
   - Plan backups before this time
   - Monitor first few runs

2. **Test Before Production**

   ```javascript
   // Test with one study
   POST /api/archival/archive-study/test_study_123

   // Verify all steps completed
   GET /api/archival/records?studyId=test_study_123
   ```

3. **Monitor Google Drive Quota**

   - Each study: ~1-5 MB (PDF + CSV)
   - 1000 studies ≈ 1-5 GB
   - Upgrade Google Workspace if needed

4. **Keep Backups**
   - Always enable "Create backup before delete"
   - Backups stored in Archives container
   - Can be used for restoration

---

## 📞 Need Help?

1. **Check Documentation:** `ARCHIVAL-SYSTEM-COMPLETE-GUIDE.md`
2. **View API Logs:** `GET /api/archival/records`
3. **Test Connection:** Use "Test Connection" button in UI
4. **Review Config:** Ensure all required fields filled

---

**Remember: Granny's watching! Make no mistakes! 👵✨**
