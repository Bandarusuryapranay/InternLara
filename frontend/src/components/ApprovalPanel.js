import React, { useState } from 'react';

function ApprovalPanel({ steps, mode, onApprove, onReject }) {
  const [selectedSteps, setSelectedSteps] = useState(steps);
  const [editingStep, setEditingStep] = useState(null);

  const handleToggleStep = (index) => {
    const newSteps = [...selectedSteps];
    newSteps[index] = { 
      ...newSteps[index], 
      disabled: !newSteps[index].disabled 
    };
    setSelectedSteps(newSteps);
  };

  const handleEditStep = (index, field, value) => {
    const newSteps = [...selectedSteps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: value
    };
    setSelectedSteps(newSteps);
  };

  const handleApprove = () => {
    const approvedSteps = selectedSteps.filter(step => !step.disabled);
    onApprove(approvedSteps);
  };

  // Helper to compute confidence of CSS selectors
  const calculateConfidence = (step) => {
    if (step.confidence) return step.confidence;
    if (!step.selector) return 'high'; // simple actions like navigate/screenshot/scroll
    
    const selector = step.selector;
    if (selector.startsWith('#') || selector.includes('[id=')) {
      return 'high'; // ID selectors are extremely reliable
    }
    if (selector.includes('.') || selector.includes('[class=')) {
      return 'medium'; // Class selectors are moderately reliable
    }
    if (step.selectorResolved) {
      return 'medium'; // Resolved against live DOM
    }
    return 'low'; // Tag selectors or fuzzy guesses
  };

  const getActionSvg = (action) => {
    const defaultColor = "currentColor";
    const svgs = {
      navigate: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      ),
      click: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6"></path>
          <path d="M9 21H3v-6"></path>
          <path d="M21 3l-7 7M3 21l7-7"></path>
        </svg>
      ),
      type: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
          <line x1="6" y1="8" x2="6" y2="8"></line>
          <line x1="10" y1="8" x2="18" y2="8"></line>
          <line x1="6" y1="12" x2="14" y2="12"></line>
          <line x1="18" y1="12" x2="18" y2="12"></line>
          <line x1="6" y1="16" x2="10" y2="16"></line>
          <line x1="14" y1="16" x2="18" y2="16"></line>
        </svg>
      ),
      scrape: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      wait: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      screenshot: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      ),
      scroll: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 11 12 6 7 11"></polyline>
          <polyline points="17 18 12 13 7 18"></polyline>
        </svg>
      ),
      upload: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
      ),
      download: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      )
    };
    return svgs[action] || (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={defaultColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    );
  };

  return (
    <div className="approval-panel">
      <div className="approval-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          {mode === 'demo' ? 'Review & Approve Plan' : 'Review Strict Operations'}
        </h2>
        <p>
          {mode === 'demo' 
            ? 'Our AI engine drafted this automated workflow. Customize steps below and approve execution.'
            : 'Review generated steps. Each step will await individual runtime confirmation.'}
        </p>
      </div>

      <div className="steps-list">
        {selectedSteps.map((step, index) => {
          const confidence = calculateConfidence(step);
          return (
            <div 
              key={index} 
              className={`step-item ${step.disabled ? 'disabled' : ''}`}
              style={{animationDelay: `${index * 50}ms`}}
            >
              <div className="step-checkbox">
                <input
                  type="checkbox"
                  checked={!step.disabled}
                  onChange={() => handleToggleStep(index)}
                />
              </div>
              <div className="step-content">
                <div className="step-header">
                  <span className="step-icon" style={{
                    color: step.disabled ? 'var(--text-dark)' : 'var(--accent-secondary)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {getActionSvg(step.action)}
                  </span>
                  <span className="step-number">Step {index + 1}</span>
                  <span className="step-action">{step.action}</span>
                  
                  {/* Selector Confidence Badge */}
                  {!step.disabled && (
                    <span className={`confidence-badge ${confidence}`}>
                      {confidence} reliability
                    </span>
                  )}

                  <button
                    className="edit-btn"
                    onClick={() => setEditingStep(editingStep === index ? null : index)}
                    style={{color: step.disabled ? 'var(--text-dark)' : 'var(--accent-secondary)'}}
                  >
                    {editingStep === index ? 'Done' : 'Edit'}
                  </button>
                </div>
                
                <div className="step-description">{step.description}</div>
                
                {editingStep === index ? (
                  <div className="step-edit">
                    {step.target !== undefined && (
                      <input
                        type="text"
                        value={step.target || ''}
                        onChange={(e) => handleEditStep(index, 'target', e.target.value)}
                        placeholder="Target URL (e.g. https://example.com)"
                      />
                    )}
                    {step.selector !== undefined && (
                      <input
                        type="text"
                        value={step.selector || ''}
                        onChange={(e) => handleEditStep(index, 'selector', e.target.value)}
                        placeholder="CSS Selector (e.g. button[type=submit])"
                      />
                    )}
                    {step.value !== undefined && (
                      <input
                        type="text"
                        value={step.value || ''}
                        onChange={(e) => handleEditStep(index, 'value', e.target.value)}
                        placeholder="Parameters / Typable Value"
                      />
                    )}
                  </div>
                ) : (
                  <div className="step-details">
                    {step.target && <code>Target: {step.target}</code>}
                    {step.selector && <code>Selector: {step.selector}</code>}
                    {step.value && <code>Value: {step.value}</code>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="approval-actions">
        <button 
          className="btn-reject" 
          onClick={onReject}
        >
          Cancel Task
        </button>
        <button 
          className="btn-approve" 
          onClick={handleApprove}
          disabled={selectedSteps.every(step => step.disabled)}
        >
          {mode === 'demo' ? 'Approve & Run Workflow' : 'Initiate Execution'} 
          {` (${selectedSteps.filter(s => !s.disabled).length} steps)`}
        </button>
      </div>

      <div className="approval-note">
        <p>
          💡 Tip: Stressed selectors can be updated directly by selecting 'Edit' before running.
        </p>
      </div>
    </div>
  );
}

export default ApprovalPanel;
