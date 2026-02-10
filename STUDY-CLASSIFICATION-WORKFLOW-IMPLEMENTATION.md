# Study Classification and Allocation Workflow Implementation

## Overview

This implementation adds automatic study routing and allocation workflows based on the AI-determined `icsrClassification` field. Studies are automatically routed to different stages based on their classification, with configurable percentage-based sampling for quality control.

## Workflow Summary

### 1. ICSR Triage
**Studies Included**: 
- `icsrClassification` = "Probable ICSR/AOI"
- `icsrClassification` = "Probable ICSR"
- `icsrClassification` = "Article requires manual review"
- Studies with undefined/null `icsrClassification`

**User Classification Options**:
- **ICSR** → Routes to ICSR Assessment (Data Entry or bypasses QC based on workflow config)
- **AOI** → Routes to AOI Assessment
- **No Case** → Routes to No Case Assessment (Reports)

**Allocation**: Standard batch allocation via `/studies/allocate-batch`

### 2. AOI Allocation
**Studies Included**: 
- `icsrClassification` = "Probable AOI"

**Distribution Logic** (Configurable):
- X% (default 10%) → AOI Allocation (for manual quality check)
- Remaining % → AOI Assessment (auto-routed, userTag set to 'AOI')

**User Classification Options** (AOI Allocation only):
- **AOI** → Routes to Reports
- **ICSR** → Routes to ICSR Triage (for reclassification)
- **No Case** → Routes to No Case Assessment (Reports)

**Allocation**: New endpoint `/studies/allocate-aoi-batch`

### 3. No Case Allocation
**Studies Included**: 
- `icsrClassification` = "No Case"

**Distribution Logic** (Configurable):
- X% (default 10%) → No Case Allocation (for manual quality check)
- Remaining % → No Case Assessment/Reports (auto-routed, userTag set to 'No Case')

**User Classification Options** (No Case Allocation only):
- **No Case** → Routes to Reports
- **ICSR** → Routes to ICSR Triage (for reclassification)
- **AOI** → Routes to ICSR Triage (per requirements)

**Allocation**: New endpoint `/studies/allocate-no-case-batch`

---

## Backend Changes

### 1. AdminConfig Model (`backend/src/models/AdminConfig.js`)

Added new `allocation` configuration type:

```javascript
allocation: {
  aoiAllocationPercentage: 10,    // % of Probable AOI to AOI Allocation
  aoiBatchSize: 10,               // Batch size for AOI Allocation
  noCaseAllocationPercentage: 10, // % of No Case to No Case Allocation
  noCaseBatchSize: 10            // Batch size for No Case Allocation
}
```

Also updated `triage` config to include "Article requires manual review" in priorityQueue.

### 2. Study Creation Service (`backend/src/services/studyCreationService.js`)

Added `routeStudyBasedOnClassification()` method that:
1. Reads the `icsrClassification` field from AI inference data
2. Fetches allocation configuration
3. Routes studies based on classification:
   - **Probable ICSR/AOI, Probable ICSR, Article requires manual review** → status: 'triage' (default)
   - **Probable AOI** → 
     - Random X% → status: 'aoi_allocation', routingTarget: 'aoi_allocation'
     - Rest → status: 'aoi_assessment', userTag: 'AOI', qaApprovalStatus: 'not_applicable'
   - **No Case** →
     - Random X% → status: 'no_case_allocation', routingTarget: 'no_case_allocation'
     - Rest → status: 'reporting', userTag: 'No Case', qaApprovalStatus: 'not_applicable'

### 3. Study Routes (`backend/src/routes/studyRoutes.js`)

#### New Allocation Endpoints:

**POST /studies/allocate-aoi-batch**
- Allocates a batch of AOI cases (status = 'aoi_allocation')
- Batch size from allocation config (default 10)
- Uses optimistic concurrency (etag + filterPredicate)
- Returns allocated cases or existing cases if already allocated

**POST /studies/allocate-no-case-batch**
- Allocates a batch of No Case studies (status = 'no_case_allocation')
- Batch size from allocation config (default 10)
- Uses optimistic concurrency (etag + filterPredicate)
- Returns allocated cases or existing cases if already allocated

#### Updated Classification Logic (PUT /:id):

Added special routing for AOI Allocation and No Case Allocation:

