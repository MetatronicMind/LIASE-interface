# PDF Attachment Feature Implementation

## Overview

Successfully implemented PDF attachment functionality across all major data entry and review workflows in the LIASE interface. Users can now upload, view, download, and delete PDF attachments for studies throughout the entire workflow.

## Implementation Date

November 25, 2025

---

## Features Implemented

### 1. Backend API Endpoints

**Location**: `backend/src/routes/studyRoutes.js`

#### Endpoints Added:

1. **Upload PDF Attachments**

   - `POST /api/studies/:id/attachments`
   - Accepts up to 5 PDF files per request (max 10MB each)
   - Stores files as base64 blobs in Cosmos DB
   - Returns uploaded attachment metadata

2. **Download PDF Attachment**

   - `GET /api/studies/:id/attachments/:attachmentId`
   - Returns the PDF file with appropriate headers
   - Supports direct browser viewing or download

3. **Delete PDF Attachment**
   - `DELETE /api/studies/:id/attachments/:attachmentId`
   - Removes attachment from study
   - Includes audit logging

#### Security & Validation:

- File type validation (PDFs only)
- File size limit: 10MB per file
- Maximum 5 files per upload
- Requires authentication and appropriate permissions
- Full audit trail logging

### 2. File Upload Middleware

**Location**: `backend/src/middleware/upload.js`

- Uses `multer` for multipart form data handling
- Memory storage for processing files as buffers
- Converts to base64 for Cosmos DB storage
- Automatic file type filtering

**Dependencies Added**:

- `multer`: ^1.4.5-lts.1

### 3. Study Model Updates

**Location**: `backend/src/models/Study.js`

The Study model already had an `attachments` array field and `addAttachment()` method, which we leveraged for this implementation.

**Attachment Structure**:

```javascript
{
  id: string,              // UUID
  fileName: string,        // Original filename
  fileSize: number,        // Size in bytes
  fileType: string,        // MIME type (application/pdf)
  uploadedBy: string,      // User ID
  uploadedByName: string,  // User's full name
  uploadedAt: string,      // ISO timestamp
  data: string            // Base64 encoded PDF
}
```

### 4. Frontend Reusable Component

**Location**: `frontend/src/components/PDFAttachmentUpload.tsx`

A fully reusable React component that handles:

- File selection and validation
- Multi-file upload with progress indication
- Display of existing attachments with metadata
- Download functionality
- Delete functionality with confirmation
- Error handling and user feedback
- Responsive design

**Component Props**:

```typescript
interface PDFAttachmentUploadProps {
  studyId: string;
  attachments: Attachment[];
  onUploadComplete: () => void;
  maxFiles?: number; // Default: 5
}
```

### 5. Integration Across All Pages

The PDF attachment component has been integrated into all major workflow pages:

#### ✅ Triage Page

**Location**: `frontend/src/app/dashboard/triage/page.tsx`

- Added before the Comments section
- Allows triage team to attach supporting documents
- Refreshes study data after upload

#### ✅ QA Page

**Location**: `frontend/src/app/dashboard/qa/page.tsx`

- Added before the Comments section
- QA reviewers can review and add attachments
- Supports classification review workflow

#### ✅ QC Page

**Location**: `frontend/src/app/dashboard/qc/page.tsx`

- Added before the Comments section
- QC team can review R3 forms with attachments
- Supports dual QC workflow (Triage + R3 XML)

#### ✅ Medical Examiner/Reviewer Page

**Location**: `frontend/src/app/dashboard/medical-examiner/page.tsx`

- Added before the Action Buttons section
- Medical reviewers can view all attachments
- Can add additional supporting documents
- Includes field-level comment support

#### ✅ Data Entry R3 Form Page

**Location**: `frontend/src/app/dashboard/r3-form/page.tsx`

- Added as a separate section above the form fields
- Data entry team can attach source documents
- Visible throughout form filling process
- Supports revoked study resubmissions

---

## Technical Implementation Details

### Storage Strategy

**Why Base64 in Cosmos DB?**

1. **Simplicity**: No need for separate blob storage service
2. **Consistency**: All study data in one location
3. **Transactional**: Attachments update atomically with study
4. **Cost-effective**: No additional storage service required
5. **Suitable for moderate file sizes**: 10MB limit keeps documents reasonable

### Alternative Options (Not Implemented):

- Azure Blob Storage: Would require additional configuration and service
- File System: Not suitable for distributed/cloud deployment
- External storage: Adds complexity and potential for orphaned files

