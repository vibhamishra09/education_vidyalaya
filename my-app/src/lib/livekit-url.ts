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
