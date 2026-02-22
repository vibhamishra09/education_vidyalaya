import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  private clerkClient;

  constructor() {
    this.clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Check if Authorization header is present
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No authorization token provided');
      }

      // Build a proxy-aware URL for Clerk authentication checks.
      const forwardedProtoHeader = request.get('x-forwarded-proto');
      const forwardedHostHeader = request.get('x-forwarded-host');
      const protocol =
        (typeof forwardedProtoHeader === 'string'
          ? forwardedProtoHeader.split(',')[0]?.trim()
          : undefined) ||
        request.protocol ||
        'http';
      const host =
        (typeof forwardedHostHeader === 'string'
          ? forwardedHostHeader.split(',')[0]?.trim()
          : undefined) ||
        request.get('host') ||
        'localhost:3001';
      const requestPath = request.originalUrl || request.url || '/';
      const fullUrl = `${protocol}://${host}${requestPath}`;
      this.logger.debug(`Clerk authenticateRequest fullUrl=${fullUrl}`);

      // Create a new request object with the full URL
      const clerkRequest = new Request(fullUrl, {
        method: request.method,
        headers: request.headers,
        body:
          request.method !== 'GET' && request.method !== 'HEAD'
            ? JSON.stringify(request.body)
            : undefined,
      });

      // Use Clerk's authenticateRequest method to verify the token
      // The method automatically extracts the token from the Authorization header
      const requestState = await this.clerkClient.authenticateRequest(
        clerkRequest,
        {
          jwtKey: process.env.CLERK_JWT_KEY, // This is the JWT signing key, not the token
        },
      );

      if (!requestState.isSignedIn) {
        throw new UnauthorizedException('User is not authenticated');
      }

      // Get the auth object from the request state
      const auth = requestState.toAuth();

      if (!auth.userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      // Attach user ID to request for use in controllers
      request.userId = auth.userId;
      request.auth = auth;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `Clerk auth context protocol=${request.protocol} host=${request.get('host')} x-forwarded-proto=${request.get('x-forwarded-proto')} x-forwarded-host=${request.get('x-forwarded-host')}`,
        );
      }
      this.logger.debug('Clerk authentication error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
