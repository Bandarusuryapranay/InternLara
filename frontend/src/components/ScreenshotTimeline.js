import React from 'react';

function ScreenshotTimeline({ results }) {
  const stepsWithScreenshots = results?.filter(r => r.screenshot || r.result?.screenshot) || [];

  if (stepsWithScreenshots.length === 0) return null;

  const getActionIcon = (action) => {
    const icons = {
      navigate: '🌐', click: '👆', type: '⌨️', scrape: '📊',
      wait: '⏱️', screenshot: '📸', scroll: '↕️', upload: '📤', download: '📥'
    };
    return icons[action] || '🔧';
  };

  return (
    <div className="screenshot-timeline">
      <div className="timeline-header">
        <h3>📸 Task Screenshot Timeline</h3>
        <p>{stepsWithScreenshots.length} step{stepsWithScreenshots.length !== 1 ? 's' : ''} captured</p>
      </div>

      <div className="timeline-scroll">
        {stepsWithScreenshots.map((item, idx) => {
          const screenshot = item.screenshot || item.result?.screenshot;
          const step = item.step;
          return (
            <div key={idx} className="timeline-card">
              <div className="timeline-card-header">
                <span className="timeline-card-icon">{getActionIcon(step?.action)}</span>
                <div className="timeline-card-info">
                  <span className="timeline-card-num">Step {idx + 1}</span>
                  <span className={`timeline-card-badge ${step?.action}`}>{step?.action?.toUpperCase()}</span>
                </div>
                {item.usedAiFallback && (
                  <span className="timeline-ai-badge">🤖 AI Fix</span>
                )}
              </div>
              <p className="timeline-card-desc">{step?.description}</p>
              {screenshot && (
                <div className="timeline-card-screenshot">
                  <img
                    src={screenshot}
                    alt={`Step ${idx + 1} screenshot`}
                    onClick={() => window.open(screenshot, '_blank')}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScreenshotTimeline;
