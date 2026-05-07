# 🤖 AI Browser Agent

**A powerful browser automation tool powered by Ollama (local LLM) and Puppeteer**

Built for AP Government Internship Project | Chennai, 2026

---

## 🎯 Features

✅ **Natural Language Commands** - Control browser with plain English  
✅ **AI-Powered Planning** - Ollama breaks down tasks into actionable steps  
✅ **Permission System** - Demo mode (approve once) or Strict mode (approve each step)  
✅ **Auto-Retry with Exponential Backoff** - Retries failed steps 3 times automatically  
✅ **Real-Time Updates** - WebSocket for live activity monitoring  
✅ **Error Handling** - User-friendly dialogs when steps fail  
✅ **File Upload/Download** - Full file operation support  
✅ **Screenshot Capture** - Take screenshots of any page  
✅ **Alert Handling** - Smart popup/alert detection and handling  
✅ **Local-First** - Everything runs on your machine, 100% private  

---

## 📋 Prerequisites

Make sure you have these installed:

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **Ollama** - You already have this! ✅
3. **LLaMA 3.2 model** - Run: `ollama pull llama3.2`

---

## 🚀 Quick Start

### Step 1: Extract the Project

Extract the zip file to your preferred location.

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 3: Start Ollama

```bash
ollama serve
```

Keep this terminal open!

### Step 4: Start the Backend

Open a new terminal:
```bash
cd backend
npm start
```

You should see:
```
✅ Ollama connected successfully
🚀 Server running on http://localhost:5000
```

### Step 5: Start the Frontend

Open another terminal:
```bash
cd frontend
npm start
```

Your browser will open automatically to `http://localhost:3000`

---

## 🎮 How to Use

### 1. Choose Your Mode

Click **Settings** (⚙️) to choose:
- **🎯 Demo Mode** (Recommended) - Approve plan once, auto-execute
- **🔒 Strict Mode** - Approve each step individually

### 2. Enter a Task

Type what you want in natural language:

```
"Go to Google and search for 'React best practices'"
"Navigate to GitHub and search for 'awesome-react' repositories"
"Open Wikipedia, search for 'AI', and take a screenshot"
```

### 3. Review & Approve

- See all the steps AI planned
- Edit or remove steps if needed
- Click "Approve & Execute All"

### 4. Watch It Work!

- Real-time activity log shows progress
- See browser automation in action
- Get results when complete

---

## 💡 Example Tasks

### Simple Navigation
```
Go to https://example.com
```

### Search & Click
```
Go to Google, search for 'React hooks tutorial', and click the first result
```

### Form Filling
```
Navigate to example.com/contact and fill the form with name 'John Doe' and email 'john@example.com'
```

### Data Scraping
```
Go to GitHub trending page and list the top 5 repository names
```

### Multi-Step with Screenshot
```
Search Wikipedia for 'Machine Learning', scroll down, and take a screenshot
```

---

## 🏗️ Architecture

```
User Input → Ollama (Parse Intent) → Steps Generated
    ↓
User Approves Steps
    ↓
Puppeteer Executes (with auto-retry)
    ↓
Real-time Updates via WebSocket
    ↓
Results Displayed
```

### Tech Stack

- **Frontend**: React 18, WebSocket, Axios
- **Backend**: Node.js, Express, Puppeteer
- **AI**: Ollama (LLaMA 3.2)
- **Real-time**: WebSocket (ws)

---

## 🔧 Configuration

Edit `backend/.env` to customize:

```env
# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Server
PORT=5000

# Browser
HEADLESS_MODE=false        # Set to 'true' for background mode
BROWSER_WIDTH=1280
BROWSER_HEIGHT=720

# Retry
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000
```

---

## 🐛 Troubleshooting

### Ollama Not Connected

**Problem**: "Ollama: 🔴 Disconnected"

**Solution**:
1. Make sure Ollama is running: `ollama serve`
2. Check if model is installed: `ollama list`
3. Pull model if needed: `ollama pull llama3.2`

