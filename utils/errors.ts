// File: utils/errors.ts

export interface ErrorResponse {
  status: 'error';
  message: string;
  statusCode: number;
  errorCode?: string;
}

export class AppError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input data') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class TokenError extends AppError {
  constructor(message = 'Token error occurred') {
    super(message, 401, 'TOKEN_ERROR');
  }
}

export class AccessRevokedError extends AppError {
  constructor(message = 'Access has been revoked') {
    super(message, 403, 'ACCESS_REVOKED_ERROR');
  }
}

export function createErrorResponse(error: AppError): ErrorResponse {
  return {
    status: 'error',
    message: error.message,
    statusCode: error.statusCode,
    errorCode: error.errorCode
  };
}

export function getClientErrorMessage(error: AppError): string {
  switch (error.errorCode) {
    case 'DATABASE_ERROR':
      return 'We\'re experiencing technical difficulties. Please try again later.';
    case 'VALIDATION_ERROR':
      return 'Please check your input and try again.';
    case 'AUTHENTICATION_ERROR':
      return 'Please log in to continue.';
    case 'AUTHORIZATION_ERROR':
      return 'You don\'t have permission to perform this action.';
    case 'NOT_FOUND_ERROR':
      return 'The requested information could not be found.';
    case 'TOKEN_ERROR':
      return 'There was an issue with your authentication. Please try logging in again.';
    case 'ACCESS_REVOKED_ERROR':
      return 'Your access to the required services has been revoked. Please re-authorize the application.';
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}