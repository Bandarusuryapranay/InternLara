const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const Logger = require('../utils/logger');

class FileManager {
  constructor() {
    this.uploadDir = config.upload.directory;
    this.initializeUploadDirectory();
  }

  /**
   * Initialize upload directory
   */
  async initializeUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      Logger.success('Upload directory initialized:', this.uploadDir);
    } catch (error) {
      Logger.error('Failed to create upload directory:', error.message);
    }
  }

  /**
   * Get file path
   */
  getFilePath(filename) {
    return path.join(this.uploadDir, filename);
  }

  /**
   * List all uploaded files
   */
  async listFiles() {
    try {
      const files = await fs.readdir(this.uploadDir);
      const fileDetails = [];

      for (const file of files) {
        const filePath = this.getFilePath(file);
        const stats = await fs.stat(filePath);
        
        fileDetails.push({
          name: file,
          path: filePath,
          size: stats.size,
          uploadedAt: stats.birthtime
        });
      }

      return fileDetails;
    } catch (error) {
      Logger.error('Failed to list files:', error.message);
      return [];
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(filename) {
    try {
      const filePath = this.getFilePath(filename);
      await fs.unlink(filePath);
      Logger.success('File deleted:', filename);
      return true;
    } catch (error) {
      Logger.error('Failed to delete file:', error.message);
      return false;
    }
  }

  /**
   * Clean up old files (older than 24 hours)
   */
  async cleanupOldFiles() {
    try {
      const files = await this.listFiles();
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const age = now - file.uploadedAt.getTime();
        if (age > maxAge) {
          await this.deleteFile(file.name);
          Logger.info('Cleaned up old file:', file.name);
        }
      }
    } catch (error) {
      Logger.error('Cleanup failed:', error.message);
    }
  }
}

module.exports = new FileManager();
