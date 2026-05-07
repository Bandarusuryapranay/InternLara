import React, { useState, useEffect } from 'react';

function LivePreview({ screenshot, isExecuting, currentStep, totalSteps }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="live-preview-panel">
        <div className="preview-header">
          <div className="preview-title">
            <span className="preview-dot"></span>
            <span>Live Browser</span>
          </div>
          {isExecuting && (
            <div className="preview-progress">
              <div className="preview-step-badge">
                {currentStep}/{totalSteps}
              </div>
              <div className="preview-spinner"></div>
            </div>
          )}
          {screenshot && (
            <button
              className="preview-fullscreen-btn"
              onClick={() => setIsFullscreen(true)}
              title="View fullscreen"
            >
              ⤢
            </button>
          )}
        </div>

        <div className={`preview-viewport ${isExecuting ? 'executing' : ''}`}>
          {screenshot ? (
            <img
              src={screenshot}
              alt="Live browser preview"
              className="preview-image"
              onClick={() => setIsFullscreen(true)}
            />
          ) : (
            <div className="preview-empty">
              <div className="preview-empty-icon">🌐</div>
              <p>Browser preview will appear here</p>
              <p className="preview-empty-sub">Screenshots update after each step</p>
            </div>
          )}

          {isExecuting && (
            <div className="preview-executing-overlay">
              <div className="executing-pulse"></div>
            </div>
          )}
        </div>

        {screenshot && (
          <div className="preview-footer">
            <button
              className="preview-download-btn"
              onClick={() => {
                const link = document.createElement('a');
                link.href = screenshot;
                link.download = `screenshot_${Date.now()}.png`;
                link.click();
              }}
            >
              💾 Download
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && screenshot && (
        <div className="preview-fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
          <img
            src={screenshot}
            alt="Fullscreen browser preview"
            className="preview-fullscreen-img"
            onClick={e => e.stopPropagation()}
          />
          <button className="preview-close-btn" onClick={() => setIsFullscreen(false)}>✕</button>
        </div>
      )}
    </>
  );
}

export default LivePreview;
