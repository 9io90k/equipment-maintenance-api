import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

const limiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, _res, next) => {
    const error = new Error('Слишком много попыток входа, повторите попытку позже');
    error.status = 429;
    error.code = 'TOO_MANY_REQUESTS';
    return next(error);
  },
});

export const authRateLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  return limiter(req, res, next);
};
