const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const {
  validateExecuteTask,
  validateApproveSteps,
  validateRetryDecision,
  validateHandlePopup
} = require('../middleware/validate');

// Execute a task (returns steps for approval)
router.post('/execute', validateExecuteTask, agentController.executeTask.bind(agentController));

// Approve and execute steps
router.post('/approve', validateApproveSteps, agentController.approveAndExecute.bind(agentController));

// Handle retry decision after error
router.post('/retry-decision', validateRetryDecision, agentController.handleRetryDecision.bind(agentController));

// Handle popup/alert
router.post('/handle-popup', validateHandlePopup, agentController.handlePopup.bind(agentController));

// Get current status
router.get('/status', agentController.getStatus.bind(agentController));

// Get current page info
router.get('/page-info', agentController.getPageInfo.bind(agentController));

// Take screenshot
router.get('/screenshot', agentController.takeScreenshot.bind(agentController));

// Stop browser
router.post('/stop', agentController.stopBrowser.bind(agentController));

// Continue after manual user action (2FA, etc.)
router.post('/continue', agentController.continueAfterUserAction.bind(agentController));

module.exports = router;
