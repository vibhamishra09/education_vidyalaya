import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, headers } = request;

    // Set context for better error tracking
    Sentry.setContext('http', {
      method,
      url,
      headers: {
        'user-agent': headers['user-agent'],
        'content-type': headers['content-type'],
      },
    });

    // Add user context if available (from Clerk or your auth system)
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    }

    return next.handle().pipe(
      tap(() => {
        // Request completed successfully
      }),
      catchError((error) => {
        // Capture exceptions to Sentry
        if (error instanceof HttpException) {
          const status = error.getStatus();

          // Only report server errors (5xx) to Sentry
          // You can adjust this logic based on your needs
          if (status >= 500) {
            Sentry.captureException(error, {
              contexts: {
                http: {
                  method,
                  url,
                  status_code: status,
                },
              },
              tags: {
                endpoint: url,
                method,
                status: status.toString(),
              },
            });
          } else {
            // For client errors (4xx), just add breadcrumb
            Sentry.addBreadcrumb({
              category: 'http',
              message: `${method} ${url} - ${status}`,
              level: 'warning',
              data: {
                status,
                message: error.message,
              },
            });
          }
        } else {
          // Capture all non-HTTP exceptions
          Sentry.captureException(error, {
            contexts: {
              http: {
                method,
                url,
              },
            },
            tags: {
              endpoint: url,
              method,
              error_type: error.constructor.name,
            },
          });
        }

        return throwError(() => error);
      }),
    );
  }
}
