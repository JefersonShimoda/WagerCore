import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../../../domain/shared/errors/domain.error.js';
import { ConflictError } from '../../../application/errors/conflict.error.js';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let type = 'about:blank';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      title = res.error || 'HTTP Error';
      detail = res.message || exception.message;
      type = `https://httpstatuses.com/${status}`;
    } else if (exception instanceof ConflictError) {
      status = HttpStatus.CONFLICT;
      title = 'Conflict';
      detail = exception.message;
      code = exception.code;
      type = `urn:wager-core:error:conflict:${code ? code.toLowerCase() : 'unknown'}`;
    } else if (exception instanceof DomainError) {
      status = HttpStatus.BAD_REQUEST;
      title = 'Bad Request';
      detail = exception.message;
      code = exception.code;
      type = `urn:wager-core:error:domain:${code ? code.toLowerCase() : 'unknown'}`;
    } else {
      this.logger.error(`Unhandled exception: ${String(exception)}`, (exception as Error).stack);
    }

    response.status(status).json({
      type,
      title,
      status,
      detail,
      instance: request.url,
      ...(code ? { code } : {}),
    });
  }
}
