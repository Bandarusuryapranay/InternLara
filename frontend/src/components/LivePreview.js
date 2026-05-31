import React, { useState } from 'react';

function LivePreview({ screenshot, isExecuting, currentStep, totalSteps, url }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clean the URL for display
  const displayUrl = url ? (url.length > 50 ? url.substring(0, 47) + '...' : url) : 'about:blank';

  return (
    <>
      <div className={`live-preview-panel ${isExecuting ? 'executing' : ''}`}>
        <div className="preview-header">
          {/* Mock MacOS dots */}
          <div className="preview-browser-controls">
            <span className="browser-dot red"></span>
            <span className="browser-dot yellow"></span>
            <span className="browser-dot green"></span>
          </div>

          {/* Fake URL Bar showing current URL */}
          <div className="browser-url-bar" title={url || 'about:blank'}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            {displayUrl}
          </div>

          <div className="preview-title">
            <span className="preview-dot"></span>
            <span style={{fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600}}>Agent Viewport</span>
          </div>

          {isExecuting && totalSteps > 0 && (
            <div className="preview-progress" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '12px'
            }}>
              <span className="preview-step-badge" style={{
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#22d3ee',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                STEP {currentStep}/{totalSteps}
              </span>
            </div>
          )}

          {screenshot && (
            <button
              className="preview-fullscreen-btn"
              onClick={() => setIsFullscreen(true)}
              title="View fullscreen"
              style={{
                marginLeft: '12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1.1rem'
              }}
            >
              ⤢
            </button>
          )}
        </div>

        <div className="preview-viewport">
          {screenshot ? (
            <img
              src={screenshot}
              alt="Live browser viewport"
              className="preview-image"
              onClick={() => setIsFullscreen(true)}
            />
          ) : (
            <div className="preview-empty">
              <div className="preview-empty-icon">🌐</div>
              <p style={{fontFamily: 'Space Grotesk, sans-serif', fontWeight: 500, color: 'var(--text-primary)'}}>
                Live Automation Stream
              </p>
              <p className="preview-empty-sub">
                Interactive page capture updates dynamically as the agent operates.
              </p>
            </div>
          )}

          {isExecuting && (
            <div className="preview-executing-overlay"></div>
          )}
        </div>

        {screenshot && (
          <div className="preview-footer">
            <button
              className="preview-download-btn"
              onClick={() => {
                const link = document.createElement('a');
                link.href = screenshot;
                link.download = `agent_capture_${Date.now()}.png`;
                link.click();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Save Screenshot
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Overlay */}
      {isFullscreen && screenshot && (
        <div className="preview-fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
          <img
            src={screenshot}
            alt="Fullscreen capture preview"
            className="preview-fullscreen-img"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
              borderRadius: 'var(--radius-md)'
            }}
          />
          <button 
            className="preview-close-btn" 
            onClick={() => setIsFullscreen(false)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

export default LivePreview;
