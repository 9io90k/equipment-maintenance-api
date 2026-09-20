import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from './logger.js';

export const asyncLocalStorage = new AsyncLocalStorage();

export const contextMiddleware = (req, res, next) => {
  asyncLocalStorage.run({ requestId: req.id, log: req.log }, next);
};

export const getLog = () => asyncLocalStorage.getStore()?.log ?? logger;
export const getRequestId = () => asyncLocalStorage.getStore()?.requestId ?? null;
