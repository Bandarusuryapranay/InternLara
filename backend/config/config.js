require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:latest'
  },
  
  browser: {
    headless: process.env.HEADLESS_MODE === 'true',
    width: parseInt(process.env.BROWSER_WIDTH) || 1280,
    height: parseInt(process.env.BROWSER_HEIGHT) || 720
  },
  
  upload: {
    directory: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  },
  
  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3,
    delayMs: parseInt(process.env.RETRY_DELAY_MS) || 1000
  }
};
