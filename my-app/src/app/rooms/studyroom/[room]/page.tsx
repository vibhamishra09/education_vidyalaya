'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { isAxiosError } from 'axios'
import { EnhancedVideoRoom, SessionData } from '@/components/livekit/EnhancedVideoRoom'
import apiClient from '@/lib/api-client'
import { normalizeLiveKitServerUrl } from '@/lib/livekit-url'
import { Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { SignInButton, SignUpButton } from '@clerk/nextjs'

type ChatIdentity = {
	id: string
	name: string
	avatar?: string | null
}

function resolveStudyRoomRouteId(roomName: string): string {
	// Accept both legacy "studyroom-<id>" and clean "<slug>" route segments.
	return roomName.startsWith('studyroom-')
		? roomName.slice('studyroom-'.length)
		: roomName
}

function extractChatTargets(
	data: Record<string, unknown>,
	isStudyRoom: boolean,
	isPeerSession: boolean,
): { recipients: ChatIdentity[]; host: ChatIdentity | null } {
	const uniqueRecipients = new Map<string, ChatIdentity>()
	let host: ChatIdentity | null = null
	const pushRecipient = (user: unknown) => {
		if (!user || typeof user !== 'object') return
		const identity = user as ChatIdentity
		if (!identity.id || !identity.name) return
		uniqueRecipients.set(identity.id, identity)
	}

	if (isStudyRoom) {
		const createdBy = (data as { createdBy?: ChatIdentity }).createdBy
		const participants =
			(data as { participants?: ChatIdentity[] }).participants || []
		pushRecipient(createdBy)
		participants.forEach(pushRecipient)
		if (createdBy) host = createdBy
	} else if (isPeerSession) {
		const requestedBy = (data as { requestedBy?: ChatIdentity }).requestedBy
		const requestedTo = (data as { requestedTo?: ChatIdentity }).requestedTo
		pushRecipient(requestedBy)
		pushRecipient(requestedTo)
		if (requestedTo) host = requestedTo
	}

	return {
		recipients: Array.from(uniqueRecipients.values()),
		host,
	}
}

export default function RoomPage() {
	const params = useParams<{ room: string }>()
	const searchParams = useSearchParams()
	const router = useRouter()
	const roomName = params.room
	const { getToken, isLoaded: clerkLoaded, isSignedIn } = useAuth()
	const [token, setToken] = useState<string | null>(null)
	const [channelId, setChannelId] = useState<string | null>(null)
	const [sessionData, setSessionData] = useState<{
		id: string;
		date: string;
		duration: number;
		sessionType: 'studyRoom' | 'peerSession';
		sessionStatus?: string;
		slug? :string | undefined
		[key: string]: unknown;
	} | null>(null)
	const [isHost, setIsHost] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [sessionEnded, setSessionEnded] = useState(false)
	const [chatRecipients, setChatRecipients] = useState<ChatIdentity[]>([])
	const [hostUser, setHostUser] = useState<ChatIdentity | null>(null)
	const [currentUserDbId, setCurrentUserDbId] = useState<string | null>(null)
	/** Prefer URL returned with the JWT so guests and hosts always hit the same LiveKit project as the API. */
	const [livekitServerUrl, setLivekitServerUrl] = useState<string | null>(null)
	/** Guest-token response includes LiveKit identity; moderation socket must use the same id as Clerk user id for hosts. */
	const [guestLivekitIdentity, setGuestLivekitIdentity] = useState<string | null>(null)
	const guestAccessToken = searchParams.get('guestAccessToken')
	const isMountedRef = useRef(true)
	const participantKeyRef = useRef<string>('')
	const {user, isLoaded} = useUser()
	const [sessionNotStarted, setSessionNotStarted] = useState(false)
	const [notAParticipant, setNotaParticipant] = useState(false)
	console.log(user);
	
	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
		}
	}, [])

	const refreshChatRecipients = useCallback(async () => {
		if (!roomName) return
		const clerkToken = guestAccessToken ? null : await getToken()
		if (!guestAccessToken && !clerkToken) return

		const roomId = resolveStudyRoomRouteId(roomName)
		if (!roomId) return

		try {
			const endpoint = `/api/study-rooms/${roomId}`
			const response = await apiClient.get(endpoint, {
				headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
			})
			if (!isMountedRef.current || !response.data) return
			const chatTargets = extractChatTargets(
				response.data as Record<string, unknown>,
				true,
				false,
			)
			setChatRecipients(chatTargets.recipients)
			setHostUser(chatTargets.host)
		} catch {
			// Best-effort refresh when participants join; do not interrupt the call UI.
		}
	}, [guestAccessToken, getToken, roomName])

	const handleParticipantListChange = useCallback((participantIdentities: string[]) => {
		const nextKey = participantIdentities.slice().sort().join('|')
		if (nextKey === participantKeyRef.current) return
		participantKeyRef.current = nextKey
		void refreshChatRecipients()
	}, [refreshChatRecipients])

	/**
	 * Keep room details fresh while inside LiveKit so host edits (title/date/duration/status/webinar config)
	 * are reflected without manual page refresh.
	 */
	useEffect(() => {
		if (!roomName || loading) return
		const roomId = resolveStudyRoomRouteId(roomName)
		if (!roomId) return

		let cancelled = false
		const POLL_MS = 15000

		const pollSessionDetails = async () => {
			try {
				const clerkToken = guestAccessToken ? null : await getToken()
				const endpoint = `/api/study-rooms/${roomId}`
				const response = await apiClient.get(endpoint, {
					headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
				})
				if (cancelled || !response.data) return

				const data = response.data as {
					id: string
					date: string
					duration: number
					sessionStatus?: string
					chatChannelId?: string | null
					sessionMode?: string
					webinarConfig?: unknown
					[key: string]: unknown
				}

				setSessionData((prev) => ({
					...(prev || {}),
					...data,
					sessionType: 'studyRoom',
					sessionMode: data.sessionMode,
					webinarConfig: data.webinarConfig,
					slug: (data.slug as string) || roomName,
				}))

				if (
					data.sessionStatus === 'DONE' ||
					data.sessionStatus === 'CANCELLED' ||
					data.sessionStatus === 'NOT_COMPLETED'
				) {
					setSessionEnded(true)
				}

				// Guest channel endpoint may not return data; room details still include chatChannelId.
				if (!channelId && data.chatChannelId) {
					setChannelId(data.chatChannelId)
				}
			} catch {
				// Best-effort polling; keep room running on last known state.
			}
		}

		const intervalId = setInterval(() => {
			void pollSessionDetails()
		}, POLL_MS)
		void pollSessionDetails()

		return () => {
			cancelled = true
			clearInterval(intervalId)
		}
	}, [roomName, loading, guestAccessToken, getToken, channelId])

	useEffect(() => {
		if (!roomName) return
		// Avoid racing Clerk: getToken() can be null before isLoaded, which used to show "Not authenticated".
		if (!guestAccessToken && !clerkLoaded ) return

		let mounted = true
		async function initialize() {
			try {
				const clerkToken = guestAccessToken ? null : await getToken()
				if (!clerkToken && !guestAccessToken) {
					throw new Error('Not authenticated')
				}

				const roomId = resolveStudyRoomRouteId(roomName)

				// Resolve DB user id before room/chat mount so ChatWidget can collapse optimistic+echo (avoids duplicate “hi”).
				if (clerkToken) {
					try {
						const meRes = await apiClient.get<{ id?: string }>('/api/users/me', {
							headers: { Authorization: `Bearer ${clerkToken}` },
						})
						if (mounted && typeof meRes.data?.id === 'string' && meRes.data.id) {
							setCurrentUserDbId(meRes.data.id)
						}
					} catch {
						/* non-fatal — ChatWidget may still fetch /api/users/me */
					}
				}

				// Fetch LiveKit token, channel ID, and session data
				const promises: Promise<{ data: { token?: string; channelId?: string; [key: string]: unknown } } | null>[] = [
					apiClient.post(
						`/api/livekit/${guestAccessToken ? 'guest-token' : 'token'}`,
						guestAccessToken ? { roomName, guestAccessToken } : { roomName },
						{
							headers: {
								...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
							},
						},
					),
					clerkToken
						? apiClient.get(`/api/chat/channel-by-room/${roomName}`, {
								headers: {
									Authorization: `Bearer ${clerkToken}`,
								},
						  }).catch(() => null)
						: Promise.resolve(null), // Channel might not exist, that's OK
				]

				// Study room page always resolves study-room details.
				if (roomId) {
					promises.push(
						clerkToken
							? apiClient.get(`/api/study-rooms/${roomId}`, {
									headers: {
										Authorization: `Bearer ${clerkToken}`,
									},
							  })
							: apiClient.get(`/api/study-rooms/${roomId}`)
					)
				}

				const results = await Promise.all(promises)
				

				if (!mounted) return
				const livekitPayload = results[0]?.data as
					| { token?: string; livekitUrl?: string; identity?: string }
					| undefined
				if (livekitPayload?.token) {
					setToken(livekitPayload.token)
				}
				if (livekitPayload?.livekitUrl) {
					setLivekitServerUrl(
						normalizeLiveKitServerUrl(livekitPayload.livekitUrl),
					)
				}
				if (typeof livekitPayload?.identity === 'string' && livekitPayload.identity) {
					setGuestLivekitIdentity(livekitPayload.identity)
				}
				if (results[1]?.data?.channelId) {
					setChannelId(results[1].data.channelId as string)
				} else if (!results[1]?.data?.channelId && results[2]?.data?.chatChannelId) {
					// For guests, channel endpoint returns null; fall back to chatChannelId in room data
					setChannelId(results[2].data.chatChannelId as string)
				}
				if (results[0]?.data && guestAccessToken && mounted) {
					setIsHost(Boolean((results[0] as { data?: { isHost?: boolean } }).data?.isHost))
				}
				if (results[2]?.data) {
	
					// Add session type to sessionData
					const data = results[2].data as { id: string; date: string; duration: number; sessionStatus?: string; [key: string]: unknown; participants: any[]; createdBy: any};
					const canonicalRoomName = `studyroom-${data.id}`
					// Ensure host + joinee always join the exact same LiveKit room name.
					if (mounted && roomName !== canonicalRoomName) {
						const query = typeof window !== 'undefined' ? window.location.search : ''
						router.replace(`/rooms/studyroom/${canonicalRoomName}${query}`)
						setLoading(false)
						return
					}
					const userId = user?.id
					const dbId = user?.publicMetadata.dbUserId || currentUserDbId
					const now = Date.now()
					const sessionStart = new Date(data.date).getTime()
					const isLearner = data.role === 'learner'
					const buffer = 5 * 60 * 1000 // 5 min
					const isSessionNotStarted = now < (sessionStart - buffer)

					 if (!guestAccessToken && userId) {
						const participants = data.participants || []

						const isParticipant = participants.some(
							(p: any) => p.clerkId === userId
						)

						const isHostUser = data.createdBy?.id === dbId

						if (!isParticipant && !isHostUser) {
							setNotaParticipant(true)
							setSessionData({
								...data,
								sessionType: 'studyRoom',
								slug: (data.slug as string) || roomName,
							})
							setLoading(false)
							return
						}
					}
					
					if (isLearner && isSessionNotStarted) {
						setSessionNotStarted(true)
						setSessionData({
							...data,
							sessionType: 'studyRoom',
							slug: (data.slug as string) || roomName,
						})
						setLoading(false)
						return
					}
					// Check if session is already completed or not completed (expired)
					if (data.sessionStatus === 'DONE' || data.sessionStatus === 'CANCELLED' || data.sessionStatus === 'NOT_COMPLETED') {
						setSessionEnded(true)
						setSessionData({
							...data,
							sessionType: 'studyRoom',
							slug: (data.slug as string) || roomName,
						})
						setLoading(false)
						return
					}
					
					setSessionData({
						...data,
						sessionType: 'studyRoom',
						sessionMode: (data as { sessionMode?: string }).sessionMode,
						webinarConfig: (data as { webinarConfig?: unknown }).webinarConfig,
						slug: (data.slug as string) || roomName,
					})

					const chatTargets = extractChatTargets(
						data as Record<string, unknown>,
						true,
						false,
					)
					setChatRecipients(chatTargets.recipients)
					setHostUser(chatTargets.host)

					// Check if current user is the host
					try {
						const endpoint = `/api/study-rooms/${roomId}/is-host`
						if (clerkToken) {
							const hostResponse = await apiClient.get(endpoint, {
								headers: {
									Authorization: `Bearer ${clerkToken}`,
								},
							})
							if (mounted) {
								setIsHost(hostResponse.data.isHost || false)
							}
						}
					} catch {
						// If host check fails, default to false (safer)
						if (mounted) {
							setIsHost(false)
						}
					}
				}
			} catch (e: unknown) {
				if (!mounted) return
				const errorMessage = isAxiosError(e)
					? ((typeof e.response?.data === 'object' &&
							e.response?.data &&
							'message' in e.response.data
								? e.response.data.message
								: null) as string | null) ||
					  e.message ||
					  'Failed to initialize'
					: e instanceof Error
						? e.message
						: 'Failed to initialize'
				setError(errorMessage)
			} finally {
				if (mounted) setLoading(false)
			}
		}
		void initialize()
		return () => {
			mounted = false
		}
	}, [roomName, getToken, guestAccessToken, clerkLoaded])

	const serverUrl = useMemo(
		() =>
			normalizeLiveKitServerUrl(
				livekitServerUrl ||
					(typeof process.env.NEXT_PUBLIC_LIVEKIT_WS_URL === 'string'
						? process.env.NEXT_PUBLIC_LIVEKIT_WS_URL
						: ''),
			),
		[livekitServerUrl],
	)

	useEffect(() => {
		if (process.env.NODE_ENV !== 'development') return
		const fromEnv = normalizeLiveKitServerUrl(
			typeof process.env.NEXT_PUBLIC_LIVEKIT_WS_URL === 'string'
				? process.env.NEXT_PUBLIC_LIVEKIT_WS_URL
				: '',
		)
		if (livekitServerUrl && fromEnv && livekitServerUrl !== fromEnv) {
			console.warn(
				'[LiveKit] API livekitUrl and NEXT_PUBLIC_LIVEKIT_WS_URL differ. The page uses the API value first. Point both at the same wss:// cluster as LIVEKIT_API_KEY.',
				{ fromApi: livekitServerUrl, nextPublic: fromEnv },
			)
		}
	}, [livekitServerUrl])

	if (loading) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-black z-50">
				<div className="text-center text-white">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
					<p>Connecting to video call...</p>
				</div>
			</div>
		)
	}
	

	if (!isSignedIn && !guestAccessToken) {
	return (
		<div className="relative h-screen w-screen flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
			
			<div className="absolute inset-0">
				<div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#E01E5A]/10 blur-[120px] rounded-full" />
			</div>

			<div className="relative z-10 w-full max-w-sm mx-auto px-4">
				<div className="bg-[#141414]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl text-center">

					<div className="flex justify-center mb-4">
						<div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-lg">
							🔐
						</div>
					</div>

					<h2 className="text-xl font-semibold text-white mb-2">
						Join the Session
					</h2>

					<p className="text-gray-400 text-sm mb-5">
						Sign in to access your study room and start learning
					</p>

					<div className="flex flex-col gap-2.5">
						<SignInButton mode="modal" forceRedirectUrl={window.location.href}>
							<Button className="w-full h-10 rounded-lg bg-[#E01E5A] hover:bg-[#C01B4B] text-white font-medium transition-colors">
								Sign In
							</Button>
						</SignInButton>

						<SignUpButton mode="modal" forceRedirectUrl={window.location.href}>
							<Button
								variant="outline"
								className="w-full h-10 rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-colors"
							>
								Create Account
							</Button>
						</SignUpButton>
					</div>

				</div>
			</div>
		</div>
	)
}
	if (error) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-black">
				<div className="text-center text-red-600">
					<p className="text-xl font-semibold mb-2">Error</p>
					<p>{error}</p>
				</div>
			</div>
		)
	}

	if (!token) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-black">
				<div className="text-center text-white">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
					<p>Connecting...</p>
				</div>
			</div>
		)
	}

	if (!serverUrl.trim()) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-black px-6">
				<div className="text-center text-red-400 max-w-md">
					<p className="text-xl font-semibold mb-2 text-white">Video unavailable</p>
					<p className="text-sm text-gray-400">
						LiveKit URL is not configured. Set LIVEKIT_URL on the API server (it is returned with the join token), or set NEXT_PUBLIC_LIVEKIT_WS_URL for the web app.
					</p>
				</div>
			</div>
		)
	}

	if (sessionEnded) {
		const isNotCompleted = sessionData?.sessionStatus === 'NOT_COMPLETED';
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
				{/* Background decoration */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
				
				<div className="relative z-10 text-center max-w-md mx-auto p-8 rounded-3xl bg-[#141414]/80 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
					<div className="flex justify-center mb-6">
						<div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
							<XCircle className="h-10 w-10 text-red-500" />
						</div>
					</div>
					<h1 className="text-2xl font-bold text-white mb-3">
						{isNotCompleted ? 'Session Time Expired' : 'Session Has Ended'}
					</h1>
					<p className="text-gray-400 mb-6">
						{isNotCompleted 
							? `This ${sessionData?.sessionType === 'studyRoom' ? 'study room' : 'peer session'} expired without being completed. No payment was processed.`
							: `This ${sessionData?.sessionType === 'studyRoom' ? 'study room' : 'peer session'} has already been completed. You cannot join a session that has ended.`
						}
					</p>
					
					<div className="flex flex-col gap-3">
						<Button 
							onClick={() => router.push('/dashboard')}
							className="w-full bg-[#E01E5A] hover:bg-[#C01B4B] text-white font-medium h-11 rounded-xl shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02]"
						>
							Go to Dashboard
						</Button>
						{/* Only show feedback button for completed sessions, not for NOT_COMPLETED */}
						{sessionData?.id && !isNotCompleted && (
							<Button 
								variant="outline"
								onClick={() => router.push(`/session-feedback/${sessionData.id}?type=${sessionData.sessionType}&isHost=false`)}
								className="w-full h-11 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white rounded-xl transition-all hover:scale-[1.02]"
							>
								Leave Feedback
							</Button>
						)}
					</div>
				</div>
			</div>
		)
	}

	if (notAParticipant) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
				<div className="text-center text-white max-w-md">
					<p className="text-2xl font-semibold mb-3">You are not Enrolled in this Study Room</p>
					<p className="text-gray-400 mb-6">
						Please enroll before joining the room
					</p>

					<Button onClick={() => router.replace(`/studyroom/${sessionData?.slug}/?join=1`)}>
						Enroll
					</Button>
				</div>
			</div>
		)
	}

	

	if (sessionNotStarted) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
				<div className="text-center text-white max-w-md">
					<p className="text-2xl font-semibold mb-3">Session Not Started Yet</p>
					<p className="text-gray-400 mb-6">
						This session hasn’t started yet. Please join at the scheduled time.
					</p>

					<Button onClick={() => router.replace(`/dashboard`)}>
						Go to Dashboard
					</Button>
				</div>
			</div>
		)
	}

	// Stable study-room id/slug used across room subsystems.
	const extractedUuid = roomName ? resolveStudyRoomRouteId(roomName) : roomName
	const liveSessionKind: 'studyRoom' = 'studyRoom'

	return (
		<EnhancedVideoRoom
			token={token}
			serverUrl={serverUrl}
			channelId={channelId}
			sessionData={sessionData}
			sessionUuid={extractedUuid}
			liveSessionKind={liveSessionKind}
			isHost={isHost}
			chatRecipients={chatRecipients}
			hostUser={hostUser}
			currentUserDbId={currentUserDbId}
			externalAccessToken={guestAccessToken}
			guestLivekitIdentity={guestLivekitIdentity}
			onParticipantListChange={handleParticipantListChange}
		/>
	)
}