```javascript
// AOI Allocation routing
if (study.status === 'aoi_allocation') {
  if (userTag === 'AOI') → status: 'reporting'
  if (userTag === 'ICSR') → status: 'triage'
  if (userTag === 'No Case') → status: 'reporting'
}

// No Case Allocation routing
if (study.status === 'no_case_allocation') {
  if (userTag === 'No Case') → status: 'reporting'
  if (userTag === 'ICSR') → status: 'triage'
  if (userTag === 'AOI') → status: 'triage' // Per requirements
}
```

#### Updated ICSR Triage Allocation:

Modified allocation queries to filter only for ICSR Triage studies:
- `/studies/allocate-case` and `/studies/allocate-batch`
- Filters for:
  - `icsrClassification` contains "probable icsr/aoi", "probable icsr", or "article requires manual review"
  - OR `icsrClassification` is undefined/null

---

## Frontend Changes

### 1. AOI Allocation Page (`frontend/src/app/dashboard/aoi-allocation/page.tsx`)

New interactive allocation page:
- **Allocate Button**: Calls `/studies/allocate-aoi-batch`
- **Case Navigation**: Previous/Next buttons to navigate through allocated batch
- **Classification UI**: Three buttons (AOI, ICSR, No Case)
- **Submit**: Calls `PUT /studies/:id` with userTag
- **Auto-release**: Cases released on exit or when batch is completed

**Features**:
- Shows study details (PMID, title, abstract, journal, etc.)
- Displays routing destination for each classification option
- Removes classified studies from current batch
- Permission-based access (QA/QC permissions)

### 2. No Case Allocation Page (`frontend/src/app/dashboard/no-case-allocation/page.tsx`)

Similar to AOI Allocation page but for No Case studies:
- **Allocate Button**: Calls `/studies/allocate-no-case-batch`
- **Classification UI**: Three buttons (No Case, ICSR, AOI)
- Same features as AOI Allocation page

**Note**: This replaces the previous version which was a list view for QC processing.

### 3. Dashboard Navigation (`frontend/src/app/dashboard/layout.tsx`)

Added "AOI Allocation" navigation item:
- Icon: CheckCircleIcon
- Permission: QA read
- Positioned after "No Case Allocation"

### 4. Allocation Settings Tab (`frontend/src/components/settings/AllocationConfigTab.tsx`)

New configuration UI in Settings:
- **AOI Allocation Section**:
  - AOI Allocation Percentage (0-100%)
  - AOI Batch Size (1-100 cases)
  - Shows remaining % automatically routed to AOI Assessment
- **No Case Allocation Section**:
  - No Case Allocation Percentage (0-100%)
  - No Case Batch Size (1-100 cases)
  - Shows remaining % automatically routed to Reports
- **Actions**:
  - Reset Defaults button (10%, batch size 10)
  - Save Configuration button
- **API Endpoint**: `/admin-config/allocation` (GET/PUT)

### 5. Settings Page (`frontend/src/app/dashboard/settings/page.tsx`)

Added "Allocation Settings" tab:
- Tab ID: 'allocation-config'
- Required Permission: settings.viewAllocationConfig
- Positioned after "Triage Settings"

---

## Configuration

### Default Settings

```javascript
{
  aoiAllocationPercentage: 10,    // 10% to AOI Allocation, 90% to AOI Assessment
  aoiBatchSize: 10,               // 10 cases per batch
  noCaseAllocationPercentage: 10, // 10% to No Case Allocation, 90% to Reports
  noCaseBatchSize: 10            // 10 cases per batch
}
```

### How to Configure

1. Navigate to **Settings** → **Allocation Settings**
2. Adjust percentages (0-100%)
3. Adjust batch sizes (1-100 cases)
4. Click **Save Configuration**
5. Configuration persists in AdminConfig collection with type 'allocation'

---

## Database Schema Changes

### Study Model

**New/Updated Fields**:
- `routingTarget` (string, optional): Tracks automatic routing decisions ('icsr_triage', 'aoi_allocation', 'aoi_assessment', 'no_case_allocation', 'reporting')

**New Status Values**:
- `aoi_allocation`: Study is in AOI Allocation queue
- `no_case_allocation`: Study is in No Case Allocation queue

