# ✅ Archival System - Installation Checklist

## 🎯 Pre-Installation Requirements

- [ ] Node.js v18+ installed
- [ ] LIASE backend running
- [ ] LIASE frontend running
- [ ] Admin access to the system
- [ ] Google Cloud account (for Google Drive)

---

## 📦 Step 1: Backend Setup (5 minutes)

### Install Dependencies

```bash
cd backend
npm install
```

**Verify Installation:**

- [ ] Check `package.json` contains `googleapis: ^144.0.0`
- [ ] Check `node_modules/googleapis` exists
- [ ] No installation errors in terminal

---

## 🔐 Step 2: Google Drive Configuration (10 minutes)

### 2.1 Create Google Cloud Project

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Click "Select a project" → "New Project"
- [ ] Name: `liase-archival` (or your preference)
- [ ] Click "Create"

### 2.2 Enable Google Drive API

- [ ] In left menu: APIs & Services → Library
- [ ] Search for "Google Drive API"
- [ ] Click on "Google Drive API"
- [ ] Click "Enable"
- [ ] Wait for confirmation (green checkmark)

### 2.3 Create Service Account

- [ ] In left menu: IAM & Admin → Service Accounts
- [ ] Click "Create Service Account"
- [ ] Service account name: `liase-archival-service`
- [ ] Service account description: `Service account for LIASE study archival`
- [ ] Click "Create and Continue"
- [ ] Role: Select "Project" → "Editor"
- [ ] Click "Continue"
- [ ] Click "Done"

### 2.4 Create Service Account Key

- [ ] Click on the created service account email
- [ ] Go to "Keys" tab
- [ ] Click "Add Key" → "Create new key"
- [ ] Key type: JSON
- [ ] Click "Create"
- [ ] File downloads automatically (e.g., `liase-archival-12345.json`)
- [ ] **IMPORTANT:** Save this file securely!

### 2.5 Convert Key to Base64

**On Windows (PowerShell):**

```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\path\to\liase-archival-12345.json")
[Convert]::ToBase64String($bytes) | Set-Clipboard
# Key is now in clipboard
```

**On Mac/Linux:**

```bash
base64 -i liase-archival-12345.json | pbcopy
# Key is now in clipboard
```

**Manual Method:**

