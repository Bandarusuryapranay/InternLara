import React from 'react';

function StatusBar({ status, onRefresh }) {
  const getBrowserStatus = () => {
    if (!status.browser) return { icon: '⚪', text: 'Unknown', color: '#999' };
    if (status.browser.isRunning) {
      return { icon: '🟢', text: 'Running', color: '#4caf50' };
    }
    return { icon: '🔴', text: 'Stopped', color: '#f44336' };
  };

  const getOllamaStatus = () => {
    if (!status.ollama) return { icon: '⚪', text: 'Unknown', color: '#999' };
    if (status.ollama.status === 'healthy') {
      return { icon: '🟢', text: 'Connected', color: '#4caf50' };
    }
    return { icon: '🔴', text: 'Disconnected', color: '#f44336' };
  };

  const browserStatus = getBrowserStatus();
  const ollamaStatus = getOllamaStatus();

  return (
    <div className="status-bar">
      <div className="status-items">
        <div className="status-item">
          <span className="status-label">Browser:</span>
          <span className="status-value" style={{ color: browserStatus.color }}>
            {browserStatus.icon} {browserStatus.text}
          </span>
          {status.browser?.currentUrl && (
            <span className="status-url" title={status.browser.currentUrl}>
              {status.browser.currentUrl.substring(0, 50)}
              {status.browser.currentUrl.length > 50 ? '...' : ''}
            </span>
          )}
        </div>

        <div className="status-item">
          <span className="status-label">Ollama:</span>
          <span className="status-value" style={{ color: ollamaStatus.color }}>
            {ollamaStatus.icon} {ollamaStatus.text}
          </span>
          {status.ollama?.currentModel && (
            <span className="status-models">
              Model: {status.ollama.currentModel}
            </span>
          )}
        </div>
      </div>

      <button className="refresh-btn" onClick={onRefresh} title="Refresh status">
        🔄
      </button>
    </div>
  );
}

export default StatusBar;
