# Backend Models and Schemas

This document lists all the models found in `backend/src/models`, including their variables, default values, and structures.

---

## 1. AdminConfig

**File:** `AdminConfig.js`
**Description:** Stores various admin configurations including personalization, session management, etc.

### Variables

- `id`: string (default: generated with `admin_config_` prefix)
- `organizationId`: string
- `configType`: string (types: `personalization`, `session`, `notification`, `scheduler`, `migration`, `security`)
- `configData`: object (default: based on `configType`)
- `isActive`: boolean (default: `true`)
- `version`: number (default: `1`)
- `createdBy`: string
- `updatedBy`: string (default: `null`)
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `metadata`: object (default: `{}`)
- `type_doc`: string (fixed: `'admin_config'`)

---

## 2. ArchivalConfig

**File:** `ArchivalConfig.js`
**Description:** Stores archival configuration per organization.

### Variables

- `id`: string (default: `null`)
- `organizationId`: string
- `isEnabled`: boolean (default: `false`)

**Archival Triggers**

- `autoArchiveEnabled`: boolean (default: `false`)
- `archiveAfterDays`: number (default: `90`)
- `manualArchiveOnly`: boolean (default: `false`)

**Google Drive Settings**

- `googleDrive`: object
  - `enabled`: boolean (default: `false`)
  - `serviceAccountEmail`: string (default: `null`)
  - `serviceAccountKey`: string (default: `null`)
  - `folderId`: string (default: `null`)
  - `folderPath`: string (default: `null`)
  - `createSubfolders`: boolean (default: `true`)
  - `subfolderPattern`: string (default: `'YYYY/MM/DD'`)

**Email Notification Settings**

- `emailNotification`: object
  - `enabled`: boolean (default: `true`)
  - `notifyOnArchival`: boolean (default: `true`)
  - `notifyOnFailure`: boolean (default: `true`)
  - `adminEmails`: array (default: `[]`)
  - `includeAttachments`: boolean (default: `true`)
  - `smtpConfigId`: string (default: `null`)
  - `emailTemplateId`: string (default: `null`)

**File Generation Settings**

- `fileGeneration`: object
  - `generatePDF`: boolean (default: `true`)
  - `generateCSV`: boolean (default: `true`)
  - `includeAuditTrail`: boolean (default: `true`)
  - `includeAttachments`: boolean (default: `false`)
  - `pdfSettings`: object
    - `includeCharts`: boolean (default: `true`)
    - `includeImages`: boolean (default: `true`)
    - `pageSize`: string (default: `'A4'`)
    - `orientation`: string (default: `'portrait'`)
    - `includeWatermark`: boolean (default: `false`)
    - `watermarkText`: string (default: `'ARCHIVED'`)
  - `csvSettings`: object
    - `includeHeaders`: boolean (default: `true`)
    - `delimiter`: string (default: `','`)
    - `encoding`: string (default: `'utf-8'`)
    - `includeMetadata`: boolean (default: `true`)

**Data Retention & Cleanup**

- `dataRetention`: object
  - `deleteFromCosmosDB`: boolean (default: `false`)
  - `createBackupBeforeDelete`: boolean (default: `true`)
  - `retainAuditLogs`: boolean (default: `true`)
  - `retainUserReferences`: boolean (default: `true`)

**Archive Scope**

- `archiveScope`: object
  - `includeStudies`: boolean (default: `true`)
  - `includeReports`: boolean (default: `true`)
  - `includeComments`: boolean (default: `true`)
  - `includeHistory`: boolean (default: `true`)
  - `includeAttachments`: boolean (default: `true`)
  - `studyStatuses`: array (default: `['Completed', 'Final Report Completed']`)
  - `includeArchivedData`: boolean (default: `false`)

**Performance & Limits**

- `performance`: object
  - `batchSize`: number (default: `10`)
  - `maxConcurrent`: number (default: `3`)
  - `retryAttempts`: number (default: `3`)
  - `retryDelayMs`: number (default: `5000`)
  - `timeoutMs`: number (default: `300000`)

