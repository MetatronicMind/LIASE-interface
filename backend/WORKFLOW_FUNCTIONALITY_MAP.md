# Workflow Functionality Map & Code Breakdown

This document provides a technical breakdown of the "Automatic Division & 3-Track Workflow" implementation in the LIASE backend.

## 1. System Overview

The system classifies incoming studies into three distinct tracks based on their `icsrClassification`.

- **ICSR Track:** High priority safety reports. 100% go to Triage.
- **AOI Track:** Adverse Events of Interest. A percentage go to QC, the rest bypass to Assessment.
- **No Case Track:** Irrelevant articles. A percentage go to QC, the rest bypass to Reporting (or Assessment).

---

## 2. Study Creation & Initial Allocation (The Brain)

**File:** `backend/src/services/studyCreationService.js`
**Function:** `routeStudyBasedOnClassification(studyData, organizationId)`

This function is the "traffic cop" that decides where a new study goes immediately after AI processing.

### Logic Breakdown:

1.  **Configuration Fetching:**
    - It fetches `aoiAllocationPercentage` and `noCaseAllocationPercentage` from the admin config.
    - _Code:_ Lines ~420-440

2.  **Classification Handling:**
    - **ICSR Logic:** If `probable icsr`, `probable icsr/aoi`, etc. -> **ALWAYS** goes to `TRIAGE_ICSR`.
    - **AOI Logic:** If `probable aoi`:
      - Generates a random number (0-100).
      - If `random < aoiAllocationPercentage` -> Routes to `QC_AOI` (Pending QC).
      - Else -> Routes to `ASSESSMENT_AOI` (Auto-passed).
    - **No Case Logic:** If `no case`:
      - Generates a random number (0-100).
      - If `random < noCaseAllocationPercentage` -> Routes to `QC_NOCASE` (Pending QC).
      - Else -> Routes to `ASSESSMENT_NO_CASE` (Auto-passed).

### Key Code Snippet:

```javascript
// Example: AOI Logic (Lines ~460+)
if (isProbableAOI) {
  const randomValue = Math.random() * 100;
  const shouldGoToQC = randomValue < aoiAllocationPercentage;

  if (shouldGoToQC) {
    // Route to QC_AOI
    studyData.status = "qc_aoi";
    studyData.qaApprovalStatus = "pending";
  } else {
    // Route to ASSESSMENT_AOI
    studyData.status = "aoi_assessment";
    studyData.qaApprovalStatus = "not_applicable";
    studyData.isAutoPassed = true;
  }
}
```

---

## 3. Data Model & State Tracking (The Memory)

**File:** `backend/src/models/Study.js`

This model defines the schema that stores the decision made by the service above.

### Key Fields:

- **`icsrClassification`**: The raw AI classification (Source of Truth).
- **`userTag`**: The human-readable tag (`ICSR`, `AOI`, `No Case`).
- **`workflowTrack`**: explicitly defines the track (`ICSR`, `AOI`, `NoCase`).
- **`subStatus`**: Granular position (`triage`, `assessment`, `qc`).
- **`isAutoPassed`**: Boolean flag. `true` means it skipped QC due to the percentage rule.
- **`qaApprovalStatus`**:
  - `pending`: waiting in the QC queue.
  - `not_applicable`: skipped QC.
  - `approved`: passed QC.

---

## 4. API Routes (The Controller)

**File:** `backend/src/routes/studyRoutes.js`

These endpoints connect the frontend to the workflow logic.

### A. Fetching QC Items (The Queue)

**Endpoint:** `GET /QA-pending`
**Line:** ~188

- **Logic:** Queries the database for studies that are currently in a QC state.
- **Query Update:**
  ```sql
  SELECT * FROM c
  WHERE c.organizationId = @orgId
  AND (c.status = 'qc_triage' OR c.status = 'qc_aoi' OR c.status = 'qc_no_case')
  ```
- **Description:** This ensures that items from ALL three tracks (Triage QC, AOI QC, No Case QC) show up in the "QC Allocation" dashboard.

### B. Bulk Approving QC Items (The Action)

**Endpoint:** `POST /QA/bulk-process`
**Line:** ~276

- **Refactored Logic:**
  - _Old Way:_ Fetched items, calculated a percentage, approved some, kept others in QC (double sampling).
  - _New Way:_ Since sampling happens at **creation**, this endpoint now simply **APPROVES** everything passed to it. It assumes if an item is in this list, it needs approval.
  - **Action:** Sets `status` to next stage (`aoi_assessment` or `reporting`), sets `qaApprovalStatus` to `approved`.

**Endpoint:** `POST /QA/process-no-case`
**Line:** ~398

- **Refactored Logic:** Similar to bulk process, it now simply approves "No Case" items moving them out of `qc_no_case` -> `reporting`.

---

## 5. Workflow Summary Table

| Classification    | Action     | Status               | QC Status        | Next Step          |
| :---------------- | :--------- | :------------------- | :--------------- | :----------------- |
| **Probable ICSR** | Always     | `TRIAGE_ICSR`        | N/A              | Triage Review      |
| **Probable AOI**  | `Rand < %` | `QC_AOI`             | `pending`        | Manual QC Approval |
| **Probable AOI**  | `Rand > %` | `ASSESSMENT_AOI`     | `not_applicable` | Assessment         |
| **No Case**       | `Rand < %` | `QC_NOCASE`          | `pending`        | Manual QC Approval |
| **No Case**       | `Rand > %` | `ASSESSMENT_NO_CASE` | `not_applicable` | Reporting          |
