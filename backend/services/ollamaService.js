const axios = require('axios');
const config = require('../config/config');
const Logger = require('../utils/logger');
const { buildPageOutline } = require('../utils/elementFinder');

class OllamaService {
  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
  }

  /**
   * Parse user intent into actionable steps.
   * Returns steps with best-guess selectors (will be resolved against live DOM later).
   */
  async parseIntent(userInput) {
    Logger.info('Parsing user intent:', userInput);

    const prompt = `You are an AI browser automation assistant. Break down the following user request into specific, actionable steps for browser automation.

User request: "${userInput}"

Available actions:
- navigate: Go to a URL (use "target" field for the URL)
- click: Click an element (use "selector" field, AND "description" for what to click)
- type: Type text into an input (use "selector" AND "description" AND "value")
- scrape: Extract text from page (use "selector" if specific element, leave blank for full page)
- screenshot: Take a screenshot (no extra fields needed)
- wait: Wait for an element to appear (use "selector" AND "description")
- scroll: Scroll the page (use "value": "up" or "down")
- upload: Upload a file (use "selector" for file input, "value" for file path)

IMPORTANT: For every "click", "type", and "wait" step, always include BOTH:
1. "selector": your best guess CSS selector
2. "description": plain English description of what element to target (e.g. "search input box", "submit button", "login link")

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "action": "navigate",
    "target": "https://example.com",
    "description": "Open the website"
  },
  {
    "action": "type",
    "selector": "input[name='q']",
    "description": "search input box",
    "value": "search term",
    "description": "Type search query into the search box"
  },
  {
    "action": "click",
    "selector": "button[type='submit']",
    "description": "search submit button",
    "description": "Click the search button"
  }
]

Important:
- Always add a "description" field describing the element in plain English
- Use the most specific selectors you can
- Keep steps atomic (one action per step)
- Return ONLY the JSON array, nothing else`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.2
        }
      });

      const generatedText = response.data.response;
      Logger.debug('Ollama raw response:', generatedText);

      const steps = this.extractJSON(generatedText);

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        throw new Error('Failed to parse valid steps from LLM response');
      }

      // Normalize: ensure every step has a description
      const normalized = steps.map((s, i) => ({
        ...s,
        description: s.description || `Step ${i + 1}: ${s.action}`,
        selector: s.selector || null
      }));

      Logger.success(`Parsed ${normalized.length} steps from user intent`);
      return normalized;

    } catch (error) {
      Logger.error('Failed to parse intent:', error.message);
      throw new Error('Could not understand the task. Please be more specific.');
    }
  }

  /**
   * After navigating to a page, resolve/correct the selectors for upcoming steps
   * by showing Ollama the ACTUAL page DOM elements.
   */
  async resolveSelectorsForPage(upcomingSteps, pageContext) {
    if (!pageContext || !pageContext.elements || pageContext.elements.length === 0) {
      Logger.warn('resolveSelectorsForPage: no page context available');
      return upcomingSteps;
    }

    const pageOutline = buildPageOutline(pageContext);
    const stepsNeedingSelectors = upcomingSteps.filter(s =>
      ['click', 'type', 'wait', 'upload'].includes(s.action)
    );

    if (stepsNeedingSelectors.length === 0) return upcomingSteps;

    Logger.info(`Resolving selectors for ${stepsNeedingSelectors.length} steps against live DOM...`);

    const prompt = `You are helping resolve CSS selectors for browser automation steps against the actual DOM of a live page.

${pageOutline}

For each of these automation steps, provide the BEST CSS selector from the elements listed above.
Use the exact "selector" value from the elements list above, choosing the element that best matches the step description.

Steps to resolve:
${JSON.stringify(stepsNeedingSelectors.map(s => ({ action: s.action, description: s.description, currentSelector: s.selector, value: s.value })), null, 2)}

Return ONLY a valid JSON array of resolved steps (no markdown):
[
  {
    "action": "...",
    "description": "...",
    "selector": "EXACT selector from elements list above",
    "value": "..."
  }
]

IMPORTANT: Only use selectors that actually exist in the elements list above.`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1
        }
      });

      const resolved = this.extractJSON(response.data.response);

      if (!resolved || !Array.isArray(resolved)) {
        Logger.warn('Could not resolve selectors — using original');
        return upcomingSteps;
      }

      // Merge resolved selectors back into upcomingSteps
      let resolvedIdx = 0;
      const result = upcomingSteps.map(step => {
        if (['click', 'type', 'wait', 'upload'].includes(step.action)) {
          const resolvedStep = resolved[resolvedIdx++];
          if (resolvedStep && resolvedStep.selector) {
            Logger.info(`Selector resolved: "${step.selector}" → "${resolvedStep.selector}" for "${step.description}"`);
            return { ...step, selector: resolvedStep.selector, selectorResolved: true };
          }
        }
        return step;
      });

      return result;

    } catch (error) {
      Logger.error('resolveSelectorsForPage failed:', error.message);
      return upcomingSteps;
    }
  }

  /**
   * Analyze page content and suggest next action
   */
  async analyzePageContent(pageText, goal, currentUrl) {
    Logger.info('Analyzing page content for goal:', goal);

    const prompt = `You are analyzing a webpage to help accomplish this goal: "${goal}"

Current URL: ${currentUrl}
Page content (first 2000 chars):
${pageText.substring(0, 2000)}

Based on the page content, what should be the next action to accomplish the goal?

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "action": "click|type|scrape|navigate|screenshot|done",
  "selector": "CSS selector if needed",
  "value": "value if typing",
  "target": "URL if navigating",
  "reasoning": "brief explanation why"
}`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.3 }
      });

      const action = this.extractJSON(response.data.response);
      Logger.debug('Analyzed action:', action);

      return action || { action: 'done', reasoning: 'Unable to determine next step' };

    } catch (error) {
      Logger.error('Failed to analyze page:', error.message);
      return { action: 'done', reasoning: 'Analysis failed' };
    }
  }

  /**
   * Generate retry strategy on error
   */
  async generateRetryStrategy(error, step, pageContext) {
    Logger.info('Generating retry strategy for error:', error.message);

    const pageOutline = pageContext ? buildPageOutline(pageContext) : 'Page context unavailable';

    const prompt = `A browser automation step failed. Help find an alternative selector.

Failed step: ${JSON.stringify(step)}
Error: ${error.message}

${pageOutline}

Which element from the list above best matches this step? Return an alternative selector.

Return ONLY a valid JSON object (no markdown):
{
  "suggestion": "best CSS selector from the page elements above",
  "reasoning": "why this selector should work"
}`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.4 }
      });

      const suggestion = this.extractJSON(response.data.response);
      return suggestion;

    } catch (error) {
      Logger.error('Failed to generate retry strategy:', error.message);
      return null;
    }
  }

  /**
   * Analyze popup/alert and suggest action
   */
  async analyzeAlert(alertText, alertType) {
    Logger.info('Analyzing alert:', alertType, alertText);

    const prompt = `A browser ${alertType} dialog appeared with this message:
"${alertText}"

What should the user do? Suggest the best action.

Return ONLY a valid JSON object (no markdown):
{
  "suggestedAction": "accept|dismiss|type_value",
  "suggestedValue": "value to type if applicable",
  "reasoning": "brief explanation"
}`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.3 }
      });

      const suggestion = this.extractJSON(response.data.response);
      return suggestion || { suggestedAction: 'dismiss', reasoning: 'Unable to analyze' };

    } catch (error) {
      Logger.error('Failed to analyze alert:', error.message);
      return { suggestedAction: 'dismiss', reasoning: 'Analysis failed' };
    }
  }

  /**
   * Extract JSON from LLM response (handles markdown code blocks)
   */
  extractJSON(text) {
    try {
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(cleaned);
    } catch (error) {
      Logger.error('JSON extraction failed:', error.message);
      Logger.debug('Raw text:', text);
      return null;
    }
  }

  /**
   * Check Ollama health
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];
      const hasModel = models.some(m => m.name.includes(this.model));

      return {
        status: 'healthy',
        models: models.map(m => m.name),
        currentModel: this.model,
        modelAvailable: hasModel
      };
    } catch (error) {
      Logger.error('Ollama health check failed:', error.message);
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new OllamaService();
