# 🗄️ Archival System - Visual Workflow

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LIASE Archival System                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │
│   Settings   │
│      UI      │
└──────┬───────┘
       │
       ├─ Configure Archival Settings
       ├─ Test Google Drive Connection
       ├─ Manage Admin Emails
       ├─ View Statistics
       │
       ▼
┌──────────────────┐
│  Archival API    │
│   (8 Endpoints)  │
└────────┬─────────┘
         │
         ├─ /config (GET/POST)
         ├─ /test-google-drive
         ├─ /archive-study/:id
         ├─ /archive-batch
         ├─ /auto-archive
         ├─ /records
         └─ /stats
         │
         ▼
┌────────────────────────┐
│   Archival Service     │
│  (Main Orchestrator)   │
└──────┬────────┬────────┘
       │        │
       │        └──────────────────────┐
       │                               │
       ▼                               ▼
┌─────────────────┐          ┌──────────────────┐
│ Report Generator│          │ Google Drive     │
│   Service       │          │    Service       │
│  (PDF/CSV)      │          │  (Upload Files)  │
└────────┬────────┘          └────────┬─────────┘
         │                            │
         ▼                            ▼
┌─────────────────┐          ┌──────────────────┐
│  Email Sender   │          │   CosmosDB       │
│    Service      │          │  (Settings,      │
│ (Notifications) │          │   Records)       │
└─────────────────┘          └──────────────────┘

         ┌──────────────────────┐
         │  Cron Scheduler      │
         │  Daily at 2:00 AM    │
         └──────────────────────┘
```

---

## 🔄 Archival Process Flow

### Manual Archival

```
User Action
    │
    ├─► POST /api/archival/archive-study/:studyId
    │
    ▼
Archival Service
    │
    ├─► 1. Validate Configuration
    │      └─► Check if archival enabled
    │
    ├─► 2. Fetch Study Data
    │      ├─► Get study from CosmosDB
    │      ├─► Get drugs
    │      ├─► Get audit logs
    │      └─► Get attachments
    │
    ├─► 3. Generate PDF Report
    │      ├─► Create HTML template
    │      ├─► Populate with study data
    │      ├─► Add watermark (optional)
    │      └─► Save to temp folder
    │
    ├─► 4. Generate CSV Export
    │      ├─► Extract study metadata
    │      ├─► Format drug data
    │      ├─► Include audit trail
    │      └─► Save to temp folder
    │
    ├─► 5. Upload to Google Drive
    │      ├─► Authenticate with service account
    │      ├─► Create subfolder (if enabled)
    │      ├─► Upload PDF file
    │      ├─► Upload CSV file
    │      └─► Get shareable links
    │
    ├─► 6. Send Email Notification
    │      ├─► Get admin email list
    │      ├─► Attach PDF (if enabled)
    │      ├─► Attach CSV (if enabled)
    │      ├─► Send via SMTP
    │      └─► Log delivery
    │
    ├─► 7. Database Cleanup (Optional)
    │      ├─► Create backup
    │      ├─► Delete study from CosmosDB
    │      ├─► Retain audit logs
    │      └─► Update statistics
    │
    ├─► 8. Cleanup Temp Files
    │      └─► Delete PDF/CSV from temp folder
    │
    └─► Return Archival Record
           └─► Success/Failure status
```

### Auto-Archival (Scheduled)

```
Cron Scheduler (2:00 AM UTC)
    │
    ├─► Query Organizations
    │      └─► WHERE archival enabled & auto-archive enabled
    │
    ▼
For Each Organization
    │
    ├─► Find Eligible Studies
    │      ├─► Status IN (Completed, Final Report Completed)
    │      ├─► Age > archiveAfterDays threshold
    │      └─► Not already archived
    │
    ├─► Process in Batches (10 studies)
    │      │
    │      ├─► Batch 1 (studies 1-10)
    │      │   └─► Process with max 3 concurrent
    │      │
    │      ├─► Batch 2 (studies 11-20)
    │      │   └─► Process with max 3 concurrent
    │      │
    │      └─► Continue until all processed
    │
    └─► Log Results
           ├─► Total successful
           ├─► Total failed
           └─► Duration
```

---

## 📧 Email Notification Flow

```
Archival Completed
    │
    ├─► Get Email Configuration
    │      ├─► Admin emails list
    │      ├─► SMTP config
    │      └─► Attachment settings
    │
    ├─► Build Email Content
    │      ├─► Subject: "Study Archived: [Title]"
    │      ├─► HTML Body:
    │      │   ├─► Study details
    │      │   ├─► Archival status
    │      │   ├─► Google Drive links
    │      │   └─► Timestamp
    │      └─► Plain Text Version
    │
    ├─► Add Attachments (if enabled)
    │      ├─► PDF file (from temp folder)
    │      └─► CSV file (from temp folder)
    │
    ├─► Send Email
    │      ├─► To: admin@example.com
    │      ├─► Cc: (optional)
    │      └─► Via SMTP transporter
    │
    └─► Update Archival Record
           ├─► Email sent: true
           ├─► Recipients: [list]
           └─► Message ID: xxx
