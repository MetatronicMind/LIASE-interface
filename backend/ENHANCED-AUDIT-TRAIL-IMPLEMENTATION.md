# Enhanced Audit Trail with Before/After Change Tracking

## Overview

This implementation enhances the audit trail system to capture and display detailed before/after values for all field changes across the application, including R3 forms, comments, and study updates.

## Changes Made

### 1. Backend Changes

#### a. AuditLog Model (`backend/src/models/AuditLog.js`)

**Enhancement:** Added three new fields to track changes:

- `beforeValue`: Stores the value before the change
- `afterValue`: Stores the value after the change
- `changes`: Array of field-level changes with structure `{field, before, after}`

```javascript
{
  field: "userTag",
  before: "No Case",
  after: "ICSR"
}
```

#### b. Audit Helper Utilities (`backend/src/utils/auditHelpers.js`)

**New file created** with comprehensive helper functions:

- `hasChanged(before, after)`: Detects if two values are different
- `extractChanges(before, after, fieldsToTrack)`: Compares objects and extracts field-level changes
- `formatValue(value)`: Formats values for display in audit logs
- `generateChangeDescription(changes)`: Creates human-readable change descriptions
- `formatFieldName(fieldName)`: Converts field names to readable format (camelCase → Title Case)
- `createAuditDescription(action, resourceType, resourceId, changes)`: Creates detailed audit descriptions
- `sanitizeValue(value, sensitiveFields)`: Removes sensitive data before logging

#### c. Audit Middleware (`backend/src/middleware/audit.js`)

**Enhancement:** Updated `auditAction` function to accept before/after values:

```javascript
const auditAction = async (
  user,
  action,
  resource,
  resourceId,
  details,
  metadata = {},
  beforeValue = null, // NEW
  afterValue = null // NEW
) => {
  // Automatically extracts changes and enriches details
  const changes = extractChanges(beforeValue, afterValue);
  // Creates detailed audit log with change information
};
```

#### d. Study Routes (`backend/src/routes/studyRoutes.js`)

**Enhanced multiple endpoints** to capture before/after values:

1. **R3 Form Update** (`PUT /:id/r3-form`):

   - Captures R3 form data before and after update
   - Logs all field-level changes in the form

2. **Study Update** (`PUT /:studyId`):

   - Captures all changed fields with before/after values
   - Special handling for userTag (classification) changes

3. **Add Comment** (`POST /:studyId/comments`):

   - Includes actual comment text in audit details
   - Stores comment content in afterValue

4. **Add Field Comment** (`POST /:id/field-comment`):

   - Includes field key and comment text
   - Shows which field was commented on

5. **QA Approval** (`POST /:id/qa/approve`):

   - Captures approval status changes
   - Includes approval comments in audit details

6. **Study Classification Update** (`PUT /:id`):
   - Tracks classification changes (ICSR, AOI, No Case)
   - Shows before and after classification values

### 2. Frontend Changes

#### a. Audit Service (`frontend/src/services/auditService.ts`)

**Enhancement:** Updated AuditLog interface to include new fields:

```typescript
export interface AuditLog {
  // ... existing fields
  beforeValue?: any;
  afterValue?: any;
  changes?: Array<{
    field: string;
    before: any;
    after: any;
  }>;
}
```

**Enhanced CSV export** to include change details in a readable format.

#### b. Audit Trail Page (`frontend/src/app/dashboard/audit-trail/page.tsx`)

**Major UI Enhancement:** Added visual display of before/after changes:

- Shows detailed field-level changes in expandable sections
- Color-coded display: Red for "before" values, Green for "after" values
- Clean, readable format with field names converted to Title Case
- Responsive design that works on mobile and desktop
- Shows `<empty>` for null/undefined values

**Visual Example:**

```
Details: Updated study classification
┌─────────────────────────────────────┐
│ userTag:                            │
│ Before: "No Case"  →  After: "ICSR" │
└─────────────────────────────────────┘
```

## Example Audit Trail Entries

### Before Enhancement:

