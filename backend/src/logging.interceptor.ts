import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const { method, route, originalUrl } = request;
    // Use the route path if available (from route handler), otherwise use originalUrl
    const path = route?.path || originalUrl || 'unknown';
    
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - start) / 1000; // Convert to seconds
          const statusCode = response.statusCode;

          this.httpRequestDuration.observe(
            {
              method: method,
              route: path,
              status_code: statusCode.toString(),
            },
            duration,
          );
        },
        error: (error) => {
          const duration = (Date.now() - start) / 1000;
          const statusCode = error.status || 500;

          this.httpRequestDuration.observe(
            {
              method: method,
              route: path,
              status_code: statusCode.toString(),
            },
            duration,
          );
        },
      }),
    );
  }
}