```

---

## 🗄️ Data Storage Structure

### CosmosDB Containers

```
┌─────────────────────────────────────────────────┐
│               Settings Container                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │  ArchivalConfig                      │      │
│  │  type_doc: 'archival_config'         │      │
│  │  organizationId: 'org_123'           │      │
│  │  isEnabled: true                     │      │
│  │  googleDrive: { ... }                │      │
│  │  emailNotification: { ... }          │      │
│  │  performance: { ... }                │      │
│  └──────────────────────────────────────┘      │
│                                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│               Archives Container                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │  ArchivalRecord                      │      │
│  │  type_doc: 'archival_record'         │      │
│  │  studyId: 'study_123'                │      │
│  │  status: 'completed'                 │      │
│  │  files: {                            │      │
│  │    pdf: { generated, driveUrl }      │      │
│  │    csv: { generated, driveUrl }      │      │
│  │  }                                    │      │
│  │  email: { sent, recipients }         │      │
│  │  cleanup: { executed }               │      │
│  └──────────────────────────────────────┘      │
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │  Study Backup (Optional)             │      │
│  │  type_doc: 'study_backup'            │      │
│  │  originalId: 'study_123'             │      │
│  │  archivedAt: '2024-12-02T...'        │      │
│  │  ... (complete study data)           │      │
│  └──────────────────────────────────────┘      │
│                                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│             AuditLogs Container                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │  AuditLog                            │      │
│  │  type_doc: 'audit_log'               │      │
│  │  action: 'study_archived'            │      │
│  │  entityType: 'archival'              │      │
│  │  details: {                          │      │
│  │    studyId, recordId, duration       │      │
│  │  }                                    │      │
│  └──────────────────────────────────────┘      │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Google Drive Folder Structure

```
Archive Root Folder (1a2b3c4d5e6f)
│
├── 2024/
│   ├── 12/
│   │   ├── 01/
│   │   │   ├── Study_123_Sample_Drug_2024-12-01.pdf
│   │   │   ├── Study_123_Sample_Drug_2024-12-01.csv
│   │   │   ├── Study_456_Another_Study_2024-12-01.pdf
│   │   │   └── Study_456_Another_Study_2024-12-01.csv
│   │   │
│   │   ├── 02/
│   │   │   ├── Study_789_Third_Study_2024-12-02.pdf
│   │   │   └── Study_789_Third_Study_2024-12-02.csv
│   │   │
│   │   └── 03/
│   │       └── ...
│   │
│   ├── 11/
│   │   └── ...
│   │
│   └── 10/
│       └── ...
│
└── 2025/
    └── ...
```

---

## 🎯 Configuration Decision Tree

```
Start Configuration
│
├─► Is archival needed?
│   │
│   ├─► NO → Leave disabled
│   │
│   └─► YES → Enable archival
│       │
│       ├─► Archive automatically?
│       │   │
│       │   ├─► YES → Enable auto-archive
│       │   │         Set threshold days
│       │   │         Select eligible statuses
│       │   │
│       │   └─► NO → Manual only
│       │
│       ├─► Store in Google Drive?
│       │   │
│       │   ├─► YES → Configure Google Drive
│       │   │         Add service account
│       │   │         Add folder ID
│       │   │         Test connection
│       │   │
│       │   └─► NO → Files generated only
│       │
│       ├─► Send email notifications?
│       │   │
│       │   ├─► YES → Add admin emails
│       │   │         Choose notification types
│       │   │         Include attachments?
│       │   │
│       │   └─► NO → Silent archival
│       │
│       ├─► Delete from database?
│       │   │
│       │   ├─► YES → ⚠️ Enable backup first!
│       │   │         Verify retention settings
│       │   │
│       │   └─► NO → Keep in CosmosDB
│       │
│       └─► Save Configuration ✅
```

---

## 🔐 Security Flow

```
API Request
│
├─► 1. Authentication Check
│      ├─► JWT token present?
│      ├─► Token valid?
│      └─► Token not expired?
│
├─► 2. Authorization Check
│      ├─► User has Admin role?
│      ├─► User belongs to organization?
│      └─► Permission granted?
│
├─► 3. Rate Limiting
│      ├─► Check request count
│      ├─► Within limits?
│      └─► Allow/Deny
│
├─► 4. Input Validation
│      ├─► Required fields present?
│      ├─► Data types correct?
│      └─► Values within bounds?
│
├─► 5. Process Request
│      └─► Execute archival operation
│
└─► 6. Audit Logging
       ├─► Log action
       ├─► Log user
       ├─► Log timestamp
       └─► Log result
```

---

## 📊 State Machine

```
Archival Record States:

┌─────────┐
│ Pending │ (Initial state)
└────┬────┘
     │
     ├─► Start archival
     │
     ▼
┌────────────┐
│ Processing │ (Active archival)
└─────┬──────┘
      │
      ├─── Success ───►  ┌───────────┐
      │                  │ Completed │ (Final state)
      │                  └───────────┘
      │
      ├─── Failure ───►  ┌─────────┐
      │                  │ Failed  │ (Terminal state)
      │                  └─────────┘
      │
      └─── Partial ───►  ┌─────────┐
                         │ Partial │ (Some steps failed)
                         └─────────┘

Status Transitions:
pending → processing → completed ✅
pending → processing → failed ❌
pending → processing → partial ⚠️
```

