/**
 * Browser LiveKit clients expect ws(s) URLs. Dashboards sometimes copy https://…
 * which breaks WebRTC signaling / ICE setup.
 */
export function normalizeLiveKitServerUrl(raw: string | null | undefined): string {
	if (raw == null) return ''
	let u = String(raw).trim()
	if (!u) return ''
	while (u.endsWith('/')) u = u.slice(0, -1)
	if (/^https:\/\//i.test(u)) return 'wss://' + u.slice(8)
	if (/^http:\/\//i.test(u)) return 'ws://' + u.slice(7)
	return u
}

/**
 * @livekit/krisp-noise-filter calls `GET https://<livekit-host>/settings` with the join token.
 * Only LiveKit Cloud (and rare proxies) implement that. Self-hosted (e.g. livekit.webyalaya.com) → 404,
 * "Could not authenticate", and a broken mic processor — do not load Krisp there.
 *
 * Enable Krisp when:
 * - Host is `*.livekit.cloud` and Krisp is not forced off (`NEXT_PUBLIC_LIVEKIT_KRISP_ENABLED !== 'false'`), or
 * - Host is listed in `NEXT_PUBLIC_LIVEKIT_KRISP_ALLOW_HOSTS` (comma-separated) and `..._KRISP_ENABLED=true`.
 */
export function shouldApplyKrispNoiseFilter(serverWsUrl: string | undefined | null): boolean {
	if (process.env.NEXT_PUBLIC_LIVEKIT_KRISP_ENABLED === 'false') return false
	const raw = serverWsUrl?.trim()
	if (!raw) return false
	try {
		const forParse = raw.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:')
		const host = new URL(forParse).hostname.toLowerCase()

		if (host.endsWith('.livekit.cloud')) {
			return true
		}

		const allowRaw = process.env.NEXT_PUBLIC_LIVEKIT_KRISP_ALLOW_HOSTS?.trim()
		if (allowRaw) {
			const allowed = allowRaw
				.split(',')
				.map((h) => h.trim().toLowerCase())
				.filter(Boolean)
			if (allowed.includes(host)) {
				return process.env.NEXT_PUBLIC_LIVEKIT_KRISP_ENABLED === 'true'
			}
		}

		return false
	} catch {
		return false
	}
}
