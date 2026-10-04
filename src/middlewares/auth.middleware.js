import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';

export const authenticate = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Требуется аутентификация'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    return next();
  } catch {
    return next(new UnauthorizedError('Невалидный или истекший токен'));
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Требуется аутентификация'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Недостаточно прав'));
    }

    return next();
  };
};
