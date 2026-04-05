/** Normalized chat row aligned with `MessageList` and socket/API payloads. */
export type ChatMessageRow = {
	id: string
	senderId: string | null
	audienceType?: 'EVERYONE' | 'HOST' | 'USER'
	targetUserId?: string | null
	content: string
	createdAt: string
	guestEmail?: string | null
	guestSenderId?: string | null
	sender?: {
		id: string
		name: string
		avatar?: string | null
	}
	targetUser?: {
		id: string
		name: string
		avatar?: string | null
	} | null
}

const AUDIENCES = new Set(['EVERYONE', 'HOST', 'USER'])

function randomSegment(): string {
	return Math.random().toString(36).slice(2, 11)
}

function parseCreatedAt(value: unknown): string {
	if (typeof value === 'string' && value) {
		const t = Date.parse(value)
		if (!Number.isNaN(t)) return new Date(t).toISOString()
	}
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString()
	}
	return new Date().toISOString()
}

export function normalizeChatMessage(msg: unknown): ChatMessageRow {
	if (!msg || typeof msg !== 'object') {
		return {
			id: `invalid-${Date.now()}-${randomSegment()}`,
			senderId: null,
			content: '',
			createdAt: new Date().toISOString(),
		}
	}

	const o = msg as Record<string, unknown>
	const id =
		typeof o.id === 'string' && o.id.trim()
			? o.id
			: `temp-${Date.now()}-${randomSegment()}`

	let senderId: string | null = null
	if (typeof o.senderId === 'string') senderId = o.senderId
	else if (o.senderId === null) senderId = null

	const content = typeof o.content === 'string' ? o.content : ''
	const createdAt = parseCreatedAt(o.createdAt)

	let audienceType: ChatMessageRow['audienceType']
	if (typeof o.audienceType === 'string' && AUDIENCES.has(o.audienceType)) {
		audienceType = o.audienceType as 'EVERYONE' | 'HOST' | 'USER'
	}

	let targetUserId: string | null | undefined
	if (typeof o.targetUserId === 'string') targetUserId = o.targetUserId
	else if (o.targetUserId === null) targetUserId = null

	let guestEmail: string | null | undefined
	if (typeof o.guestEmail === 'string') guestEmail = o.guestEmail
	else if (o.guestEmail === null) guestEmail = null

	let guestSenderId: string | null | undefined
	if (typeof o.guestSenderId === 'string') guestSenderId = o.guestSenderId
	else if (o.guestSenderId === null) guestSenderId = null

	let sender: ChatMessageRow['sender']
	if (o.sender && typeof o.sender === 'object') {
		const s = o.sender as Record<string, unknown>
		if (typeof s.id === 'string' && typeof s.name === 'string') {
			sender = {
				id: s.id,
				name: s.name,
				avatar:
					typeof s.avatar === 'string'
						? s.avatar
						: s.avatar === null
							? null
							: undefined,
			}
		}
	}

	let targetUser: ChatMessageRow['targetUser']
	if (o.targetUser === null) {
		targetUser = null
	} else if (o.targetUser && typeof o.targetUser === 'object') {
		const t = o.targetUser as Record<string, unknown>
		if (typeof t.id === 'string' && typeof t.name === 'string') {
			targetUser = {
				id: t.id,
				name: t.name,
				avatar:
					typeof t.avatar === 'string'
						? t.avatar
						: t.avatar === null
							? null
							: undefined,
			}
		}
	}

	return {
		id,
		senderId,
		audienceType,
		targetUserId: targetUserId === undefined ? null : targetUserId,
		content,
		createdAt,
		guestEmail,
		guestSenderId,
		sender,
		targetUser,
	}
}

export function isOptimisticMessageId(id: string): boolean {
	return id.startsWith('optimistic-')
}

export function shouldRemoveOptimisticForEcho(
	optimistic: ChatMessageRow,
	real: ChatMessageRow,
	viewerDbUserId: string | null,
	viewerGuestEmail: string | null,
): boolean {
	if (!isOptimisticMessageId(optimistic.id)) return false
	if (optimistic.content.trim() !== real.content.trim()) return false

	const optAud = optimistic.audienceType ?? 'EVERYONE'
	const realAud = real.audienceType ?? 'EVERYONE'
	if (optAud !== realAud) return false

	const optTarget = optimistic.targetUserId ?? null
	const realTarget = real.targetUserId ?? null
	if (optTarget !== realTarget) return false

	if (viewerDbUserId && real.senderId === viewerDbUserId) {
		const optSid = (optimistic.senderId ?? '').trim()
		const optObjId = optimistic.sender?.id
		// Optimistic row may use Clerk display name while echo uses DB name — still same user
		if (
			!optSid ||
			optSid === viewerDbUserId ||
			optObjId === viewerDbUserId ||
			optObjId === 'me'
		) {
			return true
		}
	}

	const ve = viewerGuestEmail?.trim()
	if (ve && optimistic.guestEmail && real.guestEmail) {
		return optimistic.guestEmail === ve && real.guestEmail === ve
	}

	return false
}

