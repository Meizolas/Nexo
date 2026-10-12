import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

interface HttpErrorBody {
  code?: unknown;
  details?: unknown;
  message?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const correlationId = request.id ?? response.getHeader('x-correlation-id');
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = this.readExceptionBody(exception);
    const validationDetails = Array.isArray(body.message) ? body.message : [];
    const isValidationError =
      statusCode === HttpStatus.BAD_REQUEST && validationDetails.length > 0;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          correlationId,
          err: exception,
          method: request.method,
          path: request.url,
        },
        'Unhandled request exception',
      );
    }

    response.status(statusCode).json({
      statusCode,
      code: isValidationError
        ? 'VALIDATION_ERROR'
        : this.resolveCode(body.code, statusCode),
      message: isValidationError
        ? 'Dados inválidos.'
        : this.resolveMessage(body.message, statusCode),
      details: isValidationError
        ? validationDetails
        : Array.isArray(body.details)
          ? body.details
          : [],
      correlationId: String(correlationId ?? ''),
    });
  }

  private readExceptionBody(exception: unknown): HttpErrorBody {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const response = exception.getResponse();
    return typeof response === 'string' ? { message: response } : response;
  }

  private resolveCode(code: unknown, statusCode: number): string {
    if (typeof code === 'string' && /^[A-Z][A-Z0-9_]+$/.test(code)) {
      return code;
    }

    return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
      ? 'INTERNAL_ERROR'
      : `HTTP_${statusCode}`;
  }

  private resolveMessage(message: unknown, statusCode: number): string {
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Ocorreu um erro interno.';
    }

    return typeof message === 'string'
      ? message
      : 'Não foi possível concluir a operação.';
  }
}
