const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

// Execute a task (returns steps for approval)
router.post('/execute', agentController.executeTask.bind(agentController));

// Approve and execute steps
router.post('/approve', agentController.approveAndExecute.bind(agentController));

// Handle retry decision after error
router.post('/retry-decision', agentController.handleRetryDecision.bind(agentController));

// Handle popup/alert
router.post('/handle-popup', agentController.handlePopup.bind(agentController));

// Get current status
router.get('/status', agentController.getStatus.bind(agentController));

// Get current page info
router.get('/page-info', agentController.getPageInfo.bind(agentController));

// Take screenshot
router.get('/screenshot', agentController.takeScreenshot.bind(agentController));

// Stop browser
router.post('/stop', agentController.stopBrowser.bind(agentController));

module.exports = router;
