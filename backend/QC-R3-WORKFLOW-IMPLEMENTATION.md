# QC R3 XML Workflow Implementation

## Summary

Implemented a new QC approval step in the workflow after R3 XML form completion. Studies now require QC approval before proceeding to the Medical Reviewer.

## Changes Made

### 1. Backend - Study Model (`backend/src/models/Study.js`)

#### Added New Fields:

- `qcR3Status`: Tracks QC approval status for R3 XML forms ('not_applicable', 'pending', 'approved', 'rejected')
- `qcR3ApprovedBy`: User ID who approved the R3 form
- `qcR3ApprovedAt`: Timestamp of R3 form approval
- `qcR3RejectedBy`: User ID who rejected the R3 form
- `qcR3RejectedAt`: Timestamp of R3 form rejection
- `qcR3Comments`: QC comments for R3 form review

#### Modified Methods:

- `completeR3Form()`: Now sets `qcR3Status` to 'pending' instead of directly enabling medical review
- Added `approveR3Form()`: Approves R3 XML form and allows progression to Medical Reviewer
- Added `rejectR3Form()`: Rejects R3 XML form and returns it to Data Entry for corrections

### 2. Backend - API Routes (`backend/src/routes/studyRoutes.js`)

#### New Endpoints:

1. **POST** `/studies/:id/QC/r3/approve` - QC approves R3 XML form
2. **POST** `/studies/:id/QC/r3/reject` - QC rejects R3 XML form
3. **GET** `/studies/QC-r3-pending` - Fetch studies with completed R3 forms awaiting QC approval

#### Modified Endpoints:

- **GET** `/studies/medical-examiner` - Now only returns studies with `qcR3Status = 'approved'`

### 3. Frontend - Reports Page (`frontend/src/app/dashboard/reports/page.tsx`)

#### Column Changes:

- **Removed**: "Classification" column (redundant with Triage Class. and AI Class.)
- **Added**: "QC Triage" column (shows qaApprovalStatus)
- **Added**: "QC R3 XML" column (shows qcR3Status)

#### Updated Interface:

- Added `qcR3Status` field to Study interface

### 4. Frontend - QA Page (`frontend/src/app/dashboard/qa/page.tsx`)

#### New Features:

- **Tab-based interface** with two tabs:
  1. **Triage Classifications**: Review and approve/reject study classifications from Triage team
  2. **R3 XML Forms**: Review and approve/reject completed R3 XML forms

#### New State Variables:

- `activeTab`: Tracks which tab is active ('triage' or 'r3xml')
- `r3Studies`: Stores R3 forms pending QC review

#### New Functions:

- `fetchPendingR3Studies()`: Fetches R3 forms awaiting QC approval
- `approveR3Form()`: Approves an R3 XML form
- `rejectR3Form()`: Rejects an R3 XML form with reason

## Updated Workflow

### Previous Workflow:

1. Triage → classifies study
2. QC → approves/rejects classification
3. Data Entry → fills R3 XML form (for ICSR)
4. **Medical Reviewer** → reviews and approves

### New Workflow:

1. Triage → classifies study
2. QC → approves/rejects classification
3. Data Entry → fills R3 XML form (for ICSR)
4. **QC → approves/rejects R3 XML form** ⭐ NEW STEP
5. Medical Reviewer → reviews and approves (only if QC approved R3)

## Benefits

1. **Additional Quality Control**: R3 XML forms are now reviewed by QC before reaching Medical Reviewer
2. **Error Prevention**: Catches issues in R3 forms early, reducing Medical Reviewer workload
3. **Clear Separation**: Distinct QC reviews for:
   - Study classifications (Triage output)
   - R3 XML forms (Data Entry output)
4. **Audit Trail**: All QC R3 approvals/rejections are tracked with timestamps and comments
5. **Better Visibility**: Reports page now shows both QC checkpoints separately

## Status Tracking

Studies now have three QC-related statuses:

- **qaApprovalStatus**: QC approval of Triage classification
- **qcR3Status**: QC approval of R3 XML form
- **medicalReviewStatus**: Medical Reviewer approval

## Testing Recommendations

1. Test complete workflow:

   - Create a study
   - Triage classifies as ICSR
   - QC approves classification
   - Data Entry completes R3 form
   - Verify study appears in QA page "R3 XML Forms" tab
   - QC approves R3 form
   - Verify study appears in Medical Reviewer queue

2. Test rejection scenarios:

   - QC rejects R3 form
   - Verify it returns to Data Entry with status 'in_progress'
   - Data Entry resubmits
   - QC approves
   - Verify progression to Medical Reviewer

3. Verify Reports page:
   - Check "QC Triage" column shows correct status
   - Check "QC R3 XML" column shows correct status
   - Verify "Classification" column is removed

## Implementation Date

October 24, 2025
