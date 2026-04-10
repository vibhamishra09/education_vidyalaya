/**
 * Base URL for Socket.IO (chat, moderation, transcripts, debate).
 *
 * Order:
 * 1. `NEXT_PUBLIC_CHAT_WS_URL` — explicit override.
 * 2. If `NEXT_PUBLIC_API_URL` points at **localhost / 127.0.0.1**, use that origin directly
 *    (e.g. `http://localhost:3001`). Avoids relying on Next’s `/socket.io` rewrite + default port
 *    mismatch (Nest is usually 3001; rewrite fallback was 3002).
 * 3. If the app runs on **localhost** but the API env is a **remote** host, use **same-origin**
 *    so `/socket.io` is proxied to `BACKEND_URL` (guest tokens match local Nest).
 * 4. Otherwise use API origin, then page origin, then dev fallback.
 */

function stripApiSuffix(url: string): string {
	return url.trim().replace(/\/api\/?$/, '').replace(/\/$/, '')
}

function parseHttpOrigin(raw: string | undefined): string | null {
	const t = raw?.trim()
	if (!t || !/^https?:\/\//i.test(t)) return null
	try {
		return new URL(stripApiSuffix(t)).origin.replace(/\/$/, '')
	} catch {
		return null
	}
}

function isLoopbackHost(hostname: string): boolean {
	const h = hostname.toLowerCase()
	return h === 'localhost' || h === '127.0.0.1'
}

export function getSocketIoBaseUrl(): string {
	const chat = process.env.NEXT_PUBLIC_CHAT_WS_URL?.trim().replace(/\/$/, '')
	if (chat) return chat

	const apiOrigin = parseHttpOrigin(process.env.NEXT_PUBLIC_API_URL)
	if (apiOrigin) {
		try {
			const host = new URL(apiOrigin).hostname
			if (isLoopbackHost(host)) {
				return apiOrigin
			}
		} catch {
			/* noop */
		}
	}

	if (typeof window !== 'undefined') {
		try {
			const pageHost = window.location.hostname.toLowerCase()
			if (isLoopbackHost(pageHost)) {
				// Remote API while UI on localhost: proxy via Next → BACKEND_URL (local Nest).
				if (apiOrigin) {
					try {
						const apiHost = new URL(apiOrigin).hostname.toLowerCase()
						if (!isLoopbackHost(apiHost)) {
							return window.location.origin.replace(/\/$/, '')
						}
					} catch {
						return window.location.origin.replace(/\/$/, '')
					}
				}
				// No API URL or only loopback already handled above — same-origin + rewrite.
				if (!process.env.NEXT_PUBLIC_API_URL?.trim()) {
					return window.location.origin.replace(/\/$/, '')
				}
			}
		} catch {
			/* noop */
		}
	}

	if (apiOrigin) return apiOrigin

	if (typeof window !== 'undefined' && window.location?.origin) {
		return window.location.origin.replace(/\/$/, '')
	}

	return 'http://127.0.0.1:3001'
}
