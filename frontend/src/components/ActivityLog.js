import React, { useEffect, useRef } from 'react';

function ActivityLog({ logs, onClear, isExecuting }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    // Keep logs scrolled to the bottom on update
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isExecuting]);

  const getLogSvg = (type) => {
    const defaultColor = "currentColor";
    const svgs = {
      status: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      ),
      action: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      ),
      step: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      ),
      success: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ),
      error: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      ),
      info: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      ),
      retry: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
        </svg>
      ),
      retry_failed: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      )
    };
    return svgs[type] || (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatLogMessage = (log) => {
    if (log.step) {
      return (
        <>
          <div className="log-message">{log.step.description}</div>
          <div className="log-step-info">
            Step {log.stepNumber} of {log.totalSteps}
          </div>
        </>
      );
    }

    if (log.message) {
      return <div className="log-message">{log.message}</div>;
    }

    if (log.action) {
      return (
        <div className="log-details">
          <code>{log.action}{log.target || log.selector ? `: ${log.target || log.selector}` : ''}</code>
        </div>
      );
    }

    if (log.attempt) {
      return (
        <div className="log-message">
          Retry attempt {log.attempt}/{log.maxAttempts}
          {log.nextRetryIn && ` - Wait ${log.nextRetryIn}ms`}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="activity-section">
      <div className="activity-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="9"></line>
            <line x1="9" y1="13" x2="15" y2="13"></line>
            <line x1="9" y1="17" x2="13" y2="17"></line>
          </svg>
          Activity Stream
        </h2>
        <button 
          className="clear-btn" 
          onClick={onClear}
          disabled={logs.length === 0}
        >
          Clear
        </button>
      </div>

      <div className="activity-log">
        {logs.length === 0 ? (
          <div className="empty-log" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            opacity: 0.5,
            textAlign: 'center'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '16px'}}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p>Ready for instructions. Timelines will populate live.</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div 
              key={log.id || index} 
              className={`log-entry log-${log.type}`}
              style={{animationDelay: `${Math.min(index * 30, 300)}ms`}}
            >
              <span className="log-icon" style={{
                color: log.type === 'success' ? 'var(--success)' :
                       log.type === 'error' || log.type === 'retry_failed' ? 'var(--error)' :
                       log.type === 'retry' ? 'var(--warning)' : 'var(--text-muted)'
              }}>
                {getLogSvg(log.type)}
              </span>
              <div className="log-content">
                {formatLogMessage(log)}
                {log.error && (
                  <div className="log-error" style={{
                    marginTop: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--error)',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    {log.error}
                  </div>
                )}
              </div>
              <span className="log-time">{formatTime(log.timestamp)}</span>
            </div>
          ))
        )}

        {isExecuting && (
          <div className="log-entry log-executing">
            <span className="log-icon" style={{color: 'var(--accent-primary)'}}>
              <span className="preview-spinner" style={{
                width: '12px',
                height: '12px',
                borderWidth: '2px',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'block',
                animation: 'scanning 1s linear infinite'
              }}></span>
            </span>
            <div className="log-content">
              <div className="log-message" style={{color: 'var(--text-muted)'}}>Automator processing next step...</div>
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

export default ActivityLog;
