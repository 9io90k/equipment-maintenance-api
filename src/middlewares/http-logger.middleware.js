import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger.js';

export const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const existing = req.id ?? req.headers['x-request-id'];
    if (existing) {
      res.setHeader('X-Request-Id', existing);
      return existing;
    }
    const id = randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage(req, res, responseTime) {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode} in ${responseTime}ms`;
  },
  customErrorMessage(req, res, err) {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode} error: ${err.message}`;
  },
  autoLogging: {
    ignore: (req) => req.url === '/api/health' && req.method === 'GET',
  },
});
