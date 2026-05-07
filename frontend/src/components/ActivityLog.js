import React from 'react';

function ActivityLog({ logs, onClear, isExecuting }) {
  const getLogIcon = (type) => {
    const icons = {
      status: 'ℹ️',
      action: '⚡',
      step: '▶️',
      success: '✅',
      error: '❌',
      info: '💬',
      retry: '🔄',
      retry_failed: '⚠️'
    };
    return icons[type] || '📝';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatLogMessage = (log) => {
    if (log.step) {
      return (
        <>
          <div className="log-message">{log.step.description}</div>
          <div className="log-step-info">
            Step {log.stepNumber}/{log.totalSteps}
          </div>
        </>
      );
    }

    if (log.message) {
      return <div className="log-message">{log.message}</div>;
    }

    if (log.action && log.target) {
      return (
        <div className="log-details">
          <code>{log.action}: {log.target || log.selector}</code>
        </div>
      );
    }

    if (log.attempt) {
      return (
        <div className="log-message">
          Retry attempt {log.attempt}/{log.maxAttempts}
          {log.nextRetryIn && ` - Next retry in ${log.nextRetryIn}ms`}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="activity-section">
      <div className="activity-header">
        <h2>📋 Activity Log</h2>
        <button 
          className="clear-btn" 
          onClick={onClear}
          disabled={logs.length === 0}
        >
          🗑️ Clear
        </button>
      </div>

      <div className="activity-log">
        {logs.length === 0 ? (
          <div className="empty-log">
            <p>No activity yet. Submit a task to get started!</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`log-entry log-${log.type}`}>
              <span className="log-icon">{getLogIcon(log.type)}</span>
              <div className="log-content">
                {formatLogMessage(log)}
                {log.error && (
                  <div className="log-error">Error: {log.error}</div>
                )}
              </div>
              <span className="log-time">{formatTime(log.timestamp)}</span>
            </div>
          ))
        )}

        {isExecuting && (
          <div className="log-entry log-executing">
            <span className="log-icon">⏳</span>
            <div className="log-content">
              <div className="log-message">Processing...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityLog;
