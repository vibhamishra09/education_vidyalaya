import { Controller, Get, InternalServerErrorException } from '@nestjs/common';

/**
 * Debug Controller
 * 
 * This controller provides debugging and testing endpoints.
 * These endpoints are PUBLIC (no auth guard) to facilitate testing.
 */
@Controller('debug')
export class DebugController {
  /**
   * GET /debug/trigger-500
   * 
   * Intentionally throws a 500 Internal Server Error.
   * Used for testing error monitoring, alerts, and Prometheus/Grafana configuration.
   * 
   * @throws {InternalServerErrorException} Always throws this error
   */
  @Get('trigger-500')
  trigger500() {
    throw new InternalServerErrorException(
      'This is an intentional 500 error for testing alerts and monitoring',
    );
  }

  /**
   * GET /debug/health
   * 
   * Simple health check endpoint for testing.
   * 
   * @returns {object} Health status
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Debug controller is working',
    };
  }
}