### Data Flow

1. **Upload**:

   ```
   User → Browser File Selection → FormData → Backend API
   → Multer Middleware → Buffer → Base64 → Cosmos DB
   ```

2. **Download**:

   ```
   User → Download Request → Backend API → Cosmos DB
   → Base64 → Buffer → HTTP Response → Browser Download
   ```

3. **Display**:
   ```
   Page Load → Fetch Study → Include Attachments
   → Render Attachment List → Show Metadata Only
   ```

---

## Usage Examples

### Uploading PDF Attachments

1. Navigate to any supported page (Triage, QA, QC, Medical Examiner, R3 Form)
2. Select a study to view details
3. Locate the "PDF Attachments" section
4. Click "Upload PDF" button
5. Select one or more PDF files (max 5 files, 10MB each)
6. Files are automatically uploaded and displayed

### Downloading Attachments

1. In the attachments list, each file shows:
   - PDF icon
   - Filename
   - File size
   - Uploader name
   - Upload date
2. Click the download icon (↓) to download the file
3. Browser will download or display the PDF

### Deleting Attachments

1. Click the delete icon (trash) on an attachment
2. Confirm deletion in the popup dialog
3. Attachment is removed from the study

---

## Audit Trail

All attachment operations are logged to the audit trail:

- **Upload**: `action: 'upload', resource: 'study_attachment'`
- **Delete**: `action: 'delete', resource: 'study_attachment'`

Each log includes:

- User information
- Timestamp
- Study PMID
- Filename(s)
- Full operation details

---

## Permissions & Authorization

### Required Permissions:

**Upload/Delete**:

- `studies: write` permission
- Must be authenticated
- Organization-scoped access

**Download/View**:

- `studies: read` permission
- Must be authenticated
- Organization-scoped access

### Role-Based Access:

All standard roles have appropriate access:

- ✅ Triage Team
- ✅ QA/QC Team
- ✅ Data Entry Team
- ✅ Medical Examiner/Reviewer
- ✅ Admin/Super Admin

---

## Error Handling

### Client-Side Validation:

- File type checking (PDF only)
- File size validation (10MB limit)
- File count validation (max 5 files)
- User-friendly error messages

### Server-Side Validation:

- Multer middleware enforces limits
- Authentication/authorization checks
- Study existence validation
- Attachment existence validation (for delete)

### Error Responses:

- `400`: Invalid file type, size, or count
- `401`: Not authenticated
- `403`: Insufficient permissions
- `404`: Study or attachment not found
- `500`: Server error with detailed message

---

## UI/UX Features

### Visual Design:

- Clean, modern card-based layout
- PDF icon with red color for visual recognition
- File size formatter (B, KB, MB)
- Hover effects for interactivity
- Loading spinners for async operations

### Responsive Design:

- Mobile-friendly layout
- Truncated long filenames with ellipsis
- Stacked buttons on small screens
- Touch-friendly button sizes

### User Feedback:

- Upload progress indication
- Success/error messages
- Confirmation dialogs for destructive actions
- Empty state messaging
- Disabled states during operations

---

## Testing Recommendations

### Manual Testing Checklist:

1. **Upload Tests**:

   - [ ] Single PDF upload
   - [ ] Multiple PDF upload (up to 5)
   - [ ] Reject non-PDF files
   - [ ] Reject oversized files (>10MB)
   - [ ] Reject too many files (>5)

2. **Download Tests**:

   - [ ] Download and verify PDF content
   - [ ] Download with different browsers
   - [ ] Verify filename preservation

3. **Delete Tests**:

   - [ ] Delete single attachment
   - [ ] Verify confirmation dialog
   - [ ] Verify attachment removed from database

4. **Permission Tests**:

   - [ ] Verify upload requires write permission
   - [ ] Verify download requires read permission
   - [ ] Verify organization isolation

5. **Workflow Tests**:
   - [ ] Test on each page: Triage, QA, QC, Medical Examiner, R3 Form
   - [ ] Verify attachments persist across page refreshes
   - [ ] Verify attachments visible to all authorized users

### Integration Tests:

```javascript
// Example test structure
describe("PDF Attachments", () => {
  it("should upload PDF to study", async () => {
    // Create FormData with PDF
    // POST to /api/studies/:id/attachments
    // Verify response includes attachment metadata
  });

  it("should download PDF from study", async () => {
    // GET /api/studies/:id/attachments/:attachmentId
    // Verify response content type is application/pdf
    // Verify buffer matches original file
  });

  it("should delete PDF from study", async () => {
    // DELETE /api/studies/:id/attachments/:attachmentId
    // Verify attachment removed from study.attachments
  });
});
```

