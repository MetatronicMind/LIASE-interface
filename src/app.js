import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
// import swaggerUI from 'swagger-ui-express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { payloadSizeLimit, requestLimit } from './config/constants.mjs';
// import swaggerSpec from './swagger.js';
import AppError from './utils/appError.js';
import errorHandler from './errors/errorHandler.js';
import sizeLimit from './middlewares/sizeLimit.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/storage', express.static(path.join(__dirname, 'storage')));

app.use(express.urlencoded({ extended: true }));

// Body parsing middleware with size limit
app.use(sizeLimit(payloadSizeLimit));
app.use(helmet());
app.use(rateLimit(requestLimit));
app.use(mongoSanitize());
app.use(hpp()); // exceptions can be made
app.use(cors());
app.options('*', cors());



app.get('/liase/v1/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is working correctly!',
    timestamp: new Date().toISOString(),
    data: {
      service: 'LIASE',
      version: 'v1',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});



app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

export default app;
