const axios = require('axios');
const config = require('../config/config');
const Logger = require('../utils/logger');
const { buildPageOutline } = require('../utils/elementFinder');

class OllamaService {
  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
    this.visionModel = config.ollama.visionModel;
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
- type: Type text into an input (use "selector", "description", AND "value").
  CRITICAL: If you are entering a search query or a field that needs to be submitted immediately (like a Google search field or the final field of a login form), append a newline character "\\n" to the end of the "value" string (e.g. "artificial intelligence\\n" or "mypassword\\n"). This tells the browser to press the Enter key right after typing to execute search or submit.
- scrape: Extract text from page (use "selector" if specific element, leave blank for full page)
- screenshot: Take a screenshot (no extra fields needed)
- wait: Wait for an element to appear (use "selector" AND "description")
- scroll: Scroll the page (use "value": "up" or "down")
- upload: Upload a file (use "selector" for file input, "value" for file path)
- get_emails: Read emails from Gmail inbox (no selector needed — automatically detects Gmail's email list). Use ONLY when the user asks to check/read/see emails.

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
    "value": "search term\\n"
  },
  {
    "action": "screenshot",
    "description": "Take a screenshot of the search results"
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
   * Fallback intent parser using regex patterns.
   * Used when Ollama is unavailable — handles common task patterns.
   */
  fallbackParseIntent(userInput) {
    Logger.info('Using regex fallback parser for:', userInput);
    const input = userInput.toLowerCase().trim();
    const steps = [];

    // Navigate to URL pattern
    const urlMatch = input.match(/(?:go\s+to|navigate\s+to|open|visit)\s+(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      steps.push({
        action: 'navigate',
        target: urlMatch[1],
        description: `Navigate to ${urlMatch[1]}`
      });
    } else {
      // Try domain-only pattern
      const domainMatch = input.match(/(?:go\s+to|navigate\s+to|open|visit)\s+([a-z0-9.-]+\.[a-z]{2,})/i);
      if (domainMatch) {
        steps.push({
          action: 'navigate',
          target: `https://${domainMatch[1]}`,
          description: `Navigate to ${domainMatch[1]}`
        });
      }
    }

    // Search pattern
    const searchMatch = input.match(/(?:search\s+(?:for\s+)?|find\s+)(.+?)(?:\s+and|\s+then|\s+on\s+\S+|\s*$)/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      const site = input.match(/(?:on|at)\s+([a-z0-9.-]+\.[a-z]{2,})/i);
      if (site) {
        steps.push({
          action: 'navigate',
          target: `https://${site[1]}`,
          description: `Go to ${site[1]}`
        });
      }

      if (!site && steps.length === 0) {
        // Default to Google search
        steps.push({
          action: 'navigate',
          target: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          description: `Search for ${query}`
        });
      } else {
        steps.push({
          action: 'type',
          selector: 'input[type="search"], input[name="q"]',
          description: 'Search input',
          value: `${query}\n`
        });
      }
    }

    // Click pattern
    const clickMatch = input.match(/(?:click|press|tap)\s+(?:on\s+)?(?:the\s+)?[""']?([^""']+)[""']?(?:\s+button|\s+link|\s+result)?/i);
    if (clickMatch) {
      steps.push({
        action: 'click',
        selector: null,
        description: `Click ${clickMatch[1].trim()}`
      });
    }

    // Screenshot pattern
    if (input.includes('screenshot') || input.includes('capture') || input.includes('snapshot')) {
      const fullPage = input.includes('full') || input.includes('entire') || input.includes('whole');
      steps.push({
        action: 'screenshot',
        description: fullPage ? 'Take a full-page screenshot' : 'Take a screenshot'
      });
    }

    // Scroll pattern
    if (input.includes('scroll')) {
      const direction = input.includes('up') ? 'up' : 'down';
      steps.push({
        action: 'scroll',
        value: direction,
        description: `Scroll ${direction}`
      });
    }

    // Scrape pattern
    if (input.includes('scrape') || input.includes('extract') || input.includes('read') || input.includes('list')) {
      steps.push({
        action: 'scrape',
        selector: null,
        description: 'Extract content from page'
      });
    }

    // Wait pattern
    const waitMatch = input.match(/wait\s+(\d+)\s*(?:seconds?|s|ms)?/i);
    if (waitMatch) {
      const ms = parseInt(waitMatch[1]) * (input.includes('ms') ? 1 : 1000);
      steps.push({
        action: 'wait',
        selector: null,
        description: `Wait ${waitMatch[1]} ${input.includes('ms') ? 'ms' : 'seconds'}`
      });
    }

    if (steps.length === 0) {
      throw new Error('Could not understand the task. Try: "Go to google.com and search for react"');
    }

    return steps;
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable() {
    try {
      const health = await this.checkHealth();
      return health.status === 'healthy';
    } catch {
      return false;
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
   * Analyze a screenshot using Ollama vision model.
   * Returns element position / action suggestion from visual analysis.
   */
  async analyzeScreenshotWithVision(screenshotBase64, goal) {
    Logger.info('Analyzing screenshot with vision model for:', goal);

    const prompt = `You are an AI that analyzes webpage screenshots to help automate browser actions.

Given this screenshot of a webpage, find the element that best matches this description: "${goal}"

Return ONLY valid JSON (no markdown):
{
  "found": true/false,
  "elementType": "button|input|link|text|other",
  "selector": "best CSS selector for the element (if identifiable)",
  "coordinates": { "x": 123, "y": 456 },
  "reasoning": "brief explanation"
}

If you can see the element, provide its approximate center coordinates and a CSS selector.
If you cannot find it, set "found": false.`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.visionModel,
        prompt: prompt,
        images: [screenshotBase64],
        stream: false,
        options: {
          temperature: 0.1
        }
      });

      const text = response.data.response;
      Logger.debug('Vision model response:', text);

      const result = this.extractJSON(text);
      return result || { found: false, reason: 'Failed to parse vision response' };

    } catch (error) {
      Logger.error('Vision analysis failed:', error.message);
      return { found: false, reason: error.message };
    }
  }

  /**
   * Check if vision model is available
   */
  async isVisionAvailable() {
    try {
      const tags = await axios.get(`${this.baseUrl}/api/tags`);
      const models = tags.data.models || [];
      return models.some(m => m.name.includes('vision') || m.name.includes('llava'));
    } catch {
      return false;
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

      const hasVisionModel = models.some(m => m.name.includes('vision') || m.name.includes('llava'));

      return {
        status: 'healthy',
        models: models.map(m => m.name),
        currentModel: this.model,
        modelAvailable: hasModel,
        visionModel: this.visionModel,
        visionAvailable: hasVisionModel
      };
    } catch (error) {
      Logger.error('Ollama health check failed:', error.message);
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new OllamaService();
