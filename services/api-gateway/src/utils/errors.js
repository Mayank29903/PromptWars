export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const NotFoundError = (resource) => new AppError(`${resource} not found`, 404, 'NOT_FOUND');
export const ValidationError = (msg) => new AppError(msg, 400, 'VALIDATION_ERROR');
export const UnauthorizedError = (msg = 'Unauthorized') => new AppError(msg, 401, 'UNAUTHORIZED');
export const ForbiddenError = (msg = 'Forbidden') => new AppError(msg, 403, 'FORBIDDEN');
export const ConflictError = (msg) => new AppError(msg, 409, 'CONFLICT');
