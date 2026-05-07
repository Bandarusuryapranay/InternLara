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

  const getActionIcon = (action) => {
    const icons = {
      navigate: '🌐',
      click: '👆',
      type: '⌨️',
      scrape: '📊',
      wait: '⏱️',
      screenshot: '📸',
      scroll: '↕️',
      upload: '📤',
      download: '📥'
    };
    return icons[action] || '🔧';
  };

  return (
    <div className="approval-panel">
      <div className="approval-header">
        <h2>
          {mode === 'demo' ? '⚠️ Review Task Plan' : '🔒 Approve Each Step'}
        </h2>
        <p>
          {mode === 'demo' 
            ? 'Review all steps and approve once to execute automatically'
            : 'You will approve each step individually before execution'}
        </p>
      </div>

      <div className="steps-list">
        {selectedSteps.map((step, index) => (
          <div 
            key={index} 
            className={`step-item ${step.disabled ? 'disabled' : ''}`}
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
                <span className="step-icon">{getActionIcon(step.action)}</span>
                <span className="step-number">Step {index + 1}</span>
                <span className="step-action">{step.action.toUpperCase()}</span>
                <button
                  className="edit-btn"
                  onClick={() => setEditingStep(editingStep === index ? null : index)}
                >
                  {editingStep === index ? '✅ Done' : '✏️ Edit'}
                </button>
              </div>
              <div className="step-description">{step.description}</div>
              
              {editingStep === index ? (
                <div className="step-edit">
                  {step.target && (
                    <input
                      type="text"
                      value={step.target}
                      onChange={(e) => handleEditStep(index, 'target', e.target.value)}
                      placeholder="Target URL"
                    />
                  )}
                  {step.selector && (
                    <input
                      type="text"
                      value={step.selector}
                      onChange={(e) => handleEditStep(index, 'selector', e.target.value)}
                      placeholder="CSS Selector"
                    />
                  )}
                  {step.value !== undefined && (
                    <input
                      type="text"
                      value={step.value}
                      onChange={(e) => handleEditStep(index, 'value', e.target.value)}
                      placeholder="Value"
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
        ))}
      </div>

      <div className="approval-actions">
        <button 
          className="btn-reject" 
          onClick={onReject}
        >
          ❌ Cancel Task
        </button>
        <button 
          className="btn-approve" 
          onClick={handleApprove}
          disabled={selectedSteps.every(step => step.disabled)}
        >
          ✅ {mode === 'demo' ? 'Approve & Execute All' : 'Start Execution'} 
          ({selectedSteps.filter(s => !s.disabled).length} steps)
        </button>
      </div>

      <div className="approval-note">
        <p>
          💡 <strong>Tip:</strong> Uncheck steps you don't want to execute, or click Edit to modify them
        </p>
      </div>
    </div>
  );
}

export default ApprovalPanel;
