// File: middleware/errorHandler.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { AppError, createErrorResponse, getClientErrorMessage, DatabaseError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError } from '@/utils/errors';

export const errorHandler = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('Error:', error);

      let appError: AppError;

      if (error instanceof AppError) {
        appError = error;
      } else if (error instanceof Error) {
        // Convert generic errors to AppError
        appError = new AppError(error.message, 500, 'INTERNAL_SERVER_ERROR');
      } else {
        appError = new AppError('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR');
      }

      const errorResponse = createErrorResponse(appError);
      const clientMessage = getClientErrorMessage(appError);

      // In production, we might want to hide the actual error message and only show the client-friendly message
      if (process.env.NODE_ENV === 'production') {
        errorResponse.message = clientMessage;
      } else {
        // In development, we can show both the original error and the client-friendly message
        errorResponse.message = `${errorResponse.message} (Client message: ${clientMessage})`;
      }

      res.status(appError.statusCode).json(errorResponse);
    }
  };
};

export const withErrorHandling = <T>(handler: () => Promise<T>): Promise<T> => {
  return handler().catch((error) => {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error) {
      // Convert known error types to specific AppError subclasses
      if (error.name === 'DatabaseError') {
        throw new DatabaseError(error.message);
      }
      if (error.name === 'ValidationError') {
        throw new ValidationError(error.message);
      }
      if (error.name === 'AuthenticationError') {
        throw new AuthenticationError(error.message);
      }
      if (error.name === 'AuthorizationError') {
        throw new AuthorizationError(error.message);
      }
      if (error.name === 'NotFoundError') {
        throw new NotFoundError(error.message);
      }
    }
    // For unknown errors, throw a generic AppError
    throw new AppError('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR');
  });
};