**Metadata**

- `lastArchivedAt`: string (default: `null`)
- `totalArchived`: number (default: `0`)
- `totalFailed`: number (default: `0`)
- `lastStatus`: string (default: `null`)
- `lastError`: string (default: `null`)
- `createdBy`: string
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `metadata`: object (default: `{}`)

---

## 3. ArchivalRecord

**File:** `ArchivalRecord.js`
**Description:** Tracks individual archival operations.

### Variables

- `id`: string (default: generated with `archival_record_` prefix)
- `organizationId`: string
- `studyId`: string
- `studyTitle`: string
- `drugName`: string

**Archival Status**

- `status`: string (default: `'pending'`, options: `pending`, `processing`, `completed`, `failed`, `partial`)
- `initiatedBy`: string (User ID)
- `initiatedAt`: string (ISO date, default: now)
- `completedAt`: string (default: `null`)

**Generated Files**

- `files`: object
  - `pdf`: object
    - `generated`: boolean (default: `false`)
    - `fileName`: string (default: `null`)
    - `filePath`: string (default: `null`)
    - `fileSize`: number (default: `0`)
    - `googleDriveId`: string (default: `null`)
    - `googleDriveUrl`: string (default: `null`)
    - `generatedAt`: string (default: `null`)
    - `error`: string (default: `null`)
  - `csv`: object
    - `generated`: boolean (default: `false`)
    - `fileName`: string (default: `null`)
    - `filePath`: string (default: `null`)
    - `fileSize`: number (default: `0`)
    - `googleDriveId`: string (default: `null`)
    - `googleDriveUrl`: string (default: `null`)
    - `generatedAt`: string (default: `null`)
    - `error`: string (default: `null`)

**Google Drive Upload**

- `googleDrive`: object
  - `uploaded`: boolean (default: `false`)
  - `folderId`: string (default: `null`)
  - `folderUrl`: string (default: `null`)
  - `uploadedAt`: string (default: `null`)
  - `error`: string (default: `null`)

**Email Notification**

- `email`: object
  - `sent`: boolean (default: `false`)
  - `recipients`: array (default: `[]`)
  - `sentAt`: string (default: `null`)
  - `messageId`: string (default: `null`)
  - `error`: string (default: `null`)

**Database Cleanup**

- `cleanup`: object
  - `executed`: boolean (default: `false`)
  - `deletedFromCosmosDB`: boolean (default: `false`)
  - `backupCreated`: boolean (default: `false`)
  - `cleanedAt`: string (default: `null`)
  - `error`: string (default: `null`)

**Operation Details**

- `operationLog`: array (default: `[]`)
- `totalDuration`: number (default: `0`)
- `retryCount`: number (default: `0`)
- `errors`: array (default: `[]`)
- `warnings`: array (default: `[]`)
- `metadata`: object (default: `{}`)

---

## 4. AuditLog

**File:** `AuditLog.js`
**Description:** Records system activities for audit trails.

### Variables

- `id`: string (default: UUID)
- `organizationId`: string
- `userId`: string
- `userName`: string
- `action`: string (options: `create`, `read`, `update`, `delete`, `login`, `logout`, `approve`, `reject`)
- `resource`: string (options: `user`, `drug`, `study`, `organization`, `auth`)
- `resourceId`: string
- `details`: string
- `ipAddress`: string
- `userAgent`: string
- `location`: object (default: `null`)
- `timestamp`: string (ISO date, default: now)
- `metadata`: object (default: `{}`)
- `beforeValue`: any (default: `null`)
- `afterValue`: any (default: `null`)
- `changes`: array (default: `[]`)
- `type`: string (fixed: `'audit-log'`)

---

## 5. Drug

**File:** `Drug.js`
**Description:** Represents a drug entity in the system.

### Variables

