import React, { useState } from 'react';

function ScreenshotTimeline({ results }) {
  const [activeImage, setActiveImage] = useState(null);
  const stepsWithScreenshots = results?.filter(r => r.screenshot || r.result?.screenshot) || [];

  if (stepsWithScreenshots.length === 0) return null;

  const getActionSvg = (action) => {
    const defaultColor = "currentColor";
    const svgs = {
      navigate: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      ),
      click: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6"></path>
          <path d="M9 21H3v-6"></path>
          <path d="M21 3l-7 7M3 21l7-7"></path>
        </svg>
      ),
      type: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
          <line x1="6" y1="8" x2="6" y2="8"></line>
          <line x1="10" y1="8" x2="18" y2="8"></line>
          <line x1="6" y1="12" x2="14" y2="12"></line>
          <line x1="6" y1="16" x2="10" y2="16"></line>
        </svg>
      ),
      scrape: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      screenshot: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      )
    };
    return svgs[action] || (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    );
  };

  return (
    <div className="screenshot-timeline">
      <div className="timeline-header" style={{marginBottom: '16px'}}>
        <h3 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          Filmstrip Timeline
        </h3>
        <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{stepsWithScreenshots.length} step captures stored</p>
      </div>

      <div className="timeline-scroll">
        {stepsWithScreenshots.map((item, idx) => {
          const screenshot = item.screenshot || item.result?.screenshot;
          const step = item.step;
          return (
            <div key={idx} className="timeline-card" onClick={() => setActiveImage(screenshot)}>
              <div className="timeline-card-header">
                <span className="timeline-card-icon" style={{color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center'}}>
                  {getActionSvg(step?.action)}
                </span>
                <div className="timeline-card-info" style={{marginLeft: '8px', display: 'flex', gap: '6px', alignItems: 'center'}}>
                  <span className="timeline-card-num" style={{fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem'}}>Step {idx + 1}</span>
                  <span className="step-action" style={{fontSize: '0.65rem', padding: '1px 6px'}}>{step?.action}</span>
                </div>
                {item.usedAiFallback && (
                  <span className="confidence-badge low" style={{fontSize: '0.6rem', padding: '1px 6px', marginLeft: 'auto'}}>🤖 AI Fix</span>
                )}
              </div>
              <p className="timeline-card-desc" style={{
                fontSize: '0.78rem',
                margin: '8px 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--text-primary)',
                fontWeight: 500
              }}>
                {step?.description}
              </p>
              {screenshot && (
                <div className="timeline-card-screenshot">
                  <img
                    src={screenshot}
                    alt={`Step ${idx + 1} screenshot`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {activeImage && (
        <div className="preview-fullscreen-overlay" onClick={() => setActiveImage(null)}>
          <img
            src={activeImage}
            alt="Expanded timeline view"
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
            onClick={() => setActiveImage(null)}
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
    </div>
  );
}

export default ScreenshotTimeline;