```
10/23/2025, 4:39:15 PM | Data Entry User | update | study | Unknown | Unknown | N/A | Updated R3 form data for study b6217e8f-...
```

### After Enhancement:

```
10/23/2025, 4:39:15 PM | Data Entry User | update | study | US | New York | 192.168.1.1 |
Updated R3 form data for study b6217e8f-...: Changed 3 fields

Changes:
┌─────────────────────────────────────────────────┐
│ Patient Age:                                    │
│ Before: null          →  After: "45"            │
├─────────────────────────────────────────────────┤
│ Adverse Event:                                  │
│ Before: "Nausea"      →  After: "Severe Nausea" │
├─────────────────────────────────────────────────┤
│ Outcome:                                        │
│ Before: "Unknown"     →  After: "Recovered"     │
└─────────────────────────────────────────────────┘
```

## Features

### ✅ Comprehensive Change Tracking

- Tracks all field changes across the application
- Captures both simple fields and complex objects
- Handles nested data structures

### ✅ Human-Readable Display

- Converts technical field names to readable format
- Shows before/after values side by side
- Color-coded for easy scanning (red = before, green = after)

### ✅ Comment Content Visibility

- Shows actual comment text in audit trail
- Includes context (field comments vs general comments)
- Tracks comment type (review, approval, rejection, general)

### ✅ R3 Form Change Tracking

- Captures every field change in R3 forms
- Shows exactly what was modified
- Includes field-level granularity

### ✅ CSV Export Enhanced

- Exports include before/after values
- Changes column shows all modifications
- Format: "field: 'old' → 'new'"

### ✅ Security & Privacy

- Sensitive fields (passwords, tokens) are automatically redacted
- IP addresses and locations still tracked
- User context preserved

## Impact on Existing Features

### No Breaking Changes

- Existing audit logs continue to work
- New fields are optional (null if not provided)
- Backward compatible with old audit entries

### Performance Considerations

- Change detection is efficient (uses JSON comparison)
- Audit logging is asynchronous (doesn't block requests)
- Minimal overhead on API responses

## Testing Recommendations

1. **Test R3 Form Updates:**

   - Edit any field in R3 form
   - Check audit trail shows before/after values

2. **Test Comments:**

   - Add general comment to a study
   - Add field-level comment
   - Verify comment text appears in audit trail

3. **Test Study Updates:**

   - Change study classification (ICSR → AOI)
   - Update study fields
   - Verify all changes are captured

4. **Test QA Approval:**

   - Approve a study classification
   - Check audit shows approval status change

5. **Test CSV Export:**
   - Export audit logs
   - Verify changes column includes before/after values

## Files Modified

### Backend:

1. `backend/src/models/AuditLog.js` - Added before/after fields
2. `backend/src/utils/auditHelpers.js` - NEW FILE - Helper utilities
3. `backend/src/middleware/audit.js` - Enhanced auditAction function
4. `backend/src/routes/studyRoutes.js` - Updated 6+ endpoints

### Frontend:

1. `frontend/src/services/auditService.ts` - Updated interface and CSV export
2. `frontend/src/app/dashboard/audit-trail/page.tsx` - Enhanced UI display

## Benefits

✨ **Complete Transparency** - Users can see exactly what changed and when
✨ **Compliance Ready** - Full audit trail meets regulatory requirements
✨ **Better Debugging** - Easier to trace issues and understand changes
✨ **User Accountability** - Clear record of who changed what
✨ **Data Integrity** - Can verify and validate all modifications

## Future Enhancements (Optional)

- [ ] Add "View Details" modal for complex changes
- [ ] Add filtering by changed field name
- [ ] Add change comparison view (diff-style)
- [ ] Add undo/revert functionality based on audit trail
- [ ] Add change history timeline view
- [ ] Add notifications for critical changes

## Conclusion

The enhanced audit trail system now provides comprehensive visibility into all data changes across the LIASE interface. Every field edit, comment, and status change is tracked with full before/after context, making it easy to understand exactly what happened, when, and by whom.

This implementation ensures compliance with regulatory requirements while providing users with powerful tools to track and understand system activity.
