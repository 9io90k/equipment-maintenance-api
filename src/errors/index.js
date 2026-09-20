export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details, cause } = {}) {
    super(message, { cause });
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ресурс не найден') {
    super(message, { status: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Конфликт состояния данных') {
    super(message, { status: 409, code: 'CONFLICT' });
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Некорректный запрос', details) {
    super(message, { status: 400, code: 'BAD_REQUEST', details });
  }
}

export class ValidationError extends AppError {
  constructor(zodError) {
    const details = zodError.issues.map((issue) => {
      const field = issue.path.join('.') || 'root';
      return {
        field,
        message: issue.message,
      };
    });

    super('Некорректные данные запроса', {
      status: 400,
      code: 'VALIDATION_ERROR',
      details,
    });
  }
}
