/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { attachAuthenticatedUser } from '../auth/clerk-auth.utils';

@Injectable()
export class OptionalClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalClerkAuthGuard.name);

  private clerkClient;

  constructor() {
    this.clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if Authorization header is present
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, allow request but don't set userId
      return true;
    }

    try {
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
      // This may throw errors for invalid tokens, which we'll catch and ignore
      const requestState = await this.clerkClient.authenticateRequest(
        clerkRequest,
        process.env.CLERK_JWT_KEY
          ? {
            jwtKey: process.env.CLERK_JWT_KEY,
          }
          : undefined,
      );

      // Only proceed if the request state indicates the user is signed in
      // Check both isSignedIn and that we can get auth without errors
      if (requestState && requestState.isSignedIn) {
        try {
          // Get the auth object from the request state
          // This may throw if the state is invalid, so we wrap it in try-catch
          const auth = requestState.toAuth();

          if (auth && auth.userId) {
            attachAuthenticatedUser(request, auth);
          }
        } catch (authError) {
          // If toAuth() fails, just continue without setting userId
          // This is fine - the endpoint should work without authentication
          // Don't log this as it's expected for optional auth
        }
      }
      // If requestState.isSignedIn is false, we just continue without setting userId
      // This is the expected behavior for optional authentication
    } catch (error: any) {
      // If authentication fails for any reason (invalid token, expired token, etc.),
      // just continue without setting userId. This allows the endpoint to work
      // for both authenticated and unauthenticated users.
      // We don't log this as an error since it's expected behavior for optional auth.
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          'Optional auth: Token validation failed (this is OK):',
          error?.message || 'Unknown error',
        );
      }
    }

    // Always allow the request to proceed
    return true;
  }
}
