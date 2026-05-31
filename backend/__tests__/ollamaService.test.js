const axios = require('axios');
jest.mock('axios');

const OllamaService = require('../services/ollamaService');

describe('OllamaService', () => {
  describe('extractJSON', () => {
    it('extracts JSON from plain response', () => {
      const text = '[{"action": "navigate", "target": "https://example.com"}]';
      const result = OllamaService.extractJSON(text);
      expect(result).toEqual([{ action: 'navigate', target: 'https://example.com' }]);
    });

    it('extracts JSON from markdown code block', () => {
      const text = '```json\n[{"action": "click", "selector": "#button"}]\n```';
      const result = OllamaService.extractJSON(text);
      expect(result).toEqual([{ action: 'click', selector: '#button' }]);
    });

    it('extracts JSON object from markdown', () => {
      const text = '```json\n{"action": "done", "reasoning": "All complete"}\n```';
      const result = OllamaService.extractJSON(text);
      expect(result).toEqual({ action: 'done', reasoning: 'All complete' });
    });

    it('handles text with extra whitespace', () => {
      const text = '  \n  [{"action": "screenshot"}]  \n  ';
      const result = OllamaService.extractJSON(text);
      expect(result).toEqual([{ action: 'screenshot' }]);
    });

    it('returns null for invalid JSON', () => {
      const text = 'This is not JSON at all';
      const result = OllamaService.extractJSON(text);
      expect(result).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      const text = '[{action: "navigate"}]';
      const result = OllamaService.extractJSON(text);
      expect(result).toBeNull();
    });
  });

  describe('fallbackParseIntent', () => {
    it('parses "go to URL"', () => {
      const steps = OllamaService.fallbackParseIntent('Go to https://example.com');
      expect(steps).toHaveLength(1);
      expect(steps[0]).toMatchObject({ action: 'navigate', target: 'https://example.com' });
    });

    it('parses "search for X"', () => {
      const steps = OllamaService.fallbackParseIntent('search for react hooks');
      expect(steps.length).toBeGreaterThanOrEqual(1);
      expect(steps[0].action).toBe('navigate');
      expect(steps[0].target).toContain('google.com');
    });

    it('parses "take screenshot"', () => {
      const steps = OllamaService.fallbackParseIntent('Go to example.com and take a screenshot');
      const screenshotStep = steps.find(s => s.action === 'screenshot');
      expect(screenshotStep).toBeDefined();
    });

    it('parses "scroll down"', () => {
      const steps = OllamaService.fallbackParseIntent('scroll down');
      expect(steps[0]).toMatchObject({ action: 'scroll', value: 'down' });
    });

    it('parses "extract text"', () => {
      const steps = OllamaService.fallbackParseIntent('extract all text from this page');
      expect(steps[0]).toMatchObject({ action: 'scrape' });
    });

    it('throws on unrecognized input', () => {
      expect(() => {
        OllamaService.fallbackParseIntent('xyzzy foobar');
      }).toThrow();
    });
  });

  describe('isAvailable', () => {
    it('returns true when Ollama is healthy', async () => {
      axios.get.mockResolvedValue({
        data: { models: [{ name: 'llama3.2' }] }
      });
      const result = await OllamaService.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false when Ollama request fails', async () => {
      axios.get.mockRejectedValue(new Error('Connection refused'));
      const result = await OllamaService.isAvailable();
      expect(result).toBe(false);
    });
  });
});