**Existing Fields Used**:
- `icsrClassification`: AI-determined classification (from AI inference)
- `status`: Current workflow stage
- `userTag`: Manual classification by user ('ICSR', 'AOI', 'No Case')
- `qaApprovalStatus`: QC status ('pending', 'approved', 'rejected', 'not_applicable')
- `assignedTo`: User ID who has the case locked
- `lockedAt`: Timestamp when case was locked

### AdminConfig Collection

**New Config Type**: `allocation`

---

## API Reference

### Allocation Endpoints

#### POST /studies/allocate-aoi-batch
Allocates a batch of AOI cases for quality check.

**Request**: No body required

**Response**:
```json
{
  "success": true,
  "message": "AOI cases allocated successfully",
  "cases": [/* array of study objects */]
}
```

**Status Codes**:
- 200: Cases allocated successfully (or existing cases returned)
- 404: No AOI cases available for allocation
- 409: System busy (race condition)
- 500: Server error

#### POST /studies/allocate-no-case-batch
Allocates a batch of No Case studies for quality check.

**Request**: No body required

**Response**:
```json
{
  "success": true,
  "message": "No Case studies allocated successfully",
  "cases": [/* array of study objects */]
}
```

**Status Codes**: Same as allocate-aoi-batch

#### GET /admin-config/allocation
Retrieves allocation configuration.

**Response**:
```json
{
  "id": "admin_config_...",
  "organizationId": "...",
  "configType": "allocation",
  "configData": {
    "aoiAllocationPercentage": 10,
    "aoiBatchSize": 10,
    "noCaseAllocationPercentage": 10,
    "noCaseBatchSize": 10
  }
}
```

#### PUT /admin-config/allocation
Updates allocation configuration.

**Request**:
```json
{
  "configData": {
    "aoiAllocationPercentage": 15,
    "aoiBatchSize": 20,
    "noCaseAllocationPercentage": 15,
    "noCaseBatchSize": 20
  }
}
```

---

## Testing Guide

### 1. Configuration Testing

1. **Access Settings**:
   - Login as user with `settings.viewAllocationConfig` permission
   - Navigate to Settings → Allocation Settings

2. **Verify Defaults**:
   - AOI Allocation Percentage: 10%
   - AOI Batch Size: 10
   - No Case Allocation Percentage: 10%
   - No Case Batch Size: 10

3. **Change Settings**:
   - Set AOI Allocation Percentage to 20%
   - Set AOI Batch Size to 15
   - Set No Case Allocation Percentage to 25%
   - Set No Case Batch Size to 12
   - Click "Save Configuration"
   - Verify success message

4. **Verify Persistence**:
   - Refresh page
   - Navigate back to Allocation Settings
   - Verify values persisted

### 2. Study Creation & Routing Testing

**Prerequisites**: Access to drug search configuration

1. **Create Probable AOI Studies**:
   - Configure drug search to return articles with AI classification "Probable AOI"
   - Run drug search
   - Verify ~20% of studies have status: 'aoi_allocation'
   - Verify ~80% of studies have status: 'aoi_assessment' and userTag: 'AOI'

2. **Create No Case Studies**:
   - Configure drug search to return articles with AI classification "No Case"
   - Run drug search
   - Verify ~25% of studies have status: 'no_case_allocation'
   - Verify ~75% of studies have status: 'reporting' and userTag: 'No Case'

3. **Create ICSR Triage Studies**:
   - Configure drug search with classifications: "Probable ICSR", "Probable ICSR/AOI", "Article requires manual review"
   - Run drug search
   - Verify all studies have status: 'triage' (or workflow initial stage)
   - Verify none are auto-routed to allocation

### 3. AOI Allocation Testing

1. **Access Page**:
   - Login as user with QA read permission
   - Navigate to Dashboard → AOI Allocation

2. **Allocate Cases**:
   - Click "Allocate AOI Cases"
   - Verify 15 cases are allocated (based on aoiBatchSize from config)
   - Verify "Case 1 of 15" displayed

3. **Navigate Cases**:
   - Click "Next Case"
   - Verify case counter increments
   - Click "Previous Case"
   - Verify can navigate back

4. **Classify as AOI**:
   - Select "AOI" classification button
   - Click "Submit Classification"
   - Verify case removed from batch
   - Check database: status should be 'reporting', userTag should be 'AOI'