export function mergeMessages(
	existing: ChatMessageRow[],
	incoming: ChatMessageRow[],
): ChatMessageRow[] {
	const byId = new Map<string, ChatMessageRow>()
	for (const m of existing) {
		byId.set(m.id, m)
	}
	for (const m of incoming) {
		byId.set(m.id, m)
	}
	return Array.from(byId.values()).sort(
		(a, b) =>
			new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	)
}

function sameSenderIdentity(a: ChatMessageRow, b: ChatMessageRow): boolean {
	const aSid =
		typeof a.senderId === 'string' && a.senderId.trim() ? a.senderId.trim() : null
	const bSid =
		typeof b.senderId === 'string' && b.senderId.trim() ? b.senderId.trim() : null
	if (aSid && bSid) return aSid === bSid
	const aFromSender =
		typeof a.sender?.id === 'string' && a.sender.id !== 'me'
			? a.sender.id.trim()
			: null
	const bFromSender =
		typeof b.sender?.id === 'string' && b.sender.id !== 'me'
			? b.sender.id.trim()
			: null
	if (aSid && bFromSender) return aSid === bFromSender
	if (bSid && aFromSender) return bSid === aFromSender
	if (aFromSender && bFromSender) return aFromSender === bFromSender
	const ae = a.guestEmail?.trim() ?? ''
	const be = b.guestEmail?.trim() ?? ''
	if (ae && be) return ae === be
	return false
}

/** Optimistic send before `/api/users/me` resolves uses senderId "" and sender.id "me". */
function optimisticMePlaceholderMatchesReal(
	optimistic: ChatMessageRow,
	real: ChatMessageRow,
	viewerDbUserId: string,
): boolean {
	if (!isOptimisticMessageId(optimistic.id)) return false
	if ((optimistic.senderId ?? '').trim()) return false
	if (optimistic.sender?.id !== 'me') return false
	return (real.senderId ?? '').trim() === viewerDbUserId
}

function sameSenderForOptimisticEcho(
	a: ChatMessageRow,
	b: ChatMessageRow,
	viewerDbUserId: string | null | undefined,
): boolean {
	if (sameSenderIdentity(a, b)) return true
	const v = viewerDbUserId?.trim()
	if (!v) return false
	if (isOptimisticMessageId(a.id) && optimisticMePlaceholderMatchesReal(a, b, v)) return true
	if (isOptimisticMessageId(b.id) && optimisticMePlaceholderMatchesReal(b, a, v)) return true
	return false
}

/**
 * Replace optimistic rows with the matching server echo only.
 * Do not drop two real messages with the same text — that broke sync when users
 * sent similar messages within a few seconds (each has a distinct id).
 */
export function collapseNearDuplicateChatRows(
	rows: ChatMessageRow[],
	viewerDbUserId?: string | null,
): ChatMessageRow[] {
	if (rows.length < 2) return rows
	const WINDOW_MS = 12_000
	const sorted = [...rows].sort(
		(a, b) =>
			new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	)
	const out: ChatMessageRow[] = []

	for (const row of sorted) {
		const prev = out[out.length - 1]
		if (!prev) {
			out.push(row)
			continue
		}
		if (prev.id === row.id) continue

		const dt = Math.abs(
			new Date(row.createdAt).getTime() - new Date(prev.createdAt).getTime(),
		)
		const audOk =
			(prev.audienceType ?? 'EVERYONE') === (row.audienceType ?? 'EVERYONE') &&
			(prev.targetUserId ?? null) === (row.targetUserId ?? null)

		const looksLikeOptimisticEcho =
			isOptimisticMessageId(prev.id) &&
			!isOptimisticMessageId(row.id) &&
			prev.content.trim() === row.content.trim() &&
			audOk &&
			sameSenderForOptimisticEcho(prev, row, viewerDbUserId) &&
			dt <= WINDOW_MS

		if (looksLikeOptimisticEcho) {
			out[out.length - 1] = row
			continue
		}

		// Server echo can sort before the optimistic (clock skew); drop trailing optimistic duplicate
		const reverseOptimisticEcho =
			!isOptimisticMessageId(prev.id) &&
			isOptimisticMessageId(row.id) &&
			prev.content.trim() === row.content.trim() &&
			audOk &&
			sameSenderForOptimisticEcho(prev, row, viewerDbUserId) &&
			dt <= WINDOW_MS

		if (reverseOptimisticEcho) {
			continue
		}

		out.push(row)
	}
	return out
}
