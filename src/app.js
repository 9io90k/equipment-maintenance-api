import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import cookieParser from 'cookie-parser';

import { config } from './config/index.js';
import { httpLogger } from './middlewares/http-logger.middleware.js';
import { contextMiddleware } from './lib/context.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { NotFoundError } from './errors/index.js';
import apiRouter from './routes/index.js';

const app = express();

app.set('trust proxy', 1);

app.use(httpLogger);
app.use(contextMiddleware);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {

      if (!origin) return callback(null, true);
      if (config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Location'],
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, _res, next) => {
    const error = new Error('Слишком много запросов, повторите попытку позже');
    error.status = 429;
    error.code = 'TOO_MANY_REQUESTS';
    return next(error);
  },
});

app.use('/api', limiter);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api', apiRouter);

app.use((req, _res, next) => {
  next(new NotFoundError(`Маршрут ${req.method} ${req.originalUrl} не найден`));
});

app.use(errorHandler);

export default app;
