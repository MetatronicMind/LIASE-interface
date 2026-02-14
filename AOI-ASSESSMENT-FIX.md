# AOI Assessment Page Fix

## Issue

Completed AOI assessments (those with both Listedness and Seriousness set) were remaining on the AOI Assessment page list, cluttering the view for users who want to focus on pending assessments.

## Fix

Modified `fetchAOIStudies` in `frontend/src/app/dashboard/aoi-assessment/page.tsx` to filter out studies that have both `listedness` and `seriousness` fields populated.

## Verification

- The filter condition `!study.listedness || !study.seriousness` ensures that only studies missing one or both of these fields are displayed.
- When an assessment is saved with both fields, `fetchAOIStudies` is called, which will now exclude the just-completed study from the list.
