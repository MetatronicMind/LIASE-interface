# Reports Dashboard - Testing Checklist

## Pre-Testing Setup

- [ ] Ensure you have test data with various report types (ICSR, AOI, No Case)
- [ ] Verify you have reports with different statuses
- [ ] Confirm user has `studies:read` permission
- [ ] Clear browser cache before testing
- [ ] Have browser console open to check for errors

## 1. Navigation & Access ✓

### Navigation Menu

- [ ] Reports menu item visible in dashboard sidebar
- [ ] Chart Bar icon (📊) displayed next to "Reports"
- [ ] Click on Reports navigates to `/dashboard/reports`
- [ ] URL updates correctly
- [ ] Page loads without errors

### Permissions

- [ ] User with `studies:read` can access the page
- [ ] User without permission is blocked (if applicable)
- [ ] Only organization's reports are visible

## 2. Statistics Cards ✓

### Display

- [ ] All 6 statistic cards are visible
- [ ] Cards are properly aligned
- [ ] Left border colors match card type:
  - [ ] Total: Blue border
  - [ ] ICSR: Red border
  - [ ] AOI: Yellow border
  - [ ] No Case: Gray border
  - [ ] Unclassified: Purple border
  - [ ] Serious: Orange border

### Accuracy

- [ ] Total count matches number of reports
- [ ] ICSR count accurate
- [ ] AOI count accurate
- [ ] No Case count accurate
- [ ] Unclassified count accurate
- [ ] Serious count accurate
- [ ] Counts update when filters applied

## 3. Study Type Tabs ✓

### Functionality

- [ ] "All Reports" tab shows all reports
- [ ] "ICSR" tab filters to ICSR only
- [ ] "AOI" tab filters to AOI only
- [ ] "No Case" tab filters to No Case only
- [ ] Active tab highlighted in blue
- [ ] Inactive tabs in gray
- [ ] Tab switch is instant (no delay)
- [ ] Statistics cards update with tab changes

## 4. Search Filter ✓

### Search by:

- [ ] PMID (exact match)
- [ ] Title (partial match)
- [ ] Drug Name (partial match)
- [ ] Adverse Event (partial match)
- [ ] Authors (partial match)

### Behavior

- [ ] Search is case-insensitive
- [ ] Results update as you type
- [ ] Empty search shows all results
- [ ] No results displays empty state
- [ ] Clear search box resets results

## 5. Status Filters ✓

### Study Status Filter

- [ ] "All Statuses" option works
- [ ] "Pending Review" filter works
- [ ] "Under Review" filter works
- [ ] "Approved" filter works
- [ ] "Rejected" filter works

### QA Status Filter

- [ ] "All QA Statuses" option works
- [ ] "Pending" filter works
- [ ] "Approved" filter works
- [ ] "Rejected" filter works

### R3 Form Status Filter

- [ ] "All R3 Statuses" option works
- [ ] "Not Started" filter works
- [ ] "In Progress" filter works
- [ ] "Completed" filter works

### Seriousness Filter

- [ ] "All" option shows all reports
- [ ] "Serious Only" shows only serious cases
- [ ] "Non-Serious Only" shows non-serious cases

## 6. Date Range Filter ✓

### Date From

- [ ] Date picker opens correctly
- [ ] Selected date filters reports (from that date forward)
- [ ] Clear date resets filter

### Date To

- [ ] Date picker opens correctly
- [ ] Selected date filters reports (up to that date)
- [ ] Clear date resets filter

### Combined

- [ ] Both dates work together correctly
- [ ] Reports within range displayed
- [ ] Invalid range handled gracefully

## 7. Combined Filters ✓

### Multiple Filters

- [ ] Study type + Search
- [ ] Study type + Status
- [ ] Search + Status + Date range
- [ ] All filters combined work correctly
- [ ] Filters are additive (AND logic)
- [ ] No filter conflicts

## 8. Sorting ✓

### Sortable Columns

- [ ] PMID sorting (ascending/descending)
- [ ] Title sorting (ascending/descending)
- [ ] Drug Name sorting (ascending/descending)
- [ ] Created Date sorting (ascending/descending)

### Behavior

- [ ] Click header once: sort ascending (↑)
- [ ] Click header twice: sort descending (↓)
- [ ] Arrow indicator shows current sort
- [ ] Only one column sorted at a time
- [ ] Sort maintains current filters

## 9. Pagination ✓

### Items Per Page

- [ ] 25 items option works
- [ ] 50 items option works
- [ ] 100 items option works
- [ ] 200 items option works
- [ ] Table updates correctly

### Navigation

