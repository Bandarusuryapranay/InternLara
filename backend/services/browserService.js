const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { PuppeteerBlocker } = require('@cliqz/adblocker-puppeteer');
const fetch = require('cross-fetch');
const config = require('../config/config');
const broadcaster = require('./broadcaster');
const Logger = require('../utils/logger');
const { retryWithBackoff } = require('../utils/retry');
const { extractPageContext, findBestSelector, validateSelector } = require('../utils/elementFinder');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const COOKIES_PATH = path.resolve('./session_cookies.json');

class BrowserService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isRunning = false;
    this.downloads = [];
    this.lastScreenshot = null;
    this._pendingDialog = null;
    this._dialogTimeout = null;
    this._blocker = null;
    this._waitingForUserAction = false;
    this._userActionResolve = null;
    this._userActionReject = null;
  }

  async initialize() {
    if (this.browser && this.isRunning) {
      Logger.debug('Browser already initialized');
      return;
    }

    Logger.info('Initializing browser with stealth protection...');

    this.browser = await puppeteer.launch({
      headless: config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-infobars',
        '--window-size=1280,720'
      ],
      defaultViewport: {
        width: config.browser.width,
        height: config.browser.height
      }
    });

    this.page = await this.browser.newPage();
    await this.randomizeFingerprint();
    await this.setupAdblocker();
    await this.setupDialogHandler();
    await this.restoreCookies();

    const client = await this.page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: path.resolve(config.upload.directory)
    });

    this.isRunning = true;
    Logger.success('Browser initialized with stealth protection');
  }

  async randomizeFingerprint() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ];
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(ua);

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });
  }

  async setupAdblocker() {
    try {
      this._blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);
      if (this._blocker) {
        await this._blocker.enableBlockingInPage(this.page);
        Logger.info('Adblocker enabled');
      }
    } catch (err) {
      Logger.warn('Adblocker setup failed (non-critical):', err.message);
    }
  }

  async setupDialogHandler() {
    this.page.on('dialog', async dialog => {
      Logger.info('Dialog detected:', dialog.type(), '-', dialog.message());

      if (this._dialogTimeout) {
        clearTimeout(this._dialogTimeout);
      }

      this.broadcast('alert', {
        alertType: dialog.type(),
        alertText: dialog.message(),
        timestamp: Date.now()
      });

      this._pendingDialog = dialog;

      this._dialogTimeout = setTimeout(async () => {
        if (this._pendingDialog) {
          Logger.warn('Dialog auto-dismissed after timeout');
          try {
            await this._pendingDialog.dismiss();
          } catch (e) { }
          this._pendingDialog = null;
          this.broadcast('alertAutoDismissed', {
            message: 'Dialog auto-dismissed due to timeout'
          });
        }
      }, config.dialog.autoDismissTimeout);
    });
  }

  async saveCookies() {
    try {
      if (!this.page) return;
      const cookies = await this.page.cookies();
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
      Logger.info(`Saved ${cookies.length} session cookies`);
    } catch (err) {
      Logger.warn('Failed to save cookies:', err.message);
    }
  }

  async restoreCookies() {
    try {
      if (!fs.existsSync(COOKIES_PATH)) {
        Logger.info('No saved session found — will need fresh login');
        return;
      }
      const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
      if (!Array.isArray(cookies) || cookies.length === 0) return;

      await this.page.setCookie(...cookies);
      Logger.info(`Restored ${cookies.length} session cookies`);
      this.broadcast('status', { message: `✅ Session restored (${cookies.length} cookies loaded)` });
    } catch (err) {
      Logger.warn('Failed to restore cookies:', err.message);
    }
  }

  async navigate(url) {
    await this.ensureInitialized();

    Logger.info('Navigating to:', url);

    this.broadcast('action', {
      action: 'navigate',
      target: url,
      message: `Navigating to ${url}`
    });

    try {
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (err) {
      Logger.warn('Navigation timeout/page error (continuing):', err.message);
    }

    await this.sleep(1500);

    if (await this.is2FAPage()) {
      Logger.info('2FA page detected — pausing for manual user action');
      this.broadcast('status', {
        message: '🔐 2FA detected. Please complete verification in the browser window, then click Continue in the app.'
      });
      this._waitingForUserAction = true;
      await this.waitForUserAction();
      this._waitingForUserAction = false;
      await this.sleep(1000);
    }

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

  async isLoginPage() {
    if (!this.page) return false;
    try {
      return await this.page.evaluate(() => {
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();
        if (url.includes('accounts.google.com') || url.includes('signin') || url.includes('login') || url.includes('auth')) return true;
        const headers = document.querySelectorAll('h1, h2, h3, span');
        for (const h of headers) {
          const t = (h.textContent || '').toLowerCase();
          if (t.includes('sign in') || t.includes('signin') || t.includes('log in')) return true;
        }
        return false;
      });
    } catch { return false; }
  }

  async is2FAPage() {
    if (!this.page) return false;
    try {
      return await this.page.evaluate(() => {
        const url = window.location.href.toLowerCase();
        if (url.includes('challenge') || url.includes('2fa') || url.includes('two-factor') || url.includes('verification') || url.includes('authenticator') || url.includes('otp')) return true;
        const body = document.body.innerText.toLowerCase();
        const keywords = ['verification code', 'enter the code', 'two-factor', 'authenticator', 'confirm it\'s you', 'phone number', 'get a verification'];
        return keywords.some(k => body.includes(k));
      });
    } catch { return false; }
  }

  async waitForUserAction() {
    Logger.info('Waiting for manual user action (timeout: 120s)...');

    this._waitingForUserAction = true;

    this.broadcast('userActionRequired', {
      message: '🔐 2FA or login action required. Complete it in the browser, then click Continue.'
    });

    this.broadcast('status', {
      message: '🔐 2FA or login action required. Complete it in the browser, then click Continue.'
    });

    // Create a promise that resolves when user clicks "Continue"
    return new Promise((resolve, reject) => {
      this._userActionResolve = resolve;
      this._userActionReject = reject;

      // Auto-timeout after 120s
      setTimeout(() => {
        if (this._waitingForUserAction) {
          Logger.warn('User action wait timed out');
          this._waitingForUserAction = false;
          this._userActionResolve = null;
          this.broadcast('status', {
            message: '⏰ Wait timed out. Continuing anyway...'
          });
          resolve();
        }
      }, 120000);
    });
  }

  resolveUserAction() {
    Logger.info('User clicked Continue — resuming execution');
    this._waitingForUserAction = false;
    if (this._userActionResolve) {
      this.broadcast('userActionResolved', {
        message: 'Continuing execution...'
      });
      this._userActionResolve();
      this._userActionResolve = null;
    }
  }

  isWaitingForUser() {
    return this._waitingForUserAction;
  }

  async click(selector, description = null) {
    await this.ensureInitialized();
    Logger.info('Clicking:', selector || description);

    this.broadcast('action', {
      action: 'click',
      selector: selector,
      message: `Clicking: ${description || selector}`
    });

    let resolvedSelector = selector;
    if (selector) {
      const valid = await validateSelector(this.page, selector);
      if (!valid) {
        Logger.warn(`Selector "${selector}" not found on page, trying smart search...`);
        resolvedSelector = null;
      }
    }

    if (!resolvedSelector && description) {
      resolvedSelector = await findBestSelector(this.page, description, 'any');
      if (resolvedSelector) {
        Logger.info(`Smart-found element for "${description}": ${resolvedSelector}`);
      }
    }

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
      throw new Error(`Could not find element to click: "${description || selector}".`);
    }

    await this.page.waitForSelector(resolvedSelector, { timeout: 10000, visible: true });
    await this.page.click(resolvedSelector);

    await this.sleep(800);
    await this.captureAndBroadcastScreenshot();

    return { success: true, usedSelector: resolvedSelector };
  }

  async type(selector, text, description = null) {
    await this.ensureInitialized();
    Logger.info('Typing into:', selector || description, '→', text);

    this.broadcast('action', {
      action: 'type',
      selector: selector,
      message: `Typing into: ${description || selector}`
    });

    let resolvedSelector = selector;
    if (selector) {
      const valid = await validateSelector(this.page, selector);
      if (!valid) {
        Logger.warn(`Selector "${selector}" not valid, trying smart search...`);
        resolvedSelector = null;
      }
    }

    if (!resolvedSelector && description) {
      resolvedSelector = await findBestSelector(this.page, description, 'input');
      if (resolvedSelector) {
        Logger.info(`Smart-found input for "${description}": ${resolvedSelector}`);
      }
    }

    if (!resolvedSelector) {
      const fallbacks = [
        'input[type="search"]',
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
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

    const shouldPressEnter = text.endsWith('\n') || text.endsWith('\r\n');
    const cleanText = shouldPressEnter ? text.replace(/[\r\n]+$/, '') : text;

    await this.page.type(resolvedSelector, cleanText, { delay: 50 });

    if (shouldPressEnter) {
      Logger.info('Pressing Enter key after typing to submit form');
      await this.page.keyboard.press('Enter');
      await this.sleep(1500);
    }

    await this.captureAndBroadcastScreenshot();

    return { success: true, usedSelector: resolvedSelector };
  }

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

  async getEmails() {
    await this.ensureInitialized();
    Logger.info('Fetching Gmail inbox emails');

    this.broadcast('action', {
      action: 'read_emails',
      message: 'Reading Gmail inbox...'
    });

    const emails = await this.page.evaluate(() => {
      const results = [];
      const emailRows = document.querySelectorAll('tr.zA, .zA, [role="main"] tr, .email-row');

      emailRows.forEach((row, index) => {
        if (index >= 10) return;
        const sender = (row.querySelector('.yX, .yW, [email], .sender')?.textContent || '').trim();
        const subject = (row.querySelector('.y6, .bog, .subject, [role="link"]')?.textContent || '').trim();
        const snippet = (row.querySelector('.y2, .xS, .snippet')?.textContent || '').trim();
        const time = (row.querySelector('.xW, .xY, .time, .date')?.textContent || '').trim();

        if (sender || subject) {
          results.push({ sender, subject, snippet, time });
        }
      });

      if (results.length === 0) {
        const allEmails = document.body.innerText;
        const lines = allEmails.split('\n').filter(l => l.includes('@') || l.trim().length > 20).slice(0, 15);
        lines.forEach(line => {
          results.push({ text: line.trim().substring(0, 200) });
        });
      }

      return results;
    });

    Logger.info(`Found ${emails.length} emails`);
    return { success: true, emails, count: emails.length };
  }

  async screenshot(fullPage = false) {
    await this.ensureInitialized();
    Logger.info('Taking screenshot');

    const screenshotB64 = await this.page.screenshot({
      encoding: 'base64',
      fullPage: fullPage
    });

    const dataUrl = `data:image/png;base64,${screenshotB64}`;
    this.lastScreenshot = dataUrl;

    return { success: true, screenshot: dataUrl };
  }

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
   * Click at specific page coordinates (used by vision fallback)
   */
  async clickAtCoordinates(x, y) {
    await this.ensureInitialized();
    Logger.info(`Vision-guided click at (${x}, ${y})`);

    this.broadcast('action', {
      action: 'vision_click',
      coordinates: { x, y },
      message: `Clicking at coordinates (${x}, ${y})`
    });

    await this.page.mouse.click(x, y);
    await this.sleep(800);
    await this.captureAndBroadcastScreenshot();

    return { success: true, usedVision: true, coordinates: { x, y } };
  }

  /**
   * Type at specific page coordinates (click first, then type)
   */
  async typeAtCoordinates(x, y, text) {
    await this.ensureInitialized();
    Logger.info(`Vision-guided type at (${x}, ${y}) → ${text}`);

    this.broadcast('action', {
      action: 'vision_type',
      coordinates: { x, y },
      message: `Typing "${text}" at coordinates (${x}, ${y})`
    });

    await this.page.mouse.click(x, y);
    await this.sleep(300);

    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('A');
    await this.page.keyboard.up('Control');
    await this.page.keyboard.press('Backspace');

    const shouldPressEnter = text.endsWith('\n') || text.endsWith('\r\n');
    const cleanText = shouldPressEnter ? text.replace(/[\r\n]+$/, '') : text;

    await this.page.type(cleanText, { delay: 50 });

    if (shouldPressEnter) {
      Logger.info('Pressing Enter key after typing');
      await this.page.keyboard.press('Enter');
      await this.sleep(1500);
    }

    await this.captureAndBroadcastScreenshot();

    return { success: true, usedVision: true, coordinates: { x, y } };
  }

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

  async uploadFile(selector, filePath) {
    await this.ensureInitialized();
    Logger.info('Uploading file:', filePath);

    const fileInput = await this.page.$(selector);
    if (!fileInput) throw new Error(`File input not found: ${selector}`);

    await fileInput.uploadFile(filePath);
    await this.sleep(1000);

    return { success: true };
  }

  async handleAlert(action, value = null) {
    Logger.info('Handling alert:', action);

    if (this._dialogTimeout) {
      clearTimeout(this._dialogTimeout);
      this._dialogTimeout = null;
    }

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

  hasPendingDialog() {
    return !!this._pendingDialog;
  }

  async getPageContext() {
    await this.ensureInitialized();
    return await extractPageContext(this.page);
  }

  async getPageHTML() {
    await this.ensureInitialized();
    return await this.page.content();
  }

  async getPageText() {
    await this.ensureInitialized();
    return await this.page.evaluate(() => document.body.innerText);
  }

  async getPageInfo() {
    await this.ensureInitialized();
    const info = await this.page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 1000)
    }));
    return info;
  }

  async executeScript(script) {
    await this.ensureInitialized();
    Logger.info('Executing custom script');
    const result = await this.page.evaluate(script);
    return { success: true, result };
  }

  async close() {
    if (this.browser) {
      Logger.info('Closing browser — saving session');
      await this.saveCookies();
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isRunning = false;
      this.lastScreenshot = null;
      this._pendingDialog = null;
      this._waitingForUserAction = false;
      Logger.success('Browser closed — session saved for next run');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentUrl: this.page ? this.page.url() : null,
      downloads: this.downloads,
      hasScreenshot: !!this.lastScreenshot,
      hasSavedSession: fs.existsSync(COOKIES_PATH),
      waitingForUser: this._waitingForUserAction
    };
  }

  getLastScreenshot() {
    return this.lastScreenshot;
  }

  async ensureInitialized() {
    if (!this.isRunning || !this.browser) {
      await this.initialize();
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  broadcast(type, data) {
    broadcaster.broadcast(type, data);
  }
}

module.exports = new BrowserService();