- `id`: string (default: UUID)
- `organizationId`: string
- `name`: string
- `manufacturer`: string
- `query`: string
- `rsi`: string
- `nextSearchDate`: string
- `status`: string (default: `'Active'`, options: `Active`, `Inactive`, `Suspended`)
- `description`: string (default: `''`)
- `indications`: array (default: `[]`)
- `contraindications`: array (default: `[]`)
- `sideEffects`: array (default: `[]`)
- `dosageForm`: string (default: `''`)
- `strength`: string (default: `''`)
- `activeIngredients`: array (default: `[]`)
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `createdBy`: string
- `type`: string (fixed: `'drug'`)

---

## 6. DrugSearchConfig

**File:** `DrugSearchConfig.js`
**Description:** Configuration for automated drug searches.

### Variables

- `id`: string (default: UUID)
- `organizationId`: string
- `userId`: string
- `name`: string
- `inn`: string (default: `''`)
- `query`: string
- `sponsor`: string (default: `''`)
- `brandName`: string (default: `''`)
- `frequency`: string (default: `'custom'`, options: `weekly`, `custom`)
- `customFrequencyHours`: number (default: `12`)
- `isActive`: boolean (default: `true`)
- `lastRunAt`: string (default: `null`)
- `nextRunAt`: string (default: `null`)
- `totalRuns`: number (default: `0`)
- `lastResultCount`: number (default: `0`)
- `lastRunPmids`: array (default: `[]`)
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `createdBy`: string

**Search Configuration**

- `maxResults`: number (default: `1000`)
- `includeAdverseEvents`: boolean (default: `true`)
- `includeSafety`: boolean (default: `true`)

**Date Range Configuration**

- `dateFrom`: string (default: `null`)
- `dateTo`: string (default: `null`)

**External API Configuration**

- `sendToExternalApi`: boolean (default: `true`)
- `lastExternalApiCall`: string (default: `null`)
- `lastExternalApiSuccess`: boolean (default: `null`)

---

## 7. EmailLog

**File:** `EmailLog.js`
**Description:** Tracks all email delivery attempts and status.

### Variables

- `id`: string (default: generated with `email_log_` prefix)
- `organizationId`: string
- `notificationId`: string (default: `null`)
- `templateId`: string (default: `null`)
- `from`: string
- `to`: array/string (stored as array)
- `cc`: array (default: `[]`)
- `bcc`: array (default: `[]`)
- `subject`: string
- `bodyHtml`: string
- `bodyPlain`: string
- `status`: string (default: `'queued'`, options: `queued`, `sending`, `sent`, `delivered`, `failed`, `bounced`)
- `priority`: string (default: `'normal'`)
- `scheduledAt`: string (default: `null`)
- `sentAt`: string (default: `null`)
- `deliveredAt`: string (default: `null`)
- `failedAt`: string (default: `null`)
- `errorMessage`: string (default: `null`)
- `retryCount`: number (default: `0`)
- `maxRetries`: number (default: `3`)
- `providerResponse`: object (default: `{}`)
- `smtpConfig`: object (default: `{}`)
- `metadata`: object (default: `{}`)
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `type_doc`: string (fixed: `'email_log'`)

---

## 8. EmailTemplate

**File:** `EmailTemplate.js`
**Description:** Manages email templates with variable substitution and locking.

### Variables

- `id`: string (default: generated with `email_template_` prefix)
- `organizationId`: string
- `name`: string
- `description`: string (default: `''`)
- `subject`: string
- `bodyHtml`: string
- `bodyPlain`: string (default: `''`, or stripped from HTML)
- `variables`: array (default: `[]`)
- `category`: string (default: `'general'`, options: `general`, `notification`, `report`, `system`)
- `isLocked`: boolean (default: `false`)
- `lockedBy`: string (default: `null`)
- `lockedAt`: string (default: `null`)
- `lockReason`: string (default: `''`)
- `version`: number (default: `1`)
- `status`: string (default: `'draft'`, options: `draft`, `active`, `archived`)
- `previewText`: string (default: `''`)
- `isDefault`: boolean (default: `false`)
- `metadata`: object (default: `{}`)
- `createdBy`: string
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `lastUsedAt`: string (default: `null`)
- `usageCount`: number (default: `0`)
- `type_doc`: string (fixed: `'email_template'`)

