import React from 'react';

function ErrorDialog({ error, onDecision, onClose }) {
  const { step, options, context } = error;

  return (
    <div className="error-dialog-overlay">
      <div className="error-dialog">
        <div className="error-header">
          <h2>❌ Step Failed</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="error-content">
          <div className="error-step">
            <strong>Failed Step:</strong> {step.description}
          </div>
          
          <div className="error-message">
            <strong>Error:</strong> {context.message || 'Unknown error'}
          </div>

          <div className="error-details">
            {step.selector && <code>Selector: {step.selector}</code>}
            {step.target && <code>Target: {step.target}</code>}
          </div>

          <p className="error-info">
            ℹ️ This step was retried 3 times automatically. What would you like to do?
          </p>
        </div>

        <div className="error-actions">
          <button 
            className="btn-error-action btn-retry"
            onClick={() => onDecision('retry')}
          >
            🔄 Retry Manually
          </button>

          <button 
            className="btn-error-action btn-skip"
            onClick={() => onDecision('skip')}
          >
            ⏭️ Skip This Step
          </button>

          <button 
            className="btn-error-action btn-ai"
            onClick={() => onDecision('ai_alternative')}
          >
            🤖 Let AI Find Alternative
          </button>

          <button 
            className="btn-error-action btn-cancel"
            onClick={() => onDecision('cancel')}
          >
            ❌ Cancel Task
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorDialog;