- [ ] "Previous" button works (disabled on page 1)
- [ ] "Next" button works (disabled on last page)
- [ ] Page number buttons work
- [ ] Correct page numbers shown
- [ ] Page indicator updates
- [ ] Results counter accurate

### Behavior

- [ ] Applying filter resets to page 1
- [ ] Changing items per page resets to page 1
- [ ] Sorting maintains current page (or resets appropriately)

## 10. Table Display ✓

### Column Headers

- [ ] All columns visible: Checkbox, PMID, Title, Drug, Adverse Event, Classification, Status, QA, R3, Created
- [ ] Headers properly aligned
- [ ] Sortable columns have cursor pointer

### Row Data

- [ ] PMID displayed correctly
- [ ] PMID links to PubMed (opens in new tab)
- [ ] Title truncated properly (line-clamp-2)
- [ ] Hover over title shows full text
- [ ] Drug name displayed
- [ ] Adverse event truncated properly
- [ ] Classification badge displayed with correct color
- [ ] Serious badge shown when applicable
- [ ] Status displayed correctly
- [ ] QA status badge color-coded
- [ ] R3 status badge color-coded
- [ ] Created date formatted correctly

### Badge Colors

- [ ] ICSR: Red badge
- [ ] AOI: Yellow badge
- [ ] No Case: Gray badge
- [ ] Unclassified: Blue badge
- [ ] Serious: Orange badge
- [ ] QA Approved: Green
- [ ] QA Rejected: Red
- [ ] QA Pending: Yellow
- [ ] R3 Completed: Green
- [ ] R3 In Progress: Blue
- [ ] R3 Not Started: Gray

### Interactions

- [ ] Row hover effect (background changes)
- [ ] Row transitions smooth
- [ ] PMID links open correctly
- [ ] Links have hover underline

## 11. Selection System ✓

### Individual Selection

- [ ] Check individual report checkbox
- [ ] Checkbox state updates correctly
- [ ] Can select multiple reports
- [ ] Can unselect reports

### Select All

- [ ] Header checkbox selects all on current page
- [ ] Header checkbox shows correct state
- [ ] Uncheck header deselects all
- [ ] Selection count updates

### Behavior

- [ ] Selection persists when sorting
- [ ] Selection clears when changing pages (expected)
- [ ] Selection count displayed above table
- [ ] "X selected" message accurate

## 12. Export Functions ✓

### CSV Export

- [ ] "Export CSV" button visible and enabled
- [ ] Click triggers download
- [ ] File downloads with date in filename
- [ ] CSV opens in Excel/Google Sheets
- [ ] All columns present in CSV
- [ ] Data correctly formatted
- [ ] Special characters escaped properly
- [ ] Quotes in titles/abstracts handled
- [ ] Boolean values shown as Yes/No
- [ ] Dates formatted as locale string

### JSON Export

- [ ] "Export JSON" button visible and enabled
- [ ] Click triggers download
- [ ] File downloads with date in filename
- [ ] JSON is valid (can parse)
- [ ] All fields included
- [ ] Nested structures preserved
- [ ] Array fields intact

### Export Behavior

- [ ] Export with no selection: all filtered results exported
- [ ] Export with selection: only selected reports exported
- [ ] Export respects current filters
- [ ] Large exports complete successfully
- [ ] Empty exports handled gracefully

## 13. Reset Filters ✓

### Functionality

- [ ] "Reset Filters" button visible
- [ ] Click clears all filters
- [ ] Study type resets to "All"
- [ ] Search box clears
- [ ] All dropdowns reset to default
- [ ] Date range clears
- [ ] Returns to page 1
- [ ] Statistics cards update
- [ ] Table shows all reports

## 14. Empty States ✓

### No Reports Found

- [ ] Empty state displays when no results
- [ ] Icon displayed (document icon)
- [ ] "No reports found" message
- [ ] "Try adjusting your filters" hint
- [ ] No table rows displayed
- [ ] Pagination hidden

### Loading State

- [ ] Spinner shows while loading
- [ ] "Loading reports..." message
- [ ] Appears on initial page load
- [ ] Content hidden during load

### Error State

- [ ] Error message displays on API failure
- [ ] Error icon shown
- [ ] Error text is user-friendly
- [ ] Retry option available (refresh page)

## 15. Responsive Design ✓

### Desktop (1200px+)

- [ ] 6 cards in single row (or 2 rows of 3)
- [ ] Filters in 4-column grid
- [ ] All table columns visible
- [ ] No horizontal scroll on page
- [ ] Sidebar open by default

### Tablet (768px - 1199px)

- [ ] Cards in 2 columns
- [ ] Filters in 2 columns
- [ ] Table scrolls horizontally
- [ ] Export buttons stack appropriately

### Mobile (< 768px)

