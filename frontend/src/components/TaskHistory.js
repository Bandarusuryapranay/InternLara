import React, { useState, useEffect } from 'react';
import api from '../services/api';

function TaskHistory({ onReplayTask, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    try {
      const data = await api.getHistoryTask(id);
      setDetail(data);
    } catch (err) {
      console.error('Failed to load task detail:', err);
    }
  };

  const handleSelect = (task) => {
    setSelected(task.id);
    fetchDetail(task.id);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.deleteHistoryTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      if (selected === id) { setSelected(null); setDetail(null); }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all task history?')) return;
    try {
      await api.clearHistory();
      setTasks([]);
      setSelected(null);
      setDetail(null);
    } catch (err) {
      console.error('Clear failed:', err);
    }
  };

  const formatTime = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (task) => {
    if (task.success_count === task.step_count) return 'var(--success)';
    if (task.success_count === 0) return 'var(--error)';
    return 'var(--warning)';
  };

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-modal" onClick={e => e.stopPropagation()}>
        <div className="history-modal-header">
          <h3>🗂️ Task History</h3>
          <div className="history-header-actions">
            {tasks.length > 0 && (
              <button className="history-clear-btn" onClick={handleClearAll}>🗑️ Clear All</button>
            )}
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="history-body">
          {/* LEFT: task list */}
          <div className="history-list">
            {loading ? (
              <div className="history-loading">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="history-empty">
                <p>🕐 No tasks yet</p>
                <p>Completed tasks will appear here</p>
              </div>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  className={`history-item ${selected === task.id ? 'active' : ''}`}
                  onClick={() => handleSelect(task)}
                >
                  <div className="history-item-status" style={{ background: getStatusColor(task) }}></div>
                  <div className="history-item-content">
                    <p className="history-item-input">{task.user_input}</p>
                    <div className="history-item-meta">
                      <span>{formatTime(task.created_at)}</span>
                      <span>{task.success_count}/{task.step_count} steps</span>
                      <span className="history-mode-badge">{task.mode}</span>
                    </div>
                  </div>
                  <button className="history-delete-btn" onClick={e => handleDelete(task.id, e)}>✕</button>
                </div>
              ))
            )}
          </div>

          {/* RIGHT: task detail */}
          <div className="history-detail">
            {!detail ? (
              <div className="history-detail-empty">
                <p>👈 Select a task to see details</p>
              </div>
            ) : (
              <>
                <div className="history-detail-header">
                  <p className="history-detail-input">"{detail.user_input}"</p>
                  <button
                    className="history-replay-btn"
                    onClick={() => { onReplayTask(detail.user_input); onClose(); }}
                  >
                    🔄 Replay This Task
                  </button>
                </div>
                <div className="history-steps-list">
                  {(detail.steps || []).map((step, i) => {
                    const result = (detail.results || [])[i];
                    const success = result?.success;
                    return (
                      <div key={i} className={`history-step-item ${success ? 'success' : 'failed'}`}>
                        <span className="history-step-num">{i + 1}</span>
                        <div className="history-step-body">
                          <span className="history-step-action">{step.action?.toUpperCase()}</span>
                          <span className="history-step-desc">{step.description}</span>
                          {step.selector && <code className="history-step-selector">{step.selector}</code>}
                        </div>
                        <span className="history-step-icon">{success ? '✅' : '❌'}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskHistory;
