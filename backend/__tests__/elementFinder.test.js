const { buildPageOutline } = require('../utils/elementFinder');

describe('buildPageOutline', () => {
  it('returns a formatted outline of page elements', () => {
    const context = {
      url: 'https://example.com',
      title: 'Test Page',
      elements: [
        { tag: 'input', selector: '#search', type: 'text', placeholder: 'Search...', ariaLabel: '', text: '', name: '', id: 'search', role: '' },
        { tag: 'button', selector: '.submit-btn', type: 'submit', placeholder: '', ariaLabel: 'Submit', text: 'Go', name: '', id: '', role: 'button' }
      ]
    };

    const outline = buildPageOutline(context);
    expect(outline).toContain('URL: https://example.com');
    expect(outline).toContain('Title: Test Page');
    expect(outline).toContain('selector="#search"');
    expect(outline).toContain('selector=".submit-btn"');
    expect(outline).toContain('aria-label="Submit"');
    expect(outline).toContain('text="Go"');
  });

  it('handles empty elements', () => {
    const context = {
      url: '',
      title: '',
      elements: []
    };

    const outline = buildPageOutline(context);
    expect(outline).toBe('No interactive elements found on page.');
  });

  it('handles null context', () => {
    const outline = buildPageOutline(null);
    expect(outline).toBe('No interactive elements found on page.');
  });
});
