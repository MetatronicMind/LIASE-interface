const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const cosmosService = require('./cosmosService');

/**
 * ReportGeneratorService
 * Generates PDF and CSV reports for studies
 */
class ReportGeneratorService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp/archives');
    this.browser = null;
  }

  /**
   * Initialize temp directory
   */
  async _ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Generate PDF report for a study
   */
  async generatePDF(study, config = {}) {
    const startTime = Date.now();
    console.log(`📄 Generating PDF for study: ${study.id}`);

    try {
      await this._ensureTempDir();

      // Fetch complete study data with all related information
      const completeStudyData = await this._fetchCompleteStudyData(study);

      // Generate HTML content
      const htmlContent = this._generateHTMLReport(completeStudyData, config);

      // Generate filename
      const sanitizedTitle = study.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `Study_${study.id}_${sanitizedTitle}_${timestamp}.pdf`;
      const filePath = path.join(this.tempDir, fileName);

      // For now, save HTML (will implement PDF conversion next)
      // In production, use puppeteer or similar for PDF generation
      const pdfContent = await this._convertHTMLToPDF(htmlContent, config);
      
      await fs.writeFile(filePath, pdfContent);

      const stats = await fs.stat(filePath);
      const duration = Date.now() - startTime;

      console.log(`✅ PDF generated successfully: ${fileName} (${stats.size} bytes, ${duration}ms)`);

      return {
        success: true,
        fileName,
        filePath,
        fileSize: stats.size,
        duration
      };

    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate CSV report for a study
   */
  async generateCSV(study, config = {}) {
    const startTime = Date.now();
    console.log(`📊 Generating CSV for study: ${study.id}`);

    try {
      await this._ensureTempDir();

      // Fetch complete study data
      const completeStudyData = await this._fetchCompleteStudyData(study);

      // Generate CSV content
      const csvContent = this._generateCSVContent(completeStudyData, config);

      // Generate filename
      const sanitizedTitle = study.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `Study_${study.id}_${sanitizedTitle}_${timestamp}.csv`;
      const filePath = path.join(this.tempDir, fileName);

      await fs.writeFile(filePath, csvContent, config.csvSettings?.encoding || 'utf-8');

      const stats = await fs.stat(filePath);
      const duration = Date.now() - startTime;

      console.log(`✅ CSV generated successfully: ${fileName} (${stats.size} bytes, ${duration}ms)`);

      return {
        success: true,
        fileName,
        filePath,
        fileSize: stats.size,
        duration
      };

    } catch (error) {
      console.error('❌ CSV generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch complete study data including drugs, audit logs, etc.
   */
  async _fetchCompleteStudyData(study) {
    const data = {
      study: study,
      drugs: [],
      auditLogs: [],
      attachments: [],
      comments: []
    };

    try {
      // Fetch drugs
      if (study.drugs && study.drugs.length > 0) {
        const drugQuery = `
          SELECT * FROM c 
          WHERE c.organizationId = @orgId 
          AND c.type_doc = 'drug'
          AND ARRAY_CONTAINS(@drugIds, c.id)
        `;
        data.drugs = await cosmosService.queryItems('Studies', drugQuery, [
          { name: '@orgId', value: study.organizationId },
          { name: '@drugIds', value: study.drugs }
        ]);
      }

      // Fetch audit logs
      const auditQuery = `
        SELECT * FROM c 
        WHERE c.organizationId = @orgId 
        AND c.type_doc = 'audit_log'
        AND c.entityId = @studyId
        ORDER BY c.timestamp DESC
      `;
      data.auditLogs = await cosmosService.queryItems('audit-logs', auditQuery, [
        { name: '@orgId', value: study.organizationId },
        { name: '@studyId', value: study.id }
      ]);

      // Fetch attachments
      if (study.attachments && study.attachments.length > 0) {
        data.attachments = study.attachments;
      }

      // Fetch comments if available
      if (study.comments) {
        data.comments = study.comments;
      }

    } catch (error) {
      console.error('Error fetching complete study data:', error);
    }

    return data;
  }

  /**
   * Generate HTML report content
   */
  _generateHTMLReport(data, config) {
    const { study, drugs, auditLogs, attachments, comments } = data;
    const includeAuditTrail = config.fileGeneration?.includeAuditTrail !== false;
    const includeWatermark = config.fileGeneration?.pdfSettings?.includeWatermark || false;
    const watermarkText = config.fileGeneration?.pdfSettings?.watermarkText || 'ARCHIVED';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Study Report - ${this._escapeHtml(study.title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      position: relative;
    }
    ${includeWatermark ? `
    body::before {
      content: "${watermarkText}";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      color: rgba(200, 200, 200, 0.3);
      z-index: -1;
      pointer-events: none;
    }
    ` : ''}
    .header {
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #2c3e50;
      margin: 0;
    }
    .metadata {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 20px;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
    }
    .metadata-item {
      padding: 5px 0;
    }
    .metadata-label {
      font-weight: bold;
      color: #555;
    }
    .section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .section-title {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .drug-card {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .drug-name {
      font-size: 18px;
      font-weight: bold;
      color: #2c3e50;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #3498db;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background: #f8f9fa;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-completed { background: #d4edda; color: #155724; }
    .status-in-progress { background: #fff3cd; color: #856404; }
    .status-pending { background: #cce5ff; color: #004085; }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Study Report</h1>
    <p style="font-size: 20px; color: #555; margin: 10px 0;">${this._escapeHtml(study.title)}</p>
    <p style="color: #777;">Generated: ${new Date().toLocaleString()}</p>
  </div>

  <div class="metadata">
    <div class="metadata-item">
      <span class="metadata-label">Study ID:</span> ${study.id}
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Status:</span>
      <span class="status-badge status-${study.status.toLowerCase().replace(/\s+/g, '-')}">${study.status}</span>
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Created:</span> ${new Date(study.createdAt).toLocaleString()}
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Updated:</span> ${new Date(study.updatedAt).toLocaleString()}
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Organization:</span> ${study.organizationId}
    </div>
    <div class="metadata-item">
      <span class="metadata-label">Created By:</span> ${study.createdBy}
    </div>
  </div>

  ${study.description ? `
  <div class="section">
    <h2 class="section-title">📝 Description</h2>
    <p>${this._escapeHtml(study.description)}</p>
  </div>
  ` : ''}

  <!-- Workflow Information -->
  <div class="section">
    <h2 class="section-title">🔄 Workflow Status</h2>
    <table>
      <tr>
        <th>Stage</th>
        <th>Status</th>
        <th>Details</th>
      </tr>
      <tr>
        <td><strong>Overall Study</strong></td>
        <td><span class="status-badge status-${study.status.toLowerCase().replace(/\s+/g, '-')}">${study.status}</span></td>
        <td>${study.approvedAt ? `Approved: ${new Date(study.approvedAt).toLocaleString()} by ${study.approvedBy || 'N/A'}` : 'In Progress'}</td>
      </tr>
      <tr>
        <td><strong>QA Approval</strong></td>
        <td><span class="status-badge status-${study.qaApprovalStatus}">${study.qaApprovalStatus}</span></td>
        <td>${study.qaApprovedAt ? `Approved: ${new Date(study.qaApprovedAt).toLocaleString()} by ${study.qaApprovedBy || 'N/A'}` : study.qaRejectedAt ? `Rejected: ${new Date(study.qaRejectedAt).toLocaleString()}` : 'Pending'}</td>
      </tr>
      <tr>
        <td><strong>R3 XML Form</strong></td>
        <td><span class="status-badge status-${study.r3FormStatus}">${study.r3FormStatus.replace(/_/g, ' ')}</span></td>
        <td>${study.r3FormCompletedAt ? `Completed: ${new Date(study.r3FormCompletedAt).toLocaleString()} by ${study.r3FormCompletedBy || 'N/A'}` : 'Not Started'}</td>
      </tr>
      <tr>
        <td><strong>QC R3 Review</strong></td>
        <td><span class="status-badge status-${study.qcR3Status}">${study.qcR3Status.replace(/_/g, ' ')}</span></td>
        <td>${study.qcR3ApprovedAt ? `Approved: ${new Date(study.qcR3ApprovedAt).toLocaleString()} by ${study.qcR3ApprovedBy || 'N/A'}` : study.qcR3RejectedAt ? `Rejected: ${new Date(study.qcR3RejectedAt).toLocaleString()}` : 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Medical Review</strong></td>
        <td><span class="status-badge status-${study.medicalReviewStatus}">${study.medicalReviewStatus.replace(/_/g, ' ')}</span></td>
        <td>${study.medicalReviewedAt ? `Completed: ${new Date(study.medicalReviewedAt).toLocaleString()} by ${study.medicalReviewedBy || 'N/A'}` : 'Not Started'}</td>
      </tr>
      ${study.revokedAt ? `
      <tr style="background: #f8d7da;">
        <td colspan="3"><strong>⚠️ REVOKED:</strong> ${study.revocationReason || 'No reason provided'} (by ${study.revokedBy} at ${new Date(study.revokedAt).toLocaleString()})</td>
      </tr>
      ` : ''}
    </table>
  </div>

  <!-- AI Classification Results -->
  ${study.userTag || study.icsrClassification ? `
  <div class="section">
    <h2 class="section-title">🤖 AI Classification & Assessment</h2>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      ${study.userTag ? `<tr><td><strong>User Tag</strong></td><td><span class="status-badge">${study.userTag}</span></td></tr>` : ''}
      ${study.icsrClassification ? `<tr><td><strong>ICSR Classification</strong></td><td>${study.icsrClassification}</td></tr>` : ''}
      ${study.aoiClassification ? `<tr><td><strong>AOI Classification</strong></td><td>${study.aoiClassification}</td></tr>` : ''}
      ${study.confirmedPotentialICSR !== null ? `<tr><td><strong>Confirmed Potential ICSR</strong></td><td>${study.confirmedPotentialICSR ? 'Yes' : 'No'}</td></tr>` : ''}
      ${study.textType ? `<tr><td><strong>Text Type</strong></td><td>${study.textType}</td></tr>` : ''}
      ${study.identifiableHumanSubject !== null ? `<tr><td><strong>Identifiable Human Subject</strong></td><td>${study.identifiableHumanSubject ? 'Yes' : 'No'}</td></tr>` : ''}
      ${study.serious !== null ? `<tr><td><strong>Serious</strong></td><td>${study.serious ? 'Yes' : 'No'}</td></tr>` : ''}
      ${study.testSubject ? `<tr><td><strong>Test Subject</strong></td><td>${study.testSubject}</td></tr>` : ''}
      ${study.listedness ? `<tr><td><strong>Listedness</strong></td><td>${study.listedness}</td></tr>` : ''}
      ${study.seriousness ? `<tr><td><strong>Seriousness</strong></td><td>${study.seriousness}</td></tr>` : ''}
      ${study.substanceGroup ? `<tr><td><strong>Substance Group</strong></td><td>${study.substanceGroup}</td></tr>` : ''}
    </table>
  </div>
  ` : ''}

  <!-- Clinical Details -->
  ${study.patientDetails || study.adverseEvent || study.drugEffect ? `
  <div class="section">
    <h2 class="section-title">🏥 Clinical Information</h2>
    ${study.adverseEvent ? `<p><strong>Adverse Event:</strong> ${this._escapeHtml(study.adverseEvent)}</p>` : ''}
    ${study.drugEffect ? `<p><strong>Drug Effect:</strong> ${this._escapeHtml(study.drugEffect)}</p>` : ''}
    ${study.aoiDrugEffect ? `<p><strong>AOI Drug Effect:</strong> ${this._escapeHtml(study.aoiDrugEffect)}</p>` : ''}
    ${study.attributability ? `<p><strong>Attributability:</strong> ${this._escapeHtml(study.attributability)}</p>` : ''}
    ${study.patientDetails ? `<p><strong>Patient Details:</strong> ${this._escapeHtml(study.patientDetails)}</p>` : ''}
    ${study.keyEvents ? `<p><strong>Key Events:</strong> ${this._escapeHtml(study.keyEvents)}</p>` : ''}
    ${study.relevantDates ? `<p><strong>Relevant Dates:</strong> ${this._escapeHtml(study.relevantDates)}</p>` : ''}
  </div>
  ` : ''}

  <!-- R3 Form Data if available -->
  ${study.r3FormData ? `
  <div class="section">
    <h2 class="section-title">📄 R3 XML Form Data</h2>
    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 11px; max-height: 500px;">${this._escapeHtml(JSON.stringify(study.r3FormData, null, 2))}</pre>
  </div>
  ` : ''}

  <!-- QA/QC Comments -->
  ${study.qaComments || study.qcR3Comments ? `
  <div class="section">
    <h2 class="section-title">📝 QA/QC Review Comments</h2>
    ${study.qaComments ? `
      <div style="background: #fff3cd; padding: 12px; margin-bottom: 10px; border-left: 4px solid #ffc107; border-radius: 3px;">
        <strong>QA Comments:</strong><br>${this._escapeHtml(study.qaComments)}
      </div>
    ` : ''}
    ${study.qcR3Comments ? `
      <div style="background: #d1ecf1; padding: 12px; margin-bottom: 10px; border-left: 4px solid #17a2b8; border-radius: 3px;">
        <strong>QC R3 Comments:</strong><br>${this._escapeHtml(study.qcR3Comments)}
      </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- Field-Level Comments -->
  ${study.fieldComments && study.fieldComments.length > 0 ? `
  <div class="section">
    <h2 class="section-title">💬 Field-Level Comments (${study.fieldComments.length})</h2>
    ${study.fieldComments.map(fc => `
      <div style="background: #e7f3ff; padding: 10px; margin-bottom: 8px; border-left: 3px solid #0066cc; border-radius: 3px;">
        <div style="margin-bottom: 3px;"><strong>Field:</strong> <code>${fc.fieldName}</code></div>
        <div style="margin-bottom: 3px;"><strong>Comment:</strong> ${this._escapeHtml(fc.comment)}</div>
        <div style="color: #666; font-size: 12px;">${fc.userId || 'Unknown'} - ${new Date(fc.createdAt).toLocaleString()}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Publication Details -->
  ${study.authors || study.journal || study.doi ? `
  <div class="section">
    <h2 class="section-title">📚 Publication Details</h2>
    ${study.authors && study.authors.length > 0 ? `<p><strong>Authors:</strong> ${study.authors.join(', ')}</p>` : ''}
    ${study.leadAuthor ? `<p><strong>Lead Author:</strong> ${study.leadAuthor}</p>` : ''}
    ${study.journal ? `<p><strong>Journal:</strong> ${this._escapeHtml(study.journal)}</p>` : ''}
    ${study.publicationDate ? `<p><strong>Publication Date:</strong> ${new Date(study.publicationDate).toLocaleDateString()}</p>` : ''}
    ${study.doi ? `<p><strong>DOI:</strong> ${study.doi}</p>` : ''}
    ${study.vancouverCitation ? `<p><strong>Vancouver Citation:</strong> ${this._escapeHtml(study.vancouverCitation)}</p>` : ''}
    ${study.countryOfFirstAuthor ? `<p><strong>Country of First Author:</strong> ${study.countryOfFirstAuthor}</p>` : ''}
    ${study.countryOfOccurrence ? `<p><strong>Country of Occurrence:</strong> ${study.countryOfOccurrence}</p>` : ''}
  </div>
  ` : ''}

  <!-- Abstract -->
  ${study.abstract ? `
  <div class="section">
    <h2 class="section-title">📄 Abstract</h2>
    <p style="text-align: justify; line-height: 1.6;">${this._escapeHtml(study.abstract)}</p>
  </div>
  ` : ''}

  <!-- AI Summary -->
  ${study.summary ? `
  <div class="section">
    <h2 class="section-title">🤖 AI-Generated Summary</h2>
    <p style="background: #f0f8ff; padding: 12px; border-radius: 5px; line-height: 1.6;">${this._escapeHtml(study.summary)}</p>
  </div>
  ` : ''}

  <div class="section">
    <h2 class="section-title">💊 Drugs (${drugs.length})</h2>
    ${drugs.map(drug => `
      <div class="drug-card">
        <div class="drug-name">${this._escapeHtml(drug.name)}</div>
        ${drug.pmid ? `<p><strong>PMID:</strong> ${drug.pmid}</p>` : ''}
        ${drug.status ? `<p><strong>Status:</strong> <span class="status-badge status-${drug.status.toLowerCase()}">${drug.status}</span></p>` : ''}
        ${drug.aiInferenceResults ? `
          <details>
            <summary><strong>AI Inference Results</strong></summary>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(drug.aiInferenceResults, null, 2)}</pre>
          </details>
        ` : ''}
      </div>
    `).join('')}
  </div>

  ${attachments.length > 0 ? `
  <div class="section">
    <h2 class="section-title">📎 Attachments (${attachments.length})</h2>
    <ul>
      ${attachments.map(att => `
        <li>${this._escapeHtml(att.fileName)} (${this._formatBytes(att.fileSize)})</li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  <!-- Comments Section -->
  ${comments.length > 0 ? `
  <div class="section">
    <h2 class="section-title">💬 Comments & Notes (${comments.length})</h2>
    ${comments.map(comment => `
      <div style="background: #f8f9fa; padding: 12px; margin-bottom: 10px; border-left: 3px solid #007bff; border-radius: 3px;">
        <div style="margin-bottom: 5px;">
          <strong>${comment.userId || 'User'}</strong> - <span style="color: #666; font-size: 13px;">${new Date(comment.createdAt).toLocaleString()}</span>
        </div>
        <div>${this._escapeHtml(comment.text || comment.comment)}</div>
        ${comment.fieldName ? `<div style="color: #666; font-size: 12px; margin-top: 5px;">Field: ${comment.fieldName}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- QC Reviews Section -->
  ${study.qcReviews && study.qcReviews.length > 0 ? `
  <div class="section">
    <h2 class="section-title">✅ QC Review History</h2>
    ${study.qcReviews.map(review => `
      <div style="background: ${review.approved ? '#d4edda' : '#f8d7da'}; padding: 12px; margin-bottom: 10px; border-radius: 5px;">
        <div style="margin-bottom: 5px;">
          <strong>Reviewer:</strong> ${review.reviewerId || 'Unknown'} - 
          <span style="color: #666;">${new Date(review.reviewDate || review.createdAt).toLocaleString()}</span>
        </div>
        <div><strong>Result:</strong> <span style="color: ${review.approved ? '#155724' : '#721c24'};">${review.approved ? '✓ APPROVED' : '✗ REJECTED'}</span></div>
        ${review.comments ? `<div style="margin-top: 5px;"><strong>Comments:</strong> ${this._escapeHtml(review.comments)}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${includeAuditTrail && auditLogs.length > 0 ? `
  <div class="section">
    <h2 class="section-title">📜 Audit Trail</h2>
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Action</th>
          <th>User</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${auditLogs.slice(0, 50).map(log => `
          <tr>
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${this._escapeHtml(log.action)}</td>
            <td>${log.userId}</td>
            <td>${this._escapeHtml(JSON.stringify(log.details).substring(0, 100))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${auditLogs.length > 50 ? `<p><em>Showing 50 of ${auditLogs.length} audit log entries</em></p>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <p>This report was automatically generated by LIASE System</p>
    <p>Report ID: ${study.id} | Generated: ${new Date().toISOString()}</p>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Get or initialize browser instance
   */
  async _getBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      console.log('🌐 Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      console.log('✅ Browser launched successfully');
    }
    return this.browser;
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  async _convertHTMLToPDF(htmlContent, config) {
    let page = null;
    
    try {
      const browser = await this._getBrowser();
      page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1
      });

      // Load HTML content
      await page.setContent(htmlContent, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 30000
      });

      // PDF generation options
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: false
      };

      // Apply custom settings from config if available
      if (config.fileGeneration?.pdfSettings) {
        const settings = config.fileGeneration.pdfSettings;
        
        if (settings.orientation) {
          pdfOptions.landscape = settings.orientation === 'landscape';
        }
        
        if (settings.pageSize) {
          pdfOptions.format = settings.pageSize;
        }
        
        if (settings.margin) {
          pdfOptions.margin = settings.margin;
        }
      }

      // Generate PDF buffer
      const pdfBuffer = await page.pdf(pdfOptions);
      
      await page.close();
      
      return pdfBuffer;

    } catch (error) {
      console.error('❌ PDF conversion error:', error);
      if (page) {
        await page.close().catch(() => {});
      }
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Close browser when done
   */
  async closeBrowser() {
    if (this.browser && this.browser.isConnected()) {
      await this.browser.close();
      this.browser = null;
      console.log('🌐 Browser closed');
    }
  }

  /**
   * Generate CSV content
   */
  _generateCSVContent(data, config) {
    const { study, drugs, auditLogs } = data;
    const delimiter = config.csvSettings?.delimiter || ',';
    const includeHeaders = config.csvSettings?.includeHeaders !== false;
    const includeMetadata = config.csvSettings?.includeMetadata !== false;

    let csv = '';

    // Add metadata section
    if (includeMetadata) {
      csv += `Study Report\n`;
      csv += `Generated,${new Date().toISOString()}\n`;
      csv += `\n`;
      csv += `Study Information\n`;
      csv += `Field${delimiter}Value\n`;
      csv += `Study ID${delimiter}${this._escapeCsv(study.id)}\n`;
      csv += `Title${delimiter}${this._escapeCsv(study.title)}\n`;
      csv += `Status${delimiter}${this._escapeCsv(study.status)}\n`;
      csv += `PMID${delimiter}${study.pmid || ''}\n`;
      csv += `Created At${delimiter}${study.createdAt}\n`;
      csv += `Updated At${delimiter}${study.updatedAt}\n`;
      csv += `Organization${delimiter}${study.organizationId}\n`;
      csv += `Created By${delimiter}${study.createdBy}\n`;
      csv += `\n`;
      
      // Workflow Status
      csv += `Workflow Status\n`;
      csv += `Stage${delimiter}Status${delimiter}Completed By${delimiter}Completed At\n`;
      csv += `QA Approval${delimiter}${study.qaApprovalStatus}${delimiter}${study.qaApprovedBy || ''}${delimiter}${study.qaApprovedAt || ''}\n`;
      csv += `R3 Form${delimiter}${study.r3FormStatus}${delimiter}${study.r3FormCompletedBy || ''}${delimiter}${study.r3FormCompletedAt || ''}\n`;
      csv += `QC R3 Review${delimiter}${study.qcR3Status}${delimiter}${study.qcR3ApprovedBy || study.qcR3RejectedBy || ''}${delimiter}${study.qcR3ApprovedAt || study.qcR3RejectedAt || ''}\n`;
      csv += `Medical Review${delimiter}${study.medicalReviewStatus}${delimiter}${study.medicalReviewedBy || ''}${delimiter}${study.medicalReviewedAt || ''}\n`;
      csv += `\n`;
      
      // Classification
      csv += `Classification\n`;
      csv += `Field${delimiter}Value\n`;
      csv += `User Tag${delimiter}${study.userTag || ''}\n`;
      csv += `ICSR Classification${delimiter}${study.icsrClassification || ''}\n`;
      csv += `AOI Classification${delimiter}${study.aoiClassification || ''}\n`;
      csv += `Serious${delimiter}${study.serious !== null ? (study.serious ? 'Yes' : 'No') : ''}\n`;
      csv += `Listedness${delimiter}${study.listedness || ''}\n`;
      csv += `Seriousness${delimiter}${study.seriousness || ''}\n`;
      csv += `\n`;
      
      // Clinical Details
      if (study.adverseEvent || study.drugEffect) {
        csv += `Clinical Information\n`;
        csv += `Field${delimiter}Value\n`;
        csv += `Adverse Event${delimiter}${this._escapeCsv(study.adverseEvent)}\n`;
        csv += `Drug Effect${delimiter}${this._escapeCsv(study.drugEffect)}\n`;
        csv += `Attributability${delimiter}${this._escapeCsv(study.attributability)}\n`;
        csv += `Patient Details${delimiter}${this._escapeCsv(study.patientDetails)}\n`;
        csv += `\n`;
      }
      
      // Comments
      if (study.qaComments || study.qcR3Comments) {
        csv += `Review Comments\n`;
        if (study.qaComments) csv += `QA Comments${delimiter}${this._escapeCsv(study.qaComments)}\n`;
        if (study.qcR3Comments) csv += `QC R3 Comments${delimiter}${this._escapeCsv(study.qcR3Comments)}\n`;
        csv += `\n`;
      }
    }

    // Add drugs section
    csv += `Drugs\n`;
    if (includeHeaders) {
      csv += `Drug ID${delimiter}Name${delimiter}PMID${delimiter}Status${delimiter}Created At${delimiter}Updated At\n`;
    }
    
    drugs.forEach(drug => {
      csv += `${this._escapeCsv(drug.id)}${delimiter}`;
      csv += `${this._escapeCsv(drug.name)}${delimiter}`;
      csv += `${drug.pmid || ''}${delimiter}`;
      csv += `${this._escapeCsv(drug.status)}${delimiter}`;
      csv += `${drug.createdAt}${delimiter}`;
      csv += `${drug.updatedAt}\n`;
    });

    csv += `\n`;

    // Add audit trail section
    if (config.fileGeneration?.includeAuditTrail && auditLogs.length > 0) {
      csv += `Audit Trail\n`;
      if (includeHeaders) {
        csv += `Timestamp${delimiter}Action${delimiter}User ID${delimiter}Entity Type${delimiter}Entity ID${delimiter}Details\n`;
      }
      
      auditLogs.forEach(log => {
        csv += `${log.timestamp}${delimiter}`;
        csv += `${this._escapeCsv(log.action)}${delimiter}`;
        csv += `${log.userId}${delimiter}`;
        csv += `${this._escapeCsv(log.entityType)}${delimiter}`;
        csv += `${this._escapeCsv(log.entityId)}${delimiter}`;
        csv += `${this._escapeCsv(JSON.stringify(log.details))}\n`;
      });
    }

    return csv;
  }

  /**
   * Escape HTML special characters
   */
  _escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Escape CSV special characters
   */
  _escapeCsv(text) {
    if (!text) return '';
    const str = String(text);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Format bytes to human readable
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Cleaned up temp file: ${filePath}`);
      } catch (error) {
        console.error(`Error cleaning up ${filePath}:`, error);
      }
    }
    
    // Close browser if no longer needed
    await this.closeBrowser();
  }
}

module.exports = new ReportGeneratorService();