### Browser Doesn't Open

**Problem**: Puppeteer browser fails to launch

**Solution**:
1. Try headless mode: Set `HEADLESS_MODE=true` in `.env`
2. On Linux, install dependencies:
   ```bash
   sudo apt-get install -y chromium-browser
   ```

### Port Already in Use

**Problem**: "Port 5000 is already in use"

**Solution**:
Change port in `backend/.env`:
```env
PORT=5001
```

### WebSocket Not Connecting

**Problem**: Real-time updates not working

**Solution**:
1. Check if backend is running
2. Clear browser cache
3. Restart both backend and frontend

---

## 📚 API Endpoints

### Agent

- `POST /api/agent/execute` - Execute a task
- `POST /api/agent/approve` - Approve and execute steps
- `POST /api/agent/retry-decision` - Handle retry after error
- `GET /api/agent/status` - Get system status
- `GET /api/agent/screenshot` - Take screenshot

### Files

- `POST /api/files/upload` - Upload a file
- `GET /api/files/list` - List uploaded files
- `DELETE /api/files/:filename` - Delete a file

### Ollama

- `GET /api/ollama/health` - Check Ollama health
- `POST /api/ollama/analyze-alert` - Analyze popup/alert

---

## 🎓 For Your College Presentation

### WOW Factors to Highlight:

1. **AI Understanding** 🤖
   - Show complex multi-step task
   - "Go to GitHub, search for 'react', star the first 3 repos, take screenshots"
   
2. **Beautiful UI** 🎨
   - Modern gradient design
   - Real-time activity feed
   - Live WebSocket updates

3. **Security & Privacy** 🔐
   - Permission-based execution
   - 100% local (no cloud)
   - User approval required

4. **Practical Demo** 💼
   - Automate Gmail checking
   - Form filling
   - Data scraping

### Demo Script:

1. Start with simple task (Google search)
2. Show approval panel
3. Watch real-time execution
4. Then do complex multi-step task
5. Show error handling (intentionally fail a step)
6. Highlight local/private nature

---

## 📂 Project Structure

```
ai-browser-agent-v2/
├── backend/
│   ├── config/           # Configuration
│   ├── controllers/      # Business logic
│   ├── services/         # Ollama, Browser, File services
│   ├── routes/           # API routes
│   ├── utils/            # Retry, Logger utilities
│   └── server.js         # Main server
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API, WebSocket services
│   │   ├── styles/       # CSS styling
│   │   └── App.js        # Main app
│   └── public/           # Static files
│
└── README.md             # This file
```

---

## 🚀 Future Enhancements

- [ ] Desktop app version (Electron)
- [ ] Google OAuth integration (Gmail, Calendar)
- [ ] Task templates library
- [ ] Scheduling & automation
- [ ] Multi-browser support (Firefox, Safari)
- [ ] Plugin system for custom actions

---

## 🙏 Credits

**Built by:** Dheemanth Muvva  
**Institution:** Sri Ramachandra Institute, Chennai  
**Project:** AP Government Internship  
**Year:** 2026  

**Technologies:**
- [Ollama](https://ollama.ai/) - Local LLM runner
- [Puppeteer](https://pptr.dev/) - Browser automation
- [React](https://react.dev/) - Frontend framework
- [Node.js](https://nodejs.org/) - Backend runtime

---

## 📄 License

This project is created for educational purposes as part of an internship project.

---

## 💬 Support

Having issues? Check:
1. All prerequisites installed
2. Ollama is running (`ollama serve`)
3. Model is pulled (`ollama pull llama3.2`)
4. Ports 5000 and 3000 are free
5. Check backend terminal for errors

---

**Good luck with your presentation! 🎉**

**Remember to highlight:**
- ✅ AI-powered automation (impressive!)
- ✅ Security/permission system (responsible!)
- ✅ Local-first approach (private!)
- ✅ Real-world use cases (practical!)