---

## 9. LegacyData

**File:** `LegacyData.js`
**Description:** Generic container for legacy or migrated data.

### Variables

- `id`: string (default: UUID)
- `organizationId`: string
- `data`: any
- `uploadedAt`: string (ISO date, default: now)
- `createdBy`: string
- `type`: string (fixed: `'legacyData'`)

---

## 10. Notification

**File:** `Notification.js`
**Description:** Represents a notification in the system with multi-tenant support.

### Variables

- `id`: string (default: generated with `notification_` prefix)
- `organizationId`: string
- `type`: string (default: `'info'`, options: `info`, `warning`, `error`, `success`, `report`)
- `title`: string
- `message`: string
- `templateId`: string (default: `null`)
- `templateData`: object (default: `{}`)
- `recipients`: array (default: `[]`)
- `channels`: array (default: `['email']`)
- `priority`: string (default: `'normal'`)
- `status`: string (default: `'pending'`, options: `pending`, `queued`, `sent`, `delivered`, `failed`, `retrying`)
- `scheduleType`: string (default: `'immediate'`)
- `scheduledAt`: string (default: `null`)
- `cronExpression`: string (default: `null`)
- `retryCount`: number (default: `0`)
- `maxRetries`: number (default: `3`)
- `lastRetryAt`: string (default: `null`)
- `deliveryAttempts`: array (default: `[]`)
- `metadata`: object (default: `{}`)
- `createdBy`: string
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `sentAt`: string (default: `null`)
- `deliveredAt`: string (default: `null`)
- `type_doc`: string (fixed: `'notification'`)

---

## 11. NotificationRule

**File:** `NotificationRule.js`
**Description:** Defines rules and schedules for automated notifications.

### Variables

- `id`: string (default: generated with `notification_rule_` prefix)
- `organizationId`: string
- `name`: string
- `description`: string (default: `''`)
- `isActive`: boolean (default: `true`)
- `triggerType`: string (default: `'scheduled'`, options: `scheduled`, `event`, `manual`)
- `eventType`: string (default: `null`)
- `scheduleType`: string (default: `'daily'`, options: `once`, `daily`, `weekly`, `monthly`, `cron`)
- `cronExpression`: string (default: `null`)
- `scheduledTime`: string (default: `'09:00'`)
- `scheduledDays`: array (default: `[]`)
- `timezone`: string (default: `'UTC'`)
- `notificationTemplate`: object
  - `type`: string (default: `'info'`)
  - `title`: string
  - `message`: string
  - `templateId`: string
  - `channels`: array (default: `['email']`)
- `recipientConfig`: object
  - `type`: string (default: `'roles'`)
  - `roles`: array
  - `users`: array
  - `customEmails`: array
- `conditions`: array (default: `[]`)
- `priority`: string (default: `'normal'`)
- `retentionDays`: number (default: `30`)
- `metadata`: object (default: `{}`)
- `createdBy`: string
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `lastTriggeredAt`: string (default: `null`)
- `nextScheduledAt`: string (default: `null`)
- `type_doc`: string (fixed: `'notification_rule'`)

---

## 12. Organization

**File:** `Organization.js`
**Description:** Represents a tenant or organization.

### Variables

- `id`: string (default: UUID)
- `name`: string
- `domain`: string (lowercase)
- `adminEmail`: string (lowercase)
- `tenantId`: string (default: `null`)
- `plan`: string (default: `'basic'`, options: `basic`, `premium`, `enterprise`)
- `settings`: object (default varies by plan)
- `isActive`: boolean (default: `true`)
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `type`: string (fixed: `'organization'`)

---

## 13. Role

**File:** `Role.js`
**Description:** Defines user roles and permissions.

### Variables

