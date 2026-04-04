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

export function normalizeChatMessage(raw: unknown): ChatMessageRow {
	const m =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
	const createdRaw = m.createdAt
	let createdAt: string
	if (createdRaw instanceof Date) {
		createdAt = createdRaw.toISOString()
	} else if (typeof createdRaw === 'number' && Number.isFinite(createdRaw)) {
		const d = new Date(createdRaw)
		createdAt = Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
	} else if (typeof createdRaw === 'string' && createdRaw.length > 0) {
		const d = new Date(createdRaw)
		createdAt = Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
	} else {
		createdAt = new Date(0).toISOString()
	}

	const guestEmail =
		typeof m.guestEmail === 'string' && m.guestEmail.length > 0 ? m.guestEmail : null
	const guestSenderId =
		typeof m.guestSenderId === 'string' && m.guestSenderId.length > 0
			? m.guestSenderId
			: null

	const baseSender = m.sender as Record<string, unknown> | null | undefined
	let sender: ChatMessageRow['sender']
	if (baseSender && typeof baseSender.name === 'string' && baseSender.name.length > 0) {
		sender = {
			id: String(baseSender.id ?? guestSenderId ?? 'unknown'),
			name: baseSender.name,
			avatar: (baseSender.avatar as string | null | undefined) ?? null,
		}
	} else if (guestEmail) {
		const local = guestEmail.split('@')[0] || 'Guest'
		sender = {
			id: guestSenderId || 'guest',
			name: local,
			avatar: null,
		}
	} else {
		sender = {
			id: guestSenderId || (typeof m.senderId === 'string' ? m.senderId : '') || 'guest',
			name: 'Guest',
			avatar: null,
		}
	}

	let senderId =
		typeof m.senderId === 'string' && m.senderId.length > 0
			? m.senderId
			: guestSenderId || ''
	if (!senderId && !guestEmail && sender?.id && sender.id !== 'guest') {
		senderId = sender.id
	}

	return {
		id: String(m.id ?? ''),
		senderId,
		audienceType: m.audienceType as ChatMessageRow['audienceType'],
		targetUserId:
			typeof m.targetUserId === 'string' || m.targetUserId === null
				? (m.targetUserId as string | null)
				: null,
		content: typeof m.content === 'string' ? m.content : '',
		createdAt,
		guestEmail,
		guestSenderId,
		sender,
		targetUser: m.targetUser as ChatMessageRow['targetUser'],
	}
}

export function mergeMessages(
	existing: ChatMessageRow[],
	incoming: ChatMessageRow[],
): ChatMessageRow[] {
	if (incoming.length === 0) return existing

	const byId = new Map<string, ChatMessageRow>()
	for (const message of existing) {
		byId.set(message.id, message)
	}
	for (const message of incoming) {
		byId.set(message.id, message)
	}

	return Array.from(byId.values()).sort((a, b) => {
		const ta = new Date(a.createdAt).getTime()
		const tb = new Date(b.createdAt).getTime()
		const na = Number.isNaN(ta) ? 0 : ta
		const nb = Number.isNaN(tb) ? 0 : tb
		return na - nb
	})
}

export function isOptimisticMessageId(id: string): boolean {
	return id.startsWith('optimistic-')
}

export function normalizeAudience(a?: ChatMessageRow['audienceType']): string {
	return String(a ?? 'EVERYONE').toUpperCase()
}

export function effectiveSenderId(msg: ChatMessageRow): string {
	if (msg.senderId && String(msg.senderId).length > 0) return String(msg.senderId)
	if (msg.sender?.id && String(msg.sender.id).length > 0 && msg.sender.id !== 'guest')
		return String(msg.sender.id)
	if (msg.guestSenderId && String(msg.guestSenderId).length > 0)
		return String(msg.guestSenderId)
	return ''
}

/**
 * Drop the optimistic row when the real `message:new` is the same send.
 */
export function shouldRemoveOptimisticForEcho(
	local: ChatMessageRow,
	server: ChatMessageRow,
	viewerDbUserId?: string | null,
	viewerGuestEmail?: string | null,
): boolean {
	if (!isOptimisticMessageId(local.id)) return false
	if (local.content !== server.content) return false
	if (normalizeAudience(local.audienceType) !== normalizeAudience(server.audienceType)) {
		return false
	}
	if (
		local.targetUserId &&
		server.targetUserId &&
		local.targetUserId !== server.targetUserId
	) {
		return false
	}

	const guestLocal = (local.guestEmail || viewerGuestEmail || '').trim().toLowerCase()
	const guestServer = (server.guestEmail || '').trim().toLowerCase()
	if (guestLocal.length > 0 && guestServer.length > 0 && guestLocal === guestServer) {
		return true
	}

	const srv = effectiveSenderId(server)
	const loc = effectiveSenderId(local)
	if (srv) {
		if (viewerDbUserId && String(viewerDbUserId) === srv) return true
		if (loc && loc === srv) return true
	}

	return false
}

const NEAR_DUP_WINDOW_MS = 8000

/**
 * Collapse duplicate server rows (different ids, same sender+content+audience within a short window).
 * Guards against double delivery or optimistic+server id mismatches.
 */
export function collapseNearDuplicateChatRows(messages: ChatMessageRow[]): ChatMessageRow[] {
	const sorted = [...messages].sort((a, b) => {
		const ta = new Date(a.createdAt).getTime()
		const tb = new Date(b.createdAt).getTime()
		return ta - tb
	})
	const out: ChatMessageRow[] = []
	for (const m of sorted) {
		const dupIdx = out.findIndex((x) => {
			if (x.id === m.id) return true
			if (isOptimisticMessageId(m.id) || isOptimisticMessageId(x.id)) return false
			if (x.content !== m.content) return false
			if (effectiveSenderId(x) !== effectiveSenderId(m)) return false
			if (normalizeAudience(x.audienceType) !== normalizeAudience(m.audienceType)) {
				return false
			}
			const ta = new Date(x.createdAt).getTime()
			const tb = new Date(m.createdAt).getTime()
			if (Number.isNaN(ta) || Number.isNaN(tb)) return false
			return Math.abs(tb - ta) < NEAR_DUP_WINDOW_MS
		})
		if (dupIdx >= 0) {
			const keep =
				isOptimisticMessageId(out[dupIdx].id) && !isOptimisticMessageId(m.id) ? m : out[dupIdx]
			out[dupIdx] = keep
			continue
		}
		out.push(m)
	}
	return out
}
