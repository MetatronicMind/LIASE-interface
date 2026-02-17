const { google } = require('googleapis');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * GoogleDriveService
 * Handles file uploads to Google Drive
 */
class GoogleDriveService {
  constructor() {
    this.driveClients = new Map(); // Cache drive clients per organization
  }

  /**
   * Get or create authenticated Google Drive client
   */
  async _getGoogleDriveClient(config) {
    const cacheKey = config.organizationId;

    // Return cached client if available
    if (this.driveClients.has(cacheKey)) {
      return this.driveClients.get(cacheKey);
    }

    try {
      // Decode service account key from base64
      let serviceAccountKey;
      try {
        const keyBuffer = Buffer.from(config.googleDrive.serviceAccountKey, 'base64');
        serviceAccountKey = JSON.parse(keyBuffer.toString('utf-8'));
      } catch (decodeError) {
        // If not base64, try parsing directly
        serviceAccountKey = JSON.parse(config.googleDrive.serviceAccountKey);
      }

      // Create JWT auth client
      const auth = new google.auth.JWT(
        serviceAccountKey.client_email,
        null,
        serviceAccountKey.private_key,
        ['https://www.googleapis.com/auth/drive']
      );

      // Authenticate
      await auth.authorize();

      // Create drive client
      const drive = google.drive({ version: 'v3', auth });

      // Cache the client
      this.driveClients.set(cacheKey, drive);

      console.log(`✅ Google Drive client authenticated for organization: ${config.organizationId}`);
      return drive;

    } catch (error) {
      console.error('❌ Failed to authenticate Google Drive client:', error);
      throw new Error(`Google Drive authentication failed: ${error.message}`);
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(filePath, fileName, config, metadata = {}) {
    console.log(`📤 Uploading file to Google Drive: ${fileName}`);

    try {
      const drive = await this._getGoogleDriveClient(config);

      // Determine parent folder
      let parentFolderId = config.googleDrive.folderId;

      // Create subfolder if enabled
      if (config.googleDrive.createSubfolders) {
        parentFolderId = await this._createSubfolder(drive, config);
      }

      // Read file
      const mimeType = this._getMimeType(fileName);

      // Upload file
      const fileMetadata = {
        name: fileName,
        parents: [parentFolderId],
        description: metadata.description || `Archived study report - ${new Date().toISOString()}`
      };

      const media = {
        mimeType: mimeType,
        body: fsSync.createReadStream(filePath)
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, size'
      });

      console.log(`✅ File uploaded successfully: ${response.data.id}`);

      return {
        success: true,
        fileId: response.data.id,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        size: response.data.size
      };

    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to Google Drive
   */
  async uploadMultipleFiles(files, config, metadata = {}) {
    console.log(`📤 Uploading ${files.length} files to Google Drive`);

    const results = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(
          file.filePath,
          file.fileName,
          config,
          metadata
        );
        results.push({ ...file, ...result, success: true });
      } catch (error) {
        console.error(`Failed to upload ${file.fileName}:`, error);
        results.push({ ...file, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Create subfolder based on pattern
   */
  async _createSubfolder(drive, config) {
    const pattern = config.googleDrive.subfolderPattern || 'YYYY/MM/DD';
    const now = new Date();
    
    // Generate folder path based on pattern
    let folderPath = pattern
      .replace('YYYY', now.getFullYear())
      .replace('MM', String(now.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(now.getDate()).padStart(2, '0'))
      .replace('ORG', config.organizationId);

    const folderParts = folderPath.split('/');
    let currentParentId = config.googleDrive.folderId;

    // Create nested folders
    for (const folderName of folderParts) {
      currentParentId = await this._getOrCreateFolder(drive, folderName, currentParentId);
    }

    return currentParentId;
  }

  /**
   * Get or create a folder
   */
  async _getOrCreateFolder(drive, folderName, parentFolderId) {
    try {
      // Check if folder exists
      const query = `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      // Return existing folder
      if (response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create new folder
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      };

      const folder = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id'
      });

      console.log(`📁 Created folder: ${folderName} (${folder.data.id})`);
      return folder.data.id;

    } catch (error) {
      console.error(`Error creating folder ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Get file metadata from Google Drive
   */
  async getFileMetadata(fileId, config) {
    try {
      const drive = await this._getGoogleDriveClient(config);

      const response = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime, modifiedTime'
      });

      return response.data;

    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId, config) {
    try {
      const drive = await this._getGoogleDriveClient(config);

      await drive.files.delete({
        fileId: fileId
      });

      console.log(`🗑️ Deleted file from Google Drive: ${fileId}`);
      return { success: true };

    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Test Google Drive connection
   */
  async testConnection(config) {
    try {
      const drive = await this._getGoogleDriveClient(config);

      // Try to get folder metadata
      const response = await drive.files.get({
        fileId: config.googleDrive.folderId,
        fields: 'id, name, mimeType'
      });

      if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error('Provided ID is not a folder');
      }

      console.log(`✅ Google Drive connection test successful: ${response.data.name}`);

      return {
        success: true,
        folderName: response.data.name,
        folderId: response.data.id
      };

    } catch (error) {
      console.error('❌ Google Drive connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get folder contents
   */
  async listFolderContents(folderId, config, pageSize = 100) {
    try {
      const drive = await this._getGoogleDriveClient(config);

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
        pageSize: pageSize,
        orderBy: 'modifiedTime desc'
      });

      return {
        success: true,
        files: response.data.files
      };

    } catch (error) {
      console.error('Error listing folder contents:', error);
      throw new Error(`Failed to list folder contents: ${error.message}`);
    }
  }

  /**
   * Get MIME type based on file extension
   */
  _getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.zip': 'application/zip'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Clear cached clients
   */
  clearCache(organizationId = null) {
    if (organizationId) {
      this.driveClients.delete(organizationId);
      console.log(`🗑️ Cleared Google Drive client cache for: ${organizationId}`);
    } else {
      this.driveClients.clear();
      console.log('🗑️ Cleared all Google Drive client caches');
    }
  }
}

module.exports = new GoogleDriveService();