- `id`: string (default: generated with `role_` prefix)
- `organizationId`: string
- `name`: string
- `displayName`: string
- `description`: string (default: `''`)
- `permissions`: object (default: `{}`)
- `isSystemRole`: boolean (default: `false`)
- `isActive`: boolean (default: `true`)
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `createdBy`: string (default: `null`)
- `type`: string (fixed: `'role'`)

---

## 14. ScheduledJob

**File:** `ScheduledJob.js`
**Description:** Manages scheduled tasks and cron jobs.

### Variables

- `id`: string (default: generated with `scheduled_job_` prefix)
- `organizationId`: string
- `name`: string
- `description`: string (default: `''`)
- `jobType`: string (default: `'report'`, options: `report`, `notification`, `cleanup`, `backup`, `custom`)
- `scheduleType`: string (default: `'cron'`, options: `cron`, `interval`, `once`)
- `cronExpression`: string (default: `'0 9 * * *'`)
- `intervalMs`: number (default: `null`)
- `scheduledAt`: string (default: `null`)
- `timezone`: string (default: `'UTC'`)
- `isActive`: boolean (default: `true`)
- `status`: string (default: `'pending'`, options: `pending`, `running`, `completed`, `failed`, `cancelled`)
- `lastRunAt`: string (default: `null`)
- `lastRunStatus`: string (default: `null`)
- `lastRunDuration`: number (default: `null`)
- `lastRunError`: string (default: `null`)
- `nextRunAt`: string (default: `null`)
- `runCount`: number (default: `0`)
- `failureCount`: number (default: `0`)
- `maxRetries`: number (default: `3`)
- `timeout`: number (default: `3600000`)
- `payload`: object (default: `{}`)
- `executionHistory`: array (default: `[]`)
- `metadata`: object (default: `{}`)
- `createdBy`: string
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `type_doc`: string (fixed: `'scheduled_job'`)

---

## 15. SMTPConfig

**File:** `SMTPConfig.js`
**Description:** Stores SMTP configuration per organization.

### Variables

- `id`: string (default: generated with `smtp_config_` prefix)
- `organizationId`: string
- `name`: string
- `provider`: string (default: `'custom'`, options: `gmail`, `sendgrid`, `ses`, `custom`)
- `isDefault`: boolean (default: `false`)
- `isActive`: boolean (default: `true`)
- `host`: string
- `port`: number (default: `587`)
- `secure`: boolean (default: `false`)
- `username`: string
- `password`: string
- `fromEmail`: string
- `fromName`: string
- `replyTo`: string (default: same as `fromEmail`)
- `maxEmailsPerHour`: number (default: `100`)
- `rateLimitWindow`: number (default: `3600000` (1hr))
- `currentUsage`: number (default: `0`)
- `resetTime`: string (default: calculated)
- `tlsOptions`: object (default: `{}`)
- `metadata`: object (default: `{}`)
- `createdBy`: string
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `lastUsedAt`: string (default: `null`)
- `lastTestAt`: string (default: `null`)
- `testStatus`: string (default: `null`)
- `type_doc`: string (fixed: `'smtp_config'`)

---

## 16. Study

**File:** `Study.js`
**Description:** The core model representing a study/case.

### Variables

- `id`: string (default: UUID)
- `organizationId`: string
- `pmid`: string
- `title`: string
- `authors`: array (default: `[]`)
- `journal`: string
- `publicationDate`: string
- `abstract`: string
- `drugName`: string
- `adverseEvent`: string
- `status`: string (default: `'Pending Review'`)
- `reviewDetails`: object (default: `{}`)
- `comments`: array (default: `[]`)
- `attachments`: array (default: `[]`)
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `createdBy`: string
- `reviewedBy`: string (default: `null`)
- `approvedBy`: string (default: `null`)
- `approvedAt`: string (default: `null`)

**AI Inference fields**

