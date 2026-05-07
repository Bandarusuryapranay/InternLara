const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fileManager = require('../services/fileManager');
const config = require('../config/config');
const Logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.upload.directory);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  }
});

// Upload a file
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    Logger.success('File uploaded:', req.file.filename);

    res.json({
      success: true,
      file: {
        name: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      }
    });
  } catch (error) {
    Logger.error('Upload failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all files
router.get('/list', async (req, res) => {
  try {
    const files = await fileManager.listFiles();
    res.json({ success: true, files });
  } catch (error) {
    Logger.error('List files failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a file
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const success = await fileManager.deleteFile(filename);

    if (success) {
      res.json({ success: true, message: 'File deleted' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    Logger.error('Delete file failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup old files
router.post('/cleanup', async (req, res) => {
  try {
    await fileManager.cleanupOldFiles();
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    Logger.error('Cleanup failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
