/**
 * elementFinder.js
 * Smart DOM element finder — resolves CSS selectors against the LIVE page
 * instead of relying on Ollama's guesses made before the page loaded.
 */
const Logger = require('./logger');

/**
 * Extract all interactive elements from a live Puppeteer page.
 * Returns a compact context object that can be sent to Ollama.
 */
async function extractPageContext(page) {
  try {
    const context = await page.evaluate(() => {
      const elements = [];
      const seen = new Set();

      const addEl = (el, typeHint) => {
        // Build a unique fingerprint
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const name = el.name ? `[name="${el.name}"]` : '';
        const type = el.type ? `[type="${el.type}"]` : '';
        const placeholder = el.placeholder || '';
        const label = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '';
        const visibleText = (el.innerText || el.textContent || '').trim().substring(0, 60);
        const cls = el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';

        // Build a CSS selector (priority: id > name > type+placeholder)
        let selector = '';
        if (el.id) {
          selector = `#${CSS.escape(el.id)}`;
        } else if (el.name && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
          selector = `${tag}[name="${el.name}"]`;
        } else if (el.type && tag === 'input') {
          selector = `input[type="${el.type}"]`;
        } else if (el.placeholder) {
          selector = `${tag}[placeholder="${el.placeholder.substring(0, 40)}"]`;
        } else if (el.getAttribute('aria-label')) {
          selector = `[aria-label="${el.getAttribute('aria-label').substring(0, 40)}"]`;
        } else {
          selector = tag + cls;
        }

        if (seen.has(selector)) return;
        seen.add(selector);

        // Only add visible elements
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        elements.push({
          tag,
          selector,
          type: el.type || typeHint || tag,
          id: el.id || '',
          name: el.name || '',
          placeholder,
          ariaLabel: label,
          text: visibleText,
          role: el.getAttribute('role') || ''
        });
      };

      // Inputs
      document.querySelectorAll('input:not([type="hidden"])').forEach(el => addEl(el, 'input'));
      // Textareas
      document.querySelectorAll('textarea').forEach(el => addEl(el, 'textarea'));
      // Selects
      document.querySelectorAll('select').forEach(el => addEl(el, 'select'));
      // Buttons
      document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach(el => addEl(el, 'button'));
      // Top links (limit to 20)
      const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 20);
      links.forEach(el => addEl(el, 'link'));

      return {
        url: window.location.href,
        title: document.title,
        elements
      };
    });

    return context;
  } catch (err) {
    Logger.error('extractPageContext failed:', err.message);
    return { url: '', title: '', elements: [] };
  }
}

/**
 * Try multiple selector strategies to find an element on the page.
 * Returns the first matching selector string, or null if not found.
 */
async function findBestSelector(page, description, elementType = 'any') {
  description = description.toLowerCase().trim();

  try {
    const result = await page.evaluate((desc, elType) => {
      const score = (el) => {
        let s = 0;
        const fields = [
          el.id, el.name, el.placeholder,
          el.getAttribute('aria-label'), el.getAttribute('aria-labelledby'),
          el.getAttribute('title'), el.value,
          (el.innerText || el.textContent || '').trim()
        ].map(f => (f || '').toLowerCase());

        for (const f of fields) {
          if (f === desc) s += 10;
          else if (f.includes(desc)) s += 5;
          else if (desc.split(' ').some(w => f.includes(w))) s += 2;
        }
        return s;
      };

      let candidates = [];
      const selectors = elType === 'input' || elType === 'any'
        ? 'input:not([type="hidden"]), textarea, select'
        : 'button, a, input[type="submit"]';

      document.querySelectorAll(selectors).forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        const s = score(el);
        if (s > 0) candidates.push({ el, s });
      });

      // If no typed candidates, try all interactive
      if (candidates.length === 0) {
        document.querySelectorAll('input, textarea, button, select, a[href]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          const s = score(el);
          if (s > 0) candidates.push({ el, s });
        });
      }

      candidates.sort((a, b) => b.s - a.s);
      if (candidates.length === 0) return null;

      const best = candidates[0].el;
      // Return a reliable selector
      if (best.id) return `#${CSS.escape(best.id)}`;
      if (best.name) return `${best.tagName.toLowerCase()}[name="${best.name}"]`;
      if (best.getAttribute('aria-label')) return `[aria-label="${best.getAttribute('aria-label')}"]`;
      if (best.placeholder) return `[placeholder="${best.placeholder}"]`;
      return null;
    }, description, elementType);

    return result;
  } catch (err) {
    Logger.error('findBestSelector failed:', err.message);
    return null;
  }
}

/**
 * Validate that a CSS selector actually exists and is visible on the page.
 */
async function validateSelector(page, selector) {
  try {
    const result = await page.evaluate((sel) => {
      try {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
      } catch {
        return false;
      }
    }, selector);
    return result;
  } catch {
    return false;
  }
}

/**
 * Build a compact page outline string for sending to Ollama.
 * Describes the interactive elements on the current page.
 */
function buildPageOutline(context) {
  if (!context || !context.elements || context.elements.length === 0) {
    return 'No interactive elements found on page.';
  }

  const lines = [
    `URL: ${context.url}`,
    `Title: ${context.title}`,
    ``,
    `Interactive elements on this page:`
  ];

  context.elements.forEach((el, i) => {
    const desc = [
      el.type !== el.tag ? el.type : '',
      el.placeholder ? `placeholder="${el.placeholder}"` : '',
      el.ariaLabel ? `aria-label="${el.ariaLabel}"` : '',
      el.text ? `text="${el.text}"` : ''
    ].filter(Boolean).join(' ');

    lines.push(`${i + 1}. <${el.tag}> selector="${el.selector}" ${desc}`.trim());
  });

  return lines.join('\n');
}

module.exports = {
  extractPageContext,
  findBestSelector,
  validateSelector,
  buildPageOutline
};
