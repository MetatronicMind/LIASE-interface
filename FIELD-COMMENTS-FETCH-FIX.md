# Field Comments Fetch Fix Summary

## Issue

The user reported that after adding a field comment in the QC Data Entry page, the comment was not being fetched/displayed.
Console logs showed `Selected Study: undefined` in some render cycles.

## Diagnosis

- The backend endpoint `POST /:studyId/field-comments` returns a response object: `{ message, fieldComment, study }`.
- The frontend `frontend/src/app/dashboard/qc/page.tsx` was treating the response as the study object directly: `setSelectedStudy(updatedStudy)`.
- This caused `selectedStudy` to be set to the wrapper object instead of the study object.
- Consequently, `selectedStudy.id` became undefined (causing logs), and `selectedStudy.fieldComments` became undefined (causing comments not to show).

## Fix

- Updated `frontend/src/app/dashboard/qc/page.tsx` to extract the study object from the response: `setSelectedStudy(data.study)`.

## Verification

- The `addFieldComment` function now correctly updates `selectedStudy` with the actual study object returned by the backend.
- This ensures `selectedStudy.fieldComments` is available and contains the newly added comment.
- The UI should now correctly display the added comment immediately.
