import React, { useState, useEffect } from 'react';
import api from './services/api';
import websocket from './services/websocket';
import TaskInput from './components/TaskInput';
import AgentBrain from './components/AgentBrain';
import ApprovalPanel from './components/ApprovalPanel';
import ActivityLog from './components/ActivityLog';
import StatusBar from './components/StatusBar';
import ErrorDialog from './components/ErrorDialog';
import SettingsPanel from './components/SettingsPanel';
import LivePreview from './components/LivePreview';
import FileUploader from './components/FileUploader';
import AlertHandler from './components/AlertHandler';
import ScreenshotTimeline from './components/ScreenshotTimeline';
import TaskTemplates from './components/TaskTemplates';
import TaskHistory from './components/TaskHistory';
import './styles/App.css';

function App() {
  const [mode, setMode] = useState('demo');
  const [pendingSteps, setPendingSteps] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [status, setStatus] = useState({ browser: {}, ollama: {} });
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorDialog, setErrorDialog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [liveScreenshot, setLiveScreenshot] = useState(null);
  const [alertData, setAlertData] = useState(null);
  const [taskResults, setTaskResults] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentTaskInput, setCurrentTaskInput] = useState('');
  const [waitingForUser, setWaitingForUser] = useState(false);

  useEffect(() => {
    websocket.connect();
    websocket.addListener(handleWebSocketMessage);
    fetchStatus();

    // Poll status every 30s
    const statusInterval = setInterval(fetchStatus, 30000);

    return () => {
      websocket.removeListener(handleWebSocketMessage);
      clearInterval(statusInterval);
    };
  }, []);

  // Global Keyboard Shortcuts (Escape to close overlays/panels)
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if (e.key === 'Escape') {
        setShowHistory(false);
        setShowFiles(false);
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const handleWebSocketMessage = (data) => {
    // Live preview update
    if (data.type === 'livePreview' && data.screenshot) {
      setLiveScreenshot(data.screenshot);
      // Fetch status immediately to sync URL
      fetchStatus();
      return; // Don't add to activity log
    }

    // Alert/dialog detected
    if (data.type === 'alert') {
      setAlertData(data);
      addLog({ type: 'warning', message: `Browser dialog: ${data.alertText}`, timestamp: data.timestamp });
      return;
    }

    // Steps updated with resolved selectors
    if (data.type === 'stepsUpdated' && data.steps) {
      setPendingSteps(data.steps);
      addLog({ type: 'info', message: data.message || 'Selectors resolved against live page', timestamp: data.timestamp });
      return;
    }

    // 2FA / Manual action required
    if (data.type === 'userActionRequired') {
      setWaitingForUser(true);
      addLog({ type: 'warning', message: data.message || 'Manual action required in browser', timestamp: data.timestamp });
      return;
    }

    // User action resolved
    if (data.type === 'userActionResolved') {
      setWaitingForUser(false);
      addLog({ type: 'success', message: data.message || 'Continuing execution', timestamp: data.timestamp });
      return;
    }

    // Step progress tracking
    if (data.type === 'step') {
      setCurrentStep(data.stepNumber || 0);
      setTotalSteps(data.totalSteps || 0);
    }

    // stepComplete — don't double-log
    if (data.type === 'stepComplete' && data.screenshot) {
      setLiveScreenshot(data.screenshot);
      fetchStatus();
    }

    // Add to activity log
    addLog({ ...data, id: Date.now() + Math.random() });
  };

  const addLog = (entry) => {
    setActivityLog(prev => [...prev, { ...entry, id: entry.id || Date.now() + Math.random() }]);
    // Auto-scroll
    setTimeout(() => {
      const logContainer = document.querySelector('.activity-log');
      if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    }, 100);
  };

  const fetchStatus = async () => {
    try {
      const statusData = await api.getStatus();
      setStatus(statusData);
      if (statusData.browser?.waitingForUser !== undefined) {
        setWaitingForUser(statusData.browser.waitingForUser);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const handleContinue = async () => {
    try {
      setWaitingForUser(false);
      await api.continueAfterUserAction();
      addLog({ type: 'info', message: 'Continuing execution...', timestamp: Date.now() });
    } catch (err) {
      console.error('Continue failed:', err);
    }
  };

  const handleTaskSubmit = async (task) => {
    setActivityLog([]);
    setIsExecuting(true);
    setPendingSteps(null);
    setTaskResults(null);
    setLiveScreenshot(null);
    setCurrentStep(0);
    setTotalSteps(0);
    setCurrentTaskInput(task);

    try {
      const result = await api.executeTask(task, mode);

      if (result.requiresApproval) {
        setPendingSteps(result.steps);
        setTotalSteps(result.steps.length);
        addLog({
          type: 'info',
          message: `AI generated ${result.steps.length} steps. Please review and approve.`,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      addLog({
        type: 'error',
        message: ' ' + (error.response?.data?.error || 'Failed to analyze task'),
        timestamp: Date.now()
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApprove = async (steps) => {
    setIsExecuting(true);
    setPendingSteps(null);

    try {
      const result = await api.approveSteps(steps, mode, currentTaskInput);

      if (result.success) {
        setTaskResults(result.results);
        addLog({
          type: 'success',
          message: 'All steps completed successfully!',
          timestamp: Date.now()
        });
      } else if (result.errorStep !== undefined) {
        setErrorDialog({
          errorStep: result.errorStep,
          step: result.remainingSteps?.[0] || steps[result.errorStep],
          options: result.options,
          error: result.partialResults?.[result.partialResults.length - 1]?.error,
          context: result,
          remainingSteps: result.remainingSteps
        });
        setTaskResults(result.partialResults);
      }
    } catch (error) {
      addLog({
        type: 'error',
        message: 'Execution failed: ' + (error.response?.data?.details || error.message),
        timestamp: Date.now()
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReject = () => {
    setPendingSteps(null);
    addLog({ type: 'info', message: 'Task cancelled by user', timestamp: Date.now() });
  };

  const handleErrorDecision = async (decision) => {
    try {
      const result = await api.handleRetryDecision(
        decision,
        errorDialog.step,
        { error: errorDialog.error, mode, taskInput: currentTaskInput },
        errorDialog.remainingSteps
      );

      setErrorDialog(null);

      if (result.success) {
        if (result.cancelled) {
          addLog({ type: 'info', message: 'Task cancelled', timestamp: Date.now() });
          setIsExecuting(false);
          setTaskResults(errorDialog.context?.partialResults || []);
        } else if (result.results) {
          // Continued execution completed all remaining steps
          setTaskResults(result.results);
          setIsExecuting(false);
          addLog({
            type: 'success',
            message: 'All remaining steps completed successfully!',
            timestamp: Date.now()
          });
        } else if (result.suggestion) {
          addLog({
            type: 'info',
            message: `AI suggests selector: ${result.suggestion.suggestion}`,
            timestamp: Date.now()
          });
        } else {
          addLog({ type: 'success', message: 'Action completed', timestamp: Date.now() });
        }
      } else if (result.errorStep !== undefined) {
        // Another error during continued execution — show dialog again
        setErrorDialog({
          errorStep: result.errorStep,
          step: result.remainingSteps?.[0],
          options: result.options,
          error: result.partialResults?.[result.partialResults.length - 1]?.error,
          context: result,
          remainingSteps: result.remainingSteps
        });
        setTaskResults(prev => [...(prev || []), ...(result.partialResults || [])]);
      }
    } catch (error) {
      addLog({
        type: 'error',
        message: ' ' + (error.response?.data?.error || 'Action failed'),
        timestamp: Date.now()
      });
    }
  };

  const clearLog = () => setActivityLog([]);

  const handleStopBrowser = async () => {
    try {
      await api.stopBrowser();
      setLiveScreenshot(null);
      setIsExecuting(false);
      addLog({ type: 'info', message: 'Browser stopped', timestamp: Date.now() });
    } catch (err) {
      console.error('Stop browser failed:', err);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <span className="header-logo-icon">🤖</span>
            <div>
              <h1 className="header-title">AI Browser Agent</h1>
              <p className="header-subtitle">Natural language browser automation</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          {isExecuting && (
            <button className="header-btn danger-btn" onClick={handleStopBrowser}>
              <span className="live-dot" style={{width: '6px', height: '6px', background: '#ff8a8a', boxShadow: '0 0 6px #ff8a8a', animation: 'none'}}></span>
              Stop
            </button>
          )}
          <button className="header-btn" onClick={() => setShowHistory(!showHistory)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            History
          </button>
          <button className="header-btn" onClick={() => setShowFiles(!showFiles)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Files
          </button>
          <button className="header-btn" onClick={() => setShowSettings(!showSettings)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </button>
        </div>
      </header>

      {/* Modals */}
      {showHistory && (
        <TaskHistory
          onReplayTask={(prompt) => handleTaskSubmit(prompt)}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showSettings && (
        <SettingsPanel mode={mode} onModeChange={setMode} onClose={() => setShowSettings(false)} />
      )}
      {showFiles && (
        <div className="files-panel-overlay" onClick={() => setShowFiles(false)}>
          <div className="files-panel-modal" onClick={e => e.stopPropagation()}>
            <div className="files-panel-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h3 style={{fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600}}>File Manager</h3>
              <button className="close-btn" onClick={() => setShowFiles(false)}>✕</button>
            </div>
            <FileUploader onFileUploaded={(f) => addLog({
              type: 'info',
              message: `File uploaded: ${f.name}`,
              timestamp: Date.now()
            })} />
          </div>
        </div>
      )}
      {alertData && (
        <AlertHandler
          alertData={alertData}
          onDismiss={() => setAlertData(null)}
        />
      )}

      {/* Status Bar */}
      <StatusBar status={status} onRefresh={fetchStatus} onContinue={handleContinue} isWaitingForUser={waitingForUser} visionAvailable={status.ollama?.visionAvailable} />

      {/* Two-column Main Layout */}
      <div className="app-layout">
        {/* LEFT COLUMN */}
        <div className="app-left">
          <div className="left-panel">
            <TaskInput
              onSubmit={handleTaskSubmit}
              isExecuting={isExecuting}
              mode={mode}
            />

            {/* AI thinking visualizer */}
            <AgentBrain isExecuting={isExecuting && !pendingSteps} />

            <div className="templates-toggle">
              <button
                className={`templates-toggle-btn ${showTemplates ? 'active' : ''}`}
                onClick={() => setShowTemplates(!showTemplates)}
              >
                {showTemplates ? '▲ Hide Templates' : '⚡ Show Task Templates'}
              </button>
            </div>

            {showTemplates && (
              <TaskTemplates
                onSelectTemplate={handleTaskSubmit}
                isExecuting={isExecuting}
              />
            )}

            {pendingSteps && (
              <ApprovalPanel
                steps={pendingSteps}
                mode={mode}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}

            {errorDialog && (
              <ErrorDialog
                error={errorDialog}
                onDecision={handleErrorDecision}
                onClose={() => setErrorDialog(null)}
              />
            )}

            <ActivityLog
              logs={activityLog}
              onClear={clearLog}
              isExecuting={isExecuting}
            />

            {taskResults && taskResults.length > 0 && (
              <ScreenshotTimeline results={taskResults} />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="app-right">
          <LivePreview
            screenshot={liveScreenshot}
            isExecuting={isExecuting}
            currentStep={currentStep}
            totalSteps={totalSteps}
            url={status?.browser?.currentUrl}
          />
        </div>
      </div>

      <footer className="app-footer">
        <p>🤖 Powered by Ollama (local LLM) + Puppeteer | AP Govt Internship 2026</p>
      </footer>
    </div>
  );
}

export default App;
