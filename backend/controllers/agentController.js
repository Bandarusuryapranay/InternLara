const ollamaService = require('../services/ollamaService');
const browserService = require('../services/browserService');
const historyService = require('../services/historyService');
const broadcaster = require('../services/broadcaster');
const Logger = require('../utils/logger');
const { retryWithBackoff } = require('../utils/retry');

class AgentController {

  /**
   * Execute a task — parse intent → return steps for approval
   */
  async executeTask(req, res) {
    const { task, mode = 'demo' } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    try {
      Logger.info('Executing task:', task, 'Mode:', mode);

      this.broadcast('status', { message: '🧠 Analyzing your request with AI...' });

      // Check Ollama health and fall back to regex parser if unavailable
      const ollamaAvailable = await ollamaService.isAvailable();
      let steps;

      if (ollamaAvailable) {
        steps = await ollamaService.parseIntent(task);
      } else {
        Logger.warn('Ollama unavailable — using regex fallback parser');
        this.broadcast('status', { message: '⚠️ Ollama unavailable, using basic pattern matching...' });
        steps = ollamaService.fallbackParseIntent(task);
      }

      if (!steps || steps.length === 0) {
        return res.status(400).json({
          error: 'Could not understand the task',
          suggestion: 'Try being more specific about what you want to do'
        });
      }

      const stepsWithIds = steps.map((step, i) => ({
        ...step,
        id: `step_${Date.now()}_${i}`,
        status: 'pending'
      }));

      Logger.success(`Generated ${stepsWithIds.length} steps`);

      this.broadcast('stepsGenerated', {
        count: stepsWithIds.length,
        message: `AI generated ${stepsWithIds.length} steps for your task`
      });

      return res.json({
        requiresApproval: true,
        mode: mode,
        steps: stepsWithIds,
        message: mode === 'demo'
          ? 'Please review and approve the plan'
          : 'Please approve each step individually'
      });

    } catch (error) {
      Logger.error('Task execution error:', error);
      this.broadcast('error', { message: error.message });
      res.status(500).json({
        error: 'Failed to analyze task',
        details: error.message
      });
    }
  }

  /**
   * Approve and execute all steps (Demo mode)
   */
  async approveAndExecute(req, res) {
    const { steps, mode = 'demo' } = req.body;

    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Steps array is required' });
    }

