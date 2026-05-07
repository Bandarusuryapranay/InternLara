const express = require('express');
const router = express.Router();
const ollamaService = require('../services/ollamaService');

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = await ollamaService.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze alert
router.post('/analyze-alert', async (req, res) => {
  try {
    const { alertText, alertType } = req.body;
    const suggestion = await ollamaService.analyzeAlert(alertText, alertType);
    res.json({ success: true, suggestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
