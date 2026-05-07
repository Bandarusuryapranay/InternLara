import React, { useState, useRef } from 'react';

function TaskInput({ onSubmit, isExecuting, mode }) {
  const [task, setTask] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (task.trim() && !isExecuting) {
      onSubmit(task.trim());
    }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser. Use Chrome.'); return; }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setTask(prev => prev ? prev + ' ' + transcript : transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="task-input">
      <div className="task-input-header">
        <h3 className="task-input-title">💬 What do you want me to do?</h3>
        <span className="mode-badge">{mode === 'demo' ? '🎯 Demo' : '🔒 Strict'}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <div className="textarea-wrapper">
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Tell me what to do... e.g. 'Go to Google, search for React hooks, click the first result, and take a screenshot'"
              rows="3"
              disabled={isExecuting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
              }}
            />
          </div>
          <div className="input-actions">
            <button
              type="button"
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoice}
              disabled={isExecuting}
              title={isListening ? 'Stop listening' : 'Voice input (Chrome only)'}
            >
              {isListening ? '🔴 Listening...' : '🎙️ Voice'}
            </button>
            <button
              type="button"
              className="clear-input-btn"
              onClick={() => setTask('')}
              disabled={isExecuting || !task}
            >
              ✕ Clear
            </button>
            <button
              type="submit"
              disabled={!task.trim() || isExecuting}
              className="submit-btn"
            >
              {isExecuting ? '⏳ Processing...' : '🚀 Execute'}
            </button>
          </div>
          <p className="input-hint">Tip: Press Ctrl+Enter to submit quickly</p>
        </div>
      </form>
    </div>
  );
}

export default TaskInput;