- `aiInferenceData`: object (default: `null`)
- `doi`: string (default: `null`)
- `specialCase`: string (default: `null`)
- `countryOfFirstAuthor`: string (default: `null`)
- `countryOfOccurrence`: string (default: `null`)
- `patientDetails`: object (default: `null`)
- `keyEvents`: object (default: `null`)
- `relevantDates`: object (default: `null`)
- `administeredDrugs`: array (default: `[]`)
- `attributability`: string (default: `null`)
- `drugEffect`: string (default: `null`)
- `summary`: string (default: `null`)
- `identifiableHumanSubject`: string (default: `null`)
- `textType`: string (default: `null`)
- `authorPerspective`: string (default: `null`)
- `confirmedPotentialICSR`: string (default: `null`)
- `icsrClassification`: string (default: `null`)
- `substanceGroup`: string (default: `null`)
- `vancouverCitation`: string (default: `null`)
- `leadAuthor`: string (default: `null`)
- `serious`: string (default: `null`)
- `testSubject`: string (default: `null`)
- `aoiDrugEffect`: string (default: `null`)
- `approvedIndication`: string (default: `null`)
- `aoiClassification`: string (default: `null`)
- `justification`: string (default: `null`)
- `clientName`: string (default: `null`)
- `sponsor`: string (default: `null`)
- `userTag`: string (default: `null`)

**Approvals & Workflows**

- `qaApprovalStatus`: string (default: `'pending'`, options: `pending`, `approved`, `rejected`)
- `qaApprovedBy`: string (default: `null`)
- `qaApprovedAt`: string (default: `null`)
- `qaRejectedBy`: string (default: `null`)
- `qaRejectedAt`: string (default: `null`)
- `qaComments`: string (default: `null`)

**R3 Form Data**

- `r3FormData`: object (default: `null`)
- `r3FormStatus`: string (default: `'not_started'`)
- `r3FormCompletedBy`: string (default: `null`)
- `r3FormCompletedAt`: string (default: `null`)

**QC R3 XML Review**

- `qcR3Status`: string (default: `'not_applicable'`)
- `qcR3ApprovedBy`: string (default: `null`)
- `qcR3ApprovedAt`: string (default: `null`)
- `qcR3RejectedBy`: string (default: `null`)
- `qcR3RejectedAt`: string (default: `null`)
- `qcR3Comments`: string (default: `null`)

**AOI Assessment**

- `listedness`: string (default: `null`)
- `seriousness`: string (default: `null`)
- `fullTextAvailability`: string (default: `null`)
- `fullTextSource`: string (default: `null`)
- `aoiAssessedBy`: string (default: `null`)
- `aoiAssessedAt`: string (default: `null`)

**Medical Reviewer**

- `medicalReviewStatus`: string (default: `'not_started'`)
- `medicalReviewedBy`: string (default: `null`)
- `medicalReviewedAt`: string (default: `null`)
- `reviews`: array (default: `[]`)

**Allocation**

- `assignedTo`: string (default: `null`)
- `lockedAt`: string (default: `null`)
- `priority`: string (default: `'normal'`)
- `classifiedBy`: string (default: `null`)
- `fieldComments`: array (default: `[]`)
- `revokedBy`: string (default: `null`)
- `revokedAt`: string (default: `null`)
- `revocationReason`: string (default: `null`)

---

## 17. User

**File:** `User.js`
**Description:** Represents a user in the system.

### Variables

- `id`: string (default: generated with `user_` prefix)
- `organizationId`: string
- `username`: string
- `email`: string
- `password`: string
- `firstName`: string (default: `''`)
- `lastName`: string (default: `''`)
- `roleId`: string (default: `null`)
- `role`: string (default: `'pharmacovigilance'`)
- `permissions`: object (default: `{}`)
- `isActive`: boolean (default: `true`)
- `lastLogin`: string (default: `null`)
- `passwordChangedAt`: string (default: `null` or created time)
- `passwordResetToken`: string (default: `null`)
- `passwordResetExpires`: string (default: `null`)
- `createdAt`: string (ISO date, default: now)
- `updatedAt`: string (ISO date, default: now)
- `createdBy`: string (default: `null`)
- `type`: string (fixed: `'user'`)
