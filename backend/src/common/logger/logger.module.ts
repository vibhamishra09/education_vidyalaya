import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = configService.get<string>('NODE_ENV') !== 'production';
        const logLevel = configService.get<string>('LOG_LEVEL', 'debug');

        return {
          pinoHttp: {
            level: logLevel,
            // Use pretty printing in development, JSON in production
            transport: isDevelopment
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            // Structured logging configuration
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                headers: {
                  host: req.headers?.host,
                  'user-agent': req.headers?.['user-agent'],
                },
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
              err: (err) => ({
                type: err.type,
                message: err.message,
                stack: err.stack,
              }),
            },
            // Custom log formatter for production (JSON)
            customProps: (req) => ({
              context: 'HTTP',
            }),
            // Auto-logging configuration
            autoLogging: {
              ignore: (req) => {
                // Don't log health checks and metrics endpoints
                return req.url === '/health' || req.url === '/metrics';
              },
            },
            // Request ID generation
            genReqId: (req) => {
              return req.headers['x-request-id'] || req.id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
