/**
 * Simple logger with timestamps and colors
 */
class Logger {
  static info(message, ...args) {
    console.log(`[${new Date().toISOString()}] ℹ️  INFO:`, message, ...args);
  }
  
  static success(message, ...args) {
    console.log(`[${new Date().toISOString()}] ✅ SUCCESS:`, message, ...args);
  }
  
  static error(message, ...args) {
    console.error(`[${new Date().toISOString()}] ❌ ERROR:`, message, ...args);
  }
  
  static warn(message, ...args) {
    console.warn(`[${new Date().toISOString()}] ⚠️  WARN:`, message, ...args);
  }
  
  static debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] 🐛 DEBUG:`, message, ...args);
    }
  }
}

module.exports = Logger;
