# Reports Triage Display Fix

## Issue

The "Triage Class" column in the Reports page was displaying "Seriousness" and "Listedness" badges even when the classification was "No Case". This was misleading as "No Case" studies typically do not have these attributes relevant for display in the same way as ICSRs.

## Fix

Modified `frontend/src/app/dashboard/reports/page.tsx` to conditionally render the "Listedness" and "Seriousness" badges.
They are now hidden if the Triage Classification is "No Case".

Also applied similar fixes to:

- `frontend/src/app/dashboard/qc/page.tsx`
- `frontend/src/app/dashboard/r3-form/page.tsx`

## Verification

- Checked that the rendering logic checks `getTriageClassification(study) !== 'No Case'` (or `study.userTag !== 'No Case'`) before displaying the badges.
- Confirmed that AOI Assessment page filters for 'AOI' tag only, so it's unaffected.
