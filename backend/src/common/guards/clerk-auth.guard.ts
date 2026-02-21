import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  private clerkClient;

  constructor(private readonly prisma: PrismaService) {
    this.clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
  }

  private getEmailFromAuth(auth: any): string | null {
    const claims = auth?.sessionClaims || auth?.claims;
    
    // Always visible log
    const claimKeys = Object.keys(claims || {}).join(', ') || 'none';
    this.logger.log(`[AuthEmail] claim keys: ${claimKeys}`);
    console.log(`[AuthEmail] claim keys: ${claimKeys}`);

    const directEmail =
      claims?.email || claims?.email_address || claims?.primary_email_address;
    if (typeof directEmail === 'string' && directEmail.trim()) {
      this.logger.log(`[AuthEmail] using direct email claim: ${directEmail}`);
      console.log(`[AuthEmail] using direct email claim: ${directEmail}`);
      return directEmail.trim().toLowerCase();
    }

    const emailAddresses = claims?.email_addresses;
    if (Array.isArray(emailAddresses) && emailAddresses.length > 0) {
      const firstEmail =
        emailAddresses[0]?.email_address || emailAddresses[0]?.email;
      if (typeof firstEmail === 'string' && firstEmail.trim()) {
        this.logger.log(`[AuthEmail] using first email from email_addresses: ${firstEmail}`);
        console.log(`[AuthEmail] using first email from email_addresses: ${firstEmail}`);
        return firstEmail.trim().toLowerCase();
      }
    }

    this.logger.log('[AuthEmail] email not present in token claims');
    console.log('[AuthEmail] email not present in token claims');
    return null;
  }

  private async validateAndSyncUserIdentity(clerkId: string, email: string) {
    this.logger.log(
      `[IdentitySync] checking email match for ${email} with clerkId ${clerkId}`,
    );
    console.log(
      `[IdentitySync] checking email match for ${email} with clerkId ${clerkId}`,
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
      this.logger.log('[IdentitySync] no user found by email');
      console.log('[IdentitySync] no user found by email');
      throw new UnauthorizedException('Invalid authorization');
    }

    if (user.clerkId === clerkId) {
      this.logger.log('[IdentitySync] clerkId already matches');
      console.log('[IdentitySync] clerkId already matches');
      return;
    }

    if (user.upgradedToProduction) {
      this.logger.log(
        `[IdentitySync] clerkId mismatch after production upgrade (stored=${user.clerkId}, incoming=${clerkId})`,
      );
      console.log(
        `[IdentitySync] clerkId mismatch after production upgrade (stored=${user.clerkId}, incoming=${clerkId})`,
      );
      throw new UnauthorizedException('Invalid authorization');
    }

    this.logger.log(
      `[IdentitySync] upgrading clerkId from ${user.clerkId} to ${clerkId}`,
    );
    console.log(
      `[IdentitySync] upgrading clerkId from ${user.clerkId} to ${clerkId}`,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        clerkId,
        upgradedToProduction: true,
      },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Always visible entry point log
    this.logger.log(`[ClerkAuthGuard] Processing request: ${request.method} ${request.url}`);
    console.log(`[ClerkAuthGuard] Processing request: ${request.method} ${request.url}`);

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

      const email = this.getEmailFromAuth(auth);
      if (!email) {
        this.logger.log('[AuthFlow] blocking request: missing email in claims');
        console.log('[AuthFlow] blocking request: missing email in claims');
        throw new UnauthorizedException('Email not found in token');
      }

      await this.validateAndSyncUserIdentity(auth.userId, email);

      // Attach user ID to request for use in controllers
      request.userId = auth.userId;
      request.userEmail = email;
      request.auth = auth;
      
      this.logger.log(`[ClerkAuthGuard] Authentication successful for userId: ${auth.userId}, email: ${email}`);
      console.log(`[ClerkAuthGuard] Authentication successful for userId: ${auth.userId}, email: ${email}`);

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
