const Logger = require('../utils/logger');

class Broadcaster {
  constructor() {
    this.wss = null;
  }

  init(wss) {
    this.wss = wss;
  }

  broadcast(type, data) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: type,
      ...data,
      timestamp: Date.now()
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        try {
          client.send(message);
        } catch (error) {
          Logger.error('Broadcast error:', error.message);
        }
      }
    });
  }
}

module.exports = new Broadcaster();
