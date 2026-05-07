import React from 'react';

function SettingsPanel({ mode, onModeChange, onClose }) {
  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>⚙️ Settings</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="settings-content">
        <div className="setting-group">
          <h4>Execution Mode</h4>
          <p className="setting-description">
            Choose how you want to approve actions
          </p>

          <div className="mode-options">
            <label className={`mode-option ${mode === 'demo' ? 'active' : ''}`}>
              <input
                type="radio"
                name="mode"
                value="demo"
                checked={mode === 'demo'}
                onChange={(e) => onModeChange(e.target.value)}
              />
              <div className="mode-content">
                <div className="mode-title">🎯 Demo Mode (Recommended)</div>
                <div className="mode-desc">
                  Review the full plan once, then all approved steps execute automatically.
                  Faster and better for presentations.
                </div>
              </div>
            </label>

            <label className={`mode-option ${mode === 'strict' ? 'active' : ''}`}>
              <input
                type="radio"
                name="mode"
                value="strict"
                checked={mode === 'strict'}
                onChange={(e) => onModeChange(e.target.value)}
              />
              <div className="mode-content">
                <div className="mode-title">🔒 Strict Mode</div>
                <div className="mode-desc">
                  Approve each step individually before it executes.
                  Maximum control and security.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="setting-group">
          <h4>ℹ️ About</h4>
          <div className="about-info">
            <p><strong>AI Browser Agent</strong></p>
            <p>Version 1.0.0</p>
            <p>AP Government Internship Project 2026</p>
            <p>Built with React + Node.js + Ollama + Puppeteer</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