5. **Classify as ICSR**:
   - Navigate to next case
   - Select "ICSR"
   - Submit
   - Verify case removed
   - Check database: status should be 'triage', userTag should be 'ICSR'

6. **Classify as No Case**:
   - Navigate to next case
   - Select "No Case"
   - Submit
   - Verify case removed
   - Check database: status should be 'reporting', userTag should be 'No Case'

7. **Exit Allocation**:
   - Click "Exit Allocation"
   - Confirm exit
   - Verify remaining cases are released (assignedTo and lockedAt cleared)

### 4. No Case Allocation Testing

Follow same steps as AOI Allocation Testing, but:
- Navigate to Dashboard → No Case Allocation
- Verify batch size is 12 (from config)
- Verify different routing:
  - No Case → Reports
  - ICSR → Triage
  - AOI → Triage

### 5. ICSR Triage Filtering

1. **Create Mix of Studies**:
   - Create studies with various icsrClassification values
   - Ensure some are in 'triage' status

2. **Allocate from Triage**:
   - Navigate to Dashboard → Literature Triage
   - Click "Start Triage" or "Allocate Cases"
   
3. **Verify Filtering**:
   - Allocated studies should only have:
     - icsrClassification = "Probable ICSR/AOI", "Probable ICSR", "Article requires manual review"
     - OR undefined/null icsrClassification
   - Should NOT allocate "Probable AOI" or "No Case" studies

### 6. Concurrent Allocation Testing

1. **Setup**:
   - Have multiple users with QA/QC permissions
   - Create sufficient AOI Allocation or No Case Allocation studies

2. **Test Race Conditions**:
   - User A clicks "Allocate AOI Cases"
   - Simultaneously, User B clicks "Allocate AOI Cases"
   - Both should receive non-overlapping batches
   - Verify no duplicate assignments
   - Check console logs for "Race condition" messages

---

## Troubleshooting

### Studies Not Routing Correctly

**Problem**: Studies with "Probable AOI" classification going to Triage

**Solution**: 
- Check that routing logic is in studyCreationService.js
- Verify allocation config exists (GET /admin-config/allocation)
- Check study's `icsrClassification` field matches exactly (case-sensitive search uses .toLowerCase())

### Allocation Returning No Cases

**Problem**: "No AOI cases available for allocation"

**Solution**:
- Verify studies exist with status = 'aoi_allocation'
- Check that studies are not already assigned to another user
- Verify percentage configuration is not 0%
- Check organization filter matches

### Classification Not Routing

**Problem**: Classifying a study doesn't route it to expected status

**Solution**:
- Check study's current status (must be 'aoi_allocation' or 'no_case_allocation' for special routing)
- Verify PUT /:id endpoint includes updated routing logic
- Check browser console for errors
- Verify userTag is being sent correctly ("ICSR", "AOI", "No Case" - case sensitive)

### Configuration Not Saving

**Problem**: Allocation settings reset after save

**Solution**:
- Check user has permissions to write to admin-config
- Verify PUT /admin-config/allocation endpoint is working
- Check browser console and network tab for errors
- Verify organizationId is set correctly

---

## Migration Notes

### For Existing Studies

- Existing studies are NOT affected by new routing logic
- Only NEW studies created after deployment will be auto-routed
- To migrate existing studies:
  1. Query studies with specific icsrClassification
  2. Update their status based on allocation percentage
  3. Use bulk update operations

### Database Indexing

Consider adding indexes for:
- `status` + `assignedTo` (for allocation queries)
- `icsrClassification` (for filtering ICSR Triage)
- `organizationId` + `status` + `assignedTo` (compound index)

---

## Future Enhancements

1. **Batch Processing UI**: Show progress of batch completion
2. **Allocation History**: Track allocation metrics and user performance
3. **Dynamic Percentages**: Adjust allocation percentage based on workload
4. **Smart Allocation**: Prioritize certain types of studies based on complexity
5. **Notification System**: Alert when allocation queues are running low
6. **Audit Trail**: Enhanced logging for allocation and routing decisions
7. **Reporting**: Analytics on classification accuracy and routing efficiency

---

## Support & Contact

For questions or issues related to this implementation, please contact the development team or refer to the main project documentation.

**Last Updated**: 2026-02-06
**Version**: 1.0.0
