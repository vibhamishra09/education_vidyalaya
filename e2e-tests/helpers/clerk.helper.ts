/**
 * clerk.helper.ts
 *
 * Utilities for interacting with Clerk's backend API during tests.
 * Requires CLERK_SECRET_KEY in the environment.
 *
 * NOTE: Only use in global-setup / global-teardown, not in individual tests.
 */

const CLERK_API = 'https://api.clerk.com/v1';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

function clerkHeaders() {
  if (!CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY is not set in the environment');
  }
  return {
    Authorization: `Bearer ${CLERK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

interface ClerkUser {
  id: string;
  email_addresses: { email_address: string }[];
}

/** Find a Clerk user by email address. */
export async function findUserByEmail(email: string): Promise<ClerkUser | null> {
  const params = new URLSearchParams({ email_address: email });
  const res = await fetch(`${CLERK_API}/users?${params}`, { headers: clerkHeaders() });
  if (!res.ok) return null;
  const data = (await res.json()) as ClerkUser[];
  return data[0] ?? null;
}

/** Delete a Clerk user by ID. */
export async function deleteClerkUser(userId: string): Promise<void> {
  await fetch(`${CLERK_API}/users/${userId}`, {
    method: 'DELETE',
    headers: clerkHeaders(),
  });
}

/** Set onboardingComplete: true in a user's public metadata. */
export async function setOnboardingComplete(userId: string): Promise<void> {
  await fetch(`${CLERK_API}/users/${userId}/metadata`, {
    method: 'PATCH',
    headers: clerkHeaders(),
    body: JSON.stringify({ public_metadata: { onboardingComplete: true } }),
  });
}

/** Create a test user via Clerk's backend API. Returns the created user ID. */
export async function createTestUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${CLERK_API}/users`, {
    method: 'POST',
    headers: clerkHeaders(),
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: true,
      skip_password_requirement: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Clerk user: ${text}`);
  }

  const user = (await res.json()) as ClerkUser;
  return user.id;
}

/** Generate a unique test email to avoid collisions between test runs. */
export function uniqueTestEmail(prefix = 'e2e') {
  return `${prefix}+${Date.now()}@webyalaya.test`;
}
