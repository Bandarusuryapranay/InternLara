import React, { useState, useEffect } from 'react';
import api from '../services/api';

function AlertHandler({ alertData, onDismiss }) {
  const [customText, setCustomText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (alertData) {
      fetchAiSuggestion();
    }
  }, [alertData]);

  const fetchAiSuggestion = async () => {
    setLoading(true);
    try {
      const result = await api.analyzeAlert(alertData.alertText, alertData.alertType);
      setAiSuggestion(result);
    } catch (err) {
      console.error('Failed to get AI suggestion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, value = null) => {
    try {
      await api.handlePopup(action, value || customText || null);
      onDismiss();
    } catch (err) {
      console.error('Alert handling failed:', err);
    }
  };

  const getAlertIcon = (type) => {
    const icons = { alert: '⚠️', confirm: '❓', prompt: '📝', beforeunload: '🚪' };
    return icons[type] || '⚠️';
  };

  if (!alertData) return null;

  return (
    <div className="alert-handler-overlay">
      <div className="alert-handler-modal">
        <div className="alert-handler-header">
          <span className="alert-type-icon">{getAlertIcon(alertData.alertType)}</span>
          <div>
            <h3>Browser Alert Detected</h3>
            <span className="alert-type-badge">{alertData.alertType?.toUpperCase()}</span>
          </div>
        </div>

        <div className="alert-handler-body">
          <div className="alert-message-box">
            <p className="alert-message-label">Message from page:</p>
            <p className="alert-message-text">{alertData.alertText}</p>
          </div>

          {loading && (
            <div className="alert-ai-loading">
              <div className="alert-ai-spinner"></div>
              <span>AI is analyzing this alert...</span>
            </div>
          )}

          {aiSuggestion && !loading && (
            <div className="alert-ai-suggestion">
              <span className="alert-ai-label">🤖 AI Suggestion:</span>
              <p>{aiSuggestion.reasoning}</p>
              <span className="alert-ai-action">Recommended: <strong>{aiSuggestion.suggestedAction}</strong></span>
            </div>
          )}

          {alertData.alertType === 'prompt' && (
            <div className="alert-input-section">
              <label>Enter text (for prompt dialog):</label>
              <input
                type="text"
                className="alert-text-input"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Enter your response..."
              />
            </div>
          )}
        </div>

        <div className="alert-handler-actions">
          <button
            className="alert-btn alert-btn-accept"
            onClick={() => handleAction('accept', customText || null)}
          >
            ✅ Accept{alertData.alertType === 'prompt' ? ' with text' : ''}
          </button>
          <button
            className="alert-btn alert-btn-dismiss"
            onClick={() => handleAction('dismiss')}
          >
            ❌ Dismiss
          </button>
          {aiSuggestion && (
            <button
              className="alert-btn alert-btn-ai"
              onClick={() => handleAction(
                aiSuggestion.suggestedAction,
                aiSuggestion.suggestedValue
              )}
            >
              🤖 Use AI Suggestion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertHandler;
