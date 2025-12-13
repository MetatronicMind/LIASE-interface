# QC Pages Popup Implementation

## Changes

Modified `QC Triage` and `QC Data Entry` pages to open study details in a popup modal instead of expanding below the list.

### 1. QC Triage Page (`frontend/src/app/dashboard/qc-triage/page.tsx`)

- Wrapped the study details section in a fixed overlay modal.
- Added a close button to the modal header.
- Ensured the modal is scrollable and centered.
- The list of studies remains visible in the background.

### 2. QC Data Entry Page (`frontend/src/app/dashboard/qc/page.tsx`)

- Removed the logic that hid the study list when a study was selected (`!selectedStudy &&`). Now the list remains visible.
- Wrapped the "R3 XML Form Review" section in a fixed overlay modal.
- Added a close button to the modal header.
- Ensured the modal is scrollable and centered.

## Verification

- Clicking a study in either QC Triage or QC Data Entry should now open a large modal with the details.
- The modal has a close button (X) in the top right.
- The background list is still visible (dimmed) behind the modal.
