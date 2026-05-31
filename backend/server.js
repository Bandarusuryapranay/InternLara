const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { WebSocketServer } = require('ws');
const config = require('./config/config');
const Logger = require('./utils/logger');
const broadcaster = require('./services/broadcaster');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow WebSocket connections
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  Logger.debug(`${req.method} ${req.path}`);
  next();
});

// Import routes
const agentRoutes = require('./routes/agent');
const fileRoutes = require('./routes/files');
const ollamaRoutes = require('./routes/ollama');
const historyRoutes = require('./routes/history');

// API routes
app.use('/api/agent', agentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ollama', ollamaRoutes);
app.use('/api/history', historyRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Initialize broadcaster with WebSocket server
broadcaster.init(wss);

// WebSocket connection handling
wss.on('connection', (ws) => {
  Logger.info('WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      Logger.debug('WebSocket message received:', data);
    } catch (error) {
      Logger.error('Invalid WebSocket message:', error.message);
    }
  });

  ws.on('close', () => {
    Logger.info('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    Logger.error('WebSocket error:', error.message);
  });

  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to AI Browser Agent',
    timestamp: Date.now()
  }));
});

// Error handling middleware
app.use((err, req, res, next) => {
  Logger.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
const PORT = config.server.port;

server.listen(PORT, () => {
  Logger.success(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║          🤖 AI Browser Agent Server Started           ║
║                                                        ║
║  HTTP Server:    http://localhost:${PORT}              ║
║  WebSocket:      ws://localhost:${PORT}                ║
║  Environment:    ${config.server.nodeEnv}                      ║
║                                                        ║
║  Ready to accept connections!                         ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);

  // Check Ollama connection
  const ollamaService = require('./services/ollamaService');
  ollamaService.checkHealth().then(health => {
    if (health.status === 'healthy') {
      Logger.success('✅ Ollama connected successfully');
      Logger.info('Available models:', health.models.join(', '));
      if (!health.modelAvailable) {
        Logger.warn(`⚠️  Model '${config.ollama.model}' not found. Please run: ollama pull ${config.ollama.model}`);
      }
    } else {
      Logger.error('❌ Ollama not available:', health.error);
      Logger.warn('Please start Ollama: ollama serve');
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  Logger.info('SIGTERM received, shutting down gracefully...');
  
  const browserService = require('./services/browserService');
  await browserService.close();
  
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  Logger.info('\nSIGINT received, shutting down gracefully...');
  
  const browserService = require('./services/browserService');
  await browserService.close();
  
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});
