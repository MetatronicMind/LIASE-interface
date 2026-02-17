# PMID Duplicate Check and ICSR Status Update Implementation

## Overview

This implementation adds functionality to handle duplicate PMIDs in drug discovery and automatically update study statuses for ICSR classified studies.

## Changes Made

### 1. PMID Duplicate Check (`drugRoutes.js`)

**Location**: `backend/src/routes/drugRoutes.js`

**Changes in `processDiscoveryJob` function (lines ~1760-1810)**:

- Added duplicate PMID check before creating studies from AI inference results
- Query: `SELECT * FROM c WHERE c.pmid = @pmid AND c.organizationId = @organizationId`
- Skips processing if PMID already exists in the database
- Logs when duplicates are found and skipped

**Changes in `processSearchConfigJob` function (lines ~2019-2080)**:

- Added same duplicate PMID check for basic study creation
- Prevents duplicate studies when AI inference is not available
- Maintains data integrity across different discovery methods

**Changes in direct discovery endpoint (lines ~530-580)**:

- Added duplicate check to immediate discovery processing
- Ensures consistency across all discovery pathways

### 2. ICSR Status Update Logic

**Location**: `backend/src/routes/drugRoutes.js`

**Enhancement in study creation**:

- Automatically sets status to "Study in Process" for studies with:
  - `icsrClassification` field populated
  - `confirmedPotentialICSR` set to true
- Applies to both AI-inference created studies and basic studies
- Logs status changes for tracking

**Code Example**:

```javascript
// Update status based on ICSR classification or confirmed potential ICSR
if (study.icsrClassification || study.confirmedPotentialICSR) {
  study.status = "Study in Process";
  console.log(
    `Setting status to 'Study in Process' for PMID ${aiResult.pmid} due to ICSR classification`
  );
}
```

### 3. Bulk ICSR Status Update Endpoint

**Location**: `backend/src/routes/studyRoutes.js`

**New Endpoint**: `PUT /api/studies/update-icsr-status`

**Functionality**:

- Finds existing studies with ICSR classification still in "Pending" status
- Updates their status to "Study in Process"
- Adds system comment documenting the change
- Returns summary of updates performed
- Requires `studies:update` permission

**Query**:

```sql
SELECT * FROM c
WHERE c.organizationId = @orgId
AND (c.status = @pendingStatus OR c.status = @pendingReviewStatus)
AND (c.icsrClassification != null OR c.confirmedPotentialICSR = true)
```

## Benefits

### 1. Data Integrity

- **Prevents Duplicate Studies**: No more duplicate PMIDs in the database
- **Consistent Processing**: Same logic applied across all discovery methods
- **Audit Trail**: Logs when duplicates are found and skipped

### 2. Workflow Efficiency

- **Automatic Status Updates**: Studies with ICSR classification automatically move to "Study in Process"
- **Bulk Updates**: Existing studies can be updated in bulk via API endpoint
- **Progress Tracking**: Improved job progress messages

### 3. System Performance

- **Reduced Database Load**: Skipping duplicates reduces unnecessary database writes
- **Faster Processing**: No time wasted processing already existing studies
- **Better Resource Utilization**: Focus processing power on new studies

## Usage

### For New Studies

The duplicate check and status update logic is automatically applied during:

- Drug discovery searches (`POST /api/drugs/discover`)
- Search configuration processing
- Direct PubMed ingestion

### For Existing Studies

To update existing studies with ICSR classification:

```bash
PUT /api/studies/update-icsr-status
```

**Response Example**:

```json
{
  "message": "Successfully updated 5 out of 5 studies",
  "updatedCount": 5,
  "totalFound": 5,
  "updateResults": [
    {
      "pmid": "12345678",
      "id": "study-uuid",
      "previousStatus": "Pending",
      "newStatus": "Study in Process",
      "icsrClassification": "Definite",
      "confirmedPotentialICSR": true
    }
  ]
}
```

## Testing

### Test Files Created

1. `test-pmid-duplicate-check.js` - Unit tests for duplicate logic
2. `test-pmid-integration.js` - Integration tests for API endpoints

### Manual Testing

```bash
# Test duplicate check logic
node test-pmid-duplicate-check.js

# Test ICSR status update endpoint
node test-pmid-integration.js
```

## Security & Permissions

- All endpoints require proper authentication
- ICSR status update requires `studies:update` permission
- Audit logging for all bulk operations
- Organization-scoped queries prevent cross-organization access

## Monitoring & Logging

- Console logs for duplicate detection
- Audit trail for status changes
- Progress updates during processing
- Error handling with detailed logging

## Future Enhancements

1. **Configurable Status Mapping**: Allow different status mappings based on ICSR classification types
2. **Batch Processing**: Process duplicates in batches for better performance
3. **Notification System**: Alert users when duplicates are found
4. **Dashboard Integration**: Add metrics for duplicate detection and status updates
