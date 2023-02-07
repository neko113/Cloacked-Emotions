import { HttpException } from '@nestjs/common';

export const errors = {
  BadRequest: {
    statusCode: 400,
    message: 'Bad Request',
  },
  Unauthorized: {
    statusCode: 401,
    message: 'Unauthorized',
  },
  // Unlike a 401 Unauthorized response, authenticating will make no difference.
  Forbidden: {
    statusCode: 403,
    message: 'Forbidden',
  },
  NotFound: {
    statusCode: 404,
    message: 'Not Found',
  },
  Unknown: {
    statusCode: 500,
    message: 'Unknown error',
  },
};

type ErrorName = keyof typeof errors;

export class AppErrorException extends HttpException {
  constructor(name: ErrorName, message?: string) {
    const errorInfo = errors[name];
    super(
      {
        statusCode: errorInfo.statusCode,
        message: message || errorInfo.message,
      },
      errorInfo.statusCode,
    );
  }
}