- [ ] Cards stack vertically
- [ ] Filters stack vertically
- [ ] Table scrolls horizontally
- [ ] All filters accessible
- [ ] Buttons stack or shrink
- [ ] Text remains readable

## 16. Performance ✓

### Load Time

- [ ] Initial page load < 2 seconds
- [ ] Data fetch completes quickly
- [ ] No lag when applying filters
- [ ] Sorting is instant
- [ ] Tab switching is instant

### Large Datasets

- [ ] Test with 100+ reports
- [ ] Test with 500+ reports
- [ ] Test with 1000 reports
- [ ] Pagination prevents DOM overload
- [ ] Filters remain responsive
- [ ] Export completes in reasonable time

### Browser Performance

- [ ] No memory leaks
- [ ] No console errors
- [ ] No warning messages
- [ ] Smooth animations
- [ ] Responsive interactions

## 17. Accessibility ✓

### Keyboard Navigation

- [ ] Tab through all interactive elements
- [ ] Tab order is logical
- [ ] Enter key activates buttons
- [ ] Arrow keys work in dropdowns
- [ ] Escape closes dropdowns

### Screen Reader

- [ ] Page title announced
- [ ] Interactive elements labeled
- [ ] Table structure accessible
- [ ] Button purposes clear
- [ ] Status changes announced

### Visual

- [ ] Sufficient color contrast
- [ ] Focus indicators visible
- [ ] Color not sole indicator
- [ ] Text readable at all sizes
- [ ] Icons have text labels

## 18. Error Handling ✓

### Network Errors

- [ ] API failure shows error message
- [ ] Timeout handled gracefully
- [ ] User informed of issue
- [ ] Page doesn't crash

### Invalid Data

- [ ] Missing fields handled
- [ ] Null values don't break display
- [ ] Empty arrays display correctly
- [ ] Malformed dates handled

### User Errors

- [ ] Invalid date range handled
- [ ] Nonsense search returns empty state
- [ ] Multiple rapid clicks don't cause issues

## 19. Browser Compatibility ✓

### Chrome

- [ ] All features work
- [ ] UI displays correctly
- [ ] Export downloads properly

### Firefox

- [ ] All features work
- [ ] UI displays correctly
- [ ] Export downloads properly

### Safari

- [ ] All features work
- [ ] UI displays correctly
- [ ] Export downloads properly

### Edge

- [ ] All features work
- [ ] UI displays correctly
- [ ] Export downloads properly

## 20. Integration ✓

### API Integration

- [ ] Correct endpoint called
- [ ] Authentication token sent
- [ ] Organization filter applied
- [ ] Response parsed correctly

### Navigation

- [ ] Can navigate to other pages
- [ ] Can return to Reports page
- [ ] State doesn't carry over inappropriately
- [ ] URL updates correctly

### Data Consistency

- [ ] Statistics match actual counts
- [ ] Filtered results accurate
- [ ] Sort order logical
- [ ] Export data matches displayed data

## Edge Cases & Special Scenarios ✓

- [ ] User with only 1 report
- [ ] User with 0 reports
- [ ] User with 1000+ reports
- [ ] All reports same classification
- [ ] All reports unclassified
- [ ] Reports with very long titles
- [ ] Reports with special characters
- [ ] Reports with null fields
- [ ] Reports with empty arrays
- [ ] Export with 0 results
- [ ] Export with 1 result
- [ ] Export with all 1000 results
- [ ] Filter combination with 0 results
- [ ] Date range spanning years
- [ ] Date range with single day
- [ ] Search with special characters
- [ ] Search with very long query

## Security & Permissions ✓

- [ ] Unauthenticated users redirected
- [ ] Users see only their organization's data
- [ ] No data leakage in console
- [ ] No sensitive data in URLs
- [ ] API tokens handled securely

## Documentation ✓

- [ ] User guide available
- [ ] Implementation docs complete
- [ ] Visual guide helpful
- [ ] Testing checklist comprehensive

## Final Sign-Off

### Blocker Issues (Must Fix)

- [ ] List any critical bugs found:
  - ...
  - ...

### Minor Issues (Should Fix)

- [ ] List any minor issues:
  - ...
  - ...

### Nice-to-Have Improvements

- [ ] List any enhancement ideas:
  - ...
  - ...

### Overall Assessment

- [ ] Reports page loads successfully
- [ ] All core features functional
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] UI/UX satisfactory
- [ ] Ready for production

---

**Tested By**: ********\_\_\_********
**Date**: ********\_\_\_********
**Environment**: Dev / Staging / Production
**Browser**: ********\_\_\_********
**Device**: ********\_\_\_********

**Approval**:

- [ ] Approved for Production
- [ ] Needs Revision (see issues above)

**Notes**:

---

---

---
