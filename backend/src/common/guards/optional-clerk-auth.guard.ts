import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OptionalClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalClerkAuthGuard.name);

  private clerkClient;

  constructor(private readonly prisma: PrismaService) {
    this.clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
  }

  private getEmailFromAuth(auth: any): string | null {
    const claims = auth?.sessionClaims || auth?.claims;

    const directEmail =
      claims?.email || claims?.email_address || claims?.primary_email_address;
    this.logger.debug(
      `[OptionalAuthEmail] claim keys: ${Object.keys(claims || {}).join(', ') || 'none'}`,
    );
    if (typeof directEmail === 'string' && directEmail.trim()) {
      this.logger.debug('[OptionalAuthEmail] using direct email claim');
      return directEmail.trim().toLowerCase();
    }

    const emailAddresses = claims?.email_addresses;
    if (Array.isArray(emailAddresses) && emailAddresses.length > 0) {
      const firstEmail =
        emailAddresses[0]?.email_address || emailAddresses[0]?.email;
      if (typeof firstEmail === 'string' && firstEmail.trim()) {
        this.logger.debug(
          '[OptionalAuthEmail] using first email from email_addresses',
        );
        return firstEmail.trim().toLowerCase();
      }
    }

    this.logger.debug('[OptionalAuthEmail] email not present in token claims');
    return null;
  }

  private async validateAndSyncUserIdentity(clerkId: string, email: string) {
    this.logger.debug(
      `[OptionalIdentitySync] checking email match for ${email} with clerkId ${clerkId}`,
    );
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
      select: {
        id: true,
        clerkId: true,
        upgradedToProduction: true,
      },
    });

    if (!user) {
      this.logger.debug('[OptionalIdentitySync] no user found by email');
      throw new UnauthorizedException('Invalid authorization');
    }

    if (user.clerkId === clerkId) {
      this.logger.debug('[OptionalIdentitySync] clerkId already matches');
      return;
    }

    if (user.upgradedToProduction) {
      this.logger.debug(
        `[OptionalIdentitySync] clerkId mismatch after production upgrade (stored=${user.clerkId}, incoming=${clerkId})`,
      );
      throw new UnauthorizedException('Invalid authorization');
    }

    this.logger.debug(
      `[OptionalIdentitySync] upgrading clerkId from ${user.clerkId} to ${clerkId}`,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        clerkId,
        upgradedToProduction: true,
      },
    });

    // Update Clerk metadata to mark onboarding as complete when upgraded to production
    try {
      // First, get the user to merge existing metadata
      const clerkUser = await this.clerkClient.users.getUser(clerkId);
      const existingMetadata = (clerkUser.publicMetadata as Record<string, any>) || {};
      
      // Merge with existing metadata
      await this.clerkClient.users.updateUser(clerkId, {
        publicMetadata: {
          ...existingMetadata,
          onboardingComplete: true,
        },
      });
      this.logger.debug(
        `[OptionalIdentitySync] Updated Clerk metadata: onboardingComplete=true for clerkId ${clerkId}`,
      );
    } catch (error: any) {
      // Log error but don't fail the upgrade process
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorStack = error?.stack || '';
      this.logger.warn(
        `[OptionalIdentitySync] Failed to update Clerk metadata for clerkId ${clerkId}: ${errorMessage}`,
        errorStack,
      );
    }
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
        {
          jwtKey: process.env.CLERK_JWT_KEY,
        },
      );

      // Only proceed if the request state indicates the user is signed in
      // Check both isSignedIn and that we can get auth without errors
      if (requestState && requestState.isSignedIn) {
        try {
          // Get the auth object from the request state
          // This may throw if the state is invalid, so we wrap it in try-catch
          const auth = requestState.toAuth();

          if (auth && auth.userId) {
            const email = this.getEmailFromAuth(auth);
            if (!email) {
              this.logger.debug(
                '[OptionalAuthFlow] signed-in token provided without email claim',
              );
              throw new UnauthorizedException('Email not found in token');
            }

            await this.validateAndSyncUserIdentity(auth.userId, email);

            // Attach user ID to request for use in controllers
            request.userId = auth.userId;
            request.userEmail = email;
            request.auth = auth;
          }
        } catch (authError) {
          if (authError instanceof UnauthorizedException) {
            throw authError;
          }

          // If toAuth() fails, just continue without setting userId
          // This is fine - the endpoint should work without authentication
          // Don't log this as it's expected for optional auth
        }
      }
      // If requestState.isSignedIn is false, we just continue without setting userId
      // This is the expected behavior for optional authentication
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

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
