import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export default async function connectDb(DATABASE_URL) {
  try {
    await mongoose.connect(DATABASE_URL);
    logger.info('Connected to database!');
    console.log('Connected to database!');
  } catch (err) {
    logger.error(`${err.name}: ${err.message}: ${err.stack}`);
    console.log(`${err.name}: ${err.message}: ${err.stack}`);
  }
}

// export async function closeDb() {
//   try {
//     const connection = await mongoose.connection.close();
//     logger.info("Connection closed.");
//   } catch (error) {
//     logger.error(`${err.name}: ${err.message}: ${err.stack}`);

//   }
// }
