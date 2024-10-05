// File: utils/apiUtils.ts
import { NextResponse } from 'next/server';
import { AppError, DatabaseError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError } from './errors';

export async function handleApiError(error: unknown): Promise<NextResponse> {
  console.error('API Error:', error);

  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    // Convert known error types to specific AppError subclasses
    if (error.name === 'DatabaseError') {
      appError = new DatabaseError(error.message);
    } else if (error.name === 'ValidationError') {
      appError = new ValidationError(error.message);
    } else if (error.name === 'AuthenticationError') {
      appError = new AuthenticationError(error.message);
    } else if (error.name === 'AuthorizationError') {
      appError = new AuthorizationError(error.message);
    } else if (error.name === 'NotFoundError') {
      appError = new NotFoundError(error.message);
    } else {
      appError = new AppError(error.message, 500, 'INTERNAL_SERVER_ERROR');
    }
  } else {
    appError = new AppError('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR');
  }

  const errorResponse = {
    status: 'error',
    message: appError.message,
    errorCode: appError.errorCode,
  };

  return NextResponse.json(errorResponse, { status: appError.statusCode });
}

export function withErrorHandling(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}