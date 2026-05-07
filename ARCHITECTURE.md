# 🤖 AI Browser Agent - Complete Architecture & Design

## Project Overview

**Goal:** Build a browser-based AI agent (like Accomplish.ai) that automates web tasks using natural language commands with Ollama running locally.

**Stack:** React + Node.js + Puppeteer + Ollama (llama3.2/llama3.3)

---

## 🎯 Core Features

### Must-Have Features
1. ✅ Natural language task input
2. ✅ AI-powered task planning (Ollama)
3. ✅ Browser automation (Puppeteer)
4. ✅ Permission system with two modes:
   - **Demo Mode**: Approve plan once, auto-execute
   - **Strict Mode**: Approve each step individually
5. ✅ Real-time activity monitoring (WebSocket)
6. ✅ Beautiful UI with visualization
7. ✅ Local-first (privacy & security)

### Supported Actions
- ✅ Navigate to URLs
- ✅ Click elements (buttons, links)
- ✅ Type into inputs/forms
- ✅ Scrape/read text content
- ✅ Take screenshots
- ✅ **Download files**
- ✅ **Upload files**
- ✅ Handle popups/alerts (with user confirmation)
- ✅ Wait for elements
- ✅ Scroll pages

### Error Handling Strategy
- **Auto-retry 3 times** with exponential backoff
- If still fails → **Ask user** what to do
- Options: Retry manually, Skip step, Cancel task

### Popup/Alert Handling
- Detect popup/alert
- **Take screenshot**
- **Ask user**: Accept, Dismiss, or Custom action

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   USER INTERFACE                         │
│                  (React Frontend)                        │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Task Input │  │ Approval UI  │  │ Activity Feed │  │
│  └────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Screenshot │  │ File Upload  │  │ Settings      │  │
│  │   Viewer   │  │   Manager    │  │ (Mode Toggle) │  │
│  └────────────┘  └──────────────┘  └───────────────┘  │
└───────────────────┬──────────────────────────────────┬─┘
                    │                                  │
                    │ REST API (HTTP)                  │
                    │ WebSocket (Real-time)            │
                    │                                  │
┌───────────────────▼──────────────────────────────────▼─┐
│              BACKEND API SERVER                         │
│              (Node.js + Express)                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Route Handlers                          │  │
│  │  • /api/agent/execute                            │  │
│  │  • /api/agent/approve                            │  │
│  │  • /api/agent/status                             │  │
│  │  • /api/files/upload                             │  │
│  │  • /api/files/download                           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────┐      ┌──────────────────────┐   │
│  │ Agent Controller │◄────►│  File Manager        │   │
│  │ • Task execution │      │  • Upload handling   │   │
│  │ • Step approval  │      │  • Download tracking │   │
│  └────────┬─────────┘      └──────────────────────┘   │
│           │                                             │
└───────────┼─────────────────────────────────────────────┘
            │
            │
    ┌───────▼────────┐              ┌─────────────────┐
    │                │              │                 │
    │     OLLAMA     │              │   PUPPETEER     │
    │    SERVICE     │              │    SERVICE      │
    │                │              │                 │
    │ • Parse intent │              │ • Browser ctrl  │
    │ • Plan steps   │              │ • DOM access    │
    │ • Analyze page │              │ • Screenshots   │
    │ • Smart retry  │              │ • File ops      │
    │                │              │ • Alert handler │
    └───────┬────────┘              └────────┬────────┘
            │                                │
            │                                │
    ┌───────▼────────┐              ┌────────▼────────┐
    │  Ollama Local  │              │    Chromium     │
    │  llama3.2/3.3  │              │    Browser      │
    └────────────────┘              └─────────────────┘
```

---

## 📊 Detailed Component Breakdown

### 1. Frontend (React)

#### Components Structure:
```
src/
├── App.js                      # Main app container
├── components/
│   ├── TaskInput.js            # Natural language input
│   ├── ApprovalPanel.js        # Step approval UI (2 modes)
│   ├── ActivityLog.js          # Real-time activity feed
│   ├── StatusBar.js            # System health status
│   ├── ScreenshotViewer.js     # Display screenshots
│   ├── AlertHandler.js         # Popup/alert UI
│   ├── FileUploader.js         # File upload component
│   ├── SettingsPanel.js        # Demo/Strict mode toggle
│   └── ErrorDialog.js          # Error handling UI
├── services/
│   ├── api.js                  # Backend API client
│   └── websocket.js            # WebSocket connection
└── styles/
    └── App.css                 # Modern, gradient UI
