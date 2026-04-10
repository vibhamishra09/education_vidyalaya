/**
 * Read participant identity from a LiveKit access token JWT (browser).
 * Used when the API already returned `identity` separately but state order left it empty —
 * moderation Socket.IO must use the same id as `participant.identity`.
 */
export function parseLivekitAccessTokenIdentity(
	jwt: string | null | undefined,
): string | null {
	if (!jwt || typeof jwt !== 'string') return null
	const parts = jwt.split('.')
	if (parts.length < 2) return null
	try {
		const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
		const pad = (4 - (b64.length % 4)) % 4
		const padded = b64 + '='.repeat(pad)
		if (typeof atob === 'undefined') return null
		const json = atob(padded)
		const payload = JSON.parse(json) as { sub?: string }
		return typeof payload.sub === 'string' && payload.sub.length > 0
			? payload.sub
			: null
	} catch {
		return null
	}
}
