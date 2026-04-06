/**
 * Base URL for Socket.IO (chat, moderation, transcripts, debate).
 *
 * Priority: explicit chat URL → API origin (no `/api` suffix) → browser same-origin.
 * Same-origin works when `next.config` rewrites `/socket.io/*` to Nest (see fallback rewrites).
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
