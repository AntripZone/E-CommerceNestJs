import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const url = req.originalUrl || req.url;

    const startTime = Date.now();
    console.log(`[solicitud] ==> inicia ${startTime} ${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        console.log(
          `[respuesta] == finaliza ${responseTime}MS  ${method} ${url}`,
        );
      }),
    );
  }
}
