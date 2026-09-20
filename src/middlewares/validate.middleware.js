import { ValidationError } from '../errors/index.js';

/**
 * Валидирует body, query, params по переданным Zod-схемам.
 * Очищенные и преобразованные данные складываются в req.valid[part].
 * Неизвестные поля отбрасываются либо бракуются согласно z.strictObject().
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = req.valid || {};

    const parts = ['body', 'query', 'params'];

    for (const part of parts) {
      if (!schemas[part]) continue;

      const result = schemas[part].safeParse(req[part]);

      if (!result.success) {
        return next(new ValidationError(result.error));
      }

      req.valid[part] = result.data;
    }

    return next();
  };
}
