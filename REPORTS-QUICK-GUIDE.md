# Reports Dashboard - Quick User Guide

## Quick Access

Navigate to **Dashboard → Reports** in the sidebar menu (Chart icon 📊)

## Key Features at a Glance

### 📊 Statistics Cards (Top of Page)

- **Total Reports**: All reports in your organization
- **ICSR**: Individual Case Safety Reports (Red)
- **AOI**: Areas of Interest (Yellow)
- **No Case**: Non-case reports (Gray)
- **Unclassified**: Reports awaiting classification
- **Serious**: Reports marked as serious adverse events

### 🔍 Quick Filtering

**Study Type Tabs** (Click to filter):

- All Reports
- ICSR
- AOI
- No Case

### 🎯 Advanced Filters

1. **Search Box**: Search by PMID, title, drug name, adverse event, or authors
2. **Status**: Filter by review status (Pending, Under Review, Approved, Rejected)
3. **QA Status**: Filter by QA approval state
4. **R3 Form**: Filter by form completion status
5. **Seriousness**: Show only serious or non-serious cases
6. **Date Range**: Filter by creation date (From/To)
7. **Items per page**: Choose how many reports to display (25/50/100/200)

### 📋 Reports Table

- Click **column headers** to sort (click again to reverse)
- **PMID** links open PubMed in a new tab
- Hover over titles to see full text
- Color-coded badges show classification and status

### ✅ Selection & Export

1. **Select Reports**:

   - Check individual boxes for specific reports
   - Use checkbox in header to select all on current page

2. **Export Options**:
   - **Export CSV**: Spreadsheet format for Excel/Google Sheets
   - **Export JSON**: Structured data for analysis/processing
   - If reports are selected, only those are exported
   - If none selected, all filtered results are exported

### 🔄 Reset Filters

Click **"Reset Filters"** to clear all selections and return to default view

## Common Tasks

### Find a Specific Report

1. Enter PMID or keywords in the search box
2. Results update instantly

### Export ICSR Reports Only

1. Click "ICSR" tab at top
2. (Optional) Apply additional filters
3. Click "Export CSV" or "Export JSON"

### View Serious Cases

1. Set "Seriousness" filter to "Serious Only"
2. Review the filtered list
3. Export if needed

### Check QA Pending Reports

1. Set "QA Status" to "Pending"
2. Review reports awaiting QA approval

### Export Monthly Reports

1. Set "Date From" to start of month
2. Set "Date To" to end of month
3. Click "Export CSV"

## Color Guide

### Classification Badges

- 🔴 **Red**: ICSR (Individual Case Safety Report)
- 🟡 **Yellow**: AOI (Area of Interest)
- ⚫ **Gray**: No Case
- 🔵 **Blue**: Unclassified
- 🟠 **Orange**: Serious Case

### Status Badges

- 🟢 **Green**: Approved/Completed
- 🔴 **Red**: Rejected
- 🟡 **Yellow**: Pending
- 🔵 **Blue**: In Progress
- ⚫ **Gray**: Not Started

## Tips & Tricks

### 💡 Pro Tips

1. **Combine Filters**: Use multiple filters together for precise results
2. **Export Strategy**: Select specific reports for targeted exports
3. **Sort Smart**: Sort by creation date to see newest reports first
4. **Page Size**: Increase items per page for fewer clicks
5. **Search Power**: Search works across multiple fields simultaneously

### ⚡ Keyboard Shortcuts

- **Tab**: Navigate between filters
- **Enter**: Submit search
- **Escape**: Close any open dropdowns

### 📱 Mobile Use

- All features work on mobile devices
- Swipe table horizontally to see all columns
- Filters stack vertically for easy access

## Troubleshooting

### "No reports found"

- Check if filters are too restrictive
- Click "Reset Filters" to start fresh
- Verify you have reports in your organization

### Export not working

- Ensure you have reports to export (check filter results)
- Try a different export format (CSV vs JSON)
- Check browser pop-up blocker settings

### Slow performance

- Reduce items per page
- Apply more specific filters to narrow results
- Clear browser cache if issues persist

## Permissions

- Requires `studies:read` permission
- Only see reports from your organization
- Contact admin if you can't access this page

## Support

For issues or feature requests, contact your system administrator.

---

**Need More Help?**

- See full documentation: `REPORTS-MODULE-IMPLEMENTATION.md`
- Check other dashboard modules for related features
- Contact IT support for technical issues
