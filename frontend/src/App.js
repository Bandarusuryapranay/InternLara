import React, { useState, useEffect, useRef } from 'react';
import api from './services/api';
import websocket from './services/websocket';
import TaskInput from './components/TaskInput';
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
  const [updatedSteps, setUpdatedSteps] = useState(null);
  const [currentTaskInput, setCurrentTaskInput] = useState('');

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

  const handleWebSocketMessage = (data) => {
    // Live preview update
    if (data.type === 'livePreview' && data.screenshot) {
      setLiveScreenshot(data.screenshot);
      return; // Don't add to activity log
    }

    // Alert/dialog detected
    if (data.type === 'alert') {
      setAlertData(data);
      addLog({ type: 'warning', message: `⚠️ Browser dialog: ${data.alertText}`, timestamp: data.timestamp });
      return;
    }

    // Steps updated with resolved selectors
    if (data.type === 'stepsUpdated' && data.steps) {
      setPendingSteps(data.steps);
      addLog({ type: 'info', message: data.message || '🔍 Selectors resolved against live page', timestamp: data.timestamp });
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
    } catch (error) {
      console.error('Failed to fetch status:', error);
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
          message: `🤖 AI generated ${result.steps.length} steps. Please review and approve.`,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      addLog({
        type: 'error',
        message: '❌ ' + (error.response?.data?.error || 'Failed to analyze task'),
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
          message: '🎉 All steps completed successfully!',
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
        message: '❌ Execution failed: ' + (error.response?.data?.details || error.message),
        timestamp: Date.now()
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReject = () => {
    setPendingSteps(null);
    addLog({ type: 'info', message: '🚫 Task cancelled by user', timestamp: Date.now() });
  };

  const handleErrorDecision = async (decision) => {
    try {
      const result = await api.handleRetryDecision(
        decision,
        errorDialog.step,
        { error: errorDialog.error },
        errorDialog.remainingSteps
      );

      setErrorDialog(null);

      if (result.success) {
        if (result.cancelled) {
          addLog({ type: 'info', message: '🚫 Task cancelled', timestamp: Date.now() });
        } else if (result.skipped) {
          addLog({ type: 'info', message: '⏭️ Step skipped', timestamp: Date.now() });
        } else if (result.suggestion) {
          addLog({
            type: 'info',
            message: `🤖 AI suggests selector: ${result.suggestion.suggestion}`,
            timestamp: Date.now()
          });
        } else {
          addLog({ type: 'success', message: '✅ Action completed', timestamp: Date.now() });
        }
      }
    } catch (error) {
      addLog({
        type: 'error',
        message: '❌ ' + (error.response?.data?.error || 'Action failed'),
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
      addLog({ type: 'info', message: '🛑 Browser stopped', timestamp: Date.now() });
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
            <button className="header-btn danger-btn" onClick={handleStopBrowser}>🛑 Stop</button>
          )}
          <button className="header-btn" onClick={() => setShowHistory(!showHistory)}>🗂️ History</button>
          <button className="header-btn" onClick={() => setShowFiles(!showFiles)}>📁 Files</button>
          <button className="header-btn" onClick={() => setShowSettings(!showSettings)}>⚙️ Settings</button>
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
            <div className="files-panel-header">
              <h3>📁 File Manager</h3>
              <button className="close-btn" onClick={() => setShowFiles(false)}>✕</button>
            </div>
            <FileUploader onFileUploaded={(f) => addLog({
              type: 'info',
              message: `📄 File uploaded: ${f.name}`,
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
      <StatusBar status={status} onRefresh={fetchStatus} />

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
