import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

class Logger {
  constructor() {
    this.name = 'logger';

    const getTimestampedFilename = () => {
      const date = new Date().toISOString().slice(0, 10);

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      return path.join(__dirname, '../logs', `${date}-application.log`);
    };

    this.logger = pino({
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      transport: {
        target: 'pino/file',
        options: {
          destination: getTimestampedFilename(),
          colorize: false,
          mkdir: true,
        },
      },
    });
  }

  debug(...args) {
    this.logger.debug(...args);
  }

  info(...args) {
    this.logger.info(...args);
  }

  warn(...args) {
    this.logger.warn(...args);
  }

  error(...args) {
    this.logger.error(...args);
  }

  log(...args) {
    this.logger.info(...args);
  }

  trace(...args) {
    this.logger.trace(...args);
  }

  fatal(...args) {
    this.logger.fatal(...args);
  }
}

const logger = new Logger();

export default logger;
