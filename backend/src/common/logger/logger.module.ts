import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const isDevelopment = nodeEnv !== 'production';
        const logLevel = configService.get<string>('LOG_LEVEL', 'debug');
        
        // Check if we're in a TTY environment (terminal) or not (like CloudWatch)
        const isTTY = process.stdout.isTTY === true;
        // Use pretty printing only in development AND when in a TTY
        const usePretty = isDevelopment && isTTY;

        // Loki configuration
        const lokiEnabled = configService.get<string>('LOKI_ENABLED', 'false') === 'true';
        const lokiHost = configService.get<string>('LOKI_HOST', 'http://localhost:3100');
        const lokiBatchSize = parseInt(configService.get<string>('LOKI_BATCH_SIZE', '100'), 10);
        const lokiBatchInterval = parseInt(configService.get<string>('LOKI_BATCH_INTERVAL', '5000'), 10);

        // Base Pino configuration - shared between HTTP and application logging
        let basePinoConfig: any = {
          level: logLevel,
        };

        // Configure transport based on environment and Loki settings
        if (lokiEnabled) {
          // When Loki is enabled, use multi-destination transport
          // nestjs-pino supports multiple transports via targets array
          basePinoConfig.transport = {
            targets: [
              // Loki transport
              {
                target: 'pino-loki',
                level: logLevel,
                options: {
                  host: lokiHost,
                  labels: {
                    service: 'webyalaya-backend',
                    environment: nodeEnv,
                  },
                  silenceErrors: false, // Log transport errors for debugging
                },
              },
              // Console transport (pretty in dev, JSON in prod)
              ...(usePretty
                ? [
                    {
                      target: 'pino-pretty',
                      level: logLevel,
                      options: {
                        colorize: true,
                        singleLine: false,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                      },
                    },
                  ]
                : [
                    {
                      target: 'pino/file',
                      level: logLevel,
                      options: {
                        destination: 1, // stdout
                      },
                    },
                  ]),
            ],
          };
        } else {
          // When Loki is disabled, use standard transport configuration
          if (usePretty) {
            basePinoConfig.transport = {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            };
          } else {
            // Pure JSON output: no colorization, no formatting
            // This ensures clean JSON in CloudWatch and production
            basePinoConfig.formatters = {
              level: (label: string) => {
                return { level: label };
              },
            };
          }
        }

        return {
          // Use the same Pino instance for both HTTP and application logging
          ...basePinoConfig,
          // HTTP request logging configuration
          pinoHttp: {
            ...basePinoConfig,
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
