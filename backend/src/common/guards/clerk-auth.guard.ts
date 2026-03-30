/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { attachAuthenticatedUser } from '../auth/clerk-auth.utils';

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

      // Construct a proper URL for Clerk's authenticateRequest
      const protocol = request.protocol || 'http';
      const host = request.get('host') || 'localhost:3001';
      const fullUrl = `${protocol}://${host}${request.url}`;

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
        process.env.CLERK_JWT_KEY
          ? {
            jwtKey: process.env.CLERK_JWT_KEY,
          }
          : undefined,
      );

      if (!requestState.isSignedIn) {
        throw new UnauthorizedException('User is not authenticated');
      }

      // Get the auth object from the request state
      const auth = requestState.toAuth();

      if (!auth.userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      attachAuthenticatedUser(request, auth);

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.debug('Clerk authentication error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
