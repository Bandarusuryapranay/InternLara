import React, { useState, useRef, useEffect } from 'react';

function TaskInput({ onSubmit, isExecuting, mode }) {
  const [task, setTask] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  const placeholders = [
    "Go to Wikipedia, search for 'Artificial Intelligence', scroll down, and take a screenshot",
    "Open GitHub, search for trending React repositories, and list the top 5 names",
    "Go to google.com, search for 'modern web design styles', and click the first link",
    "Navigate to a contact page, fill in the form with John Doe, and take a full-page screenshot"
  ];

  // Cycling placeholder text effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prevIndex) => (prevIndex + 1) % placeholders.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K to focus input)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (task.trim() && !isExecuting) {
      onSubmit(task.trim());
    }
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }

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
        <h3 className="task-input-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--accent-secondary)'}}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Command Center
        </h3>
        <span className="mode-badge">{mode === 'demo' ? '🎯 Demo Mode' : '🔒 Strict Mode'}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <div className="textarea-wrapper">
            <textarea
              ref={textareaRef}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={placeholders[placeholderIndex]}
              rows="3"
              maxLength="500"
              disabled={isExecuting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSubmit(e);
                }
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '16px',
              fontSize: '0.75rem',
              color: 'var(--text-dark)',
              pointerEvents: 'none'
            }}>
              {task.length}/500
            </div>
          </div>
          <div className="input-actions">
            <button
              type="button"
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoice}
              disabled={isExecuting}
              title={isListening ? 'Stop listening' : 'Voice input (Chrome only)'}
            >
              {isListening ? (
                <>
                  <span className="live-dot" style={{width: '6px', height: '6px', background: '#fca5a5', boxShadow: '0 0 6px #fca5a5', animation: 'none'}}></span>
                  Listening...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                  Voice
                </>
              )}
            </button>
            <button
              type="button"
              className="clear-input-btn"
              onClick={() => setTask('')}
              disabled={isExecuting || !task}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={!task.trim() || isExecuting}
              className="submit-btn"
            >
              {isExecuting ? (
                <>
                  <span className="preview-spinner" style={{width: '12px', height: '12px', borderWidth: '2px', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spinning 1s linear infinite'}}></span>
                  Planning...
                </>
              ) : (
                <>
                  Execute
                  <kbd style={{
                    fontSize: '0.7rem',
                    background: 'rgba(255,255,255,0.2)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginLeft: '6px',
                    fontFamily: 'inherit',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>⌘↵</kbd>
                </>
              )}
            </button>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '10px'}}>
            <p className="input-hint">Tip: Press <kbd style={{background: 'rgba(255,255,255,0.05)', padding: '1px 4px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px'}}>Ctrl + Enter</kbd> to execute instantly</p>
            <p className="input-hint" style={{color: 'var(--text-dark)'}}>Focus: <kbd style={{background: 'rgba(255,255,255,0.05)', padding: '1px 4px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px'}}>Ctrl + K</kbd></p>
          </div>
        </div>
      </form>
    </div>
  );
}

export default TaskInput;
