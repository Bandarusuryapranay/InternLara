import React, { useState, useEffect } from 'react';

function AgentBrain({ isExecuting }) {
  const [thinkingStep, setThinkingStep] = useState(0);

  const cognitivePhases = [
    { text: "Deconstructing language intent...", icon: "🧠" },
    { text: "Synthesizing optimal browser path...", icon: "🗺️" },
    { text: "Predicting target DOM selectors...", icon: "🔍" },
    { text: "Validating permissions & safety parameters...", icon: "🛡️" }
  ];

  useEffect(() => {
    if (!isExecuting) return;

    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % cognitivePhases.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isExecuting]);

  if (!isExecuting) return null;

  return (
    <div className="agent-brain-panel">
      <div className="brain-visual">
        <div className="brain-pulsar">
          {cognitivePhases[thinkingStep].icon}
        </div>
      </div>
      <div className="brain-status-text">
        {cognitivePhases[thinkingStep].text}
      </div>
      <div className="brain-loading-rail">
        <div className="brain-loading-bar"></div>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-dark)',
        fontFamily: 'JetBrains Mono, monospace',
        marginTop: '4px'
      }}>
        <span>LLM: llama3.2</span>
        <span>STATUS: ACTIVE THINKING</span>
      </div>
    </div>
  );
}

export default AgentBrain;
