/**
 * Base URL for Socket.IO (chat, moderation, transcripts, debate).
 *
 * On production, if `NEXT_PUBLIC_CHAT_WS_URL` / `NEXT_PUBLIC_API_URL` were not set
 * at build time, the old `localhost` fallback broke live. In the browser we use
 * the current origin so same-host deployments still connect.
 */
export function getSocketIoBaseUrl(): string {
	const chat = process.env.NEXT_PUBLIC_CHAT_WS_URL?.trim().replace(/\/$/, '')
	if (chat) return chat

	const api = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '').replace(/\/$/, '')
	if (api) return api

	if (typeof window !== 'undefined' && window.location?.origin) {
		return window.location.origin
	}

	return 'http://127.0.0.1:3002'
}