```

#### Key Features:
- **Two Permission Modes**:
  - Demo Mode: Show full plan → Approve once → Auto-execute
  - Strict Mode: Approve each step before execution
- **Real-time Updates**: WebSocket for live activity
- **Screenshot Display**: Show browser state to user
- **File Operations**: Upload/download UI
- **Error Handling**: Retry options dialog

---

### 2. Backend (Node.js)

#### Services:

##### A. Ollama Service
```javascript
class OllamaService {
  // Parse user intent into actionable steps
  async parseIntent(userInput)
  
  // Analyze page content to decide next action
  async analyzePageContent(html, goal)
  
  // Generate smart retry strategy on failure
  async generateRetryStrategy(error, context)
  
  // Analyze popup/alert and suggest action
  async analyzeAlert(alertText, screenshot)
}
```

##### B. Browser Service (Puppeteer)
```javascript
class BrowserService {
  // Navigation
  async navigate(url)
  
  // Interactions
  async click(selector)
  async type(selector, text)
  async select(selector, value)
  async scroll(direction, amount)
  
  // Data extraction
  async scrape(selector)
  async getPageHTML()
  async getPageText()
  
  // Visual
  async screenshot(fullPage = false)
  
  // File operations
  async downloadFile(url, savePath)
  async uploadFile(selector, filePath)
  
  // Advanced
  async waitForElement(selector, timeout)
  async handleAlert(action: 'accept' | 'dismiss' | 'text')
  async executeScript(jsCode)
  
  // Error handling
  async retry(action, maxAttempts = 3)
}
```

##### C. File Manager Service
```javascript
class FileManager {
  async handleUpload(file)
  async trackDownload(filename)
  async getDownloads()
  async cleanupOldFiles()
}
```

##### D. Agent Controller
```javascript
class AgentController {
  // Main execution flow
  async executeTask(task, mode: 'demo' | 'strict')
  
  // Step management
  async approveSteps(steps)
  async executeStepWithRetry(step)
  
  // Error handling
  async handleError(error, step)
  async askUserForRetry(error)
  
  // Alert handling
  async handlePopup(alertData)
}
```

---

## 🔄 Execution Flow

### Flow 1: Demo Mode (Default)

```
1. User: "Go to GitHub, search for 'react', and star the top repository"
   ↓
2. Backend → Ollama: Parse this task
   ↓
3. Ollama returns:
   [
     { action: 'navigate', target: 'https://github.com' },
     { action: 'wait', selector: 'input[name="q"]' },
     { action: 'type', selector: 'input[name="q"]', value: 'react' },
     { action: 'click', selector: 'button[type="submit"]' },
     { action: 'wait', selector: '.repo-list' },
     { action: 'click', selector: '.repo-list a:first-child' },
     { action: 'click', selector: 'button.star-button' }
   ]
   ↓
4. Frontend shows ALL steps in approval panel
   ↓
5. User clicks "Approve All"
   ↓
6. Backend executes steps one by one
   - WebSocket sends real-time updates
   - If error → Auto-retry 3x
   - If still fails → Ask user
   ↓
7. Success! Show results
```

### Flow 2: Strict Mode

```
Same as above BUT:
- After each step execution
- Wait for user to approve next step
- User can modify/skip steps
```

### Flow 3: Error Handling

```
1. Step fails (e.g., element not found)
   ↓
2. Auto-retry attempt 1 (wait 1s)
   ↓
3. Auto-retry attempt 2 (wait 2s)
   ↓
4. Auto-retry attempt 3 (wait 4s)
   ↓
5. Still failing → Ask Ollama for alternative
   ↓
6. If Ollama suggests fix → Try it
   ↓