---

## Performance Considerations

### Current Implementation:

- **Storage**: Base64 in Cosmos DB (~33% size overhead)
- **10MB limit per file**: ~13.3MB stored as base64
- **5 files max**: ~66.5MB max per study

### Optimization Opportunities (Future):

1. **Lazy Loading**: Only load attachment data when downloading
2. **Thumbnail Generation**: Generate preview thumbnails
3. **Compression**: Compress PDFs before storage
4. **Azure Blob Storage**: For larger files or many attachments
5. **CDN**: Cache frequently accessed attachments

### Cosmos DB Impact:

- Attachments stored in study document
- May increase document size significantly
- Monitor RU consumption for large attachments
- Consider document size limits (2MB default, 16MB max)

**Note**: If attachments cause documents to exceed Cosmos DB limits, migration to Azure Blob Storage is recommended.

---

## Future Enhancements

### Potential Improvements:

1. **File Type Expansion**:

   - Support for images (JPEG, PNG)
   - Support for Word documents (.docx)
   - Support for Excel files (.xlsx)

2. **Advanced Features**:

   - Inline PDF preview/viewer
   - Version control for attachments
   - Attachment comments/annotations
   - Bulk upload/download
   - Drag-and-drop upload

3. **Performance**:

   - Move to Azure Blob Storage for scale
   - Implement CDN for downloads
   - Add thumbnail generation
   - Implement lazy loading

4. **Security**:

   - Virus scanning for uploads
   - Encryption at rest (Azure feature)
   - Watermarking for sensitive documents
   - Access logging and reporting

5. **Search & Organization**:
   - Search attachments by filename
   - Tag/categorize attachments
   - Filter by uploader or date
   - Attachment-specific audit trail

---

## Migration & Rollback

### Data Migration:

No migration required - the `attachments` array field already exists in the Study model.

### Rollback Plan:

1. Remove frontend components
2. Remove backend routes
3. Uninstall multer: `npm uninstall multer`
4. Attachments data remains in database (no harm)

---

## Files Modified/Created

### Backend:

- ✅ Created: `backend/src/middleware/upload.js`
- ✅ Modified: `backend/src/routes/studyRoutes.js`
- ✅ Modified: `backend/package.json` (added multer)

### Frontend:

- ✅ Created: `frontend/src/components/PDFAttachmentUpload.tsx`
- ✅ Modified: `frontend/src/app/dashboard/triage/page.tsx`
- ✅ Modified: `frontend/src/app/dashboard/qa/page.tsx`
- ✅ Modified: `frontend/src/app/dashboard/qc/page.tsx`
- ✅ Modified: `frontend/src/app/dashboard/medical-examiner/page.tsx`
- ✅ Modified: `frontend/src/app/dashboard/r3-form/page.tsx`

### Documentation:

- ✅ Created: `PDF-ATTACHMENT-IMPLEMENTATION.md` (this file)

---

## Support & Troubleshooting

### Common Issues:

**Issue**: "Only PDF files are allowed"

- **Solution**: Ensure file has .pdf extension and proper MIME type

**Issue**: "File too large"

- **Solution**: Compress PDF or ensure file is under 10MB

**Issue**: "Too many files"

- **Solution**: Upload maximum 5 files at a time

**Issue**: "Failed to upload attachments"

- **Solution**: Check network connection, verify authentication, check server logs

**Issue**: "Attachment not found"

- **Solution**: Attachment may have been deleted, refresh page

### Debug Endpoints:

```bash
# Check study with attachments
GET /api/studies/:studyId

# Verify attachment exists in response
# Look for: study.attachments array
```

### Logging:

All operations are logged:

- Backend: Console logs with file details
- Audit Trail: Full operation tracking
- Frontend: Console errors for debugging

---

## Conclusion

The PDF attachment feature is now fully implemented and integrated across all major workflow pages in the LIASE interface. Users can upload, view, download, and delete PDF documents as supporting materials for studies throughout the triage, QA/QC, medical review, and data entry processes.

The implementation uses a simple, reliable approach with base64 storage in Cosmos DB, suitable for moderate file sizes and usage patterns. The system includes comprehensive validation, security, audit logging, and user-friendly UI/UX.

For questions or issues, please refer to the troubleshooting section or contact the development team.
