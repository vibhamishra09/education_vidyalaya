/**
 * Opt-in chat pipeline log file (joinee ↔ host: socket, audience, delivery, message text).
 *
 * Append to `my-app/logs/chat-flow.txt`: NEXT_PUBLIC_CHAT_FLOW_FILE=1
 * (requires dev server or CHAT_FLOW_LOG_API=1 on the API route)
 */

const CLIENT_KEY = 'we_chat_flow_client_id'

function getOrCreateClientId(): string {
	if (typeof window === 'undefined') return 'ssr'
	try {
		let id = sessionStorage.getItem(CLIENT_KEY)
		if (!id) {
			id =
				globalThis.crypto?.randomUUID?.() ??
				`cf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
			sessionStorage.setItem(CLIENT_KEY, id)
		}
		return id
	} catch {
		return 'unknown'
	}
}

export function isChatFlowFileEnabled(): boolean {
	return process.env.NEXT_PUBLIC_CHAT_FLOW_FILE === '1'
}

/** Short id in log lines (keeps file rows readable). */
export function chatFlowShortId(id: string | null | undefined): string {
	if (id == null || id === '') return '(none)'
	const s = String(id)
	return s.length <= 14 ? s : `${s.slice(0, 8)}…`
}

const fileBuffer: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_MS = 400
const MAX_BUFFER = 200

function flushFileBufferSyncBeacon(): void {
	if (typeof window === 'undefined' || fileBuffer.length === 0) return
	const lines = fileBuffer.splice(0, fileBuffer.length)
	const payload = JSON.stringify({ lines })
	try {
		const blob = new Blob([payload], { type: 'application/json' })
		navigator.sendBeacon('/api/dev/chat-flow-log', blob)
	} catch {
		fileBuffer.unshift(...lines)
	}
}

function scheduleFileFlush(): void {
	if (typeof window === 'undefined') return
	if (flushTimer) clearTimeout(flushTimer)
	flushTimer = setTimeout(() => {
		flushTimer = null
		void flushFileBufferNow()
	}, FLUSH_MS)
}

async function flushFileBufferNow(): Promise<void> {
	if (fileBuffer.length === 0) return
	const lines = fileBuffer.splice(0, fileBuffer.length)
	try {
		await fetch('/api/dev/chat-flow-log', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ lines }),
			keepalive: true,
		})
	} catch {
		fileBuffer.unshift(...lines)
	}
}

function formatFileLine(step: string, detail?: Record<string, unknown>): string {
	const ts = new Date().toISOString()
	const cid = typeof window !== 'undefined' ? getOrCreateClientId() : 'ssr'
	const safeDetail = { ...detail }
	if (clientHint) {
		;(safeDetail as Record<string, unknown>).page = clientHint
	}
	const line = `${ts}\tclient=${cid}\t${step}\t${JSON.stringify(safeDetail)}`
	return line.length > 8000 ? `${line.slice(0, 7997)}…` : line
}

let clientHint: string | null = null
let bootLogged = false

function ensureBootFileLine(): void {
	if (!isChatFlowFileEnabled() || bootLogged || typeof window === 'undefined') return
	bootLogged = true
	clientHint = `${window.location.pathname}${window.location.search}`
	fileBuffer.push(
		formatFileLine('session:boot', {
			href: window.location.href,
			userAgent: navigator.userAgent?.slice(0, 200),
		}),
	)
	scheduleFileFlush()
}

function queueFileLine(step: string, detail?: Record<string, unknown>): void {
	if (!isChatFlowFileEnabled() || typeof window === 'undefined') return
	ensureBootFileLine()
	if (fileBuffer.length >= MAX_BUFFER) {
		fileBuffer.splice(0, fileBuffer.length - MAX_BUFFER + 1)
	}
	fileBuffer.push(formatFileLine(step, detail))
	scheduleFileFlush()
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
	const onHide = () => {
		if (document.visibilityState === 'hidden') {
			flushFileBufferSyncBeacon()
		}
	}
	window.addEventListener('visibilitychange', onHide)
	window.addEventListener('pagehide', () => flushFileBufferSyncBeacon())
}

export function chatFlowLog(
	step: string,
	detail?: Record<string, unknown>,
): void {
	if (!isChatFlowFileEnabled()) return
	queueFileLine(step, detail)
}
