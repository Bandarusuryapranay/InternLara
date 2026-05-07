const express = require('express');
const router = express.Router();
const historyService = require('../services/historyService');

// Get all tasks (paginated)
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tasks = historyService.getTasks(limit);
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single task with full details
router.get('/:id', (req, res) => {
  try {
    const task = historyService.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
router.delete('/:id', (req, res) => {
  try {
    historyService.deleteTask(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all history
router.delete('/', (req, res) => {
  try {
    historyService.clearAll();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