---

## 🔄 Retry Logic Flow

```
Operation Start
│
├─► Attempt 1
│   │
│   ├─► Success? → Continue
│   │
│   └─► Failure?
│       │
│       └─► Wait 5 seconds
│           │
│           ├─► Attempt 2
│           │   │
│           │   ├─► Success? → Continue
│           │   │
│           │   └─► Failure?
│           │       │
│           │       └─► Wait 5 seconds
│           │           │
│           │           ├─► Attempt 3
│           │           │   │
│           │           │   ├─► Success? → Continue
│           │           │   │
│           │           │   └─► Failure?
│           │           │       │
│           │           │       └─► Mark as Failed
│           │           │           Send Failure Notification
│           │           │           Log Error
│           │           │
│           │           └─► Max Retries Reached
```

---

## 📈 Monitoring Dashboard

```
┌────────────────────────────────────────────────┐
│        Archival System Dashboard                │
├────────────────────────────────────────────────┤
│                                                 │
│  Total Archived: 🟢 142                        │
│  Total Failed:   🔴 3                          │
│  Success Rate:   📊 98%                        │
│  Last Archived:  🕐 2 hours ago                │
│  Last Status:    ✅ Success                    │
│                                                 │
│  ┌───────────────────────────────────────┐   │
│  │  Recent Archival Activity             │   │
│  ├───────────────────────────────────────┤   │
│  │  study_123  ✅ 2024-12-02 08:30       │   │
│  │  study_456  ✅ 2024-12-02 08:25       │   │
│  │  study_789  ✅ 2024-12-02 08:20       │   │
│  │  study_101  ❌ 2024-12-02 08:15       │   │
│  │  study_202  ✅ 2024-12-02 08:10       │   │
│  └───────────────────────────────────────┘   │
│                                                 │
│  ┌───────────────────────────────────────┐   │
│  │  Storage Usage                        │   │
│  ├───────────────────────────────────────┤   │
│  │  Google Drive: 2.5 GB / 15 GB        │   │
│  │  CosmosDB: 450 MB                     │   │
│  │  Average per study: 1.2 MB           │   │
│  └───────────────────────────────────────┘   │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## 🎨 UI Component Tree

```
ArchivalSettingsTab (Root Component)
│
├── Header Section
│   ├── Title & Icon
│   ├── Enable Toggle
│   └── Statistics Cards
│       ├── Total Archived
│       ├── Total Failed
│       ├── Last Status
│       └── Last Archived Time
│
├── Message Banner (Conditional)
│   ├── Success Message
│   └── Error Message
│
├── Auto-Archive Settings Panel
│   ├── Enable Checkbox
│   ├── Days Threshold Input
│   └── Status Checkboxes
│
├── Google Drive Panel
│   ├── Enable Toggle
│   ├── Service Account Email Input
│   ├── Service Account Key Textarea
│   ├── Folder ID Input
│   ├── Subfolder Options
│   ├── Test Connection Button
│   └── Test Result Display
│
├── Email Notifications Panel
│   ├── Enable Toggle
│   ├── Notification Type Checkboxes
│   ├── Email List Management
│   │   ├── Email Input
│   │   ├── Add Button
│   │   └── Email Chips (with remove)
│   └── Attachment Options
│
├── File Generation Panel
│   ├── PDF Checkbox
│   ├── CSV Checkbox
│   ├── Audit Trail Checkbox
│   └── Watermark Options
│
├── Data Retention Panel
│   ├── Warning Banner
│   ├── Delete Checkbox
│   └── Backup Options
│
└── Action Buttons
    ├── Cancel Button
    └── Save Button (with loading state)
```

---

## 🚀 Performance Optimization

```
Batch Processing Strategy:

Total Studies: 100
Batch Size: 10
Max Concurrent: 3

┌──────────────────────────────────────┐
│  Batch 1 (Studies 1-10)              │
├──────────────────────────────────────┤
│  ├─ Process 1, 2, 3 (concurrent)     │
│  ├─ Process 4, 5, 6 (concurrent)     │
│  ├─ Process 7, 8, 9 (concurrent)     │
│  └─ Process 10                       │
└──────────────────────────────────────┘
    ⏱️ ~2 minutes

┌──────────────────────────────────────┐
│  Batch 2 (Studies 11-20)             │
├──────────────────────────────────────┤
│  ├─ Process 11, 12, 13 (concurrent)  │
│  ├─ Process 14, 15, 16 (concurrent)  │
│  ├─ Process 17, 18, 19 (concurrent)  │
│  └─ Process 20                       │
└──────────────────────────────────────┘
    ⏱️ ~2 minutes

... Continue for remaining batches

Total Time: ~20 minutes (vs 100 minutes sequential)
```

---

**Visual workflow complete! 🎨**