- [ ] Go to [base64encode.org](https://www.base64encode.org/)
- [ ] Upload JSON file
- [ ] Copy encoded output

### 2.6 Create Google Drive Folder

- [ ] Go to [Google Drive](https://drive.google.com)
- [ ] Click "New" → "Folder"
- [ ] Name: `LIASE Archives` (or your preference)
- [ ] Click "Create"
- [ ] **Copy Folder ID from URL:**
  ```
  https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
                                           ^^^^^^^^^^^^^^^^^^^^
                                           This is the Folder ID
  ```

### 2.7 Share Folder with Service Account

- [ ] Right-click on folder → "Share"
- [ ] Paste service account email (from JSON key: `client_email`)
- [ ] Example: `liase-archival-service@project-name.iam.gserviceaccount.com`
- [ ] Role: "Editor"
- [ ] Uncheck "Notify people"
- [ ] Click "Share"
- [ ] Confirm sharing

**Verification:**

- [ ] Folder shows shared icon
- [ ] Service account email appears in "Manage access"

---

## 🖥️ Step 3: Backend Configuration (2 minutes)

### Start Backend Server

```bash
cd backend
npm run dev
```

**Check Console Output:**

```
✅ Look for these messages:
   🕒 Initializing Archival Scheduler...
   📅 Scheduled auto-archival: Daily at 2:00 AM UTC
   ✅ Archival Scheduler initialized
```

- [ ] Server starts without errors
- [ ] Port 8000 is listening
- [ ] Archival scheduler initialized
- [ ] No error messages related to archival

---

## 🎨 Step 4: Frontend Configuration (3 minutes)

### Access Settings Page

- [ ] Open browser to frontend (usually http://localhost:3000)
- [ ] Login with admin credentials
- [ ] Navigate to Dashboard
- [ ] Click "Settings" in sidebar
- [ ] Click "Archival Settings" tab

**Verify UI Loaded:**

- [ ] "Archival Settings" tab is visible
- [ ] Toggle switch for "Enable Archival" is present
- [ ] All configuration panels are visible
- [ ] No console errors in browser dev tools

---

## ⚙️ Step 5: Configure Archival Settings (5 minutes)

### 5.1 Enable Archival

- [ ] Toggle "Enable Archival" → ON
- [ ] See statistics section appear (zeros initially)

### 5.2 Auto-Archive Settings

- [ ] Check "Enable automatic archival"
- [ ] Set "Archive studies after" days: `90`
- [ ] Check eligible statuses:
  - [ ] "Completed"
  - [ ] "Final Report Completed"

### 5.3 Google Drive Configuration

- [ ] Toggle "Enable" for Google Drive
- [ ] Paste **Service Account Email** (from JSON key)
- [ ] Paste **Service Account Key** (base64 from Step 2.5)
- [ ] Paste **Target Folder ID** (from Step 2.6)
- [ ] Check "Create date-based subfolders"
- [ ] Subfolder pattern: `YYYY/MM/DD` (default)

### 5.4 Test Google Drive Connection

- [ ] Click "Test Connection" button
- [ ] Wait for response (5-10 seconds)
- [ ] See green success message: "Connection successful!"
- [ ] See folder name displayed

**If Test Fails:**

- [ ] Verify service account key is base64-encoded
- [ ] Verify folder ID is correct
- [ ] Verify folder is shared with service account
- [ ] Check server logs for detailed error

### 5.5 Email Notifications

- [ ] Toggle "Enable" for Email Notifications
- [ ] Check "Notify on successful archival"
- [ ] Check "Notify on failure"
- [ ] Check "Include PDF/CSV as attachments"
- [ ] Add admin email addresses:
  - [ ] Enter email in input field
  - [ ] Click "Add" button
  - [ ] Repeat for additional admins
  - [ ] Verify emails appear as chips with X button

### 5.6 File Generation

- [ ] Check "Generate PDF report"
- [ ] Check "Generate CSV data"
- [ ] Check "Include audit trail"
- [ ] (Optional) Check "Add watermark to PDF"

### 5.7 Data Retention

- [ ] **READ WARNING CAREFULLY** ⚠️
- [ ] Decide if you want to delete from database:
  - [ ] **Recommended for testing:** Leave UNCHECKED
  - [ ] **For production:** Check if space is critical
- [ ] If checked, also check:
  - [ ] "Create backup before deletion"
  - [ ] "Retain audit logs"

### 5.8 Save Configuration

- [ ] Click "Save Configuration" button
- [ ] Wait for success message
- [ ] See green banner: "Archival configuration saved successfully"

---

## 🧪 Step 6: Test Manual Archival (10 minutes)

### 6.1 Prepare Test Study

- [ ] Have at least one study with status "Completed" or "Final Report Completed"
- [ ] Note the study ID (e.g., `study_123abc`)

### 6.2 Test via API

**Using Postman/Insomnia:**

```
POST http://localhost:8000/api/archival/archive-study/study_123abc
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
```

**Using cURL:**

```bash
curl -X POST http://localhost:8000/api/archival/archive-study/study_123abc \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6.3 Monitor Server Logs

**Watch for these log messages:**

```
✅ Expected log sequence:
   🗄️ Starting archival process for study: study_123abc
   📄 Generating PDF...
   ✅ PDF generated: Study_123abc_..._.pdf
   📊 Generating CSV...
   ✅ CSV generated: Study_123abc_..._.csv
   ☁️ Uploading to Google Drive...
   ✅ Uploaded 2 files to Google Drive
   📧 Sending email notification...
   ✅ Email notification sent to X recipients
   ✅ Archival completed successfully
```

- [ ] All steps show success (✅)
- [ ] No error messages (❌)
- [ ] Duration logged (e.g., "Duration: 12450ms")

### 6.4 Verify Results

**Check API Response:**

```json
{
  "success": true,
  "message": "Study archived successfully",
  "record": {
    "id": "archival_record_...",
    "status": "completed",
    "files": {
      "pdf": {
        "generated": true,
        "googleDriveUrl": "https://drive.google.com/..."
      },
      "csv": {
        "generated": true,
        "googleDriveUrl": "https://drive.google.com/..."
      }
    }
  }
}
```

- [ ] Response status: 200 OK
- [ ] `success: true`
- [ ] `status: "completed"`
- [ ] Both PDF and CSV have `generated: true`
- [ ] Google Drive URLs present

**Check Google Drive:**

- [ ] Open Google Drive folder
- [ ] Navigate to date subfolder (e.g., 2024/12/02)
- [ ] See PDF file: `Study_123abc_..._.pdf`
- [ ] See CSV file: `Study_123abc_..._.csv`
- [ ] Files are downloadable and viewable

**Check Email:**

- [ ] Admin emails received notification
- [ ] Subject: "Study Archived: [Study Title]"
- [ ] Body contains study details
- [ ] Google Drive links are clickable
- [ ] PDF attached (if enabled)
- [ ] CSV attached (if enabled)

**Check Settings UI:**

- [ ] Go to Settings → Archival Settings
- [ ] See updated statistics:
  - [ ] Total Archived: 1
  - [ ] Total Failed: 0
  - [ ] Last Status: success
  - [ ] Last Archived: [timestamp]

### 6.5 Verify Database

**Check Archival Record:**

```
GET http://localhost:8000/api/archival/records?studyId=study_123abc
```

- [ ] Record exists
- [ ] Status: "completed"
- [ ] All operation logs present
- [ ] No errors in record

---

## 🕐 Step 7: Verify Scheduled Archival (Wait for 2 AM UTC)

### Option A: Wait for Scheduled Time

- [ ] Wait until 2:00 AM UTC next day
- [ ] Check server logs after 2:00 AM
- [ ] Look for:
  ```
  🤖 Running scheduled auto-archival...
  📊 Found X organizations with archival enabled
  ```

### Option B: Manual Trigger (Don't wait)

**Test auto-archival immediately:**

```
POST http://localhost:8000/api/archival/auto-archive
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
```

- [ ] API returns list of archived studies
- [ ] Server logs show auto-archival process
- [ ] Eligible studies are archived
- [ ] Emails sent to admins

---

## 📊 Step 8: Final Verification (2 minutes)

### Check All Systems

- [ ] **Backend:** Server running without errors
- [ ] **Frontend:** Archival tab loads correctly
- [ ] **Google Drive:** Files uploaded and accessible
- [ ] **Email:** Notifications received
- [ ] **Database:** Records stored correctly
- [ ] **Scheduler:** Cron job initialized

### View Statistics

```
GET http://localhost:8000/api/archival/stats
```

**Expected Response:**

```json
{
  "isEnabled": true,
  "autoArchiveEnabled": true,
  "totalArchived": 1,
  "totalFailed": 0,
  "lastArchivedAt": "2024-12-02T...",
  "lastStatus": "success",
  "archiveAfterDays": 90
}
```

- [ ] All values correct
- [ ] No unexpected null values

---

## 🎉 Installation Complete!

### Success Criteria

✅ **Configuration**

- [ ] Archival enabled in UI
- [ ] Google Drive configured and tested
- [ ] Admin emails added
- [ ] Settings saved successfully

✅ **Functionality**

- [ ] Manual archival works
- [ ] PDF generated correctly
- [ ] CSV generated correctly
- [ ] Files uploaded to Google Drive
- [ ] Email notifications sent
- [ ] Database records created

✅ **Automation**

- [ ] Scheduler initialized
- [ ] Auto-archival scheduled (2 AM UTC)
- [ ] Manual trigger works

✅ **Monitoring**

- [ ] Statistics display correctly
- [ ] Archival records accessible
- [ ] Server logs detailed
- [ ] No errors in console

---

## 🛟 Troubleshooting

### Common Issues & Solutions

**Issue 1: Google Drive test connection fails**

```
Solution:
1. Verify service account key is valid JSON
2. Convert to base64 correctly (no extra spaces/newlines)
3. Check folder ID is correct (from URL)
4. Verify folder is shared with service account email
5. Ensure service account has Editor role
```

**Issue 2: Email not sending**

```
Solution:
1. Check SMTP configuration exists
2. Verify admin emails are valid
3. Test SMTP connection separately
4. Check server logs for specific errors
5. Verify email service is enabled in config
```

**Issue 3: PDF/CSV generation fails**

```
Solution:
1. Check study data is complete
2. Verify temp folder is writable
3. Check server has disk space
4. Review server logs for specific error
5. Ensure study exists in database
```

**Issue 4: Scheduler not running**

```
Solution:
1. Check server logs for initialization
2. Verify archival is enabled in settings
3. Verify auto-archival toggle is ON
4. Restart server
5. Check cron syntax in code
```

---

## 📝 Post-Installation Tasks

### Daily Monitoring (First Week)

- [ ] Check archival logs daily
- [ ] Verify files in Google Drive
- [ ] Monitor email notifications
- [ ] Review archival statistics
- [ ] Check for any failed archival attempts

### Weekly Tasks

- [ ] Review Google Drive storage usage
- [ ] Check archival success rate
- [ ] Verify email deliverability
- [ ] Update admin email list if needed
- [ ] Review and adjust settings

### Monthly Tasks

- [ ] Analyze archival patterns
- [ ] Optimize batch size if needed
- [ ] Clean up old temp files
- [ ] Audit Google Drive folder structure
- [ ] Review and update documentation

---

## 📞 Support Resources

### Documentation

- [ ] Read `ARCHIVAL-SYSTEM-COMPLETE-GUIDE.md`
- [ ] Review `ARCHIVAL-QUICK-REFERENCE.md`
- [ ] Check `ARCHIVAL-VISUAL-WORKFLOW.md`

### API Testing

- [ ] Use Postman collection (if available)
- [ ] Test all 8 endpoints
- [ ] Verify authentication works

### Logs Location

- [ ] Server console output
- [ ] `backend/logs/` folder (if configured)
- [ ] Browser console (frontend)
- [ ] Email delivery logs

---

## ✨ You're All Set!

**Congratulations!** Your archival system is fully installed and operational.

### Quick Reference Commands

```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Test archival
curl -X POST http://localhost:8000/api/archival/archive-study/:id \
  -H "Authorization: Bearer TOKEN"

# Check statistics
curl http://localhost:8000/api/archival/stats \
  -H "Authorization: Bearer TOKEN"

# Trigger auto-archival
curl -X POST http://localhost:8000/api/archival/auto-archive \
  -H "Authorization: Bearer TOKEN"
```

---

**Installation Date:** ******\_******  
**Installed By:** ******\_******  
**Version:** 1.0.0  
**Status:** ✅ **COMPLETE**

---

**Granny says: Perfect! No mistakes! 👵✨**
