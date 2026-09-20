import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) {
    return _next(err);
  }

  const log = req.log ?? logger;
  const status = err.status ?? err.statusCode ?? 500;
  const isOperational = err.isOperational === true || status < 500;


  if (status >= 500) {
    log.error({ err, status, requestId: req.id }, 'Internal server error');
  } else {
    log.warn({ err: err.message, status, code: err.code, requestId: req.id }, 'Handled operational error');
  }


  let code = err.code ?? (status === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR');
  let message = isOperational ? err.message : 'Внутренняя ошибка сервера';

  if (err.type === 'entity.parse.failed') {
    code = 'INVALID_JSON';
    message = 'Синтаксически некорректный JSON в теле запроса';
  } else if (err.type === 'entity.too.large') {
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Размер тела запроса превышает допустимый лимит';
  }

  const errorResponse = {
    error: {
      code,
      message,
      ...(err.details && { details: err.details }),
      requestId: req.id,
    },
  };


  if (config.isDevelopment && status >= 500 && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  return res.status(status).json(errorResponse);
}
