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

/**
 * True when `inbound` is the server echo of `optimistic` (same send), so the optimistic row
 * should be dropped. Handles Clerk vs DB display names/avatars — matching is id-based only.
 */
export function isOptimisticEchoOfInbound(
	optimistic: ChatMessageRow,
	inbound: ChatMessageRow,
	viewerDbUserId: string | null,
	viewerGuestEmail: string | null,
): boolean {
	if (!isOptimisticMessageId(optimistic.id)) return false
	if (optimistic.content.trim() !== inbound.content.trim()) return false

	const optAud = optimistic.audienceType ?? 'EVERYONE'
	const realAud = inbound.audienceType ?? 'EVERYONE'
	if (optAud !== realAud) return false

	const optTarget = optimistic.targetUserId ?? null
	const realTarget = inbound.targetUserId ?? null
	if (optTarget !== realTarget) return false

	const inSid = (inbound.senderId ?? '').trim()
	const optSid = (optimistic.senderId ?? '').trim()
	const v = (viewerDbUserId ?? '').trim()
	const optSenderObj = (optimistic.sender?.id ?? '').trim()

	// Same Prisma user id on both rows (strongest signal)
	if (inSid && optSid && inSid === optSid) return true

	// Echo sender id matches optimistic.sender.id (same user, different name in UI)
	if (inSid && optSenderObj && inSid === optSenderObj) return true

	// Real echo is from this viewer; optimistic may still be placeholder (sender.id "me", empty senderId)
	if (v && inSid === v) {
		if (!optSid || optSid === v || optSenderObj === 'me' || optSenderObj === v) {
			return true
		}
	}

	const ve = viewerGuestEmail?.trim().toLowerCase()
	const og = optimistic.guestEmail?.trim().toLowerCase()
	const ig = inbound.guestEmail?.trim().toLowerCase()
	if (ve && og && ig && og === ve && ig === ve) return true

	return false
}

export function shouldRemoveOptimisticForEcho(
	optimistic: ChatMessageRow,
	real: ChatMessageRow,
	viewerDbUserId: string | null,
	viewerGuestEmail: string | null,
): boolean {
	return isOptimisticEchoOfInbound(optimistic, real, viewerDbUserId, viewerGuestEmail)
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

function audienceAndTargetMatch(a: ChatMessageRow, b: ChatMessageRow): boolean {
	return (
		(a.audienceType ?? 'EVERYONE') === (b.audienceType ?? 'EVERYONE') &&
		(a.targetUserId ?? null) === (b.targetUserId ?? null)
	)
}

/**
 * Drop optimistic rows that have a matching server message (same sender, content, audience).
 *
 * **Core issue the old adjacent-only pass missed:** after sorting by time, an optimistic
 * row and its echo are not always *neighbors* — another message can sit between them
 * (e.g. someone else posts, or a second quick send). Then two lines showed until a
 * later effect ran.
 *
 * This pass pairs each optimistic with the **closest-in-time** real message that matches
 * (one real consumes at most one optimistic), within a short window.
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

	const optimistics = sorted.filter((m) => isOptimisticMessageId(m.id))
	if (optimistics.length === 0) return sorted

	const reals = sorted.filter((m) => !isOptimisticMessageId(m.id))

	function pairable(o: ChatMessageRow, r: ChatMessageRow): boolean {
		if (o.content.trim() !== r.content.trim()) return false
		if (!audienceAndTargetMatch(o, r)) return false
		const dt = Math.abs(
			new Date(o.createdAt).getTime() - new Date(r.createdAt).getTime(),
		)
		if (dt > WINDOW_MS) return false
		return sameSenderForOptimisticEcho(o, r, viewerDbUserId)
	}

	const usedRealIds = new Set<string>()
	const removeOptimisticIds = new Set<string>()

	for (const o of optimistics) {
		const candidates = reals
			.filter((r) => !usedRealIds.has(r.id) && pairable(o, r))
			.sort(
				(a, b) =>
					Math.abs(
						new Date(o.createdAt).getTime() - new Date(a.createdAt).getTime(),
					) -
					Math.abs(
						new Date(o.createdAt).getTime() - new Date(b.createdAt).getTime(),
					),
			)
		if (candidates.length > 0) {
			removeOptimisticIds.add(o.id)
			usedRealIds.add(candidates[0].id)
		}
	}

	return sorted.filter((m) => !removeOptimisticIds.has(m.id))
}

/** For chat-flow file logs: who this browser session is in the room (study room / webinar). */
export type ChatViewerSessionRole = 'host' | 'joinee' | 'guest'

export function buildOutboundChatFlowMeta(
	role: ChatViewerSessionRole,
): { syncNote: string } {
	switch (role) {
		case 'host':
			return {
				syncNote:
					'Host typed send → socket will broadcast message:new to channel room (host + all joinees)',
			}
		case 'guest':
			return {
				syncNote:
					'Guest typed send → server persists and broadcasts message:new to channel room',
			}
		default:
			return {
				syncNote:
					'Signed-in participant/joinee typed send → socket will broadcast message:new to channel room',
			}
	}
}

export type ChatInboundSenderKind =
	| 'self_echo'
	| 'from_host'
	| 'from_participant'
	| 'guest_self_echo'
	| 'guest_other'
	| 'unknown'

/**
 * Classify an inbound `message:new` for logging: who sent vs who is viewing (host/joinee/guest).
 */
export function buildInboundChatFlowMeta(
	normalized: ChatMessageRow,
	viewerSessionRole: ChatViewerSessionRole,
	hostUserId: string | null | undefined,
	viewerDbUserId: string | null,
	viewerGuestEmail: string | null,
	isGuestMode: boolean,
): { senderKind: ChatInboundSenderKind; syncNote: string } {
	const hid = (hostUserId ?? '').trim()
	const vid = (viewerDbUserId ?? '').trim()
	const sid = (normalized.senderId ?? '').trim()
	const ge = (normalized.guestEmail ?? '').trim().toLowerCase()
	const vge = (viewerGuestEmail ?? '').trim().toLowerCase()

	if (isGuestMode) {
		if (vge && ge && ge === vge) {
			return {
				senderKind: 'guest_self_echo',
				syncNote:
					'Guest viewer: socket echo of own send (other clients in room also get message:new)',
			}
		}
		return {
			senderKind: 'guest_other',
			syncNote:
				'Guest viewer: message from another person in the room (host or other guest)',
		}
	}

	if (vid && sid && sid === vid) {
		return {
			senderKind: 'self_echo',
			syncNote:
				viewerSessionRole === 'host'
					? 'Host viewer: echo of own message (server broadcast back to you)'
					: 'Participant viewer: echo of own message (server broadcast back to you)',
		}
	}
	if (hid && sid === hid) {
		return {
			senderKind: 'from_host',
			syncNote:
				viewerSessionRole === 'host'
					? 'Host viewer: same as self_echo (you are host)'
					: 'Joinee viewer: receiving host message in real time',
		}
	}
	if (sid) {
		return {
			senderKind: 'from_participant',
			syncNote:
				viewerSessionRole === 'host'
					? 'Host viewer: receiving message from joinee/participant in real time'
					: 'Joinee viewer: receiving message from another participant (not host)',
		}
	}
	return {
		senderKind: 'unknown',
		syncNote: 'Inbound message could not classify sender (missing senderId)',
	}
}