7. If still fails → Show user dialog:
   - "Step failed: Click login button"
   - Options:
     • Retry manually
     • Skip this step
     • Cancel entire task
     • Let AI try different approach
```

### Flow 4: Popup/Alert Handling

```
1. Popup appears (detected by Puppeteer)
   ↓
2. Take screenshot
   ↓
3. Get alert text
   ↓
4. Send to Ollama: "What should I do with this alert?"
   ↓
5. Show user:
   - Screenshot
   - Alert text
   - AI suggestion
   - Options: Accept, Dismiss, Type custom text
   ↓
6. Execute user's choice
```

---

## 🎨 UI/UX Design

### Color Scheme (Modern Gradient)
```css
Primary: Linear gradient (Purple to Blue)
  #667eea → #764ba2

Success: #4caf50 (Green)
Error: #f44336 (Red)
Warning: #ffc107 (Yellow)
Info: #2196f3 (Blue)

Background: White with subtle shadows
Text: #333 (Dark gray)
```

### Key UI Elements:

#### 1. Task Input Area
```
┌─────────────────────────────────────────────┐
│  What would you like me to do?             │
│  ┌───────────────────────────────────────┐ │
│  │ Go to Gmail and summarize unread...   │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
│  [ 🚀 Execute ]    Mode: [Demo ▼]         │
└─────────────────────────────────────────────┘
```

#### 2. Approval Panel (Demo Mode)
```
┌─────────────────────────────────────────────┐
│  ⚠️  Review Task Plan                       │
│                                             │
│  ✅ Step 1: Navigate to gmail.com          │
│  ✅ Step 2: Wait for inbox                 │
│  ✅ Step 3: Click on first unread          │
│  ✅ Step 4: Read email content             │
│                                             │
│  [❌ Cancel]            [✅ Approve All]    │
└─────────────────────────────────────────────┘
```

#### 3. Activity Feed (Real-time)
```
┌─────────────────────────────────────────────┐
│  📋 Activity Log               [🗑️ Clear]  │
│  ─────────────────────────────────────────  │
│  ⚡ Navigating to gmail.com...     14:23   │
│  ✅ Page loaded successfully       14:24   │
│  ⏱️ Waiting for inbox...           14:24   │
│  ⚡ Clicking first email...        14:25   │
│  📸 Screenshot captured            14:25   │
│  ✅ Task completed!                14:26   │
└─────────────────────────────────────────────┘
```

#### 4. Error Dialog
```
┌─────────────────────────────────────────────┐
│  ❌ Step Failed                             │
│                                             │
│  Could not find element: .login-button     │
│  Attempted 3 times                         │
│                                             │
│  What would you like to do?                │
│                                             │
│  [ 🔄 Retry ]  [ ⏭️ Skip ]  [ ❌ Cancel ]  │
│  [ 🤖 Let AI Try Alternative ]             │
└─────────────────────────────────────────────┘
```

---

## 📝 Data Models

### Task Object
```typescript
interface Task {
  id: string
  userInput: string
  mode: 'demo' | 'strict'
  steps: Step[]
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
}
```

### Step Object
```typescript
interface Step {
  id: string
  action: 'navigate' | 'click' | 'type' | 'scrape' | 'screenshot' | 
          'download' | 'upload' | 'wait' | 'scroll'
  selector?: string
  target?: string  // URL for navigate
  value?: string   // Text for type
  description: string
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped'
  retryCount: number
  error?: string
  screenshot?: string  // base64
}
```

### Alert/Popup Object
```typescript
interface Alert {
  id: string
  type: 'alert' | 'confirm' | 'prompt'
  text: string
  screenshot: string  // base64
  aiSuggestion?: string
  timestamp: Date
}
```

---

## 🔐 Security & Privacy

### Local-First Approach
- ✅ All data stays on user's machine
- ✅ No cloud API calls (except websites being automated)
- ✅ Ollama runs locally
- ✅ No telemetry or tracking

### Permission System
- ✅ User must approve all actions
- ✅ Two modes: Demo (approve once) vs Strict (approve each)
- ✅ Can review and modify steps
- ✅ Can cancel at any time

### Authentication Handling
- ✅ User logs in manually to websites
- ✅ No credential storage
- ✅ Session cookies managed by browser
- ✅ Support for 2FA (manual)

---

## 🎯 College Demo Script

### WOW Factor Combination:

#### 1. AI Understanding (Complex Task)
**Demo:** "Go to GitHub, search for 'awesome-react', star the first 3 repos, and take screenshots"

**Why impressive:**
- Multi-step reasoning
- Conditional logic (first 3)
- Multiple actions (search, click, screenshot)

#### 2. Beautiful UI with Real-time Visualization
**Show:**
- Clean gradient design
- WebSocket live updates
- Step-by-step progress
- Screenshots appearing in real-time

#### 3. Security (Permission + Local)
**Highlight:**
- "All processing happens locally - no cloud"
- "You approve every action before it runs"
- "Your data never leaves your machine"

#### 4. Practical Demo
**Use case:** "Automate my daily email check"
- Go to Gmail
- Summarize unread emails
- Mark important ones

---

## 📦 File Structure (Final)

```
ai-browser-agent/
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── config.js
│   ├── controllers/
│   │   ├── agentController.js
│   │   └── fileController.js
│   ├── services/
│   │   ├── ollamaService.js
│   │   ├── browserService.js
│   │   └── fileManager.js
│   ├── routes/
│   │   ├── agent.js
│   │   ├── files.js
│   │   └── ollama.js
│   ├── utils/
│   │   ├── retry.js
│   │   └── logger.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── components/
│   │   │   ├── TaskInput.js
│   │   │   ├── ApprovalPanel.js
│   │   │   ├── ActivityLog.js
│   │   │   ├── StatusBar.js
│   │   │   ├── ScreenshotViewer.js
│   │   │   ├── AlertHandler.js
│   │   │   ├── FileUploader.js
│   │   │   ├── SettingsPanel.js
│   │   │   └── ErrorDialog.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── websocket.js
│   │   └── styles/
│   │       └── App.css
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md (this file)
│   ├── API.md
│   └── DEMO_SCRIPT.md
│
├── .gitignore
├── README.md
└── start.sh
```

---

## 🚀 Development Phases

### Phase 1: Core Setup (Week 1)
- ✅ Project structure
- ✅ Basic Express server
- ✅ React app skeleton
- ✅ Ollama integration
- ✅ Puppeteer basic automation

### Phase 2: Basic Features (Week 2)
- ✅ Task input → Ollama → Steps
- ✅ Approval panel (demo mode)
- ✅ Basic actions (navigate, click, type)
- ✅ WebSocket real-time updates
- ✅ Activity log

### Phase 3: Advanced Features (Week 3)
- ✅ File upload/download
- ✅ Screenshot capture
- ✅ Error handling with retry
- ✅ Popup/alert handling
- ✅ Strict mode

### Phase 4: Polish (Week 4)
- ✅ Beautiful UI
- ✅ Error messages
- ✅ Loading states
- ✅ Testing with real websites
- ✅ Documentation
- ✅ Demo preparation

---

## 🧪 Testing Strategy

### Test Cases:

1. **Simple Navigation**
   - "Go to google.com"
   
2. **Form Filling**
   - "Fill the contact form with name 'John' and email 'john@test.com'"
   
3. **Multi-step**
   - "Search Google for 'React', click first result, take screenshot"
   
4. **Error Scenarios**
   - Wrong selector
   - Slow loading page
   - Network error
   
5. **File Operations**
   - "Download this PDF"
   - "Upload my resume to this form"

6. **Alert Handling**
   - Pages with confirmation dialogs
   - Permission requests

---

## ✅ Ready to Build?

This architecture gives us:
- ✅ Clear component structure
- ✅ All features defined
- ✅ Error handling strategy
- ✅ Security approach
- ✅ Demo plan
- ✅ WOW factors for college

**Next Steps:**
1. Review this architecture
2. Confirm you understand the flow
3. Start building backend first (Ollama + Puppeteer)
4. Then build frontend (React)
5. Integrate everything
6. Test & polish

**Are you ready to start coding? Or do you have questions about any part?**
