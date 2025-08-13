import './loadEnv.js';
import logger from './src/utils/logger.js';
import connectDb from './src/config/dbConfig.mjs';
import app from './src/app.js';

const port = process.env.PORT;
const { DATABASE_URL } = process.env;

connectDb(DATABASE_URL);
console.log("test")
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server starting at: http://0.0.0.0:${port}`);
  logger.info(`Starting server at: http://0.0.0.0:${port}`);
});


process.on('uncaughtException', (err) => {
  // console.error('Uncaught Exception:', err);
  logger.error(`Uncaught Exception: ${err.name}: ${err.message}: ${err.stack}`);
  process.exit(1);
});

// Catch unhandled rejections outside the app
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(`${err.name}: ${err.message}: ${err.stack}`);
  server.close(() => {
    process.exit(1);
  });
});

export default server;


