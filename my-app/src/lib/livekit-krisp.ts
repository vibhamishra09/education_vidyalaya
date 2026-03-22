/**
 * LiveKit Krisp needs a Cloud entitlement; without it the filter calls Krisp auth and returns 404.
 * Opt in explicitly: set NEXT_PUBLIC_ENABLE_KRISP=true in .env.local when your project has Krisp enabled.
 */
export function isLiveKitKrispEnabled(): boolean {
	return process.env.NEXT_PUBLIC_ENABLE_KRISP === 'true'
}
