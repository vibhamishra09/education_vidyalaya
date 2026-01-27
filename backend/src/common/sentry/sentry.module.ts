import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Global()
@Module({})
export class SentryModule {
  static forRoot() {
    return {
      module: SentryModule,
      providers: [
        {
          provide: 'SENTRY_INIT',
          useFactory: (configService: ConfigService) => {
            const dsn = configService.get<string>('SENTRY_DSN');
            const environment = configService.get<string>('NODE_ENV', 'development');
            
            if (!dsn) {
              console.warn('⚠️  SENTRY_DSN not configured. Sentry will not be initialized.');
              return null;
            }

            Sentry.init({
              dsn,
              environment,
              // Performance Monitoring
              tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev
              
              // Profiling
              profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
              integrations: [
                // Add profiling integration
                nodeProfilingIntegration(),
              ],
              
              // Release tracking
              release: configService.get<string>('SENTRY_RELEASE', 'webyalaya-backend@1.0.0'),
              
              // Additional options
              beforeSend(event, hint) {
                // Filter out sensitive data
                if (event.request) {
                  // Remove sensitive headers
                  if (event.request.headers) {
                    delete event.request.headers['authorization'];
                    delete event.request.headers['cookie'];
                  }
                  
                  // Remove sensitive query parameters
                  if (event.request.query_string && typeof event.request.query_string === 'string') {
                    const sensitiveParams = ['token', 'password', 'api_key', 'secret'];
                    let queryString = event.request.query_string;
                    sensitiveParams.forEach(param => {
                      if (queryString.includes(param)) {
                        queryString = queryString.replace(
                          new RegExp(`${param}=[^&]*`, 'gi'),
                          `${param}=[REDACTED]`
                        );
                      }
                    });
                    event.request.query_string = queryString;
                  }
                }
                
                return event;
              },
              
              // Ignore certain errors
              ignoreErrors: [
                // Browser errors
                'ResizeObserver loop limit exceeded',
                'Non-Error promise rejection captured',
                // Network errors
                'NetworkError',
                'Network request failed',
                // Common errors to ignore
                'ECONNRESET',
                'ETIMEDOUT',
              ],
            });

            console.log(`✅ Sentry initialized for environment: ${environment}`);
            return Sentry;
          },
          inject: [ConfigService],
        },
      ],
      exports: ['SENTRY_INIT'],
    };
  }
}
