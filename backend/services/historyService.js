const Database = require('better-sqlite3');
const path = require('path');
const Logger = require('../utils/logger');

const DB_PATH = path.resolve('./history.db');

class HistoryService {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    try {
      this.db = new Database(DB_PATH);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          user_input TEXT NOT NULL,
          mode TEXT DEFAULT 'demo',
          status TEXT DEFAULT 'completed',
          step_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          steps_json TEXT,
          results_json TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          completed_at TEXT
        );
      `);
      Logger.success('History DB initialized at ' + DB_PATH);
    } catch (err) {
      Logger.error('History DB init failed:', err.message);
    }
  }

  saveTask({ id, userInput, mode, steps, results }) {
    if (!this.db) return;
    try {
      const successCount = (results || []).filter(r => r.success).length;
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO tasks
          (id, user_input, mode, status, step_count, success_count, steps_json, results_json, created_at, completed_at)
        VALUES
          (?, ?, ?, 'completed', ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      stmt.run(
        id,
        userInput,
        mode || 'demo',
        (steps || []).length,
        successCount,
        JSON.stringify(steps || []),
        JSON.stringify(results || [])
      );
      Logger.info(`Task saved to history: ${id}`);
    } catch (err) {
      Logger.error('saveTask failed:', err.message);
    }
  }

  getTasks(limit = 20) {
    if (!this.db) return [];
    try {
      return this.db.prepare(`
        SELECT id, user_input, mode, status, step_count, success_count, created_at, completed_at
        FROM tasks ORDER BY created_at DESC LIMIT ?
      `).all(limit);
    } catch (err) {
      Logger.error('getTasks failed:', err.message);
      return [];
    }
  }

  getTask(id) {
    if (!this.db) return null;
    try {
      const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (!row) return null;
      return {
        ...row,
        steps: row.steps_json ? JSON.parse(row.steps_json) : [],
        results: row.results_json ? JSON.parse(row.results_json) : []
      };
    } catch (err) {
      Logger.error('getTask failed:', err.message);
      return null;
    }
  }

  deleteTask(id) {
    if (!this.db) return;
    try {
      this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    } catch (err) {
      Logger.error('deleteTask failed:', err.message);
    }
  }

  clearAll() {
    if (!this.db) return;
    try {
      this.db.prepare('DELETE FROM tasks').run();
    } catch (err) {
      Logger.error('clearAll failed:', err.message);
    }
  }
}

module.exports = new HistoryService();