    try {
      Logger.info(`Executing ${steps.length} steps in ${mode} mode`);

      const taskStartInput = req.body.userInput || steps[0]?.description || 'Unknown task';

      await this._executeSteps({
        steps: [...steps],
        startIndex: 0,
        results: [],
        res,
        mode,
        taskInput: taskStartInput
      });

    } catch (error) {
      Logger.error('Execution failed:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Execution failed',
          details: error.message
        });
      }
    }
  }

  /**
   * Shared step execution loop — used by approveAndExecute AND handleRetryDecision
   */
  async _executeSteps({ steps, startIndex, results, res, mode, taskInput }) {
    const remainingSteps = [...steps];
    const taskId = `task_${Date.now()}`;

    for (let i = startIndex; i < remainingSteps.length; i++) {
      const step = remainingSteps[i];

      this.broadcast('step', {
        stepNumber: i + 1,
        totalSteps: remainingSteps.length,
        step: step,
        message: `▶ Step ${i + 1}/${remainingSteps.length}: ${step.description}`
      });

      try {
        const result = await this.executeSmartStep(step);

        // After navigate, resolve selectors for upcoming steps
        if (step.action === 'navigate' && result.pageContext) {
          const upcomingSteps = remainingSteps.slice(i + 1);
          if (upcomingSteps.length > 0) {
            this.broadcast('status', {
              message: `🔍 Analyzing page elements to resolve selectors...`
            });

            const resolvedUpcoming = await ollamaService.resolveSelectorsForPage(
              upcomingSteps,
              result.pageContext
            );

            for (let j = 0; j < resolvedUpcoming.length; j++) {
              remainingSteps[i + 1 + j] = resolvedUpcoming[j];
            }

            this.broadcast('stepsUpdated', {
              steps: remainingSteps,
              message: `✅ Selectors resolved against live page`
            });
          }
        }

        results.push({
          step: remainingSteps[i],
          result: result,
          success: true,
          screenshot: result.screenshot || null
        });

        this.broadcast('stepComplete', {
          stepNumber: i + 1,
          totalSteps: remainingSteps.length,
          message: `✅ Step ${i + 1} completed: ${step.description}`,
          screenshot: result.screenshot || null
        });

        Logger.success(`Step ${i + 1} completed`);

        await this.sleep(400);

      } catch (error) {
        Logger.error(`Step ${i + 1} failed:`, error.message);

        const pageContext = await browserService.getPageContext().catch(() => null);
        if (pageContext) {
          const suggestion = await ollamaService.generateRetryStrategy(error, step, pageContext);
          if (suggestion && suggestion.suggestion) {
            Logger.info('AI suggests alternative selector:', suggestion.suggestion);
            try {
              const altStep = { ...step, selector: suggestion.suggestion };
              const altResult = await this.executeSmartStep(altStep);
              results.push({
                step: altStep,
                result: altResult,
                success: true,
                usedAiFallback: true
              });
              this.broadcast('stepComplete', {
                stepNumber: i + 1,
                totalSteps: remainingSteps.length,
                message: `✅ Step ${i + 1} completed (AI alternative)`,
                screenshot: altResult.screenshot
              });
              continue;
            } catch (altError) {
              Logger.error('AI alternative also failed:', altError.message);
            }
          }
        }

        results.push({
          step: step,
          error: error.message,
          success: false,
          needsUserDecision: true
        });

        this.broadcast('error', {
          step: step,
          error: error.message,
          stepNumber: i + 1,
          message: `❌ Step ${i + 1} failed: ${error.message}`
        });

        return res.json({
          success: false,
          partialResults: results,
          errorStep: i,
          remainingSteps: remainingSteps.slice(i),
          message: 'Step failed after retries. What would you like to do?',
          options: ['retry', 'skip', 'cancel', 'ai_alternative']
        });
      }
    }

    // All steps completed
    historyService.saveTask({
      id: taskId,
      userInput: taskInput,
      mode: mode || 'demo',
      steps: remainingSteps,
      results
    });

    this.broadcast('success', {
      message: '🎉 All steps completed successfully!',
      totalSteps: remainingSteps.length
    });

    res.json({
      success: true,
      taskId,
      results
    });
  }

  /**
   * Execute a single step — tries DOM-based retry first, then vision fallback
   */
  async executeSmartStep(step) {
    try {
      return await retryWithBackoff(async () => {
        return await this.executeStep(step);
      });
    } catch (domError) {
      // Try vision-based fallback
      if (step.action === 'click' || step.action === 'type') {
        Logger.info('DOM execution failed, trying vision-based approach');
        this.broadcast('status', {
          message: `👁️ Analyzing page with AI vision to find "${step.description || step.action}"...`
        });

        const visionResult = await ollamaService.analyzeScreenshotWithVision(
          browserService.getLastScreenshot(),
          step.description || step.action
        );

        if (visionResult && visionResult.found && visionResult.coordinates) {
          const { x, y } = visionResult.coordinates;
          Logger.info(`Vision found element at (${x}, ${y}): ${visionResult.reasoning}`);

          this.broadcast('status', {
            message: `👁️ Vision-guided ${step.action} at (${Math.round(x)}, ${Math.round(y)})`
          });

          if (step.action === 'click') {
            return await browserService.clickAtCoordinates(x, y);
          } else if (step.action === 'type') {
            return await browserService.typeAtCoordinates(x, y, step.value);
          }
        }
      }

      // Re-throw original error if vision couldn't help
      throw domError;
    }
  }

  /**
   * Execute a single step based on action type
   */
  async executeStep(step) {
    const { action, selector, target, value, description } = step;

    switch (action) {
      case 'navigate':
        return await browserService.navigate(target);

      case 'click':
        // Pass description as fallback for smart search
        return await browserService.click(selector, description);

      case 'type':
        // Pass description as fallback for smart input search
        return await browserService.type(selector, value, description);

      case 'scrape':
        return await browserService.scrape(selector);

      case 'screenshot':
        return await browserService.screenshot();

      case 'wait':
        return await browserService.waitForElement(selector);

      case 'scroll':
        return await browserService.scroll(value || 'down');

      case 'upload':
        return await browserService.uploadFile(selector, value);

      case 'get_emails':
        return await browserService.getEmails();

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Handle retry decision from user — retry/skip will CONTINUE remaining steps
   */
  async handleRetryDecision(req, res) {
    const { decision, step, context, remainingSteps } = req.body;

    try {
      switch (decision) {
        case 'retry': {
          Logger.info('User chose to retry step');
          const result = await this.executeSmartStep(step);

          const accumulatedResults = [{
            step,
            result,
            success: true
          }];

          return await this._executeSteps({
            steps: remainingSteps.slice(1),
            startIndex: 1,
            results: accumulatedResults,
            res,
            mode: context?.mode || 'demo',
            taskInput: context?.taskInput || step.description
          });
        }

        case 'skip': {
          Logger.info('User chose to skip step');

          return await this._executeSteps({
            steps: remainingSteps.slice(1),
            startIndex: 1,
            results: [],
            res,
            mode: context?.mode || 'demo',
            taskInput: context?.taskInput || 'Skipped step task'
          });
        }

        case 'cancel': {
          Logger.info('User cancelled task');
          this.broadcast('cancelled', { message: 'Task cancelled by user' });
          return res.json({ success: true, cancelled: true });
        }

        case 'ai_alternative': {
          const pageContext = await browserService.getPageContext();
          const suggestion = await ollamaService.generateRetryStrategy(
            new Error(context?.error || 'Unknown error'),
            step,
            pageContext
          );
          return res.json({ success: true, suggestion });
        }

        default:
          return res.status(400).json({ error: 'Invalid decision' });
      }
    } catch (error) {
      Logger.error('Retry decision failed:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * Handle alert/popup from user decision
   */
  async handlePopup(req, res) {
    const { action, value } = req.body;

    try {
      const screenshot = await browserService.screenshot();
      await browserService.handleAlert(action, value);

      res.json({
        success: true,
        screenshot: screenshot.screenshot
      });
    } catch (error) {
      Logger.error('Popup handling failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get current status
   */
  async getStatus(req, res) {
    try {
      const browserStatus = browserService.getStatus();
      const ollamaStatus = await ollamaService.checkHealth();

      res.json({
        browser: browserStatus,
        ollama: ollamaStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      Logger.error('Status check failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get page info
   */
  async getPageInfo(req, res) {
    try {
      const info = await browserService.getPageInfo();
      res.json(info);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get last screenshot (for live preview polling fallback)
   */
  async takeScreenshot(req, res) {
    try {
      const result = await browserService.screenshot();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Stop browser
   */
  async stopBrowser(req, res) {
    try {
      await browserService.close();
      res.json({ success: true, message: 'Browser stopped' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Resume execution after manual user action (e.g. 2FA)
   */
  async continueAfterUserAction(req, res) {
    try {
      browserService.resolveUserAction();
      res.json({ success: true, message: 'Continuing execution' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Broadcast helper
   */
  broadcast(type, data) {
    broadcaster.broadcast(type, data);
  }
}

module.exports = new AgentController();
