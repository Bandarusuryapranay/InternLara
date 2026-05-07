import React, { useState, useEffect, useRef } from 'react';

const CATEGORIES = [
  {
    label: '🌐 Search & Browse',
    color: '#3b82f6',
    templates: [
      { title: 'Google Search', description: 'Search and click first result', prompt: "Go to Google, search for '{query}', and click the first result", variables: ['query'], icon: '🔍' },
      { title: 'Wikipedia Research', description: 'Search Wikipedia and take a screenshot', prompt: "Go to Wikipedia, search for '{topic}', click the article, scroll down and take a screenshot", variables: ['topic'], icon: '📖' },
      { title: 'YouTube Search', description: 'Find a video on YouTube', prompt: "Go to YouTube and search for '{topic}'", variables: ['topic'], icon: '▶️' },
      { title: 'News Search', description: 'Find latest news on a topic', prompt: "Go to news.google.com and search for '{topic}'", variables: ['topic'], icon: '📰' },
    ]
  },
  {
    label: '💻 GitHub & Dev',
    color: '#8b5cf6',
    templates: [
      { title: 'GitHub Repo Search', description: 'Search GitHub for repositories', prompt: "Go to GitHub, search for '{query}' repositories, and take a screenshot of the results", variables: ['query'], icon: '⭐' },
      { title: 'NPM Package Lookup', description: 'Check a package on NPM', prompt: "Go to npmjs.com and search for the '{package}' package", variables: ['package'], icon: '📦' },
      { title: 'Stack Overflow Search', description: 'Find answers on Stack Overflow', prompt: "Go to Stack Overflow and search for '{question}'", variables: ['question'], icon: '💬' },
    ]
  },
  {
    label: '📋 Forms & Data',
    color: '#10b981',
    templates: [
      { title: 'Screenshot Any Page', description: 'Take a screenshot of any URL', prompt: "Navigate to {url} and take a full screenshot", variables: ['url'], icon: '📸' },
      { title: 'Scrape Page Text', description: 'Extract all text from a page', prompt: "Go to {url} and scrape all the text content from the page", variables: ['url'], icon: '📊' },
      { title: 'Form Fill Demo', description: 'Fill out a sample form', prompt: "Go to httpbin.org/forms/post and fill in the customer name as '{name}' and submit the form", variables: ['name'], icon: '📝' },
    ]
  },
  {
    label: '🛒 Shopping',
    color: '#f59e0b',
    templates: [
      { title: 'Amazon Search', description: 'Search Amazon for a product', prompt: "Go to Amazon India and search for '{product}', then take a screenshot of the results", variables: ['product'], icon: '🛒' },
      { title: 'Flipkart Search', description: 'Search Flipkart for a product', prompt: "Go to Flipkart and search for '{product}'", variables: ['product'], icon: '🏷️' },
    ]
  }
];

function TaskTemplates({ onSelectTemplate, isExecuting }) {
  const [expanded, setExpanded] = useState(null);
  const [vars, setVars] = useState({});
  const [activeTemplate, setActiveTemplate] = useState(null);

  const handleTemplateClick = (template, catIdx, tIdx) => {
    const key = `${catIdx}-${tIdx}`;
    if (activeTemplate === key) {
      setActiveTemplate(null);
      setVars({});
      return;
    }
    setActiveTemplate(key);
    const initialVars = {};
    (template.variables || []).forEach(v => { initialVars[v] = ''; });
    setVars(initialVars);
  };

  const buildPrompt = (template) => {
    let prompt = template.prompt;
    Object.entries(vars).forEach(([k, v]) => {
      prompt = prompt.replace(`{${k}}`, v || `[${k}]`);
    });
    return prompt;
  };

  const handleUseTemplate = (template) => {
    const prompt = buildPrompt(template);
    onSelectTemplate(prompt);
    setActiveTemplate(null);
    setVars({});
  };

  return (
    <div className="task-templates">
      <div className="templates-header">
        <h3 className="templates-title">⚡ Task Templates</h3>
        <p className="templates-sub">Click any template to get started quickly</p>
      </div>

      <div className="templates-body">
        {CATEGORIES.map((cat, catIdx) => (
          <div key={catIdx} className="template-category">
            <button
              className="template-cat-header"
              onClick={() => setExpanded(expanded === catIdx ? null : catIdx)}
              style={{ '--cat-color': cat.color }}
            >
              <span>{cat.label}</span>
              <span className="cat-chevron">{expanded === catIdx ? '▲' : '▼'}</span>
            </button>

            {expanded === catIdx && (
              <div className="template-grid">
                {cat.templates.map((tpl, tIdx) => {
                  const key = `${catIdx}-${tIdx}`;
                  const isActive = activeTemplate === key;
                  return (
                    <div key={tIdx} className={`template-card ${isActive ? 'active' : ''}`} style={{ '--cat-color': cat.color }}>
                      <div className="template-card-header" onClick={() => handleTemplateClick(tpl, catIdx, tIdx)}>
                        <span className="template-icon">{tpl.icon}</span>
                        <div className="template-card-info">
                          <span className="template-card-title">{tpl.title}</span>
                          <span className="template-card-desc">{tpl.description}</span>
                        </div>
                      </div>

                      {isActive && (
                        <div className="template-card-expand">
                          {(tpl.variables || []).map(v => (
                            <div key={v} className="template-var">
                              <label className="template-var-label">{v}:</label>
                              <input
                                type="text"
                                className="template-var-input"
                                placeholder={`Enter ${v}...`}
                                value={vars[v] || ''}
                                onChange={e => setVars(prev => ({ ...prev, [v]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleUseTemplate(tpl)}
                              />
                            </div>
                          ))}
                          <div className="template-preview">
                            <span className="template-preview-label">Preview:</span>
                            <span className="template-preview-text">{buildPrompt(tpl)}</span>
                          </div>
                          <button
                            className="template-use-btn"
                            onClick={() => handleUseTemplate(tpl)}
                            disabled={isExecuting}
                          >
                            🚀 Use This Template
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskTemplates;
