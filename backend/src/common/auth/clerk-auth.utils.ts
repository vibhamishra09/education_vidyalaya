type ClerkSessionClaims = Record<string, unknown> & {
  metadata?: Record<string, unknown>;
};

type ClerkAuthLike = {
  userId?: string | null;
  sessionClaims?: ClerkSessionClaims;
};

function getStringClaim(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function extractDbUserIdFromAuth(auth: ClerkAuthLike): string | undefined {
  const claims = auth.sessionClaims;

  return (
    getStringClaim(claims?.metadata?.dbUserId) ??
    getStringClaim(claims?.metadata?.userId) ??
    getStringClaim(claims?.dbUserId) ??
    getStringClaim(claims?.db_user_id) ??
    undefined
  );
}

export function attachAuthenticatedUser(request: any, auth: ClerkAuthLike): void {
  const clerkUserId = auth.userId ?? undefined;
  const dbUserId = extractDbUserIdFromAuth(auth);

  request.auth = auth;
  request.userId = clerkUserId;
  request.clerkUserId = clerkUserId;
  request.dbUserId = dbUserId;
}
