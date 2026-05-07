const puppeteer = require('puppeteer');
const config = require('../config/config');
const Logger = require('../utils/logger');
const { retryWithBackoff } = require('../utils/retry');
const { extractPageContext, findBestSelector, validateSelector } = require('../utils/elementFinder');
const path = require('path');

class BrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isRunning = false;
    this.downloads = [];
    this.lastScreenshot = null; // Cache for live preview
  }

  /**
   * Initialize browser
   */
  async initialize() {
    if (this.browser && this.isRunning) {
      Logger.debug('Browser already initialized');
      return;
    }

    Logger.info('Initializing browser...');

    this.browser = await puppeteer.launch({
      headless: config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ],
      defaultViewport: {
        width: config.browser.width,
        height: config.browser.height
      }
    });

    this.page = await this.browser.newPage();

    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Setup download tracking
    const client = await this.page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: path.resolve(config.upload.directory)
    });

    // Listen for dialogs (alerts, confirms, prompts)
    this.page.on('dialog', async dialog => {
      Logger.info('Dialog detected:', dialog.type(), '-', dialog.message());
      this.broadcast('alert', {
        alertType: dialog.type(),
        alertText: dialog.message(),
        timestamp: Date.now()
      });
      // Store dialog for later handling
      this._pendingDialog = dialog;
    });

    this.isRunning = true;
    Logger.success('Browser initialized successfully');
  }

  /**
   * Navigate to URL and capture page context
   */
  async navigate(url) {
    await this.ensureInitialized();

    Logger.info('Navigating to:', url);

    this.broadcast('action', {
      action: 'navigate',
      target: url,
      message: `Navigating to ${url}`
    });

    await this.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a little for dynamic content
    await this.sleep(1000);

    // Auto-capture screenshot and page context after navigation
    const screenshot = await this.captureAndBroadcastScreenshot();
    const pageContext = await extractPageContext(this.page);

    Logger.success(`Navigated to: ${this.page.url()}`);
    Logger.info(`Found ${pageContext.elements.length} interactive elements on page`);

    return {
      success: true,
      url: this.page.url(),
      title: await this.page.title(),
      screenshot: screenshot,
      pageContext: pageContext
    };
  }

  /**
   * SMART Click — tries resolved selector first, then fuzzy search fallbacks
   */
  async click(selector, description = null) {
    await this.ensureInitialized();

    Logger.info('Clicking:', selector || description);

    this.broadcast('action', {
      action: 'click',
      selector: selector,
      message: `Clicking: ${description || selector}`
    });

    // Try the provided selector first
    let resolvedSelector = selector;
    if (selector) {
      const valid = await validateSelector(this.page, selector);
      if (!valid) {
        Logger.warn(`Selector "${selector}" not found on page, trying smart search...`);
        resolvedSelector = null;
      }
    }

    // Fallback: fuzzy search by description
    if (!resolvedSelector && description) {
      resolvedSelector = await findBestSelector(this.page, description, 'any');
      if (resolvedSelector) {
        Logger.info(`Smart-found element for "${description}": ${resolvedSelector}`);
      }
    }

    // Fallback: try common search button selectors
    if (!resolvedSelector) {
      const fallbacks = [
        selector,
        'button[type="submit"]',
        'input[type="submit"]',
        '[role="button"]',
        'button:first-of-type'
      ].filter(Boolean);

      for (const fb of fallbacks) {
        const valid = await validateSelector(this.page, fb);
        if (valid) {
          resolvedSelector = fb;
          Logger.info(`Fallback selector found: ${fb}`);
          break;
        }
      }
    }

    if (!resolvedSelector) {
      throw new Error(`Could not find element to click: "${description || selector}". Element may not exist on this page.`);
    }

    await this.page.waitForSelector(resolvedSelector, { timeout: 10000, visible: true });
    await this.page.click(resolvedSelector);

    await this.sleep(800);
    await this.captureAndBroadcastScreenshot();

    return { success: true, usedSelector: resolvedSelector };
  }

  /**
   * SMART Type — finds the right input field using description fallbacks
   */
  async type(selector, text, description = null) {
    await this.ensureInitialized();

    Logger.info('Typing into:', selector || description, '→', text);

    this.broadcast('action', {
      action: 'type',
      selector: selector,
      message: `Typing "${text}" into: ${description || selector}`
    });

    // Try the provided selector first
    let resolvedSelector = selector;
    if (selector) {
      const valid = await validateSelector(this.page, selector);
      if (!valid) {
        Logger.warn(`Selector "${selector}" not valid, trying smart search...`);
        resolvedSelector = null;
      }
    }

    // Fallback: fuzzy search by description
    if (!resolvedSelector && description) {
      resolvedSelector = await findBestSelector(this.page, description, 'input');
      if (resolvedSelector) {
        Logger.info(`Smart-found input for "${description}": ${resolvedSelector}`);
      }
    }

    // Fallback: try common input selectors
    if (!resolvedSelector) {
      const fallbacks = [
        'input[type="search"]',
        'input[type="text"]',
        'textarea',
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])'
      ];

      for (const fb of fallbacks) {
        const valid = await validateSelector(this.page, fb);
        if (valid) {
          resolvedSelector = fb;
          Logger.info(`Fallback input selector found: ${fb}`);
          break;
        }
      }
    }

    if (!resolvedSelector) {
      throw new Error(`Could not find input field: "${description || selector}".`);
    }

    await this.page.waitForSelector(resolvedSelector, { timeout: 10000, visible: true });
    await this.page.click(resolvedSelector);
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('A');
    await this.page.keyboard.up('Control');
    await this.page.keyboard.press('Backspace');
    await this.page.type(resolvedSelector, text, { delay: 50 });

    await this.captureAndBroadcastScreenshot();

    return { success: true, usedSelector: resolvedSelector };
  }

  /**
   * Scrape text content
   */
  async scrape(selector = null) {
    await this.ensureInitialized();
    Logger.info('Scraping content:', selector || 'entire page');

    if (selector) {
      const elements = await this.page.$$(selector);
      const data = [];
      for (const element of elements) {
        const text = await element.evaluate(el => el.textContent);
        data.push(text.trim());
      }
      return { success: true, data };
    } else {
      const content = await this.page.evaluate(() => document.body.innerText);
      return { success: true, content };
    }
  }

  /**
   * Take screenshot and optionally broadcast
   */
  async screenshot(fullPage = false) {
    await this.ensureInitialized();
    Logger.info('Taking screenshot');

    const screenshotB64 = await this.page.screenshot({
      encoding: 'base64',
      fullPage: fullPage
    });

    const dataUrl = `data:image/png;base64,${screenshotB64}`;
    this.lastScreenshot = dataUrl;

    return {
      success: true,
      screenshot: dataUrl
    };
  }

  /**
   * Capture screenshot and broadcast as livePreview event
   */
  async captureAndBroadcastScreenshot() {
    try {
      const result = await this.screenshot(false);
      this.broadcast('livePreview', { screenshot: result.screenshot });
      return result.screenshot;
    } catch (err) {
      Logger.error('captureAndBroadcastScreenshot failed:', err.message);
      return null;
    }
  }

  /**
   * Wait for element
   */
  async waitForElement(selector, timeout = 10000) {
    await this.ensureInitialized();
    Logger.info('Waiting for:', selector);

    this.broadcast('action', {
      action: 'wait',
      selector: selector,
      message: `Waiting for element: ${selector}`
    });

    await this.page.waitForSelector(selector, { timeout, visible: true });

    return { success: true };
  }

  /**
   * Scroll page
   */
  async scroll(direction, amount = 500) {
    await this.ensureInitialized();
    Logger.info('Scrolling:', direction);

    const scrollMap = {
      down: `window.scrollBy(0, ${amount})`,
      up: `window.scrollBy(0, -${amount})`,
      left: `window.scrollBy(-${amount}, 0)`,
      right: `window.scrollBy(${amount}, 0)`
    };

    await this.page.evaluate(scrollMap[direction] || scrollMap.down);
    await this.sleep(500);
    await this.captureAndBroadcastScreenshot();

    return { success: true };
  }

  /**
   * Upload file
   */
  async uploadFile(selector, filePath) {
    await this.ensureInitialized();
    Logger.info('Uploading file:', filePath);

    const fileInput = await this.page.$(selector);
    if (!fileInput) throw new Error(`File input not found: ${selector}`);

    await fileInput.uploadFile(filePath);
    await this.sleep(1000);

    return { success: true };
  }

  /**
   * Handle alert/popup
   */
  async handleAlert(action, value = null) {
    Logger.info('Handling alert:', action);

    if (this._pendingDialog) {
      switch (action) {
        case 'accept':
          await this._pendingDialog.accept(value);
          break;
        case 'dismiss':
          await this._pendingDialog.dismiss();
          break;
        default:
          await this._pendingDialog.dismiss();
      }
      this._pendingDialog = null;
    } else {
      // Set handler for next dialog
      this.page.once('dialog', async dialog => {
        switch (action) {
          case 'accept': await dialog.accept(value); break;
          case 'dismiss': await dialog.dismiss(); break;
          default: await dialog.dismiss();
        }
      });
    }

    return { success: true };
  }

  /**
   * Extract page context (interactive elements from live DOM)
   */
  async getPageContext() {
    await this.ensureInitialized();
    return await extractPageContext(this.page);
  }

  /**
   * Get current page HTML
   */
  async getPageHTML() {
    await this.ensureInitialized();
    return await this.page.content();
  }

  /**
   * Get current page text
   */
  async getPageText() {
    await this.ensureInitialized();
    return await this.page.evaluate(() => document.body.innerText);
  }

  /**
   * Get page info
   */
  async getPageInfo() {
    await this.ensureInitialized();

    const info = await this.page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 1000)
    }));

    return info;
  }

  /**
   * Execute custom JavaScript
   */
  async executeScript(script) {
    await this.ensureInitialized();
    Logger.info('Executing custom script');
    const result = await this.page.evaluate(script);
    return { success: true, result };
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      Logger.info('Closing browser');
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isRunning = false;
      this.lastScreenshot = null;
      Logger.success('Browser closed');
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentUrl: this.page ? this.page.url() : null,
      downloads: this.downloads,
      hasScreenshot: !!this.lastScreenshot
    };
  }

  /**
   * Get last screenshot for live preview
   */
  getLastScreenshot() {
    return this.lastScreenshot;
  }

  /**
   * Ensure browser is initialized
   */
  async ensureInitialized() {
    if (!this.isRunning || !this.browser) {
      await this.initialize();
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Broadcast message via WebSocket
   */
  broadcast(type, data) {
    if (global.broadcast) {
      global.broadcast({
        type: type,
        ...data,
        timestamp: Date.now()
      });
    }
  }
}

module.exports = new BrowserService();
