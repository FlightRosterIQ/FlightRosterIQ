// Production-ready logging
// Logs to console in dev, can be extended to file/service in production

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(level = 'INFO') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    this.isProd = process.env.NODE_ENV === 'production';
  }

  formatMessage(level, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    return [prefix, ...args];
  }

  error(...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(...this.formatMessage('ERROR', ...args));
    }
  }

  warn(...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(...this.formatMessage('WARN', ...args));
    }
  }

  info(...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(...this.formatMessage('INFO', ...args));
    }
  }

  debug(...args) {
    if (this.level >= LOG_LEVELS.DEBUG && !this.isProd) {
      console.log(...this.formatMessage('DEBUG', ...args));
    }
  }

  request(req) {
    this.info(`${req.method} ${req.url}`, req.ip || req.connection.remoteAddress);
  }
}

module.exports = new Logger(process.env.LOG_LEVEL || 'INFO');
