import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) {
    return _next(err);
  }

  const log = req.log ?? logger;

  let status = err.status ?? err.statusCode ?? 500;
  let code = err.code ?? (status === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR');
  let message = err.message;
  let isOperational = err.isOperational === true || status < 500;

  if (err.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    code = 'CONFLICT';
    message = err.errors?.[0]?.message || 'Запись с такими уникальными данными уже существует';
    isOperational = true;
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    status = 409;
    code = 'CONFLICT';
    message = 'Операция отклонена: нарушение связности внешнего ключа в базе данных';
    isOperational = true;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Синтаксически некорректный JSON в теле запроса';
    isOperational = true;
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Размер тела запроса превышает допустимый лимит';
    isOperational = true;
  }

  if (status >= 500) {
    log.error({ err, status, requestId: req.id }, 'Internal server error');
  } else {
    log.warn({ err: message, status, code, requestId: req.id }, 'Handled operational error');
  }

  const errorResponse = {
    error: {
      code,
      message: isOperational ? message : 'Внутренняя ошибка сервера',
      ...(err.details && { details: err.details }),
      requestId: req.id,
    },
  };

  if (config.isDevelopment && status >= 500 && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  return res.status(status).json(errorResponse);
}
