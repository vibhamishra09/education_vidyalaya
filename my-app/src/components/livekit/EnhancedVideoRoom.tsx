'use client'
import '@/lib/livekit-benign-log-filter'
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import { LiveKitRoom, useParticipants, useTracks, RoomAudioRenderer, useSpeakingParticipants, VideoTrack, useLocalParticipant, isTrackReference, useRoomContext } from '@livekit/components-react'
import {
	Track,
	RoomOptions,
	VideoPresets,
	LocalVideoTrack,
	RoomEvent,
	DisconnectReason,
} from 'livekit-client'
import '@livekit/components-styles'
import { BackgroundProcessor, BackgroundBlur, VirtualBackground, BackgroundOptions } from '@livekit/track-processors'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { parseLivekitAccessTokenIdentity } from '@/lib/livekit-jwt-identity'
import { isJoineeFlowFileEnabled } from '@/lib/joinee-flow-log'
import { Button } from '@/components/ui/button'
import {
	MessageSquare, X, Users, Maximize2, Minimize2, Video, VideoOff, Mic, MicOff,
	Clock, MonitorUp, MonitorOff, Grid2X2, Presentation, Pin,
	PinOff, User, PictureInPicture2, Camera, CameraOff, Sparkles, Lock, Settings2,
	PhoneOff, ChevronUp, ChevronLeft, ChevronRight, ShieldCheck, Ban, Aperture,
	ImageIcon, LayoutGrid, Check, Timer, Power, LogOut, ZoomIn, ZoomOut, MousePointer2, Pencil,
	Share2
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSessionTimer } from '@/hooks/use-session-timer'
import { SessionEndWarningDialog } from '@/components/study-room/session-end-warning-dialog'

// Type the dynamic import to ensure props like roomId are recognized
const ScratchPad = dynamic<any>(() => import('@/components/scratch-pad/ScratchPad').then(mod => mod.ScratchPad), { 
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-[#0f0f0f]">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-sky-500/30 border-t-sky-500 animate-spin rounded-full" />
                <span className="text-white/40 text-sm font-medium">Initializing Whiteboard...</span>
            </div>
        </div>
    )
})

import { useToast } from '@/contexts/toast-context'
import { useAuth, useUser } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import { streakKeys } from '@/hooks/use-streaks'
import { dashboardKeys } from '@/hooks/use-dashboard'
import { achievementKeys } from '@/hooks/use-achievements'
import { io, Socket } from 'socket.io-client'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useSessionExtension } from '@/hooks/use-session-extension'
import { ExtensionRequestDialog } from '@/components/study-room/extension-request-dialog'
import { EndMeetingDialog } from '@/components/study-room/end-meeting-dialog'
import { WebinarHostPanel } from '@/components/study-room/webinar-host-panel'
import { useSessionModeration, RoomPermissions, PermissionRequest, ParticipantPermissionRequest, ParticipantChatLocks, RoomSettings, FlashMessage, FlashQuestion } from '@/hooks/use-session-moderation'
import { ChatRecipient } from '@/components/chat/MessageInput'
import { useRemoteControl } from '@/hooks/use-remote-control'
import { RemoteControlOverlay } from '@/components/livekit/RemoteControlOverlay'
import { getSocketIoBaseUrl } from '@/lib/socket-base-url'
import { shouldApplyKrispNoiseFilter } from '@/lib/livekit-url'
import { attachLiveKitConnectionDiagnostics } from '@/lib/livekit-connection-diagnostics'
import apiClient from '@/lib/api-client'
import { useBluetoothMicRecovery } from '@/hooks/use-bluetooth-mic-recovery'
// Stable virtual backgrounds constant to avoid re-creating array each render
const VIRTUAL_BACKGROUNDS = [
	{
		id: 0,
		name: 'Modern Office',
		url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop&q=80',
		thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=150&fit=crop&q=80'
	},
	{
		id: 1,
		name: 'Minimalist Workspace',
		url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1920&h=1080&fit=crop&q=80',
		thumbnail: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=200&h=150&fit=crop&q=80'
	},
	{
		id: 2,
		name: 'Cozy Library',
		url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920&h=1080&fit=crop&q=80',
		thumbnail: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=200&h=150&fit=crop&q=80'
	},
	{
		id: 3,
		name: 'Conference Room',
		url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&h=1080&fit=crop&q=80',
		thumbnail: 'https://images.unsplash.com/photo-497366754035-f200968a6e72?w=200&h=150&fit=crop&q=80'
	},
	{
		id: 4,
		name: 'Bookshelf',
		url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1920&h=1080&fit=crop&q=80',
		thumbnail: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=200&h=150&fit=crop&q=80'
	},
	{
		id: 5,
		name: 'City View',
		url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&h=1080&fit=crop&q=80',
		thumbnail: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=200&h=150&fit=crop&q=80'
	}
]
export interface SessionData {
	id: string;
	date: string;
	duration: number;
	sessionType: 'studyRoom' | 'peerSession';
	sessionMode?: string;
	slug: string
	[key: string]: unknown;
}

interface ChatIdentity {
	id: string
	name: string
	avatar?: string | null
}

interface EnhancedVideoRoomProps {
	token: string
	serverUrl: string
	channelId?: string | null
	sessionData?: SessionData | null
	isHost?: boolean
	chatRecipients?: ChatRecipient[]
	hostUser?: ChatIdentity | null
	currentUserDbId?: string | null
	externalAccessToken?: string | null
	guestLivekitIdentity?: string | null
	onParticipantListChange?: (participantIdentities: string[]) => void
	sessionUuid?: string | null
	/** From URL (`studyroom-` / `peersession-`); used if `sessionData` is missing ids during navigation */
	liveSessionKind?: 'studyRoom' | 'peerSession'
}

export function EnhancedVideoRoom({
	token,
	serverUrl,
	channelId,
	sessionData,
	isHost = false,
	chatRecipients = [],
	hostUser,
	currentUserDbId,
	externalAccessToken,
	guestLivekitIdentity = null,
	onParticipantListChange,
	sessionUuid = null,
	liveSessionKind,
}: EnhancedVideoRoomProps) {
	const isGuest = !!externalAccessToken
	const [showChat, setShowChat] = useState(false) // Start hidden on mobile
	const [showParticipants, setShowParticipants] = useState(false)
	const [showScratchPad, setShowScratchPad] = useState(false)
	const [showTimerPanel, setShowTimerPanel] = useState(false)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [showWarning, setShowWarning] = useState(false)
	const [isMobileViewport, setIsMobileViewport] = useState(false)
	/** Must be correct on first client render — if it flips after mount, LiveKitRoom recreates Room() and drops the first connection. */
	const [isMobileDevice] = useState(() => {
		if (typeof window === 'undefined') return false
		const mobileByUa =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				window.navigator.userAgent,
			)
		const mobileByTouch =
			window.navigator.maxTouchPoints > 1 && window.screen.width <= 1024
		return mobileByUa || mobileByTouch
	})
	const [hasResolvedMediaContext, setHasResolvedMediaContext] = useState(false)
	const [isSecureMediaContext, setIsSecureMediaContext] = useState(false)
	const router = useRouter()
	const { showSuccess, showError } = useToast()
	const { getToken } = useAuth()
	const { user, isLoaded: clerkLoaded } = useUser()
	const queryClient = useQueryClient()
	// Auth token for chat/moderation sockets
	const [authToken, setAuthToken] = useState<string | null>(null)
	const derivedLivekitIdentity = useMemo(
		() =>
			externalAccessToken && token
				? parseLivekitAccessTokenIdentity(token)
				: null,
		[externalAccessToken, token],
	)
	const resolvedGuestLivekitIdentity =
		guestLivekitIdentity ?? derivedLivekitIdentity ?? null
	/**
	 * Must match what the host sends in `request-audio-on` / `request-video-on` (LiveKit `participant.identity`).
	 * Guest joins use the guest LiveKit identity on the token — not the viewer's Clerk id, or host-targeted
	 * events will never match `userIdRef` and permission modals never show.
	 */
	const moderationUserId = externalAccessToken
		? resolvedGuestLivekitIdentity ?? user?.id ?? null
		: user?.id ?? null
	/** Host moderation events use LiveKit `participant.identity`; may differ from Clerk id (guest links). */
	const moderationIdentityMatchIds = useMemo(
		() =>
			[
				...new Set(
					[
						user?.id,
						resolvedGuestLivekitIdentity,
						currentUserDbId,
						moderationUserId,
					].filter((x): x is string => typeof x === 'string' && x.length > 0),
				),
			],
		[user?.id, resolvedGuestLivekitIdentity, currentUserDbId, moderationUserId],
	)
	const moderationReady =
		!!sessionData?.id &&
		(externalAccessToken
			? !!authToken &&
				(!!resolvedGuestLivekitIdentity || !!(clerkLoaded && user?.id))
			: clerkLoaded && !!user?.id)

	/** Prevents double `router.push` when leave + LiveKit disconnect both fire */
	const feedbackNavigatedRef = useRef(false)
	useEffect(() => {
		feedbackNavigatedRef.current = false
	}, [sessionData?.id])

	// Socket.io for transcripts
	const [transcriptSocket, setTranscriptSocket] = useState<Socket | null>(null)
	const socketConnectingRef = useRef(false)

	// Loading state when ending meeting
	const [endingMeeting, setEndingMeeting] = useState(false)

	// Confirmation dialog for ending meeting
	const [showEndConfirmation, setShowEndConfirmation] = useState(false)

	// User activity tracking for auto-hiding controls
	const [isUserActive, setIsUserActive] = useState(true)

	useEffect(() => {
		if (typeof window === 'undefined') return
		const mediaQuery = window.matchMedia('(max-width: 767px)')
		const updateViewport = () => setIsMobileViewport(mediaQuery.matches)
		updateViewport()
		mediaQuery.addEventListener('change', updateViewport)
		return () => mediaQuery.removeEventListener('change', updateViewport)
	}, [])

	useEffect(() => {
		if (typeof window === 'undefined') return
		setIsSecureMediaContext(
			window.isSecureContext &&
			typeof window.navigator.mediaDevices?.getUserMedia === 'function',
		)
		setHasResolvedMediaContext(true)
	}, [])

	const isNavigatingRef = useRef(false)
	useEffect(() => {
		let timeoutId: NodeJS.Timeout
		const handleActivity = () => {
			setIsUserActive(true)
			clearTimeout(timeoutId)
			timeoutId = setTimeout(() => setIsUserActive(false), 3000)
		}

		window.addEventListener('mousemove', handleActivity)
		window.addEventListener('keydown', handleActivity)
		window.addEventListener('click', handleActivity)
		window.addEventListener('touchstart', handleActivity)

		// Initial timeout
		timeoutId = setTimeout(() => setIsUserActive(false), 3000)

		return () => {
			window.removeEventListener('mousemove', handleActivity)
			window.removeEventListener('keydown', handleActivity)
			window.removeEventListener('click', handleActivity)
			window.removeEventListener('touchstart', handleActivity)
			clearTimeout(timeoutId)
		}
	}, [])

	// Get auth token on mount
	useEffect(() => {
		async function fetchToken() {
			if (externalAccessToken) {
				setAuthToken(externalAccessToken)
				return
			}
			const token = await getToken()
			setAuthToken(token)
		}
		fetchToken()
	}, [getToken, externalAccessToken])

	/** Participant mic disabled at create time → join muted unless host (LiveKit publish). */
	const webinarJoineeMicOffByConfig = useMemo(() => {
		if (sessionData?.sessionMode !== 'WEBINAR') return false
		const perms = (
			(sessionData.webinarConfig || {}) as { permissions?: { mic?: string } }
		).permissions
		return perms?.mic === 'disabled'
	}, [sessionData?.sessionMode, sessionData?.webinarConfig])

	/** Participant camera disabled at create time → no auto video for joinees; host always may publish video. */
	const webinarJoineeVideoOffByConfig = useMemo(() => {
		if (sessionData?.sessionMode !== 'WEBINAR') return false
		const perms = (
			(sessionData.webinarConfig || {}) as { permissions?: { video?: string } }
		).permissions
		return perms?.video === 'disabled'
	}, [sessionData?.sessionMode, sessionData?.webinarConfig])

	const liveKitInitialAudio =
		isSecureMediaContext && (!webinarJoineeMicOffByConfig || isHost)

	/** Webinar only: publish camera on connect when create-time participant camera is enabled; standard/peer rooms stay off. */
	const liveKitInitialVideo = useMemo(() => {
		if (!isSecureMediaContext) return false
		if (sessionData?.sessionMode !== 'WEBINAR') return false
		return !webinarJoineeVideoOffByConfig || isHost
	}, [isSecureMediaContext, sessionData?.sessionMode, webinarJoineeVideoOffByConfig, isHost])

	// Store showSuccess in ref to avoid recreating handleWarning callback
	const showSuccessRef = useRef(showSuccess)
	useEffect(() => {
		showSuccessRef.current = showSuccess
	}, [showSuccess])

	// Calculate session start time and duration (only if sessionData exists)
	const sessionStartTime = sessionData?.date ? new Date(sessionData.date) : null
	const sessionDuration = sessionData?.duration || 0 // in minutes

	// Convert to stable timestamp (use 0 as fallback to avoid hydration issues)
	const sessionStartTimestamp = sessionStartTime ? sessionStartTime.getTime() : 0

	// Session timer with warnings (only if we have start time and duration)
	const timerEnabled = !!sessionStartTime && sessionDuration > 0 && !!sessionData

	// For peer sessions, show moderator controls even if timer isn't configured
	const showModeratorControls = !!sessionData && (sessionData.sessionType === 'peerSession' || timerEnabled)

	// Timer debug logging removed

	// Session extension hook
	const {
		hasExtended,
		extendedEndTime,
		extensionMinutes,
		pendingRequest,
		requestExtension,
		approveExtension,
		dismissRequest,
	} = useSessionExtension({
		sessionId: sessionData?.id || null,
		sessionType: sessionData?.sessionType || null,
		isHost,
		token: authToken,
		enabled: timerEnabled,
	})

	// Session moderation hook (host actions + listeners)
	const {
		socket: moderationSocket,
		isConnected: moderationConnected,
		meetingEnded,
		chatDisabled,
		permissions, // Room-wide permissions (Lock system)
		roomSettings,
		endMeetingForAll,
		lockAudio,
		lockVideo,
		lockChat,
		restrictChatToHostOnly,
		lockUserAudio,
		lockUserVideo,
		lockUserChatAudience,
		hideParticipantList,
		muteAll,
		unmuteAll,
		muteParticipant,
		unmuteParticipant,
		disableVideoAll,
		enableVideoAll,
		disableVideoParticipant,
		enableVideoParticipant,
		toggleChatDisabled,
		// New request functions
		requestAudioOn,
		requestVideoOn,
		respondToAudioRequest,
		respondToVideoRequest,
		pendingPermissionRequest,
		dismissPermissionRequest,
		// Participant request functions
		participantRequestAudio,
		participantRequestVideo,
		// Host response functions
		hostRespondParticipantAudio,
		hostRespondParticipantVideo,
		// Pending participant requests (for host UI)
		pendingParticipantRequests,
		clearParticipantRequest,
		participantChatLocks,
		// Flash message state
		activeFlashMessage,
		flashQuestions,
		// Flash message actions
		flashUploadList,
		flashUpdateQuestion,
		flashReorder,
		flashDeleteQuestion,
		flashShowQuestion,
		flashShowAdHoc,
		flashDismiss,
		flashGetList,
		dismissFlashMessage,
		lockScratchPad,
	} = useSessionModeration({
		sessionId: sessionData?.id || null,
		sessionType: sessionData?.sessionType || null,
		isHost,
		token: authToken,
		userId: moderationUserId,
		identityMatchIds: moderationIdentityMatchIds,
		enabled: moderationReady,
		meetFlowTrace: isJoineeFlowFileEnabled() && !isHost,
	})

	const webinarChat = useMemo(() => {
		// Mode from permissions if studyRoom/webinar
		const mode = permissions.allowChatEveryone ? 'everyone' : (permissions.allowChatHost ? 'host' : 'disabled')
		return {
			chatLive: permissions.allowChat,
			chatMode: mode as 'everyone' | 'host' | 'disabled',
		}
	}, [permissions])

	const pushSessionFeedback = useCallback(
		(force?: boolean) => {
			const feedbackId = sessionData?.id ?? sessionUuid ?? ''
			const feedbackType =
				sessionData?.sessionType ?? liveSessionKind ?? null
			if (!feedbackId || !feedbackType) return
			if (!force && feedbackNavigatedRef.current) return
			feedbackNavigatedRef.current = true
			const path = `/session-feedback/${encodeURIComponent(feedbackId)}?type=${feedbackType}&isHost=${isHost}`
			// Hard navigation: client router.push often fails to leave the LiveKit/fullscreen stack reliably
			if (typeof window !== 'undefined') {
				window.location.assign(`${window.location.origin}${path}`)
			} else {
				router.push(path)
			}
		},
		[
			router,
			sessionData?.id,
			sessionData?.sessionType,
			isHost,
			sessionUuid,
			liveSessionKind,
		],
	)

	// Redirect all clients when server signals meeting ended
	useEffect(() => {
		if (!meetingEnded) return
		pushSessionFeedback(true)
	}, [meetingEnded, pushSessionFeedback])

	const onLiveKitRoomClosedByServer = useCallback((reason?: DisconnectReason) => {
		if (!isHost && reason === DisconnectReason.PARTICIPANT_REMOVED) {
			showError(
				'Removed by host',
				'You were removed from this meet by the host due to inappropriate behaviour.',
			)
		}
		pushSessionFeedback(true)
	}, [isHost, pushSessionFeedback, showError])

	// Wrapper functions for request actions with toast notifications
	const handleRequestAudioOn = useCallback((targetUserId: string) => {
		requestAudioOn(targetUserId)
		showSuccess('Request sent', 'Asked participant to unmute microphone')
	}, [requestAudioOn, showSuccess])

	const handleRequestVideoOn = useCallback((targetUserId: string) => {
		requestVideoOn(targetUserId)
		showSuccess('Request sent', 'Asked participant to enable camera')
	}, [requestVideoOn, showSuccess])

	const handleParticipantRequestAudio = useCallback(() => {
		participantRequestAudio()
		showSuccess('Request sent', 'Asked host for permission to unmute')
	}, [participantRequestAudio, showSuccess])

	const handleParticipantRequestVideo = useCallback(() => {
		participantRequestVideo()
		showSuccess('Request sent', 'Asked host for permission to enable camera')
	}, [participantRequestVideo, showSuccess])

	const handleRequestExtension = useCallback(() => {
		requestExtension()
		showSuccess('Extension request sent', 'Your request to extend the session has been sent to the host')
	}, [requestExtension, showSuccess])

	// Show confirmation dialog before ending meeting
	const handleEndMeetingClick = useCallback(() => {
		setShowEndConfirmation(true)
	}, [])

	// Actually end the meeting after confirmation
	const confirmEndMeeting = useCallback(async () => {
		setShowEndConfirmation(false)
		setEndingMeeting(true)

		// Call backend to complete the session
		if (sessionData?.id && sessionData?.sessionType) {
			try {
				const authTokenValue = await getToken()

				if (sessionData.sessionType === 'studyRoom') {
					await apiClient.post(
						`/api/study-rooms/${sessionData.id}/complete`,
						{},
						{
							headers: {
								Authorization: `Bearer ${authTokenValue}`,
							},
						},
					)
				} else if (sessionData.sessionType === 'peerSession') {
					await apiClient.patch(
						`/api/peer-sessions/${sessionData.id}/complete`,
						{},
						{
							headers: {
								Authorization: `Bearer ${authTokenValue}`,
							},
						},
					)
				}

				// Invalidate queries
				await queryClient.invalidateQueries({ queryKey: streakKeys.current() })
				await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
				await queryClient.invalidateQueries({ queryKey: achievementKeys.all })
			} catch (error) {
				// Error completing session
			}
		}

		// End meeting for all participants via socket
		endMeetingForAll()

		// Go straight to review; do not wait on socket (joiners also get LiveKit room-closed backup)
		pushSessionFeedback(true)
	}, [
		sessionData?.id,
		sessionData?.sessionType,
		getToken,
		queryClient,
		endMeetingForAll,
		pushSessionFeedback,
	])

	const handleTimeUp = useCallback(async () => {
		// Set loading state
		setEndingMeeting(true)

		// Timer expired - auto-complete the session (payment processed, redirect to review)
		if (sessionData?.id && sessionData?.sessionType && isHost) {
			try {
				const authToken = await getToken()

				if (sessionData.sessionType === 'studyRoom') {
					try {
						await apiClient.post(
							`/api/study-rooms/${sessionData.id}/complete`,
							{},
							{
								headers: {
									Authorization: `Bearer ${authToken}`,
								},
							},
						)
					} catch {
						// Failed to complete study room
					}
				} else if (sessionData.sessionType === 'peerSession') {
					try {
						await apiClient.patch(
							`/api/peer-sessions/${sessionData.id}/complete`,
							{},
							{
								headers: {
									Authorization: `Bearer ${authToken}`,
								},
							},
						)
					} catch {
						// Failed to complete peer session
					}
				}

				// Invalidate queries
				await queryClient.invalidateQueries({ queryKey: streakKeys.current() })
				await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
				await queryClient.invalidateQueries({ queryKey: achievementKeys.all })
			} catch (error) {
				// Error completing session
			}
		}

		pushSessionFeedback(true)
	}, [sessionData?.id, sessionData?.sessionType, isHost, getToken, queryClient, pushSessionFeedback])

	const handleWarning = useCallback((minutes: number) => {
		setShowWarning(true)
		showSuccessRef.current('⏰ Session Ending Soon', `Your session will end in ${minutes} minutes.`)
	}, [])

	const { formattedTime, minutesLeft, currentEndTime } = useSessionTimer({
		startTime: sessionStartTimestamp,
		duration: sessionDuration || 60,
		enabled: timerEnabled,
		onTimeUp: handleTimeUp,
		onWarning: handleWarning,
		extendedEndTime,
	})
	console.log(minutesLeft, formattedTime, currentEndTime);
	

	// Handle approving extension request from the dialog
	const handleApproveExtension = useCallback(() => {
		approveExtension(currentEndTime)
	}, [approveExtension, currentEndTime])

	// Show toast when session is extended
	useEffect(() => {
		if (hasExtended && extendedEndTime && extensionMinutes) {
			showSuccessRef.current('⏱️ Session Extended!', `The session has been extended by ${extensionMinutes} minutes.`)
		}
	}, [hasExtended, extendedEndTime, extensionMinutes])

	// Auto-show chat on desktop, hide on mobile only when crossing the md breakpoint.
	// This avoids closing chat on mobile keyboard open, which can trigger window resize.
	useEffect(() => {
		if (typeof window === 'undefined') return
		const mediaQuery = window.matchMedia('(min-width: 768px)')
		const applyChatVisibility = (matchesDesktop: boolean) => {
			setShowChat(matchesDesktop)
		}

		applyChatVisibility(mediaQuery.matches)
		const handleChange = (event: MediaQueryListEvent) => {
			applyChatVisibility(event.matches)
		}

		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [])

	// Setup Socket.io for transcripts
	useEffect(() => {
		if (!sessionData?.id || !user || socketConnectingRef.current) return

		let socket: Socket | null = null
		socketConnectingRef.current = true

		async function connectTranscriptSocket() {
			try {
				const authToken = await getToken()
				if (!authToken) return

				const url = getSocketIoBaseUrl()

				socket = io(`${url}/transcripts`, {
					transports: ['websocket'],
					auth: { token: authToken },
					reconnection: true,
					reconnectionAttempts: 5,
					reconnectionDelay: 1000,
				})

				socket.on('connect', () => {
					setTranscriptSocket(socket) // Set socket only after successful connection
				})

				socket.on('connect_error', (err: Error) => {
					setTranscriptSocket(null) // Clear socket on connection error
				})

				socket.on('disconnect', (reason) => {
					setTranscriptSocket(null) // Clear socket on disconnect
				})

				// Add transcript-specific event handlers
				socket.on('transcript-received', (data) => {
					// Server acknowledged transcript
				})

				socket.on('transcript-error', (error) => {
					// Server error
				})
			} catch (_err) {
				// Failed to connect socket
			}
		}

		connectTranscriptSocket()

		return () => {
			socketConnectingRef.current = false
			if (socket) {
				socket.disconnect()
			}
			setTranscriptSocket(null)
		}
	}, [sessionData?.id, user, getToken])

	// Enable speech recognition
	const { isListening, error: speechError } = useSpeechRecognition({
		callId: sessionData?.id || null,
		userId: user?.id || null,
		socket: transcriptSocket,
		enabled: !!sessionData?.id && !!user && !!transcriptSocket && !isMobileDevice,
	})

	// Speech recognition status logging removed

	const handleLeave = useCallback(() => {
		// Joiners (not host): always offer review / feedback (including webinar guest links).
		if (!isHost && sessionData?.id && sessionData?.sessionType) {
			pushSessionFeedback(true)
			return
		}
		router.back()
	}, [router, isHost, sessionData?.id, sessionData?.sessionType, pushSessionFeedback])

	// Memoize LiveKit room options to avoid passing a new object every render
	const roomOptions = useMemo(() => ({
		videoCaptureDefaults: {
			resolution: isMobileDevice ? VideoPresets.h360 : VideoPresets.h720,
			frameRate: isMobileDevice ? 15 : 24,
		},
		audioCaptureDefaults: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
		adaptiveStream: true,
		dynacast: true,
		publishDefaults: {
			videoSimulcastLayers: isMobileDevice
				? [VideoPresets.h180]
				: [VideoPresets.h180, VideoPresets.h360],
		},
	} as RoomOptions), [isMobileDevice])

	/** Passed to room.connect(); defaults were 15s PC / 15s WS — too aggressive on slower networks. */
	const liveConnectOptions = useMemo(
		() => ({
			peerConnectionTimeout: 60_000,
			websocketTimeout: 25_000,
			maxRetries: 5,
		}),
		[],
	)

	const mediaCaptureBlockedReason = !hasResolvedMediaContext
		? null
		: !isSecureMediaContext
			? 'insecure_context'
			: null
	return (
		<div className="h-screen w-screen flex flex-col bg-[#202124] overflow-hidden fixed inset-0">
			{mediaCaptureBlockedReason === 'insecure_context' && (
				<div className="absolute left-4 right-4 top-4 z-[70] rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-md">
					<div className="font-medium text-amber-50">Microphone and camera need HTTPS on mobile web</div>
					<div className="mt-1 text-amber-100/90">
						This room opened over HTTP, so the browser joined in listen-only mode. Open the site over HTTPS or use the mobile app to speak or turn on video.
					</div>
				</div>
			)}
			{isHost &&
				sessionData?.sessionType === 'studyRoom' &&
				sessionData.sessionMode === 'WEBINAR' &&
				sessionData.id && (
					<WebinarHostPanel
						isHost={isHost}
						studyRoomId={sessionData.id}
						guestParticipants={[]}
						hostEmail={user?.primaryEmailAddress?.emailAddress ?? null}
					/>
				)}
			<LiveKitRoom
				video={liveKitInitialVideo}
				audio={liveKitInitialAudio}
				token={token}
				serverUrl={serverUrl}
				connect={true}
				className="flex-1 flex flex-col overflow-hidden"
				options={roomOptions}
				connectOptions={liveConnectOptions}
			>
				<VideoRoomContent
					isUserActive={isUserActive}
					showChat={showChat}
					setShowChat={setShowChat}
					showParticipants={showParticipants}
					setShowParticipants={setShowParticipants}
					showScratchPad={showScratchPad}
					setShowScratchPad={setShowScratchPad}
					showTimerPanel={showTimerPanel}
					setShowTimerPanel={setShowTimerPanel}
					isFullscreen={isFullscreen}
					setIsFullscreen={setIsFullscreen}
					channelId={channelId}
					onLeave={handleLeave}
					timerEnabled={timerEnabled}
					showModeratorControls={showModeratorControls}
					formattedTime={formattedTime}
					minutesLeft={minutesLeft}
					sessionTitle={sessionData?.title as string | undefined}
					isHost={isHost}
					hasExtended={hasExtended}
					onRequestExtension={requestExtension}
					onExtendSession={(mins) => approveExtension(currentEndTime, mins)}
					currentUserId={user?.id}
					moderationSocket={moderationSocket}
					onEndMeeting={handleEndMeetingClick}
					endingMeeting={endingMeeting}
					onMuteAll={muteAll}
					onUnmuteAll={unmuteAll}
					onMuteParticipant={muteParticipant}
					onUnmuteParticipant={unmuteParticipant}
					onDisableVideoAll={disableVideoAll}
					onEnableVideoAll={enableVideoAll}
					onDisableVideoParticipant={disableVideoParticipant}
					onEnableVideoParticipant={enableVideoParticipant}
					onToggleChat={toggleChatDisabled}
					chatDisabled={chatDisabled}
					webinarChatMode={
						sessionData?.sessionMode === 'WEBINAR'
							? webinarChat.chatMode
							: undefined
					}
					webinarChatLive={
						sessionData?.sessionMode === 'WEBINAR'
							? webinarChat.chatLive
							: undefined
					}
					roomSettings={roomSettings}
					onLockAudio={lockAudio}
					onLockVideo={lockVideo}
					onLockChat={lockChat}
					onRestrictChatToHostOnly={restrictChatToHostOnly}
					onHideParticipantList={hideParticipantList}
					onLockScratchPad={lockScratchPad}
					onLockUserAudio={lockUserAudio}
					onLockUserVideo={lockUserVideo}
					onLockUserChatAudience={lockUserChatAudience}
					onRequestAudioOn={handleRequestAudioOn}
					onRequestVideoOn={handleRequestVideoOn}
					pendingPermissionRequest={pendingPermissionRequest}
					respondToAudioRequest={respondToAudioRequest}
					respondToVideoRequest={respondToVideoRequest}
					dismissPermissionRequest={dismissPermissionRequest}
					participantRequestAudio={handleParticipantRequestAudio}
					participantRequestVideo={handleParticipantRequestVideo}
					hostRespondParticipantAudio={hostRespondParticipantAudio}
					hostRespondParticipantVideo={hostRespondParticipantVideo}
					pendingParticipantRequests={pendingParticipantRequests}
					clearParticipantRequest={clearParticipantRequest}
					isMobileViewport={isMobileViewport}
					chatRecipients={chatRecipients}
					hostUser={hostUser}
					currentUserDbId={currentUserDbId}
					onParticipantListChange={onParticipantListChange}
					isGuest={isGuest}
					guestToken={externalAccessToken}
					participantChatLocks={participantChatLocks}
					onPromoteToCohost={async (participantIdentity, role) => {
						if (sessionData?.sessionType !== 'studyRoom' || !sessionData?.id) return
						const authTokenValue = await getToken()
						await apiClient.post(
							`/api/study-rooms/${sessionData.id}/participants/role`,
							{ participantIdentity, role },
							{
								headers: {
									...(authTokenValue ? { Authorization: `Bearer ${authTokenValue}` } : {}),
								},
							},
						)
						showSuccess(
							role === 'COHOST' ? 'Cohost assigned' : 'Cohost removed',
							'Participant role updated',
						)
					}}
					sessionInfo={sessionData}
					webinarChatEnabledUi={webinarChat.chatLive}
					activeFlashMessage={activeFlashMessage}
					flashQuestions={flashQuestions}
					onFlashUploadList={flashUploadList}
					onFlashUpdateQuestion={flashUpdateQuestion}
					onFlashReorder={flashReorder}
					onFlashDeleteQuestion={flashDeleteQuestion}
					onFlashShowQuestion={flashShowQuestion}
					onFlashShowAdHoc={flashShowAdHoc}
					onFlashDismiss={flashDismiss}
					onFlashGetList={flashGetList}
					onDismissFlashMessage={dismissFlashMessage}
					mediaCaptureBlockedReason={mediaCaptureBlockedReason}
					sessionStableId={sessionUuid}
					sessionData={sessionData}
					liveKitServerUrl={serverUrl}
					onLiveKitRoomClosedByServer={onLiveKitRoomClosedByServer}
				/>
			</LiveKitRoom>

			{/* Extension Request Dialog - Shows when a participant requests extension (Host only) */}
			{isHost && pendingRequest && (
				<ExtensionRequestDialog
					open={!!pendingRequest}
					requesterName={pendingRequest.name}
					onApprove={handleApproveExtension}
					onDismiss={dismissRequest}
				/>
			)}

			{/* Warning Dialog - Shows at 5 minutes (Only for host) */}
			{timerEnabled && isHost && (
				<SessionEndWarningDialog
					open={showWarning}
					currentEndTime={currentEndTime}
					onClose={() => setShowWarning(false)}
				/>
			)}

			{/* End Meeting Confirmation Dialog */}
			{isHost && (
				<EndMeetingDialog
					open={showEndConfirmation}
					onConfirm={confirmEndMeeting}
					onCancel={() => setShowEndConfirmation(false)}
				/>
			)}

			{/* Loading Overlay when ending meeting */}
			{endingMeeting && (
				<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
					<div className="relative">
						<div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						<div className="absolute inset-0 flex items-center justify-center">
							<PhoneOff className="h-6 w-6 text-primary animate-pulse" />
						</div>
					</div>
					<p className="mt-6 text-lg font-medium text-white">Ending Session...</p>
					<p className="mt-2 text-sm text-gray-400">Please wait while we wrap things up</p>
				</div>
			)}
		</div>
	)
}

// Memoized to prevent re-renders from parent component state changes
const VideoRoomContent = memo(function VideoRoomContent({
	isUserActive,
	showChat,
	setShowChat,
	showParticipants,
	setShowParticipants,
	showScratchPad,
	setShowScratchPad,
	showTimerPanel,
	setShowTimerPanel,
	isFullscreen,
	setIsFullscreen,
	channelId,
	onLeave,
	timerEnabled,
	showModeratorControls,
	formattedTime,
	minutesLeft,
	sessionTitle,
	isHost,
	hasExtended,
	onRequestExtension,
	onExtendSession,
	currentUserId,
	moderationSocket,
	onEndMeeting,
	endingMeeting,
	onMuteAll,
	onUnmuteAll,
	onMuteParticipant,
	onUnmuteParticipant,
	onDisableVideoAll,
	onEnableVideoAll,
	onDisableVideoParticipant,
	onEnableVideoParticipant,
	onToggleChat,
	chatDisabled,
	permissions,
	roomSettings,
	onLockAudio,
	onLockVideo,
	onLockChat,
	onRestrictChatToHostOnly,
	onHideParticipantList,
	onLockUserAudio,
	onLockUserVideo,
	onLockUserChatAudience,
	onRequestAudioOn,
	onRequestVideoOn,
	pendingPermissionRequest,
	respondToAudioRequest,
	respondToVideoRequest,
	dismissPermissionRequest,
	participantRequestAudio,
	participantRequestVideo,
	hostRespondParticipantAudio,
	hostRespondParticipantVideo,
	pendingParticipantRequests,
	clearParticipantRequest,
	isMobileViewport,
	chatRecipients,
	hostUser,
	currentUserDbId,
	onParticipantListChange,
	isGuest = false,
	guestToken,
	participantChatLocks,
	onPromoteToCohost,
	onLockScratchPad,
	sessionInfo = null,
	webinarChatEnabledUi = true,
	activeFlashMessage,
	flashQuestions = [],
	onFlashUploadList,
	onFlashUpdateQuestion,
	onFlashReorder,
	onFlashDeleteQuestion,
	onFlashShowQuestion,
	onFlashShowAdHoc,
	onFlashDismiss,
	onFlashGetList: _onFlashGetList,
	onDismissFlashMessage,
	mediaCaptureBlockedReason = null,
	sessionStableId,
	sessionData: _sessionData,
	webinarChatMode,
	webinarChatLive,
	liveKitServerUrl = '',
	onLiveKitRoomClosedByServer,
}: {
	isUserActive: boolean
	showChat: boolean
	setShowChat: (show: boolean) => void
	showParticipants: boolean
	setShowParticipants: (show: boolean) => void
	showScratchPad: boolean
	setShowScratchPad: (show: boolean) => void
	showTimerPanel: boolean
	setShowTimerPanel: (show: boolean) => void
	isFullscreen: boolean
	setIsFullscreen: (show: boolean) => void
	channelId?: string | null
	onLeave: () => void
	timerEnabled: boolean
	showModeratorControls: boolean
	formattedTime: string
	minutesLeft: number
	sessionTitle?: string
	isHost: boolean
	hasExtended: boolean
	onRequestExtension: (minutes?: number) => void
	onExtendSession: (minutes?: number) => void
	currentUserId?: string | null
	moderationSocket?: Socket | null
	onEndMeeting?: () => void
	endingMeeting?: boolean
	onMuteAll?: () => void
	onUnmuteAll?: () => void
	onMuteParticipant?: (targetUserId: string) => void
	onUnmuteParticipant?: (targetUserId: string) => void
	onDisableVideoAll?: () => void
	onEnableVideoAll?: () => void
	onDisableVideoParticipant?: (targetUserId: string) => void
	onEnableVideoParticipant?: (targetUserId: string) => void
	onToggleChat?: (disabled: boolean) => void
	chatDisabled?: boolean
	permissions?: RoomPermissions
	roomSettings?: RoomSettings
	onLockAudio?: (locked: boolean) => void
	onLockVideo?: (locked: boolean) => void
	onLockChat?: (locked: boolean) => void
	onRestrictChatToHostOnly?: (restricted: boolean) => void
	onHideParticipantList?: (hidden: boolean) => void
	onLockScratchPad: (locked: boolean) => void
	onLockUserAudio?: (targetUserId: string, locked: boolean) => void
	onLockUserVideo?: (targetUserId: string, locked: boolean) => void
	onLockUserChatAudience?: (
		targetUserId: string,
		audience: 'everyone' | 'host' | 'user',
		locked: boolean,
	) => void
	onRequestAudioOn?: (targetUserId: string) => void
	onRequestVideoOn?: (targetUserId: string) => void
	pendingPermissionRequest?: PermissionRequest | null
	respondToAudioRequest?: (accepted: boolean) => void
	respondToVideoRequest?: (accepted: boolean) => void
	dismissPermissionRequest?: () => void
	participantRequestAudio?: () => void
	participantRequestVideo?: () => void
	hostRespondParticipantAudio?: (userId: string, accepted: boolean) => void
	hostRespondParticipantVideo?: (userId: string, accepted: boolean) => void
	pendingParticipantRequests?: ParticipantPermissionRequest[]
	clearParticipantRequest?: (userId: string, type: 'audio' | 'video') => void
	isMobileViewport?: boolean
	chatRecipients?: ChatRecipient[]
	hostUser?: ChatIdentity | null
	currentUserDbId?: string | null
	onParticipantListChange?: (participantIdentities: string[]) => void
	isGuest?: boolean
	guestToken?: string | null
	participantChatLocks?: Record<string, ParticipantChatLocks>
	onPromoteToCohost?: (
		participantIdentity: string,
		role: 'PARTICIPANT' | 'COHOST',
	) => void
	sessionInfo?: SessionData | null
	webinarChatEnabledUi?: boolean
	activeFlashMessage?: FlashMessage | null
	flashQuestions?: FlashQuestion[]
	onFlashUploadList?: (questions: FlashQuestion[]) => void
	onFlashUpdateQuestion?: (questionId: string, updates: Partial<Omit<FlashQuestion, 'id'>>) => void
	onFlashReorder?: (orderedIds: string[]) => void
	onFlashDeleteQuestion?: (id: string) => void
	onFlashShowQuestion?: (id: string, duration?: number) => void
	onFlashShowAdHoc?: (content: string, type: 'AD_HOC' | 'MEDIA', duration?: number) => void
	onFlashDismiss?: () => void
	onFlashGetList?: () => void
	onDismissFlashMessage?: () => void
	sessionData?: SessionData | null
	mediaCaptureBlockedReason?: 'insecure_context' | null
	sessionStableId?: string | null
	webinarChatMode?: string
	webinarChatLive?: boolean
	liveKitServerUrl?: string
	onLiveKitRoomClosedByServer?: (reason?: DisconnectReason) => void
}) {
	// Room context removed to avoid race conditions, using localParticipant hook instead
	const room = useRoomContext()
	const params = useParams<{ room: string }>()
	const { showWarning, showSuccess, showInfo, showError } = useToast()

	// Remote Control Hook
	const {
		isControlling,
		isRequestPending,
		targetScreenShareId,
		requestControl,
		stopControl,
		sendInputEvent,
		controllerId,
		pendingRequestFrom,
		grantControl,
		denyControl,
		revokeControl
	} = useRemoteControl()

	// Get participants list for name lookup
	const allParticipants = useParticipants()
	/** Webinar attendees often use guest join links; give them the same controls as a signed-in study-room joiner */
	const isWebinarJoinee = !isHost && sessionInfo?.sessionMode === 'WEBINAR'
	const studyRoomStyleJoinerChrome = !isGuest || isWebinarJoinee
	const restrictGuestChatAudiences = isGuest && !isWebinarJoinee
	const canViewParticipantList =
		studyRoomStyleJoinerChrome &&
		(isHost ||
			(permissions?.allowParticipantList !== false &&
				roomSettings?.hideParticipantList !== true))
	const participantIdentitiesKey = useMemo(
		() => allParticipants.map((participant) => participant.identity).sort().join('|'),
		[allParticipants],
	)

	useEffect(() => {
		if (!onParticipantListChange) return
		onParticipantListChange(
			participantIdentitiesKey ? participantIdentitiesKey.split('|') : [],
		)
	}, [onParticipantListChange, participantIdentitiesKey])

	useEffect(() => {
		if (canViewParticipantList) return
		if (showParticipants) {
			setShowParticipants(false)
		}
	}, [canViewParticipantList, showParticipants, setShowParticipants])

	// Get local participant state directly - most reliable source of truth
	const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()
	const lkRoom = useRoomContext()

	useEffect(() => {
		if (!lkRoom) return
		return attachLiveKitConnectionDiagnostics(lkRoom, {
			sessionStableId: sessionStableId ?? null,
			liveKitServerUrl: liveKitServerUrl || undefined,
		})
	}, [lkRoom, sessionStableId, liveKitServerUrl])

	// When the host ends the call, LiveKit closes the room; redirect if moderation socket missed `meeting-ended`.
	useEffect(() => {
		if (!lkRoom || !onLiveKitRoomClosedByServer) return
		const handler = (reason?: DisconnectReason) => {
			const serverEnded =
				reason === DisconnectReason.ROOM_DELETED ||
				reason === DisconnectReason.ROOM_CLOSED ||
				reason === DisconnectReason.PARTICIPANT_REMOVED ||
				reason === DisconnectReason.SERVER_SHUTDOWN
			if (!serverEnded) return
			onLiveKitRoomClosedByServer(reason)
		}
		lkRoom.on(RoomEvent.Disconnected, handler)
		return () => {
			lkRoom.off(RoomEvent.Disconnected, handler)
		}
	}, [lkRoom, onLiveKitRoomClosedByServer])

	const insecureMediaTitle = useMemo(
		() =>
			isMobileViewport || isGuest
				? 'Microphone and camera need HTTPS'
				: 'Microphone and camera unavailable on HTTP',
		[isGuest, isMobileViewport],
	)
	const insecureMediaDescription =
		'This page is open over HTTP, and browsers only allow microphone and camera access in a secure HTTPS context. Reopen the site over HTTPS or use the mobile app.'

	const showMediaError = useCallback(
		(kind: 'mic' | 'cam', err: unknown, enabling: boolean) => {
			if (enabling && mediaCaptureBlockedReason === 'insecure_context') {
				showError(insecureMediaTitle, insecureMediaDescription)
				return
			}
			const name =
				err instanceof DOMException
					? err.name
					: typeof err === 'object' &&
						err !== null &&
						'name' in err &&
						typeof (err as { name: unknown }).name === 'string'
						? (err as { name: string }).name
						: ''
			if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
				showError(
					`${kind === 'mic' ? 'Microphone' : 'Camera'} blocked`,
					`Allow ${kind === 'mic' ? 'microphone' : 'camera'} access for this site in your browser settings, then try again.`,
				)
			} else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
				showError(
					`No ${kind === 'mic' ? 'microphone' : 'camera'}`,
					'Connect a device or choose a different input in your system settings.',
				)
			} else if (
				name === 'NotReadableError' ||
				name === 'TrackStartError' ||
				name === 'AbortError'
			) {
				showError(
					`${kind === 'mic' ? 'Microphone' : 'Camera'} busy`,
					'Another app or tab may be using the device. Close it and try again.',
				)
			} else {
				showError(
					`${kind === 'mic' ? 'Microphone' : 'Camera'}`,
					enabling
						? `Could not turn ${kind === 'mic' ? 'the microphone' : 'the camera'} on. Try again or reload the page.`
						: `Could not turn ${kind === 'mic' ? 'the microphone' : 'the camera'} off.`,
				)
			}
		},
		[mediaCaptureBlockedReason, insecureMediaDescription, insecureMediaTitle, showError],
	)
	const insecureMediaToastShownRef = useRef(false)
	useBluetoothMicRecovery({
		room: lkRoom,
		localParticipant,
		enabled: mediaCaptureBlockedReason !== 'insecure_context',
	})
	useEffect(() => {
		if (mediaCaptureBlockedReason !== 'insecure_context') return
		if (insecureMediaToastShownRef.current) return
		insecureMediaToastShownRef.current = true
		showWarning(insecureMediaTitle, 'You joined muted because this room is open over HTTP. Switch to HTTPS or the mobile app to use your microphone and camera.')
	}, [mediaCaptureBlockedReason, insecureMediaTitle, showWarning])

	const handleToggleMicrophone = useCallback(async () => {
		if (!localParticipant) {
			showError('Not connected', 'Wait until the room finishes connecting, then try again.')
			return
		}
		const newState = !localParticipant.isMicrophoneEnabled
		if (newState && mediaCaptureBlockedReason === 'insecure_context') {
			showError(insecureMediaTitle, insecureMediaDescription)
			return
		}
		if (newState && !isHost && permissions && !permissions.allowAudio) {
			participantRequestAudio?.()
			return
		}
		try {
			await localParticipant.setMicrophoneEnabled(newState)
		} catch (err) {
			if (newState) {
				try {
					await new Promise((r) => setTimeout(r, 350))
					await localParticipant.setMicrophoneEnabled(true)
					return
				} catch (retryErr) {
					showMediaError('mic', retryErr, true)
					return
				}
			}
			showMediaError('mic', err, false)
		}
	}, [
		localParticipant,
		isHost,
		permissions,
		participantRequestAudio,
		showError,
		showMediaError,
		mediaCaptureBlockedReason,
		insecureMediaDescription,
		insecureMediaTitle,
	])

	const handleToggleCamera = useCallback(async () => {
		if (!localParticipant) {
			showError('Not connected', 'Wait until the room finishes connecting, then try again.')
			return
		}
		const newState = !localParticipant.isCameraEnabled
		if (newState && mediaCaptureBlockedReason === 'insecure_context') {
			showError(insecureMediaTitle, insecureMediaDescription)
			return
		}
		if (newState && !isHost && permissions && !permissions.allowVideo) {
			participantRequestVideo?.()
			return
		}
		try {
			await localParticipant.setCameraEnabled(newState)
		} catch (err) {
			if (newState) {
				try {
					await new Promise((r) => setTimeout(r, 350))
					await localParticipant.setCameraEnabled(true)
					return
				} catch (retryErr) {
					showMediaError('cam', retryErr, true)
					return
				}
			}
			showMediaError('cam', err, false)
		}
	}, [
		localParticipant,
		isHost,
		permissions,
		participantRequestVideo,
		showError,
		showMediaError,
		mediaCaptureBlockedReason,
		insecureMediaDescription,
		insecureMediaTitle,
	])

	// Track pending requests to show toast when new requests arrive
	const prevRequestCountRef = useRef(0)
	const lastToastAtRef = useRef<Record<string, number>>({})
	const shouldShowToast = useCallback((key: string, cooldownMs: number = 5000) => {
		const now = Date.now()
		const lastAt = lastToastAtRef.current[key] || 0
		if (now - lastAt < cooldownMs) return false
		lastToastAtRef.current[key] = now
		return true
	}, [])
	useEffect(() => {
		if (!isHost || !pendingParticipantRequests) return

		// Check if a new request was added
		if (pendingParticipantRequests.length > prevRequestCountRef.current) {
			// Find the newest request
			const newest = pendingParticipantRequests[pendingParticipantRequests.length - 1]
			// Look up participant name from room
			const participant = allParticipants.find(p => p.identity === newest.userId)
			const displayName = participant?.name || newest.userId
			const toastKey = `permission-request-${newest.type}-${newest.userId}`

			if (newest.type === 'audio' && shouldShowToast(toastKey, 6000)) {
				showWarning('Permission Request', `${displayName} is requesting to unmute`)
			} else if (newest.type === 'video' && shouldShowToast(toastKey, 6000)) {
				showWarning('Permission Request', `${displayName} is requesting to enable camera`)
			}
		}
		prevRequestCountRef.current = pendingParticipantRequests.length
	}, [pendingParticipantRequests, isHost, showWarning, allParticipants, shouldShowToast])

	// Layout mode: 'focus' shows speaker large with others small, 'grid' shows equal tiles
	const [layoutMode, setLayoutMode] = useState<'focus' | 'grid'>('grid')
	const [isViewMenuOpen, setIsViewMenuOpen] = useState(false)
	const [showEndMenu, setShowEndMenu] = useState(false)
	const [showExtendMenu, setShowExtendMenu] = useState(false)
	// Expanded view - hide thumbnails and show only main video
	const [isExpandedView, setIsExpandedView] = useState(false)
	// Screen share: zoom + minimize (floating) + maximize (full workspace overlay)
	const [screenShareZoom, setScreenShareZoom] = useState(1)
	const [screenShareMinimized, setScreenShareMinimized] = useState(false)
	const [screenShareMaximized, setScreenShareMaximized] = useState(false)

	// Automatically switch to Focus Mode and maximize screen share when controlling
	useEffect(() => {
		if (isControlling) {
			setLayoutMode('focus')
			setIsExpandedView(true)
			setScreenShareMaximized(true)
			// Also ensure sidebars are closed
			setShowChat(false)
			setShowParticipants(false)
		}
	}, [isControlling, setLayoutMode, setIsExpandedView, setScreenShareMaximized, setShowChat, setShowParticipants])

	// Close extend menu on outside click
	useEffect(() => {
		if (!showExtendMenu) return
		const handleClick = () => setShowExtendMenu(false)
		document.addEventListener('click', handleClick)
		return () => document.removeEventListener('click', handleClick)
	}, [showExtendMenu])

	// Pinned participant - manually pinned by user
	const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)

	const [isAudioEnabled, setIsAudioEnabled] = useState(true)
	const [isPipPrimed, setIsPipPrimed] = useState(false)

	// Background effects state - use refs for values that don't need to trigger re-renders
	const [backgroundMode, setBackgroundMode] = useState<'none' | 'blur' | 'virtual'>('none')
	const [showBackgroundMenu, setShowBackgroundMenu] = useState(false)
	const [blurAmount, setBlurAmount] = useState(10)
	const [selectedVirtualBg, setSelectedVirtualBg] = useState(0)
	const processorRef = useRef<ReturnType<typeof BackgroundProcessor> | null>(null)
	const blurDebounceRef = useRef<NodeJS.Timeout | null>(null)
	// Store current values in refs to avoid stale closures without adding deps
	const blurAmountRef = useRef(blurAmount)
	const selectedVirtualBgRef = useRef(selectedVirtualBg)
	const backgroundModeRef = useRef(backgroundMode)
	// CRITICAL: Store participants in refs to avoid callback recreation and infinite loops
	const localParticipantRef = useRef(localParticipant)
	const allParticipantsRef = useRef(allParticipants)
	// Prevent concurrent effect applications
	const isApplyingEffectRef = useRef(false)
	// Krisp noise filter ref for cleanup
	const krispFilterRef = useRef<unknown | null>(null)

	// Helper function to get avatar URL from participant metadata
	const getParticipantAvatar = useCallback((participant: { metadata?: string | null }): string | null => {
		if (!participant.metadata) return null
		try {
			const metadata = JSON.parse(participant.metadata)
			return metadata.avatar || null
		} catch {
			return null
		}
	}, [])

	// Keep refs in sync with state
	useEffect(() => { blurAmountRef.current = blurAmount }, [blurAmount])
	useEffect(() => { selectedVirtualBgRef.current = selectedVirtualBg }, [selectedVirtualBg])
	useEffect(() => { backgroundModeRef.current = backgroundMode }, [backgroundMode])
	// CRITICAL: Keep participant refs in sync
	useEffect(() => { localParticipantRef.current = localParticipant }, [localParticipant])
	useEffect(() => { allParticipantsRef.current = allParticipants }, [allParticipants])
	
	// Native Auto-PiP attribute enforcer (fixes React type errors)
	useEffect(() => {
		if (persistentPipVideoRef.current) {
			persistentPipVideoRef.current.setAttribute('autoPictureInPicture', 'true');
		}
	}, []);

	// Listen for moderation socket events and apply local actions
	useEffect(() => {
		if (!moderationSocket) return

		const handleMute = (data: { action: 'mute' | 'unmute'; targetUserId?: string; hostClerkId?: string; isLocked?: boolean }) => {
			try {
				const selfIds = new Set<string>([
					currentUserId || '',
					localParticipant?.identity || '',
				])
				// If targetUserId is specified and it's not this user, skip
				if (data.targetUserId && !selfIds.has(data.targetUserId)) return
				// If this is a global action (no targetUserId) but current user is the host, skip
				// The host should NEVER be affected by global mute actions
				if (!data.targetUserId && data.hostClerkId && data.hostClerkId === currentUserId) return
				if (!localParticipant) return
				const enable = data.action === 'unmute'
				localParticipant.setMicrophoneEnabled(enable).catch(() => { })

				// Show toast notification when host mutes this participant (targeted or room-wide).
				const muteAppliesToMe =
					!data.targetUserId || selfIds.has(data.targetUserId)
				if (data.action === 'mute' && muteAppliesToMe) {
					if (shouldShowToast('moderation-muted', 6000)) {
						showWarning(
							'Microphone muted',
							data.isLocked
								? 'The host has muted your microphone and locked it. You cannot unmute until the host allows it.'
								: 'The host has muted your microphone.'
						)
					}
				}
			} catch (err) {
				// Error applying mute action
			}
		}

		const handleVideo = (data: { action: 'disable' | 'enable'; targetUserId?: string; hostClerkId?: string; isLocked?: boolean }) => {
			try {
				const selfIds = new Set<string>([
					currentUserId || '',
					localParticipant?.identity || '',
				])
				// If targetUserId is specified and it's not this user, skip
				if (data.targetUserId && !selfIds.has(data.targetUserId)) return
				// If this is a global action (no targetUserId) but current user is the host, skip
				// The host should NEVER be affected by global video disable actions
				if (!data.targetUserId && data.hostClerkId && data.hostClerkId === currentUserId) return
				if (!localParticipant) return
				const enable = data.action === 'enable'
				localParticipant.setCameraEnabled(enable).catch(() => { })

				// Show toast notification when host disables video (targeted or room-wide).
				const disableAppliesToMe =
					!data.targetUserId || selfIds.has(data.targetUserId)
				if (data.action === 'disable' && disableAppliesToMe) {
					if (shouldShowToast('moderation-video-disabled', 6000)) {
						showWarning(
							'Camera disabled',
							data.isLocked
								? 'The host has disabled your camera and locked it. You cannot enable it until the host allows it.'
								: 'The host has disabled your camera.'
						)
					}
				}
			} catch (err) {
				// Error applying video action
			}
		}

		moderationSocket.on('moderation-mute', handleMute)
		moderationSocket.on('moderation-video', handleVideo)

		return () => {
			moderationSocket.off('moderation-mute', handleMute)
			moderationSocket.off('moderation-video', handleVideo)
		}
	}, [moderationSocket, currentUserId, localParticipant, showWarning, shouldShowToast])

	// Enforce permission locks on initial join and when permissions change
	// This ensures that when a participant rejoins/refreshes, they respect the locked state
	const prevPermissionsRef = useRef(permissions)
	useEffect(() => {
		if (!localParticipant || isHost) return

		const prevPermissions = prevPermissionsRef.current
		const webinarPermissions = (
			(sessionInfo?.webinarConfig || {}) as { permissions?: { mic?: string; video?: string } }
		).permissions
		const forceMicOffByWebinarConfig =
			sessionInfo?.sessionMode === 'WEBINAR' && webinarPermissions?.mic === 'disabled'
		const forceVideoOffByWebinarConfig =
			sessionInfo?.sessionMode === 'WEBINAR' && webinarPermissions?.video === 'disabled'

		// If audio is locked and mic is on, force disable it
		if (
			localParticipant.isMicrophoneEnabled &&
			(!!permissions && !permissions.allowAudio || forceMicOffByWebinarConfig)
		) {
			localParticipant.setMicrophoneEnabled(false).catch(() => { })
		}

		// If video is locked and camera is on, force disable it
		if (
			localParticipant.isCameraEnabled &&
			(!!permissions && !permissions.allowVideo || forceVideoOffByWebinarConfig)
		) {
			localParticipant.setCameraEnabled(false).catch(() => { })
		}

		// Show notifications to participants when permissions change
		if (permissions && prevPermissions) {
			// Audio lock changed
			if (prevPermissions.allowAudio !== permissions.allowAudio) {
				if (!permissions.allowAudio) {
					if (shouldShowToast('audio-locked', 5000)) {
						showWarning('🔇 Audio Locked', 'The host has locked audio. You cannot unmute until allowed.')
					}
				} else {
					if (shouldShowToast('audio-unlocked', 5000)) {
						showSuccess('🎤 Audio Unlocked', 'You can now unmute your microphone.')
					}
				}
			}

			// Video lock changed
			if (prevPermissions.allowVideo !== permissions.allowVideo) {
				if (!permissions.allowVideo) {
					if (shouldShowToast('video-locked', 5000)) {
						showWarning('📷 Video Locked', 'The host has locked video. You cannot enable camera until allowed.')
					}
				} else {
					if (shouldShowToast('video-unlocked', 5000)) {
						showSuccess('📹 Video Unlocked', 'You can now enable your camera.')
					}
				}
			}

			// Chat lock changed
			if (prevPermissions.allowChat !== permissions.allowChat) {
				if (!permissions.allowChat) {
					if (shouldShowToast('chat-locked', 5000)) {
						showWarning('💬 Chat Locked', 'The host has disabled chat.')
					}
				} else {
					if (shouldShowToast('chat-unlocked', 5000)) {
						showSuccess('💬 Chat Unlocked', 'You can now send messages.')
					}
				}
			}
		}

		// Update ref for next comparison
		prevPermissionsRef.current = permissions
	}, [permissions, localParticipant, isHost, showWarning, showSuccess, shouldShowToast, sessionInfo?.sessionMode, sessionInfo?.webinarConfig])

	// Show joiners explicit notifications for room setting toggles that are not covered by `permissions`.
	const prevRoomSettingsRef = useRef(roomSettings)
	useEffect(() => {
		if (isHost || !roomSettings || !prevRoomSettingsRef.current) {
			prevRoomSettingsRef.current = roomSettings
			return
		}
		const prev = prevRoomSettingsRef.current
		if (!prev) {
			prevRoomSettingsRef.current = roomSettings
			return
		}

		if (prev.chatRestrictToHostOnly !== roomSettings.chatRestrictToHostOnly) {
			if (roomSettings.chatRestrictToHostOnly) {
				if (shouldShowToast('chat-host-only', 5000)) {
					showWarning('💬 Chat Restricted', 'You can send messages to host only.')
				}
			} else if (shouldShowToast('chat-host-only-cleared', 5000)) {
				showSuccess('💬 Chat Open', 'You can send messages to everyone again.')
			}
		}

		if (prev.hideParticipantList !== roomSettings.hideParticipantList) {
			if (roomSettings.hideParticipantList) {
				if (shouldShowToast('participant-list-hidden', 5000)) {
					showWarning('👥 Participant List Hidden', 'Host has hidden the participant list.')
				}
			} else if (shouldShowToast('participant-list-visible', 5000)) {
				showSuccess('👥 Participant List Visible', 'You can open the participant list now.')
			}
		}

		prevRoomSettingsRef.current = roomSettings
	}, [roomSettings, isHost, showWarning, showSuccess, shouldShowToast])

	// Use memoized virtual backgrounds (moved outside with stable ref below)
	// Access via `VIRTUAL_BACKGROUNDS` constant defined below to avoid re-creating this array each render

	// Get all camera tracks using useTracks - the standard way
	const cameraTracks = useTracks(
		[{ source: Track.Source.Camera, withPlaceholder: true }],
		{ onlySubscribed: false }
	)

	// Get screen share tracks
	const screenShareTracks = useTracks(
		[{ source: Track.Source.ScreenShare, withPlaceholder: false }]
	)


	// Debounced speaking detection - only switch focus after sustained speaking (1.5 seconds)
	const [debouncedSpeakerId, setDebouncedSpeakerId] = useState<string | null>(null)
	const speakingTimerRef = useRef<NodeJS.Timeout | null>(null)
	const lastSpeakerRef = useRef<string | null>(null)

	// Find the focused participant (screenShare > pinned > speaking > host)
	const speakingParticipants = useSpeakingParticipants()

	// Debounce the speaking detection - require 1.5 seconds of continuous speaking
	useEffect(() => {
		const currentSpeaker = speakingParticipants.length > 0 ? speakingParticipants[0]?.identity : null

		// If no one is speaking, clear timer but keep last speaker for a bit
		if (!currentSpeaker) {
			if (speakingTimerRef.current) {
				clearTimeout(speakingTimerRef.current)
				speakingTimerRef.current = null
			}
			return
		}

		// If same person keeps speaking, don't reset
		if (currentSpeaker === lastSpeakerRef.current) {
			return
		}

		// New speaker detected - start debounce timer
		if (speakingTimerRef.current) {
			clearTimeout(speakingTimerRef.current)
		}

		speakingTimerRef.current = setTimeout(() => {
			// Only update if still speaking after 1.5 seconds
			if (speakingParticipants.some(p => p.identity === currentSpeaker)) {
				lastSpeakerRef.current = currentSpeaker
				setDebouncedSpeakerId(currentSpeaker)
			}
		}, 1500) // 1.5 second debounce

		return () => {
			if (speakingTimerRef.current) {
				clearTimeout(speakingTimerRef.current)
			}
		}
	}, [speakingParticipants])

	// Auto-switch to presenter view when someone shares screen (only once)
	const hasAutoSwitchedRef = useRef(false)
	useEffect(() => {
		if (screenShareTracks.length > 0) {
			// Auto-switch to focus mode when screen share starts (only if we haven't auto-switched yet)
			if (layoutMode === 'grid' && !hasAutoSwitchedRef.current) {
				setLayoutMode('focus')
				hasAutoSwitchedRef.current = true
			}
		} else {
			// Reset when screen share ends
			hasAutoSwitchedRef.current = false
		}
	}, [screenShareTracks.length, layoutMode])

	// Check if anyone is screen sharing (highest priority)
	const activeScreenShare = screenShareTracks.length > 0 ? screenShareTracks[0] : null

	const focusedParticipant = useMemo(() => {
		// Priority 1: Screen sharing participant (handled separately via activeScreenShare)
		// We still need a focused participant for the thumbnail strip

		// Priority 2: Pinned participant
		if (pinnedParticipantId) {
			const pinned = allParticipants.find(p => p.identity === pinnedParticipantId)
			if (pinned) return pinned
		}

		// Priority 3: Debounced speaking participant (requires sustained speaking)
		if (debouncedSpeakerId) {
			const speaker = allParticipants.find(p => p.identity === debouncedSpeakerId)
			if (speaker) return speaker
		}

		// Priority 4: Host or first remote
		if (localParticipant) {
			if (isHost) {
				return localParticipant
			}
			const firstRemote = allParticipants.find(p => !p.isLocal)
			return firstRemote || localParticipant
		}
		return null
	}, [debouncedSpeakerId, localParticipant, allParticipants, isHost, pinnedParticipantId, activeScreenShare])

	// Handle clicking on a thumbnail to focus/pin that participant
	const handleThumbnailClick = useCallback((participantId: string) => {
		if (pinnedParticipantId === participantId) {
			// Unpin if clicking on already pinned
			setPinnedParticipantId(null)
		} else {
			setPinnedParticipantId(participantId)
		}
	}, [pinnedParticipantId])

	// Toggle pin on the focused video
	const togglePinFocused = useCallback(() => {
		if (focusedParticipant) {
			if (pinnedParticipantId === focusedParticipant.identity) {
				setPinnedParticipantId(null)
			} else {
				setPinnedParticipantId(focusedParticipant.identity)
			}
		}
	}, [focusedParticipant, pinnedParticipantId])

	// Pin from grid and switch to presenter view
	const pinAndSwitchToPresenter = useCallback((participantId: string) => {
		setPinnedParticipantId(participantId)
		setLayoutMode('focus')
	}, [])

	// Apply background effect to local video track using the newer BackgroundProcessor API
	// This provides smoother transitions and better segmentation quality
	// CRITICAL FIX: Empty dependency array - all values accessed via refs to prevent flickering
	const applyBackgroundEffect = useCallback(async (mode: 'none' | 'blur' | 'virtual', intensity?: number) => {
		// Hard guard: never allow background processing on mobile to avoid accidental high CPU usage.
		if (isMobileViewport && mode !== 'none') {
			return
		}

		// Prevent concurrent applications which cause flickering
		if (isApplyingEffectRef.current) {
			return
		}

		isApplyingEffectRef.current = true

		try {
			// CRITICAL: Access localParticipant from ref, not from closure
			const participant = localParticipantRef.current

			// Check if camera is enabled
			if (!participant?.isCameraEnabled) {
				alert('Please turn on your camera first to use background effects')
				return
			}

			// Get local video track
			const videoPublication = Array.from(participant.videoTrackPublications.values()).find(
				pub => pub.source === Track.Source.Camera
			)
			const localVideoTrack = videoPublication?.track as LocalVideoTrack | undefined

			if (!localVideoTrack) {
				alert('Could not find video track. Please ensure your camera is working.')
				return
			}

			// Use refs for current values to avoid stale closures
			const blurRadius = intensity ?? blurAmountRef.current
			const currentSelectedBg = selectedVirtualBgRef.current

			// OPTIMIZATION: If processor already exists, use switchTo for smooth transitions
			// This avoids destroying and recreating the processor which causes flickering
			if (processorRef.current) {
				if (mode === 'blur') {
					await processorRef.current.switchTo({ mode: 'background-blur', blurRadius })
					if (intensity !== undefined) setBlurAmount(intensity)
				} else if (mode === 'virtual') {
					const selectedBg = VIRTUAL_BACKGROUNDS[currentSelectedBg]
					await processorRef.current.switchTo({
						mode: 'virtual-background',
						imagePath: selectedBg.url
					})
				} else {
					// Mode is 'none' - remove processor
					await localVideoTrack.stopProcessor()
					processorRef.current = null
				}
			} else if (mode !== 'none') {
				// Only create new processor if one doesn't exist

				let processor: ReturnType<typeof BackgroundProcessor>

				if (mode === 'blur') {
					processor = BackgroundProcessor({
						mode: 'background-blur',
						blurRadius: blurRadius,
						segmenterOptions: { delegate: 'GPU' }
					})
				} else {
					const selectedBg = VIRTUAL_BACKGROUNDS[currentSelectedBg]
					processor = BackgroundProcessor({
						mode: 'virtual-background',
						imagePath: selectedBg.url,
						segmenterOptions: { delegate: 'GPU' }
					})
				}

				await localVideoTrack.setProcessor(processor)
				processorRef.current = processor

				if (mode === 'blur' && intensity !== undefined) {
					setBlurAmount(intensity)
				}
			}

			setBackgroundMode(mode)
		} catch (err) {
			const error = err as Error
			alert(`Failed to apply background effect: ${error.message}\n\nTip: Make sure you have good lighting and your browser supports this feature.`)
		} finally {
			isApplyingEffectRef.current = false
		}
	}, [isMobileViewport])

	// Ensure mobile sessions never keep background processors active.
	useEffect(() => {
		if (!isMobileViewport) return
		setShowBackgroundMenu(false)
		if (backgroundModeRef.current !== 'none') {
			void applyBackgroundEffect('none')
		}
	}, [isMobileViewport, applyBackgroundEffect])

	// Debounced blur radius update - only updates the blur radius without recreating processor
	// STABILIZED: Uses ref for backgroundMode check
	const updateBlurRadius = useCallback(async (newRadius: number) => {
		if (!processorRef.current || backgroundModeRef.current !== 'blur') return

		try {
			// Use switchTo for smooth radius update without recreating the processor
			await processorRef.current.switchTo({ mode: 'background-blur', blurRadius: newRadius })
		} catch (err) {
			// Failed to update blur radius
		}
	}, [])

	// Debounced handler for slider changes - updates UI immediately, processor after delay
	// STABILIZED: No dependencies since updateBlurRadius is now stable
	const handleBlurSliderChange = useCallback((newValue: number) => {
		// Update UI immediately for smooth slider feel
		setBlurAmount(newValue)

		// Clear any pending debounce timer
		if (blurDebounceRef.current) {
			clearTimeout(blurDebounceRef.current)
		}

		// Debounce the heavy processor update (150ms delay for smoother experience)
		blurDebounceRef.current = setTimeout(() => {
			updateBlurRadius(newValue)
		}, 150)
	}, [updateBlurRadius])

	// Cleanup debounce timer on unmount
	useEffect(() => {
		return () => {
			if (blurDebounceRef.current) {
				clearTimeout(blurDebounceRef.current)
			}
		}
	}, [])

	// Cleanup processor on unmount
	useEffect(() => {
		return () => {
			if (processorRef.current) {
				const localVideoTrack = localParticipant?.videoTrackPublications.values().next().value?.track as LocalVideoTrack | undefined
				if (localVideoTrack) {
					localVideoTrack.stopProcessor().catch(() => { })
				}
			}
		}
	}, [localParticipant])

	// Apply Krisp AI noise suppression only when the LiveKit host exposes Krisp settings (Cloud, or explicit opt-in).
	useEffect(() => {
		if (!localParticipant || typeof window === 'undefined') return
		if (!shouldApplyKrispNoiseFilter(liveKitServerUrl)) return

		let cancelled = false
		let cleanup: (() => void) | null = null

		const applyKrispFilter = async () => {
			try {
				const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import(
					'@livekit/krisp-noise-filter'
				)
				if (cancelled || !isKrispNoiseFilterSupported()) return

				const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone)
				const micTrack = micPublication?.audioTrack
				if (!micTrack) return

				const filter = KrispNoiseFilter()
				krispFilterRef.current = filter
				await micTrack.setProcessor(filter).catch((err: unknown) => {
					console.warn('[LiveKit] Krisp setProcessor failed; mic continues without Krisp:', err)
				})
				cleanup = () => {
					micTrack.stopProcessor().catch(() => { })
					krispFilterRef.current = null
				}
			} catch {
				// Ignore unsupported/runtime errors and continue without Krisp.
			}
		}

		void applyKrispFilter().catch(() => {})

		return () => {
			cancelled = true
			cleanup?.()
		}
	}, [localParticipant, isMicrophoneEnabled, liveKitServerUrl])

	// Stable ordering system: Maintain positions for visible participants
	// Only reorder when participants join/leave, not when speaking status changes
	const stableOrderRef = useRef<string[]>([])
	const previousParticipantIdsRef = useRef<Set<string>>(new Set())
	const hasInitializedParticipantListRef = useRef(false)
	const joinAlertAudioContextRef = useRef<AudioContext | null>(null)
	/** Browsers require a user gesture before AudioContext runs; avoid creating/resuming until then. */
	const joinSoundUnlockedRef = useRef(false)

	useEffect(() => {
		if (typeof window === 'undefined') return
		const unlock = () => {
			joinSoundUnlockedRef.current = true
			void lkRoom?.startAudio().catch(() => { })
		}
		window.addEventListener('pointerdown', unlock, { passive: true })
		window.addEventListener('keydown', unlock)
		return () => {
			window.removeEventListener('pointerdown', unlock)
			window.removeEventListener('keydown', unlock)
		}
	}, [lkRoom])

	const playParticipantJoinedSound = useCallback(() => {
		if (typeof window === 'undefined' || !joinSoundUnlockedRef.current) return
		void (async () => {
			try {
				const AudioCtx =
					window.AudioContext ||
					(window as Window & { webkitAudioContext?: typeof AudioContext })
						.webkitAudioContext
				if (!AudioCtx) return

				if (!joinAlertAudioContextRef.current) {
					joinAlertAudioContextRef.current = new AudioCtx()
				}
				const context = joinAlertAudioContextRef.current
				if (context.state === 'suspended') {
					try {
						await context.resume()
					} catch {
						return
					}
				}
				if (context.state !== 'running') return

				const startAt = context.currentTime
				const oscillator = context.createOscillator()
				const gainNode = context.createGain()
				oscillator.type = 'triangle'
				oscillator.frequency.setValueAtTime(740, startAt)
				oscillator.frequency.exponentialRampToValueAtTime(920, startAt + 0.18)
				gainNode.gain.setValueAtTime(0.0001, startAt)
				gainNode.gain.exponentialRampToValueAtTime(0.045, startAt + 0.02)
				gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2)
				oscillator.connect(gainNode)
				gainNode.connect(context.destination)
				oscillator.start(startAt)
				oscillator.stop(startAt + 0.2)
			} catch {
				// Best-effort join tone; ignore browsers that block audio context.
			}
		})()
	}, [])

	// Update stable order when participants join/leave (not on speaking status changes)
	useEffect(() => {
		const currentParticipantIds = new Set(
			allParticipants.map((participant) => participant.identity)
		)

		// Check if participants have actually joined or left (not just speaking status changed)
		const participantIdsChanged =
			currentParticipantIds.size !== previousParticipantIdsRef.current.size ||
			[...currentParticipantIds].some(id => !previousParticipantIdsRef.current.has(id)) ||
			[...previousParticipantIdsRef.current].some(id => !currentParticipantIds.has(id))

		if (participantIdsChanged) {
			// Find local participant identity
			const localParticipantId = allParticipants.find((participant) => participant.isLocal)?.identity

			// Get current stable order
			const currentStableOrder = [...stableOrderRef.current]

			// Identify new participants (not in stable order)
			const newParticipantIds = [...currentParticipantIds].filter(
				id => !currentStableOrder.includes(id) && id !== localParticipantId
			)
			if (hasInitializedParticipantListRef.current && newParticipantIds.length > 0) {
				playParticipantJoinedSound()
			}

			// Remove participants who left
			const updatedOrder = currentStableOrder.filter(id => currentParticipantIds.has(id))

			// If this is the first time (empty stable order), initialize with all current participants
			if (currentStableOrder.length === 0 && currentParticipantIds.size > 0) {
				// Initialize: local first, then others
				if (localParticipantId) {
					const others = [...currentParticipantIds].filter(id => id !== localParticipantId)
					stableOrderRef.current = [localParticipantId, ...others]
				} else {
					stableOrderRef.current = [...currentParticipantIds]
				}
			} else {
				// Insert new participants right after local participant
				if (localParticipantId && updatedOrder.includes(localParticipantId)) {
					const localIndex = updatedOrder.indexOf(localParticipantId)
					updatedOrder.splice(localIndex + 1, 0, ...newParticipantIds)
				} else if (localParticipantId) {
					// If local participant is not in order yet, add it first, then new participants
					updatedOrder.unshift(localParticipantId, ...newParticipantIds)
				} else {
					// No local participant, just append new ones
					updatedOrder.push(...newParticipantIds)
				}

				// Ensure local participant is always first if it exists
				if (localParticipantId && updatedOrder[0] !== localParticipantId) {
					const localIndex = updatedOrder.indexOf(localParticipantId)
					if (localIndex > 0) {
						updatedOrder.splice(localIndex, 1)
						updatedOrder.unshift(localParticipantId)
					}
				}

				// Update stable order
				stableOrderRef.current = updatedOrder
			}

			// Update previous participant IDs for next comparison
			previousParticipantIdsRef.current = new Set(currentParticipantIds)
			hasInitializedParticipantListRef.current = true
		}
	}, [allParticipants, playParticipantJoinedSound])

	useEffect(() => {
		return () => {
			joinAlertAudioContextRef.current?.close().catch(() => { })
		}
	}, [])

	// Sort participants using stable order: local participant first, then stable order of others
	const sortedParticipants = useMemo(() => {
		if (allParticipants.length === 0) return []

		// Find local participant
		const localEntry = allParticipants.find((participant) => participant.isLocal)
		const otherParticipants = allParticipants.filter((participant) => !participant.isLocal)

		// Sort other participants according to stable order
		const sortedOthers = [...otherParticipants].sort((a, b) => {
			const stableOrder = stableOrderRef.current
			const aIndex = stableOrder.indexOf(a.identity)
			const bIndex = stableOrder.indexOf(b.identity)

			// If both are in stable order, maintain their relative positions
			if (aIndex !== -1 && bIndex !== -1) {
				return aIndex - bIndex
			}

			// If only one is in stable order, prioritize it
			if (aIndex !== -1) return -1
			if (bIndex !== -1) return 1

			// If neither is in stable order, use identity as fallback for consistent ordering
			return a.identity.localeCompare(b.identity)
		})

		// Return local first, then sorted others
		return localEntry ? [localEntry, ...sortedOthers] : sortedOthers
	}, [allParticipants])

	// Build a quick lookup for camera tracks by participant identity.
	const cameraTrackByParticipantId = useMemo(() => {
		return new Map(cameraTracks.map((track) => [track.participant.identity, track]))
	}, [cameraTracks])

	// Separate focused track from other tracks
	// Screen share gets highest priority in focus view
	const { focusedTrack, isScreenShareFocused, isSplitMode, pinnedTrack } = useMemo(() => {
		if (layoutMode === 'grid') {
			return { focusedTrack: null, isScreenShareFocused: false, isSplitMode: false, pinnedTrack: null }
		}

		// Detection for Split Mode - Both screen share and a pinned participant
		if (pinnedParticipantId && activeScreenShare) {
			const pinned = cameraTrackByParticipantId.get(pinnedParticipantId) || {
				participant: allParticipants.find(p => p.identity === pinnedParticipantId) || activeScreenShare.participant,
				source: Track.Source.Camera
			}
			return {
				focusedTrack: activeScreenShare,
				isScreenShareFocused: true,
				isSplitMode: true,
				pinnedTrack: pinned
			}
		}

		// Priority 1: Pinned participant (single focus)
		if (pinnedParticipantId) {
			const pinned = cameraTrackByParticipantId.get(pinnedParticipantId) || {
				participant: allParticipants.find(p => p.identity === pinnedParticipantId),
				source: Track.Source.Camera
			}
			if (pinned.participant) return { focusedTrack: pinned, isScreenShareFocused: false, isSplitMode: false, pinnedTrack: pinned }
		}

		// Priority 2: Screen share (single focus)
		if (activeScreenShare) {
			return {
				focusedTrack: activeScreenShare,
				isScreenShareFocused: true,
				isSplitMode: false,
				pinnedTrack: null
			}
		}

		// Priority 3: Show speaker if they have a camera
		if (!focusedParticipant) {
			return { focusedTrack: null, isScreenShareFocused: false, isSplitMode: false, pinnedTrack: null }
		}

		const focused = cameraTrackByParticipantId.get(focusedParticipant.identity) || null

		return { focusedTrack: focused, isScreenShareFocused: false, isSplitMode: false, pinnedTrack: null }
	}, [focusedParticipant, layoutMode, activeScreenShare, cameraTrackByParticipantId, pinnedParticipantId, allParticipants])

	// Automatically un-minimize/un-maximize screen share when entering split mode
	useEffect(() => {
		if (isSplitMode) {
			setScreenShareMinimized(false)
			setScreenShareMaximized(false)
		}
	}, [isSplitMode])

	useEffect(() => {
		if (!isScreenShareFocused) {
			setScreenShareZoom(1)
			setScreenShareMinimized(false)
			setScreenShareMaximized(false)
		}
	}, [isScreenShareFocused])

	const showScreenShareInMain =
		isScreenShareFocused && !screenShareMinimized && !screenShareMaximized

	const adjustScreenShareZoom = useCallback((delta: number) => {
		setScreenShareZoom((z) => {
			const next = Math.round((z + delta) * 100) / 100
			return Math.min(2, Math.max(0.5, next))
		})
	}, [])

	const focusedParticipantForDisplay = useMemo(() => {
		if (isScreenShareFocused && focusedTrack) {
			return focusedTrack.participant
		}
		return focusedTrack?.participant || focusedParticipant || null
	}, [focusedTrack, focusedParticipant, isScreenShareFocused])

	const toggleAudio = () => {
		// Toggle audio output (mute/unmute all remote audio)

		const enabled = !isAudioEnabled
		setIsAudioEnabled(enabled)
		// Mute/unmute all remote audio tracks by setting volume
		allParticipants.forEach((participant) => {
			if (participant.isLocal) return
			participant.audioTrackPublications.forEach((publication) => {
				if (publication.track && 'setVolume' in publication.track) {
					(publication.track as unknown as { setVolume: (volume: number) => void }).setVolume(enabled ? 1 : 0)
				}
			})
		})
	}

	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen()
			setIsFullscreen(true)
		} else {
			document.exitFullscreen()
			setIsFullscreen(false)
		}
	}

	// Native Picture-in-Picture state and refs
	const [isPiPActive, setIsPiPActive] = useState(false)

	// Helper to get actual Track object from a TrackReference or Placeholder object
	// Updated for PiP Priority: Remote Screen > Remote Camera > Local Screen Share > Local Camera
	const getTrackFromReference = useCallback((ref: any, pipMode = false): Track | null => {
		if (pipMode) {
			// Find ALL remote participants first (exclude local participant from mirrored view)
			const remoteParticipants = allParticipants.filter((p: any) => p.identity !== localParticipant?.identity)

			// Priority 1: Remote Screen Share (preferred if someone else is presenting)
			// Ensure we find the first available SUBSCRIBED screen share track
			for (const p of remoteParticipants) {
				const screenPub = Array.from(p.videoTrackPublications.values() as IterableIterator<any>)
					.find((pub: any) => pub.source === Track.Source.ScreenShare && pub.track && pub.isSubscribed)
				if (screenPub?.track) return screenPub.track as Track
			}

			// Priority 2: Remote Camera (any active remote camera)
			for (const p of remoteParticipants) {
				const camPub = Array.from(p.videoTrackPublications.values() as IterableIterator<any>)
					.find((pub: any) => pub.source === Track.Source.Camera && pub.track && pub.isSubscribed)
				if (camPub?.track) return camPub.track as Track
			}

			// Priority 3: Local Screen Share (show your own presentation, like Google Meet)
			if (localParticipant) {
				const localScreenPub = Array.from(localParticipant.videoTrackPublications.values())
					.find(pub => pub.source === Track.Source.ScreenShare && pub.track)
				if (localScreenPub?.track) return localScreenPub.track as Track
			}

			// Priority 4: Local Camera
			if (localParticipant) {
				const localCamPub = Array.from(localParticipant.videoTrackPublications.values())
					.find(pub => pub.source === Track.Source.Camera && pub.track)
				if (localCamPub?.track) return localCamPub.track as Track
			}

			return null
		}

		// Default behavior (current reference or any video)
		if (!ref || !ref.participant) return null
		if (ref.track) return ref.track as Track
		if (ref.publication?.track) return ref.publication.track as Track
		const pubs = Array.from(ref.participant.videoTrackPublications.values()) as any[]
		return pubs.find(p => p.track)?.track || null
	}, [allParticipants, localParticipant, isScreenShareEnabled])

	// Helper to draw participant avatar to a canvas for PiP streaming when no camera is active
	const drawAvatarToCanvas = useCallback(async (participant: any): Promise<MediaStream | null> => {
		const canvas = document.createElement('canvas')
		canvas.width = 512
		canvas.height = 512
		const ctx = canvas.getContext('2d')
		if (!ctx) return null

		// 1. Draw Initials/Placeholder IMMEDIATELY (Fix 3)
		drawAvatarFallback(ctx, participant)

		const avatarUrl = getParticipantAvatar(participant)
		if (avatarUrl) {
			try {
				const img = new window.Image()
				img.crossOrigin = 'anonymous'
				img.src = avatarUrl
				await new Promise((resolve, reject) => {
					img.onload = resolve
					img.onerror = () => reject(new Error('Image load failed'))
					// Timeout to ensure we don't block PiP opening
					setTimeout(() => reject(new Error('Image load timeout')), 2000)
				})

				// Clear background and draw circular avatar over initials
				ctx.clearRect(0, 0, 512, 512)
				const gradient = ctx.createLinearGradient(0, 0, 0, 512)
				gradient.addColorStop(0, '#252525')
				gradient.addColorStop(1, '#1a1a1a')
				ctx.fillStyle = gradient
				ctx.fillRect(0, 0, 512, 512)

				ctx.save()
				ctx.beginPath()
				ctx.arc(256, 256, 128, 0, Math.PI * 2)
				ctx.clip()
				ctx.drawImage(img, 128, 128, 256, 256)
				ctx.restore()
			} catch (err) {
				// We already have the fallback initials drawn
				console.warn('[PiP] Avatar image failed, using fallback:', err)
			}
		}

		// 3. Final Frame Draw AND Capture
		// Capture at 30fps to ensure browser treats it as active video (fixes stalling)
		const stream = (canvas as any).captureStream(30)
		return stream
	}, [getParticipantAvatar])

	// Helper for better avatar fallback (Fix 3)
	const drawAvatarFallback = (ctx: CanvasRenderingContext2D, participant: any) => {
		const name = participant.name || participant.identity || '?'
		const initials = name
			.split(' ')
			.map((n: string) => n[0])
			.join('')
			.toUpperCase()
			.substring(0, 2)

		// Draw Circle
		ctx.fillStyle = '#3b82f6' // Nice blue
		ctx.beginPath()
		ctx.arc(256, 256, 128, 0, Math.PI * 2)
		ctx.fill()

		// Draw Text
		ctx.fillStyle = 'white'
		ctx.font = 'bold 100px Inter, sans-serif'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(initials, 256, 256)

		// Draw Name at bottom
		ctx.font = '30px Inter, sans-serif'
		ctx.fillText(name, 256, 420)
	}

	// Thumbnails scroll logic
	const thumbnailsRef = useRef<HTMLDivElement>(null)
	const [canScrollLeft, setCanScrollLeft] = useState(false)
	const [canScrollRight, setCanScrollRight] = useState(false)

	const checkScroll = useCallback(() => {
		if (thumbnailsRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } = thumbnailsRef.current
			setCanScrollLeft(scrollLeft > 0)
			setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5) // -5 buffer
		}
	}, [])

	useEffect(() => {
		const el = thumbnailsRef.current
		if (el) {
			checkScroll()
			el.addEventListener('scroll', checkScroll)
			window.addEventListener('resize', checkScroll)
			return () => {
				el.removeEventListener('scroll', checkScroll)
				window.removeEventListener('resize', checkScroll)
			}
		}
	}, [checkScroll, sortedParticipants.length]) // Re-check when participants change

	const scrollThumbnails = (direction: 'left' | 'right') => {
		if (thumbnailsRef.current) {
			const scrollAmount = thumbnailsRef.current.clientWidth * 0.75
			thumbnailsRef.current.scrollBy({
				left: direction === 'left' ? -scrollAmount : scrollAmount,
				behavior: 'smooth'
			})
		}
	}

	const pipWindowRef = useRef<any>(null)
	const persistentPipVideoRef = useRef<HTMLVideoElement | null>(null)
	const pipVideoRef = useRef<HTMLVideoElement | null>(null)

	// -------------------------------------------------------------------------
	// NEW: "Always-Ready" Background PiP Sync
	// This ensures the hidden PiP video is ALWAYS playing the best candidate
	// so that clicking 'Toggle PiP' is a 100% synchronous, instant action.
	// -------------------------------------------------------------------------
	const pipSyncRef = useRef<{ syncing: boolean; lastTrackSid: string | null }>({ syncing: false, lastTrackSid: null })

	useEffect(() => {
		if (isMobileViewport) return

		let isMounted = true
		const syncPipBackground = async () => {
			const video = persistentPipVideoRef.current
			if (!video || pipSyncRef.current.syncing) return

			// Allow Chrome to automatically handle PiP transitions if possible
			video.setAttribute('autoPictureInPicture', 'true');
			video.disablePictureInPicture = false;

			pipSyncRef.current.syncing = true
			try {
				// 1. Get Best Candidate (Screen > Remote Camera > Local Camera)
				const trackToUse = getTrackFromReference(null, true)
				let streamToUse: MediaStream | null = null

				if (!trackToUse) {
					const remoteWithAvatar = allParticipants.find(p => p.identity !== localParticipant?.identity) || localParticipant
					if (remoteWithAvatar) {
						streamToUse = await drawAvatarToCanvas(remoteWithAvatar)
					}
				}

				if (!isMounted) return

				// 2. Attach and Warm Up only if changed
				const currentSid = (trackToUse ? trackToUse.sid : (streamToUse ? 'avatar-stream' : null)) || null

				if (currentSid !== pipSyncRef.current.lastTrackSid) {
					// 2. Attach and Warm Up only if changed
					// CRITICAL: NEVER set video.srcObject = null because it closes active PiP windows.
					// track.attach(video) handles the replacement seamlessly.

					if (trackToUse) {
						const isLocalCamera = trackToUse.source === Track.Source.Camera && (trackToUse as any).isLocal
						video.style.transform = isLocalCamera ? 'scaleX(-1)' : ''
						trackToUse.attach(video)
					} else if (streamToUse) {
						video.style.transform = ''
						video.srcObject = streamToUse
					}

					pipSyncRef.current.lastTrackSid = currentSid
				}

				// 3. Ensure it is playing (muted auto-play is almost always allowed)
				if ((video.srcObject || trackToUse) && video.paused) {
					await video.play().catch(e => {
						if (e.name !== 'AbortError') console.warn('[PiP-Sync] Play failed:', e)
					})
					// Small wait to ensure hardware decoder has a frame after play starts
					await new Promise(resolve => setTimeout(resolve, 50))
				}

				// 4. Force DOM properties for Chrome Auto-PiP natively bypassing React attributes
				try {
					if (!(video as any).autoPictureInPicture) {
						(video as any).autoPictureInPicture = true;
					}
					if (video.disablePictureInPicture) {
						video.disablePictureInPicture = false;
					}
				} catch (e) {
					// Ignore if browser doesn't support the property
				}
			} catch (err) {
				console.warn('[PiP-Sync] Background warm-up failed:', err)
			} finally {
				pipSyncRef.current.syncing = false
			}
		}

		// Use a very small delay to keep the background sync responsive to track changes
		const timer = setTimeout(syncPipBackground, 100)
		return () => {
			isMounted = false
			clearTimeout(timer)
		}
	}, [isMobileViewport, allParticipants, localParticipant, getTrackFromReference, drawAvatarToCanvas, isScreenShareEnabled])

	const togglePiP = useCallback(async (isAuto = false) => {
		try {
			if (isMobileViewport) return

			// If already in PiP, close it (handle both types)
			if (document.pictureInPictureElement || pipWindowRef.current) {
				if (document.pictureInPictureElement) await document.exitPictureInPicture()
				if (pipWindowRef.current) pipWindowRef.current.close()
				setIsPiPActive(false)
				return
			}

			// 1. CHROME ONLY: Clean Mini-Window (Option 2 - No Badge, No Line)
			// Priority for manual clicks in Chrome to allow for a perfectly clean UI
			if ('documentPictureInPicture' in window && !isAuto) {
				try {
					const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
						width: 384,
						height: 216,
					})
					pipWindowRef.current = pipWindow

					const doc = pipWindow.document
					doc.title = 'Webyalaya Session'
					doc.body.style.background = '#000'
					doc.body.style.margin = '0'
					doc.body.style.padding = '0'
					doc.body.style.overflow = 'hidden'
					doc.body.style.display = 'flex'
					doc.body.style.alignItems = 'center'
					doc.body.style.justifyContent = 'center'

					// INJECT CSS: This is the ONLY way to remove the "LIVE" badge and blue line in Chrome
					const style = doc.createElement('style')
					style.textContent = `
						video::-webkit-media-controls { display: none !important; }
						video::-webkit-media-controls-enclosure { display: none !important; }
						video { width: 100%; height: 100%; object-fit: contain; }
						* { -webkit-user-select: none; user-select: none; cursor: default; }
					`
					doc.head.appendChild(style)

					const video = doc.createElement('video')
					video.autoplay = true
					video.muted = true
					video.playsInline = true

					// Selection logic (Already fixed for "Square One" mirror issue)
					const trackToUse = getTrackFromReference(null, true)
					if (trackToUse) {
						const isLocalCamera = trackToUse.source === Track.Source.Camera && (trackToUse as any).isLocal
						video.style.transform = isLocalCamera ? 'scaleX(-1)' : ''
						trackToUse.attach(video)
					}

					doc.body.appendChild(video)

					// Ensure immediate playback
					setTimeout(() => video.play().catch(() => { }), 150)

					setIsPiPActive(true)

					pipWindow.addEventListener('pagehide', () => {
						setIsPiPActive(false)
						pipWindowRef.current = null
					})
					return // Task Complete for Chrome manual click
				} catch (docPipErr) {
					console.warn('[PiP] Document PiP failed, falling back to Native PiP:', docPipErr)
				}
			}

			// 2. FALLBACK/SAFARI/AUTO-PIP: Native rounded overlay
			const video = persistentPipVideoRef.current
			if (!video) return

			// Ensure native attributes are set for auto-PiP
			video.setAttribute('autoPictureInPicture', 'true')
			video.disablePictureInPicture = false
			video.playsInline = true
			video.muted = true

			// HARDENED READINESS CHECK: Ensure video is actually ready for PiP
			// If sync is working, video should ALREADY be ready.
			if (!video.srcObject || video.readyState < 2) {
				const trackToUse = getTrackFromReference(null, true)
				if (trackToUse) {
					trackToUse.attach(video)
					// Skip delay if it's an auto-trigger to satisfy browser gesture constraints
					if (!isAuto) {
						await new Promise(resolve => {
							const onReady = () => {
								video.removeEventListener('loadedmetadata', onReady);
								video.removeEventListener('canplay', onReady);
								resolve(null);
							};
							video.addEventListener('loadedmetadata', onReady);
							video.addEventListener('canplay', onReady);
							setTimeout(onReady, 300); // Shorter fallback
						});
					}
				}
			}

			// Ensure it is actually playing before calling PiP
			try {
				if (video.paused) {
					await video.play().catch(() => { })
					// Brief pause after play to satisfy some browser state requirements
					if (isAuto) await new Promise(resolve => setTimeout(resolve, 100))
				}
			} catch (e) {
				if (!isAuto) console.warn('[PiP] Play failed:', e)
			}

			// Tab-hide path uses isAuto; Chromium requires a user gesture unless autoPictureInPicture fires.
			if (video.requestPictureInPicture && !isAuto) {
				const callRequest = async () => {
					try {
						await video.requestPictureInPicture()
						setIsPiPActive(true)
					} catch (e) {
						console.error('[PiP] Manual activation failed:', e)
					}
				}
				await callRequest()
			}
		} catch (error) {
			console.error('PiP Error:', error)
		}
	}, [isMobileViewport, allParticipants, localParticipant, getTrackFromReference])

	// Auto-trigger PiP on visibility change (like Google Meet)
	useEffect(() => {
		if (isMobileViewport) return

		const handleVisibilityChange = async () => {
			if (document.hidden) {
				// Page is going hidden — activate PiP if not already active
				// Check both native PiP and Document PiP window
				if (document.pictureInPictureElement || pipWindowRef.current) return

				try {
					// Guard: check if browser or Document PiP already activated it
					if (document.pictureInPictureElement || pipWindowRef.current) return

					// Small delay to let the browser complete the tab transition and track warm-up
					await new Promise(resolve => setTimeout(resolve, 300));
					if (document.hidden) {
						// autoPictureInPicture attribute handles the toggle automatically
						// We just ensure it's unmuted for warmth.
						if (persistentPipVideoRef.current) {
							persistentPipVideoRef.current.volume = 0.001;
							persistentPipVideoRef.current.muted = false;
						}
					}
				} catch (error) {
					console.warn('[PiP] Auto-PiP activation failed:', error);
				}
			} else {
				// Page is becoming visible again — close any active PiP
				try {
					// Close native PiP if active
					if (document.pictureInPictureElement) {
						await document.exitPictureInPicture();
					}
					// Close Document PiP window if active
					if (pipWindowRef.current) {
						pipWindowRef.current.close();
						pipWindowRef.current = null;
					}
					setIsPiPActive(false);
				} catch (error) {
					// Ignore exit errors (PiP may already be closing)
				}
			}
		}

		const handlePiPExit = () => {
			setIsPiPActive(false)
		}

		// Handle the case where the browser's native engine triggers PiP automatically 
		const video = persistentPipVideoRef.current
		const handleAutoEnter = () => setIsPiPActive(true)
		if (video) {
			video.addEventListener('enterpictureinpicture', handleAutoEnter)

			// Optional: Update MediaSession for conferencing mode
			if ('mediaSession' in navigator) {
				navigator.mediaSession.metadata = new MediaMetadata({
					title: 'Webyalaya Session',
					artist: 'Live Session',
				});

				// CRITICAL: Chrome looks for this exact handler to authorize Auto-PiP on tab switches
				try {
					const mediaSessionAny = navigator.mediaSession as any;
					mediaSessionAny.setActionHandler('enterpictureinpicture', async () => {
						try {
							// When Chrome's background engine decides it's time for auto-PiP, 
							// it will fire this handler. Calling requestPictureInPicture here 
							// is "blessed" and will not throw a NotAllowedError.
							if (video && video.requestPictureInPicture) {
								await video.requestPictureInPicture();
								setIsPiPActive(true);
							}
						} catch (e) {
							console.warn('[PiP] Action handler failed:', e);
						}
					});
				} catch (e) {
					// Browser doesn't support the 'enterpictureinpicture' action handler
				}
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)
		window.addEventListener('blur', handleVisibilityChange)
		window.addEventListener('focus', handleVisibilityChange)
		document.addEventListener('leavepictureinpicture', handlePiPExit)

		return () => {
			if (video) {
				video.removeEventListener('enterpictureinpicture', handleAutoEnter)
			}
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			window.removeEventListener('blur', handleVisibilityChange)
			window.removeEventListener('focus', handleVisibilityChange)
			document.removeEventListener('leavepictureinpicture', handlePiPExit)
		}
	}, [isMobileViewport, togglePiP])

	// Mobile: Restore mic/camera after Android tab switch
	// Android browsers suspend media tracks when the page is hidden.
	// When the user returns, we re-enable tracks that were active before the switch.
	const micBeforeHideRef = useRef<boolean>(false)
	const cameraBeforeHideRef = useRef<boolean>(false)
	useEffect(() => {
		const handleMobileVisibilityChange = async () => {
			if (!localParticipant) return
			const webinarPermissions = (
				(sessionInfo?.webinarConfig || {}) as { permissions?: { mic?: string; video?: string } }
			).permissions
			const canRestoreMic =
				permissions?.allowAudio !== false &&
				!(sessionInfo?.sessionMode === 'WEBINAR' && webinarPermissions?.mic === 'disabled')
			const canRestoreCamera =
				permissions?.allowVideo !== false &&
				!(sessionInfo?.sessionMode === 'WEBINAR' && webinarPermissions?.video === 'disabled')

			if (document.hidden) {
				// Tab going hidden — remember current track states
				micBeforeHideRef.current = localParticipant.isMicrophoneEnabled
				cameraBeforeHideRef.current = localParticipant.isCameraEnabled
			} else {
				// Tab becoming visible again — restore tracks that were active
				// Small delay to let the browser fully resume
				await new Promise(r => setTimeout(r, 500))

				if (canRestoreMic && micBeforeHideRef.current && !localParticipant.isMicrophoneEnabled) {
					try {
						await localParticipant.setMicrophoneEnabled(true)
						console.log('[MobileVisibility] Mic restored after tab switch')
					} catch (err) {
						console.warn('[MobileVisibility] Failed to restore mic:', err)
					}
				}

				if (canRestoreCamera && cameraBeforeHideRef.current && !localParticipant.isCameraEnabled) {
					try {
						await localParticipant.setCameraEnabled(true)
						console.log('[MobileVisibility] Camera restored after tab switch')
					} catch (err) {
						console.warn('[MobileVisibility] Failed to restore camera:', err)
					}
				}
			}
		}

		document.addEventListener('visibilitychange', handleMobileVisibilityChange)
		return () => {
			document.removeEventListener('visibilitychange', handleMobileVisibilityChange)
		}
	}, [localParticipant, permissions?.allowAudio, permissions?.allowVideo, sessionInfo?.sessionMode, sessionInfo?.webinarConfig])

	return (
		<>
			<div className="flex-1 flex relative bg-[#09090b] overflow-hidden h-full w-full">
				{/* Main Video Area - Centered and full width always (overlays used for sidebars) */}
				<div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden relative ${(showChat || showParticipants) ? 'md:mr-96' : ''}`}>
					{/* Zoom-Style Top Info Bar - Centered */}
					<div className={`absolute left-2 right-2 md:left-0 md:right-0 h-auto flex items-center justify-center pointer-events-none z-30 select-none transition-all duration-300 ${isUserActive ? 'top-2 md:top-4 opacity-100' : 'top-[-60px] opacity-0'}`}>
						<div className="bg-[#1a1a1a]/90 backdrop-blur-md px-2 md:px-4 py-1.5 rounded-full flex items-center gap-2 md:gap-4 border border-white/10 pointer-events-auto shadow-lg hover:bg-[#252525]/95 transition-all">
							{/* Meeting Info */}
							<div className="flex items-center gap-1.5 md:gap-2">
								<div className="text-[#00DC6E]">
									<ShieldCheck className="h-3 w-3 md:h-4 md:w-4" />
								</div>
								<div className="flex items-center gap-1.5 md:gap-2">
									<span className="text-white text-[10px] md:text-xs font-semibold tracking-wide truncate max-w-[120px] md:max-w-none">
										{sessionTitle || 'Webyalaya Meeting'}
									</span>
									<div className="w-px h-3 bg-white/10" />
									<span className="text-white/50 text-[9px] md:text-xs font-mono whitespace-nowrap">
										{formattedTime}
									</span>
								</div>
							</div>

							{/* View Switcher Button */}
							<div className="relative">
								<button
									onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
									className="h-5 w-5 md:h-6 md:w-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
									title="Change View"
								>
									<LayoutGrid className="h-3 w-3 md:h-3.5 md:w-3.5" />
								</button>

								{/* View Menu Dropdown */}
								{isViewMenuOpen && (
									<>
										<div className="fixed inset-0 z-[100]" onClick={() => setIsViewMenuOpen(false)} />
										<div className="absolute right-0 top-full mt-2 w-48 bg-[#252525] border border-white/10 rounded-lg shadow-xl z-[101] py-1 animate-in fade-in zoom-in-95 duration-100">
											<div className="px-3 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
												Layout
											</div>
											<button
												onClick={() => {
													setLayoutMode('focus')
													setIsViewMenuOpen(false)
												}}
												className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center justify-between group"
											>
												<div className="flex items-center gap-2">
													<Presentation className="h-4 w-4 text-white/70 group-hover:text-white" />
													<span>Speaker</span>
												</div>
												{layoutMode === 'focus' && <Check className="h-4 w-4 text-[#00DC6E]" />}
											</button>
											<button
												onClick={() => {
													setLayoutMode('grid')
													setIsViewMenuOpen(false)
												}}
												className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center justify-between group"
											>
												<div className="flex items-center gap-2">
													<Grid2X2 className="h-4 w-4 text-white/70 group-hover:text-white" />
													<span>Gallery</span>
												</div>
												{layoutMode === 'grid' && <Check className="h-4 w-4 text-[#00DC6E]" />}
											</button>

											<div className="my-1 border-t border-white/10" />

											<button
												onClick={() => {
													if (document.fullscreenElement) {
														document.exitFullscreen()
														setIsFullscreen(false)
													} else {
														document.documentElement.requestFullscreen()
														setIsFullscreen(true)
													}
													setIsViewMenuOpen(false)
												}}
												className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center justify-between group"
											>
												<div className="flex items-center gap-2">
													{isFullscreen ? (
														<Minimize2 className="h-4 w-4 text-white/70 group-hover:text-white" />
													) : (
														<Maximize2 className="h-4 w-4 text-white/70 group-hover:text-white" />
													)}
													<span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
												</div>
											</button>
										</div>
									</>
								)}
							</div>
						</div>
					</div>

					{/* Video Grid - No padding needed since bars are floating overlays */}
					<div className="flex-1 overflow-hidden bg-black relative min-h-0 video-grid-container pt-2 pb-2">
						<style dangerouslySetInnerHTML={{
							__html: `
					/* CRITICAL: Remove ALL green overlays and speaking indicators */
					.video-grid-container .lk-participant-tile[data-lk-speaking="true"]::before,
					.video-grid-container .lk-participant-tile[data-lk-speaking="true"]::after,
					.video-grid-container [data-lk-speaking="true"]::before,
					.video-grid-container [data-lk-speaking="true"]::after,
					.lk-participant-tile::before,
					.lk-participant-tile::after {
						display: none !important;
						background: none !important;
						opacity: 0 !important;
					}
					
					.video-grid-container .lk-participant-tile,
					.video-grid-container [data-lk-participant-tile],
					.lk-participant-tile {
						border: none !important;
						outline: none !important;
						box-shadow: none !important;
						background: transparent !important;
						filter: none !important;
						border-radius: 16px !important;
					}
					
					/* Override any green background or tint from LiveKit */
					.video-grid-container .lk-video-container,
					.video-grid-container video,
					.lk-video-container,
					video {
						background: transparent !important;
						background-color: transparent !important;
						filter: none !important;
						mix-blend-mode: normal !important;
						/* CRITICAL: Hardware acceleration to prevent flickering during processor switching */
						transform: translate3d(0, 0, 0);
						backface-visibility: hidden;
						-webkit-backface-visibility: hidden;
						will-change: transform;
					}

					video:picture-in-picture {
						transform: none !important;
					}
					
					/* Hide the unnecessary Chrome-specific overlay text when in PiP */
					video::-webkit-media-controls-panel,
					video::-webkit-media-controls-enclosure,
					video::-internal-media-controls-overlay-cast-button,
					video::-webkit-media-controls-picture-in-picture-display {
						display: none !important;
						opacity: 0 !important;
						visibility: hidden !important;
					}
					
					/* CRITICAL: Make ALL LiveKit tile backgrounds transparent */
					.lk-participant-tile,
					[data-lk-participant-tile],
					.lk-participant-tile > div,
					.lk-video-container {
						background: transparent !important;
						background-color: transparent !important;
					}
					
					/* HIDE LiveKit's placeholder and ALL its children completely */
					.lk-participant-placeholder,
					.lk-participant-placeholder *,
					[data-lk-participant-placeholder],
					[data-lk-participant-placeholder] *,
					.lk-participant-tile .lk-participant-placeholder,
					.lk-participant-tile .lk-participant-placeholder * {
						display: none !important;
						visibility: hidden !important;
						opacity: 0 !important;
						width: 0 !important;
						height: 0 !important;
						overflow: hidden !important;
					}
					
					/* KILL any SVG inside participant tile that's not video */
					.lk-participant-tile svg:not(.lucide),
					.focus-thumbnail .lk-participant-tile svg,
					.custom-grid-tile .lk-participant-tile svg,
					.focus-main-video .lk-participant-tile svg {
						display: none !important;
						visibility: hidden !important;
						width: 0 !important;
						height: 0 !important;
					}
					
					/* GRID VIEW: Make participant names white and visible */
					.grid-mode .lk-participant-name,
					.grid-mode .lk-participant-metadata,
					.video-grid-container .lk-participant-name,
					.video-grid-container .lk-participant-metadata,
					.lk-participant-name,
					.lk-participant-metadata {
						color: white !important;
						background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%) !important;
						padding: 6px 12px !important;
						height: 32px !important;
						max-height: 32px !important;
						font-size: 13px !important;
						font-weight: 500 !important;
						text-shadow: 0 1px 3px rgba(0,0,0,0.8) !important;
						position: absolute !important;
						bottom: 0 !important;
						left: 0 !important;
						right: 0 !important;
						z-index: 10 !important;
						display: flex !important;
						align-items: flex-end !important;
					}
					
					.grid-mode .lk-participant-metadata-item,
					.lk-participant-metadata-item {
						color: white !important;
					}
					
					/* Grid Layout */
					.video-grid-container .grid-mode {
						height: 100%;
						width: 100%;
						padding: 8px;
					}
					
					@media (max-width: 768px) {
						.video-grid-container .grid-mode {
							padding: 4px;
						}
						.grid-mode .lk-participant-name,
						.lk-participant-name {
							font-size: 11px !important;
							padding: 4px 8px !important;
							height: 26px !important;
							max-height: 26px !important;
						}
					}
					
					/* Focus/Presenter Layout Styles - Zoom Style */
					.focus-layout-container {
						display: flex;
						flex-direction: column;
						height: 100%;
						width: 100%;
						padding: 0;
						gap: 0;
						overflow: hidden;
						background: #0a0a0a;
					}
					
					/* Thumbnail strip at top */
					.focus-thumbnails-wrapper {
						position: relative;
						width: 100%;
						height: auto;
						min-height: 140px;
						display: flex;
						align-items: center;
						background: #0d0d0d;
						border-bottom: 1px solid rgba(255, 255, 255, 0.06);
						padding: 10px 0;
						z-index: 10;
					}

					.focus-thumbnails {
						position: relative;
						display: flex !important;
						align-items: flex-start;
						justify-content: flex-start;
						gap: 12px;
						width: 100%;
						overflow-x: auto;
						overflow-y: hidden;
						padding: 4px 48px; /* Side padding for buttons */
						scroll-behavior: smooth;
						scrollbar-width: none;
					}
					
					.focus-thumbnails::-webkit-scrollbar {
						display: none;
					}
					
					/* Scroll buttons */
					.focus-scroll-btn {
						position: absolute;
						top: 50%;
						transform: translateY(-50%);
						width: 32px;
						height: 32px;
						border-radius: 50%;
						background: rgba(30, 30, 30, 0.9);
						border: 1px solid rgba(255, 255, 255, 0.1);
						color: white;
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 20;
						cursor: pointer;
						transition: all 0.2s;
						box-shadow: 0 2px 8px rgba(0,0,0,0.5);
					}
					.focus-scroll-btn:hover {
						background: #404040;
						border-color: rgba(255,255,255,0.3);
					}
					.focus-scroll-btn.left { left: 8px; }
					.focus-scroll-btn.right { right: 8px; }
					.focus-scroll-btn:disabled {
						opacity: 0;
						pointer-events: none;
					}

					/* Main video filling below */
					.focus-main-wrapper {
						flex: 1;
						display: flex;
						align-items: center;
						justify-content: center;
						min-height: 0;
						overflow: hidden;
						background: #0a0a0a;
						padding: 0;
					}
					
					.focus-main-video {
						position: relative;
						width: 100%;
						height: 100%;
						max-width: 100%;
						max-height: 100%;
						border-radius: 16px;
						overflow: hidden;
						background: #1a1a1a;
						display: flex;
						align-items: center;
						justify-content: center;
					}

					/* Remove border radius from tiles in main view */
					@media (max-width: 768px) {
						.focus-main-wrapper {
							padding: 8px;
						}
						.focus-main-video {
							border-radius: 8px;
						}
					}
					
					/* CRITICAL: Constrain ParticipantTile inside focus-main-video */
					.focus-main-video > div:first-child,
					.focus-main-video .lk-participant-tile,
					.focus-main-video [data-lk-participant-tile] {
						width: 100% !important;
						height: 100% !important;
						max-width: 100% !important;
						max-height: 100% !important;
						background: #1a1a1a !important;
						position: relative !important;
					}
					
					/* Ensure video container shows properly */
					.focus-main-video .lk-video-container {
						width: 100% !important;
						height: 100% !important;
						position: relative !important;
					}
					
					.focus-main-video video {
						object-fit: contain !important;
						background: transparent !important;
						width: 100% !important;
						height: 100% !important;
					}
					
					/* Hide default LiveKit name in focus main video (we use our own) */
					.focus-main-video .lk-participant-name,
					.focus-main-video .lk-participant-metadata {
						display: none !important;
					}
					
					/* Participant name overlay - our custom one */
					.focus-participant-name {
						position: absolute;
						bottom: 0;
						left: 0;
						right: 0;
						padding: 8px 16px;
						height: 40px;
						max-height: 40px;
						background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
						display: flex;
						align-items: flex-end;
						gap: 8px;
						z-index: 15;
					}
					
					.focus-participant-name span {
						color: white !important;
						font-size: 14px;
						font-weight: 500;
						text-shadow: 0 1px 2px rgba(0,0,0,0.5);
					}
					
					@media (max-width: 768px) {
						.focus-participant-name {
							padding: 6px 12px;
							height: 32px;
							max-height: 32px;
						}
						.focus-participant-name span {
							font-size: 12px;
						}
					}
					
					/* Individual thumbnail */
					.focus-thumbnail {
						position: relative;
						width: 180px;
						min-width: 180px;
						display: flex;
						flex-direction: column;
						gap: 6px;
						cursor: pointer;
						transition: all 0.2s ease;
						flex-shrink: 0;
					}
					
					@media (max-width: 768px) {
						.focus-thumbnail {
							width: 120px;
							min-width: 120px;
							gap: 4px;
						}
						
						.focus-thumbnails {
							gap: 8px !important;
							padding: 4px 40px !important;
						}
						
						.focus-thumbnails-wrapper {
							min-height: 100px !important;
							padding: 6px 0 !important;
						}
					}
					
					@media (max-width: 768px) {
						.focus-thumbnail {
							width: 120px;
							min-width: 120px;
							gap: 4px;
						}
						
						.focus-thumbnails {
							gap: 8px;
							padding: 4px 40px;
						}
						
						.focus-thumbnails-wrapper {
							min-height: 100px;
							padding: 6px 0;
						}
					}
					
					.focus-thumbnail-video-container {
						position: relative;
						width: 100%;
						aspect-ratio: 16/9;
						overflow: hidden;
						background: #1a1a1a;
						border: 2px solid rgba(255, 255, 255, 0.08);
						border-radius: 12px;
						transition: all 0.2s ease;
					}
					
					.focus-thumbnail:hover .focus-thumbnail-video-container {
						border-color: rgba(255, 255, 255, 0.4);
						transform: scale(1.02);
					}
					
					.focus-thumbnail-video-container > div,
					.focus-thumbnail-video-container .lk-participant-tile {
						width: 100% !important;
						height: 100% !important;
						position: absolute !important;
						top: 0 !important;
						left: 0 !important;
					}
					
					.focus-thumbnail.speaking .focus-thumbnail-video-container {
						border-color: #00DC6E !important;
						border-width: 2px;
						box-shadow: 0 0 0 2px rgba(0, 220, 110, 0.4);
						animation: pulse-border 2s ease-in-out infinite;
					}
					
					.focus-thumbnail.pinned .focus-thumbnail-video-container {
						border-color: #3b82f6 !important;
						box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
					}
					
					.focus-thumbnail.active .focus-thumbnail-video-container {
						border-color: #00DC6E;
						box-shadow: 0 0 0 2px rgba(0, 220, 110, 0.3);
					}
					
					/* Thumbnail name label (below video now) */
					.focus-thumbnail-name {
						display: flex;
						align-items: center;
						justify-content: center;
						padding: 0 4px;
					}
					
					.focus-thumbnail-name span {
						color: rgba(255,255,255,0.6) !important;
						font-size: 11px;
						font-weight: 500;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
					}
					
					.focus-thumbnail.speaking .focus-thumbnail-name span {
						color: #00DC6E !important;
						font-weight: 600;
					}
					
					/* Hide default LiveKit name in thumbnails (we use our own) */
					.focus-thumbnail .lk-participant-name,
					.focus-thumbnail .lk-participant-metadata {
						display: none !important;
					}
					
					/* "View All" button in thumbnail strip - Smaller */
					.focus-view-more {
						width: 36px;
						min-width: 36px;
						height: 36px;
						flex-shrink: 0;
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						background: rgba(30, 30, 30, 0.6);
						border: 1px solid rgba(255, 255, 255, 0.1);
						cursor: pointer;
						transition: all 0.2s ease;
						margin-left: 4px;
					}
					
					.focus-view-more:hover {
						background: rgba(50, 50, 50, 0.9);
						border-color: rgba(255,255,255,0.3);
						transform: scale(1.05);
					}
					.custom-grid {
						display: grid;
						gap: 12px;
										height: 90%;
										width: 100%;
										max-width: 100%;
										padding: 16px;
										align-items: stretch;
										justify-items: stretch;
										overflow: hidden;
										box-sizing: border-box;
										margin: auto;
						grid-template-columns: minmax(0, 900px);
						grid-template-rows: minmax(0, 1fr);
						justify-content: center;
					}
					
					/* 2 participants - side by side */
					.custom-grid[data-count="2"] {
						grid-template-columns: repeat(2, minmax(0, 1fr));
						grid-template-rows: minmax(0, 1fr);
					}
					
					/* 3-4 participants - 2x2 grid */
					.custom-grid[data-count="3"],
					.custom-grid[data-count="4"] {
						grid-template-columns: repeat(2, minmax(0, 1fr));
						grid-template-rows: repeat(2, minmax(0, 1fr));
					}
					
					/* 5-6 participants - 3x2 grid */
					.custom-grid[data-count="5"],
					.custom-grid[data-count="6"] {
						grid-template-columns: repeat(3, minmax(0, 1fr));
						grid-template-rows: repeat(2, minmax(0, 1fr));
					}
					
					/* 7-9 participants - 3x3 grid */
					.custom-grid[data-count="7"],
					.custom-grid[data-count="8"],
					.custom-grid[data-count="9"] {
						grid-template-columns: repeat(3, minmax(0, 1fr));
						grid-template-rows: repeat(3, minmax(0, 1fr));
					}
					
					@keyframes pulse-border {
						0%, 100% {
							box-shadow: 0 0 0 2px rgba(0, 220, 110, 0.3);
						}
						50% {
							box-shadow: 0 0 0 4px rgba(0, 220, 110, 0.5);
						}
					}
					
					@media (max-width: 768px) {
						.custom-grid {
							gap: 8px;
							padding: 8px;
						}
						
						.custom-grid[data-count="1"] {
							grid-template-columns: 1fr;
							max-height: 100%;
						}
						
						.custom-grid[data-count="2"] {
							grid-template-columns: 1fr;
							grid-template-rows: repeat(2, minmax(0, 1fr));
							max-height: 100%;
						}
						
						.custom-grid[data-count="3"],
						.custom-grid[data-count="4"] {
							grid-template-columns: repeat(2, minmax(0, 1fr));
							grid-template-rows: repeat(2, minmax(0, 1fr));
						}
						
						.custom-grid[data-count="5"],
						.custom-grid[data-count="6"] {
							grid-template-columns: repeat(2, minmax(0, 1fr));
							grid-template-rows: repeat(3, minmax(0, 1fr));
						}
					}
					
					/* Grid tile styling */
					.custom-grid-tile {
						width: 100%;
						height: 100%;
						max-width: 100%;
						max-height: 100%;
						min-height: 0;
						min-width: 0;
						display: flex;
						flex-direction: column;
						gap: 4px;
						overflow: hidden;
					}
					
					.custom-grid-tile-content {
						position: relative;
						width: 100%;
						flex: 1;
						min-height: 0;
						border-radius: 16px;
						overflow: hidden;
						background: #1a1a1a;
						border: 2px solid transparent;
						transition: all 0.2s ease;
					}
					
					.custom-grid-tile-content > div:first-child {
						position: absolute !important;
						top: 0 !important;
						left: 0 !important;
						right: 0 !important;
						bottom: 0 !important;
						width: 100% !important;
						height: 100% !important;
					}
					
					/* Ensure video fills height and adjusts width proportionally */
					.custom-grid-tile-content video {
						object-fit: contain !important;
						width: 100% !important;
						height: 100% !important;
					}
					
					.custom-grid-tile-content.speaking {
						border-color: #00DC6E !important;
						border-width: 3px;
						box-shadow: 0 0 0 2px rgba(0, 220, 110, 0.3);
						animation: pulse-border 2s ease-in-out infinite;
					}
					
					.custom-grid-tile-content:hover {
						border-color: rgba(255, 255, 255, 0.3);
					}
					
					/* Custom Scrollbar for Sidebar */
					.custom-scrollbar::-webkit-scrollbar {
						width: 8px;
					}
					
					.custom-scrollbar::-webkit-scrollbar-track {
						background: rgba(255, 255, 255, 0.05);
						border-radius: 4px;
					}
					
					.custom-scrollbar::-webkit-scrollbar-thumb {
						background: rgba(255, 255, 255, 0.2);
						border-radius: 4px;
						transition: background 0.2s;
					}
					
					.custom-scrollbar::-webkit-scrollbar-thumb:hover {
						background: rgba(255, 255, 255, 0.3);
					}
					
					/* Firefox scrollbar */
					.custom-scrollbar {
						scrollbar-width: thin;
						scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
					}
					`}} />
						{/* Layout rendering */}
						{layoutMode === 'focus' ? (
							<div className="focus-layout-container">
								{/* Thumbnail strip at TOP with Scroll Buttons */}
								{!isExpandedView && (
									<div className="focus-thumbnails-wrapper">
										{/* Left Scroll Button */}
										<button
											className={`focus-scroll-btn left ${!canScrollLeft ? 'opacity-0 pointer-events-none' : ''}`}
											onClick={() => scrollThumbnails('left')}
											disabled={!canScrollLeft}
										>
											<ChevronLeft className="w-5 h-5" />
										</button>

										<div className="focus-thumbnails" ref={thumbnailsRef}>
											{sortedParticipants
												.filter((participant) => {
													// Exclude the focused participant from thumbnails to avoid showing them twice.
													const isFocused = focusedParticipantForDisplay?.identity === participant.identity
													return !isFocused || isScreenShareFocused
												})
												.map((participant) => {
													const isLocal = participant.isLocal
													const isMuted = !participant.isMicrophoneEnabled
													const isVideoOff = !participant.isCameraEnabled
													const participantCameraTrack = cameraTrackByParticipantId.get(participant.identity)
													const isVideoTrackRef = !!participantCameraTrack && isTrackReference(participantCameraTrack)
													const hasVideo = isVideoTrackRef && !!participantCameraTrack.publication?.track
													const avatarUrl = getParticipantAvatar(participant)
													const name = participant.isLocal ? 'You' : (participant.name || participant.identity)

													return (
														<div
															key={`thumb-${participant.identity}`}
															className={`focus-thumbnail ${participant.isSpeaking ? 'speaking' : ''
																} ${pinnedParticipantId === participant.identity ? 'pinned' : ''
																}`}
															onClick={() => handleThumbnailClick(participant.identity)}
														>
															{/* Video/Avatar Container */}
															<div className="focus-thumbnail-video-container">
																{/* Avatar background layer - always visible */}
																<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#2a2a2a] to-[#1f1f1f] z-[1]">
																	{avatarUrl ? (
																		<Image
																			src={avatarUrl}
																			alt={participant.name || 'Participant'}
																			width={40}
																			height={40}
																			className="w-10 h-10 rounded-full object-cover"
																		/>
																	) : (
																		<div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#404040] to-[#303030] flex items-center justify-center">
																			<User className="w-5 h-5 text-[#666]" />
																		</div>
																	)}
																</div>
																{/* Video layer on top - ONLY render when there's actual video track */}
																{hasVideo && isVideoTrackRef && (
																	<div className="absolute inset-0 z-[2]">
																		<VideoTrack
																			trackRef={participantCameraTrack}
																			className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
																		/>
																	</div>
																)}
																{/* Off-state badges */}
																{(isMuted || isVideoOff) && (
																	<div className="absolute top-2 right-2 z-[3] flex items-center gap-1">
																		{isMuted && (
																			<div
																				className="w-6 h-6 rounded-full flex items-center justify-center bg-sky-500"
																				title="Muted"
																			>
																				<MicOff className="h-3 w-3 text-white" />
																			</div>
																		)}
																		{isVideoOff && (
																			<div
																				className="w-6 h-6 rounded-full flex items-center justify-center bg-sky-500"
																				title="Camera off"
																			>
																				<VideoOff className="h-3 w-3 text-white" />
																			</div>
																		)}
																	</div>
																)}
															</div>

															{/* Name below video */}
															<div className="focus-thumbnail-name">
																<span>{name}</span>
																{participant.isSpeaking && (
																	<div className="w-1.5 h-1.5 rounded-full bg-[#00DC6E] animate-pulse ml-1.5" />
																)}
															</div>
														</div>
													)
												})}
											{/* View All button - switch to grid view */}
											{sortedParticipants.length > 1 && (
												<button
													onClick={() => setLayoutMode('grid')}
													className="focus-view-more"
													title="View All"
												>
													<Grid2X2 className="h-4 w-4 text-white/80" />
													<span className="sr-only">View All</span>
												</button>
											)}
										</div>

										{/* Right Scroll Button */}
										<button
											className={`focus-scroll-btn right ${!canScrollRight ? 'opacity-0 pointer-events-none' : ''}`}
											onClick={() => scrollThumbnails('right')}
											disabled={!canScrollRight}
										>
											<ChevronRight className="w-5 h-5" />
										</button>
									</div>
								)}

								{/* Main focused video wrapper - centers the video */}
								<div className="focus-main-wrapper">
									{focusedParticipantForDisplay ? (
										<div className="flex flex-col w-full h-full max-h-full">
											<div className={`focus-main-video relative group flex-1 min-h-0`}>
												{/* Always show avatar background */}
												<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#1a1a1a] z-[1]">
													{(() => {
														const avatarUrl = getParticipantAvatar(focusedParticipantForDisplay)
														return avatarUrl ? (
															<Image
																src={avatarUrl}
																alt={focusedParticipantForDisplay.name || 'Participant'}
																width={112}
																height={112}
																className="w-28 h-28 rounded-full object-cover shadow-2xl"
															/>
														) : (
															<div className="w-28 h-28 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] flex items-center justify-center shadow-2xl">
																<User className="w-14 h-14 text-[#555]" />
															</div>
														)
													})()}
												</div>
												{/* Video layer — screen share (zoom / min / max) vs camera */}
												{isTrackReference(focusedTrack) && (
													<>
														{isSplitMode && pinnedTrack && (
															<div className="absolute inset-0 z-[2] flex flex-col md:flex-row gap-2 p-2 bg-[#0f0f0f]">
																{/* Left/Top: Screen Share */}
																<div className="flex-1 relative bg-black/40 rounded-xl overflow-hidden group border border-white/5">
																	{isTrackReference(focusedTrack) ? (
																		<div
																			className="relative flex h-full w-full items-center justify-center p-2"
																			style={{
																				transform: `scale(${screenShareZoom})`,
																				transformOrigin: 'center center',
																				transition: 'transform 0.12s ease-out',
																			}}
																		>
																			<VideoTrack
																				trackRef={focusedTrack}
																				className="h-full w-full object-contain"
																			/>
																		</div>
																	) : (
																		<div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
																			<MonitorUp className="h-12 w-12 text-white/20" />
																		</div>
																	)}
																	{/* Label for Screen share */}
																	<div className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-md text-[10px] font-bold text-white px-2 py-1 rounded flex items-center gap-1.5 z-10 shadow-lg border border-white/10">
																		<MonitorUp className="h-3 w-3" />
																		<span>SCREEN SHARE</span>
																	</div>

																	{/* Remote Control Actions - Overlay on the screen share half */}
																	<RemoteControlOverlay
																		isControlling={isControlling && targetScreenShareId === focusedParticipantForDisplay.identity}
																		isSharing={focusedParticipantForDisplay.isLocal}
																		controllerId={controllerId}
																		onSendInput={sendInputEvent}
																		onStopControl={stopControl}
																		onRevokeControl={revokeControl}
																	/>
																</div>

																{/* Right/Bottom: Pinned Participant */}
																<div className="flex-1 relative bg-[#1a1a1a] rounded-xl overflow-hidden group border border-blue-500/30">
																	{isTrackReference(pinnedTrack) && pinnedTrack.publication?.track ? (
																		<VideoTrack
																			trackRef={pinnedTrack}
																			className={`h-full w-full object-contain ${pinnedTrack.participant.isLocal ? 'scale-x-[-1]' : ''}`}
																		/>
																	) : (
																		<div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#252525] to-[#1a1a1a]">
																			{pinnedTrack.participant ? (
																				(() => {
																					const avatarUrl = getParticipantAvatar(pinnedTrack.participant)
																					return avatarUrl ? (
																						<Image
																							src={avatarUrl}
																							alt={pinnedTrack.participant.name || 'Participant'}
																							width={80}
																							height={80}
																							className="w-20 h-20 rounded-full object-cover shadow-xl border-2 border-white/10"
																						/>
																					) : (
																						<div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] flex items-center justify-center shadow-xl border-2 border-white/10">
																							<User className="w-10 h-10 text-[#555]" />
																						</div>
																					)
																				})()
																			) : null}
																			<p className="mt-4 text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">Camera Off</p>
																		</div>
																	)}
																	{/* Label for Pinned Participant */}
																	<div className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur-md text-[10px] font-bold text-white px-2 py-1 rounded flex items-center gap-1.5 z-10 shadow-lg border border-white/10">
																		<Pin className="h-3 w-3 fill-current" />
																		<span>{pinnedTrack.participant?.name || pinnedTrack.participant?.identity || 'Participant'}</span>
																	</div>
																	{/* Unpin button overlay */}
																	<button
																		onClick={() => setPinnedParticipantId(null)}
																		className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-white/10 text-white"
																		title="Exit split view (unpin)"
																	>
																		<PinOff className="h-4 w-4" />
																	</button>
																</div>
															</div>
														)}
														{!isSplitMode && isScreenShareFocused && showScreenShareInMain && (
															<div className="absolute inset-0 z-[2] overflow-hidden bg-black/40">
																<VideoTrack
																	trackRef={focusedTrack}
																	className="w-full h-full object-contain"
																/>

																<RemoteControlOverlay
																	isControlling={isControlling && targetScreenShareId === focusedParticipantForDisplay.identity}
																	isSharing={focusedParticipantForDisplay.isLocal}
																	controllerId={controllerId}
																	onSendInput={sendInputEvent}
																	onStopControl={stopControl}
																	onRevokeControl={revokeControl}
																/>

																{/* Remote Control Actions */}
																{!focusedParticipantForDisplay.isLocal && !isControlling && (
																	<div className="absolute top-4 left-4 z-30">
																		<Button
																			variant="secondary"
																			size="sm"
																			onClick={(e) => {
																				e.stopPropagation();
																				requestControl(focusedParticipantForDisplay.identity);
																			}}
																			disabled={isRequestPending && targetScreenShareId === focusedParticipantForDisplay.identity}
																			className="bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur"
																		>
																			{isRequestPending && targetScreenShareId === focusedParticipantForDisplay.identity
																				? 'Requesting Control...'
																				: 'Request Control'}
																		</Button>
																	</div>
																)}
															</div>
														)}
														{isScreenShareFocused && !showScreenShareInMain && (
															<div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#252525] to-[#1a1a1a] px-6 text-center">
																{screenShareMaximized ? (
																	<Maximize2 className="h-10 w-10 text-sky-400" />
																) : (
																	<PictureInPicture2 className="h-10 w-10 text-sky-400" />
																)}
																<p className="text-sm font-medium text-white">
																	{screenShareMaximized
																		? 'Screen share is using the full workspace'
																		: 'Screen share is in a small window'}
																</p>
																<p className="max-w-xs text-xs text-white/50">
																	Restore the small window or exit full workspace from its top bar.
																</p>
																<Button
																	size="sm"
																	variant="secondary"
																	className="mt-1"
																	onClick={() => {
																		setScreenShareMinimized(false)
																		setScreenShareMaximized(false)
																	}}
																>
																	Back to meeting layout
																</Button>
															</div>
														)}
														{!isSplitMode && !isScreenShareFocused && focusedTrack.publication?.track && (
															<div className="absolute inset-0 z-[2]">
																<VideoTrack
																	trackRef={focusedTrack}
																	className={`h-full w-full object-contain ${focusedParticipantForDisplay.isLocal ? 'scale-x-[-1]' : ''}`}
																/>
															</div>
														)}
													</>
												)}

												<div className="absolute top-4 right-4 flex items-center gap-2 z-20">
													<div
														className={`w-8 h-8 rounded-full flex items-center justify-center ${focusedParticipantForDisplay.isMicrophoneEnabled
															? 'bg-black/60 border border-white/20'
															: 'bg-sky-500'
															}`}
														title={focusedParticipantForDisplay.isMicrophoneEnabled ? 'Unmuted' : 'Muted'}
													>
														{focusedParticipantForDisplay.isMicrophoneEnabled ? (
															<Mic className="h-4 w-4 text-white" />
														) : (
															<MicOff className="h-4 w-4 text-white" />
														)}
													</div>
													{!focusedParticipantForDisplay.isCameraEnabled && !isScreenShareFocused && (
														<div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center" title="Camera off">
															<VideoOff className="h-4 w-4 text-white" />
														</div>
													)}
												</div>

												{/* Pin/Unpin button overlay - Top Left */}
												{!isScreenShareFocused && (
													<div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
														<Button
															variant="ghost"
															size="sm"
															onClick={togglePinFocused}
															className={`h-9 px-4 rounded-lg border ${pinnedParticipantId === focusedParticipantForDisplay.identity
																? 'bg-[#3b82f6] text-white hover:bg-[#2563eb] border-[#3b82f6]'
																: 'bg-black/60 text-white hover:bg-black/80 border-white/10 backdrop-blur-sm'
																}`}
															title={pinnedParticipantId === focusedParticipantForDisplay.identity ? 'Unpin' : 'Pin this video'}
														>
															{pinnedParticipantId === focusedParticipantForDisplay.identity ? (
																<>
																	<PinOff className="h-4 w-4 mr-1.5" /> Unpin
																</>
															) : (
																<>
																	<Pin className="h-4 w-4 mr-1.5" /> Pin
																</>
															)}
														</Button>
													</div>
												)}

												{/* Expand/Collapse button - Bottom Right */}
												<div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setIsExpandedView(!isExpandedView)}
														className="h-10 w-10 rounded-xl bg-black/60 text-white hover:bg-black/80 border border-white/10 backdrop-blur-sm flex items-center justify-center"
														title={isExpandedView ? 'Show participants' : 'Expand video'}
													>
														{isExpandedView ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
													</Button>
												</div>

												{/* Screen share zoom — bottom-left of same stage as expand (absolute; shifts with main column / md:mr-96) */}
												{isScreenShareFocused && showScreenShareInMain && (
													<div
														className="pointer-events-auto absolute bottom-4 left-4 z-20 flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/60 px-1 py-1 shadow-lg backdrop-blur-sm"
														role="toolbar"
														aria-label="Screen share zoom"
													>
														<button
															type="button"
															onClick={() => adjustScreenShareZoom(-0.25)}
															disabled={screenShareZoom <= 0.5}
															className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
															title="Zoom out"
														>
															<ZoomOut className="h-4 w-4" />
														</button>
														<span className="min-w-[2.25rem] shrink-0 text-center text-[10px] font-semibold tabular-nums text-white/90">
															{Math.round(screenShareZoom * 100)}%
														</span>
														<button
															type="button"
															onClick={() => adjustScreenShareZoom(0.25)}
															disabled={screenShareZoom >= 2}
															className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
															title="Zoom in"
														>
															<ZoomIn className="h-4 w-4" />
														</button>
													</div>
												)}
											</div>

											{/* Participant name bar below video */}
											<div className="h-10 shrink-0 flex items-center justify-between px-2 pt-1.5">
												<div className="flex items-center gap-2">
													<span className="text-white text-sm font-medium">
														{focusedParticipantForDisplay.isLocal ? 'You' : (focusedParticipantForDisplay.name || focusedParticipantForDisplay.identity)}
													</span>
													{focusedParticipantForDisplay.isSpeaking && (
														<div className="flex items-center gap-1.5 ml-1">
															<div className="w-1.5 h-1.5 rounded-full bg-[#00DC6E] animate-pulse" />
														</div>
													)}
													{isScreenShareFocused && (
														<span className="text-white/60 text-xs ml-1">(Screen)</span>
													)}
												</div>
											</div>
										</div>
									) : (
										<div className="focus-main-video flex items-center justify-center">
											<div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
												<div className="relative">
													<div className="absolute inset-0 bg-[#00DC6E]/20 rounded-full blur-xl animate-pulse" />
													<div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] flex items-center justify-center shadow-2xl relative border border-white/5">
														<User className="w-10 h-10 text-white/40" />
													</div>
													{/* Decorative rings */}
													<div className="absolute inset-[-12px] border border-white/5 rounded-full animate-[spin_8s_linear_infinite]" style={{ borderTopColor: 'rgba(255,255,255,0.1)' }} />
													<div className="absolute inset-[-24px] border border-white/5 rounded-full animate-[spin_12s_linear_infinite_reverse]" style={{ borderBottomColor: 'rgba(255,255,255,0.05)' }} />
												</div>
												<div className="text-center space-y-2">
													<h3 className="text-white font-medium text-lg">Waiting for others</h3>
													<p className="text-white/40 text-sm max-w-[200px]">You are the only one here. Invite others to join the session.</p>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						) : (
							<div className="grid-mode h-full w-full">
								{/* Custom Grid layout with pin buttons */}
								<div className="custom-grid" data-count={Math.min(sortedParticipants.length, 9)}>
									{sortedParticipants.map((participant) => {
										const isLocal = participant.isLocal
										const participantCameraTrack = cameraTrackByParticipantId.get(participant.identity)
										const isVideoTrackRef = !!participantCameraTrack && isTrackReference(participantCameraTrack)
										const hasVideo = isVideoTrackRef && !!participantCameraTrack.publication?.track
										const isMuted = !participant.isMicrophoneEnabled
										const isVideoOff = !participant.isCameraEnabled
										const avatarUrl = getParticipantAvatar(participant)
										return (
											<div
												key={`grid-${participant.identity}`}
												className={`custom-grid-tile group`}
											>
												<div className={`custom-grid-tile-content ${participant.isSpeaking ? 'speaking' : ''}`}>
													{/* Avatar background layer - always visible */}
													<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#1a1a1a] z-[1]">
														{avatarUrl ? (
															<Image
																src={avatarUrl}
																alt={participant.name || 'Participant'}
																width={80}
																height={80}
																className="w-20 h-20 rounded-full object-cover shadow-lg"
															/>
														) : (
															<div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] flex items-center justify-center shadow-lg">
																<User className="w-10 h-10 text-[#666]" />
															</div>
														)}
													</div>
													{/* Video layer on top - ONLY render when there's actual video track */}
													{hasVideo && isVideoTrackRef && (
														<div className="absolute inset-0 z-[2] flex items-center justify-center">
															<VideoTrack
																trackRef={participantCameraTrack}
																className={`w-full h-full object-contain ${isLocal ? 'scale-x-[-1]' : ''}`}
															/>
														</div>
													)}
													{/* Pin button overlay */}
													<button
														onClick={(e) => {
															e.stopPropagation()
															pinAndSwitchToPresenter(participant.identity)
														}}
														className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 border border-white/10"
														title="Pin and switch to speaker view"
													>
														<Pin className="h-4 w-4 text-white" />
													</button>
													{/* Speaking indicator */}
													{participant.isSpeaking && (
														<div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#00DC6E]/90 backdrop-blur-sm px-2 py-1 rounded-full z-20">
															<div className="w-2 h-2 rounded-full bg-white animate-pulse" />
															<span className="text-white text-[10px] font-medium">Speaking</span>
														</div>
													)}
												</div>

												{/* Bottom bar with name and audio/video status - NOW BELOW THE VIDEO */}
												<div className="flex items-center justify-between px-2 pt-1 h-8 md:h-8 shrink-0">
													<span className="text-white text-xs md:text-sm font-medium truncate max-w-[65%]">
														{isLocal ? 'You' : (participant.name || participant.identity)}
													</span>
													<div className="flex items-center gap-1 md:gap-1.5">
														{/* Mic status icon */}
														{isMuted ? (
															<div className="w-6 h-6 md:w-6 md:h-6 rounded-full bg-sky-500 flex items-center justify-center" title="Muted">
																<MicOff className="h-3 w-3 md:h-3.5 md:w-3.5 text-white" />
															</div>
														) : (
															<div className="w-6 h-6 md:w-6 md:h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center" title="Unmuted">
																<Mic className="h-3 w-3 md:h-3.5 md:w-3.5 text-white" />
															</div>
														)}
														{/* Video status icon */}
														{isVideoOff && (
															<div className="w-6 h-6 md:w-6 md:h-6 rounded-full bg-sky-500 flex items-center justify-center" title="Camera off">
																<VideoOff className="h-3 w-3 md:h-3.5 md:w-3.5 text-white" />
															</div>
														)}
													</div>
												</div>
											</div>
										)
									})}
								</div>
							</div>
						)}
						{/* Screen share: small floating preview (minimized) */}
						{isScreenShareFocused &&
							screenShareMinimized &&
							!screenShareMaximized &&
							isTrackReference(focusedTrack) && (
								<div className="fixed bottom-28 right-4 z-[260] w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-white/15 bg-[#141414] shadow-2xl">
									<div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/60 px-2 py-1.5">
										<span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-white">
											<MonitorUp className="h-3 w-3 shrink-0 text-sky-400" />
											<span className="truncate">Screen share</span>
										</span>
										<div className="flex shrink-0 items-center gap-0.5">
											<button
												type="button"
												onClick={() => adjustScreenShareZoom(-0.25)}
												disabled={screenShareZoom <= 0.5}
												className="rounded p-1.5 text-white/80 hover:bg-white/10 disabled:opacity-30"
												title="Zoom out"
											>
												<ZoomOut className="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												onClick={() => adjustScreenShareZoom(0.25)}
												disabled={screenShareZoom >= 2}
												className="rounded p-1.5 text-white/80 hover:bg-white/10 disabled:opacity-30"
												title="Zoom in"
											>
												<ZoomIn className="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												onClick={() => {
													setScreenShareMinimized(false)
													setScreenShareMaximized(true)
												}}
												className="rounded p-1.5 text-white/80 hover:bg-white/10"
												title="Full workspace"
											>
												<Maximize2 className="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												onClick={() => setScreenShareMinimized(false)}
												className="rounded p-1.5 text-white/80 hover:bg-white/10"
												title="Restore to meeting layout"
											>
												<PictureInPicture2 className="h-3.5 w-3.5" />
											</button>
										</div>
									</div>
									<div className="relative aspect-video bg-black overflow-auto">
										<div
											className="flex min-h-full min-w-full items-center justify-center p-2"
											style={{
												transform: `scale(${screenShareZoom})`,
												transformOrigin: 'center center',
												transition: 'transform 0.12s ease-out',
											}}
										>
											<VideoTrack
												trackRef={focusedTrack}
												className="h-full w-full object-contain"
											/>
										</div>
									</div>
								</div>
							)}


						{/* Screen share: full workspace overlay (maximized) */}
						{isScreenShareFocused &&
							screenShareMaximized &&
							isTrackReference(focusedTrack) && (
								<div className="fixed inset-0 z-[290] flex flex-col bg-black">
									<div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#141414] px-3 py-2 sm:px-4">
										<span className="flex items-center gap-2 text-sm font-medium text-white">
											<MonitorUp className="h-4 w-4 shrink-0 text-sky-400" />
											Screen share
										</span>
										<div className="flex flex-wrap items-center justify-end gap-1">
											<div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/40 p-1">
												<button
													type="button"
													onClick={() => adjustScreenShareZoom(-0.25)}
													disabled={screenShareZoom <= 0.5}
													className="rounded p-2 text-white/90 hover:bg-white/10 disabled:opacity-30"
													title="Zoom out"
												>
													<ZoomOut className="h-4 w-4" />
												</button>
												<span className="min-w-[2.5rem] text-center text-xs tabular-nums text-white/80">
													{Math.round(screenShareZoom * 100)}%
												</span>
												<button
													type="button"
													onClick={() => adjustScreenShareZoom(0.25)}
													disabled={screenShareZoom >= 2}
													className="rounded p-2 text-white/90 hover:bg-white/10 disabled:opacity-30"
													title="Zoom in"
												>
													<ZoomIn className="h-4 w-4" />
												</button>
											</div>
											<Button
												variant="secondary"
												size="sm"
												className="h-8 text-xs"
												onClick={() => {
													setScreenShareMaximized(false)
													setScreenShareMinimized(true)
												}}
											>
												Minimize
											</Button>
											<Button
												size="sm"
												className="h-8 bg-sky-600 text-xs hover:bg-sky-500"
												onClick={() => setScreenShareMaximized(false)}
											>
												Exit
											</Button>
										</div>
									</div>
									<div className="relative flex flex-1 items-center justify-center overflow-auto p-4">
										<div
											style={{
												transform: `scale(${screenShareZoom})`,
												transformOrigin: 'center center',
												transition: 'transform 0.12s ease-out',
											}}
										>
											<div className="relative inline-block w-full">
												<VideoTrack
													trackRef={focusedTrack}
													className="max-h-[min(82vh,calc(100vw-4rem))] w-auto max-w-full object-contain"
												/>
											</div>

											<RemoteControlOverlay
												isControlling={isControlling && targetScreenShareId === focusedTrack.participant.identity}
												isSharing={focusedTrack.participant.isLocal}
												controllerId={controllerId}
												onSendInput={sendInputEvent}
												onStopControl={stopControl}
												onRevokeControl={revokeControl}
											/>
										</div>
									</div>
								</div>
							)}

						<RoomAudioRenderer />
					</div>
				</div>

				{/* Zoom-Style Bottom Control Bar - Floating Island */}
				<div
					className={`fixed left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:w-fit md:min-w-[500px] flex items-center justify-between px-2 md:px-4 py-2 md:py-3 bg-[#141414]/90 backdrop-blur-xl border border-white/10 shadow-2xl z-[50] transition-all duration-300 rounded-xl md:rounded-2xl gap-1 md:gap-8 ${isUserActive ? 'bottom-3 md:bottom-6 opacity-100' : 'bottom-[-100px] opacity-0'}`}
				>
					{/* LEFT: Audio/Video Controls - Horizontal Group */}
					<div className="flex items-center gap-1 md:gap-3">
						{/* Audio Button Stack */}
						{studyRoomStyleJoinerChrome && (
							<div className="flex flex-col items-center justify-center group relative">
								<div className="flex items-center bg-white/5 rounded-lg md:rounded-xl p-0.5 md:p-1 border border-white/5">
									<button
										onClick={async () => {
											try {
												if (!localParticipant) return

												const newState = !localParticipant.isMicrophoneEnabled
												if (newState && !isHost && permissions && !permissions.allowAudio) {
													participantRequestAudio?.()
													return
												}
												await localParticipant.setMicrophoneEnabled(newState)
											} catch { }
										}}
										className={`h-11 w-11 md:h-10 md:w-10 flex items-center justify-center rounded-lg hover:bg-sky-500/20 active:scale-95 transition-all ${(isMicrophoneEnabled) ? 'text-white hover:text-sky-400' : 'bg-sky-500/10 text-sky-500 hover:text-sky-400'}`}
										title="Toggle Microphone"
									>
										{(isMicrophoneEnabled) ? <Mic className="h-5 w-5 md:h-5 md:w-5" /> : <MicOff className="h-5 w-5 md:h-5 md:w-5" />}
									</button>
								</div>
							</div>
						)}

						{/* Video Button Stack */}
						{studyRoomStyleJoinerChrome && (
							<div className="flex flex-col items-center justify-center group relative">
								<div className="flex items-center bg-white/5 rounded-lg md:rounded-xl p-0.5 md:p-1 border border-white/5">
									<button
										onClick={async () => {
											try {
												if (!localParticipant) return

												const newState = !localParticipant.isCameraEnabled
												if (newState && !isHost && permissions && !permissions.allowVideo) {
													participantRequestVideo?.()
													return
												}
												await localParticipant.setCameraEnabled(newState)
											} catch (_err) { }
										}}
										className={`h-11 w-11 md:h-10 md:w-10 flex items-center justify-center rounded-lg hover:bg-sky-500/20 active:scale-95 transition-all ${(isCameraEnabled) ? 'text-white hover:text-sky-400' : 'bg-sky-500/10 text-sky-500 hover:text-sky-400'}`}
										title="Toggle Camera"
									>
										{(isCameraEnabled) ? <Video className="h-5 w-5 md:h-5 md:w-5" /> : <VideoOff className="h-5 w-5 md:h-5 md:w-5" />}
									</button>
									<div className="hidden md:block w-px h-6 bg-white/10 mx-1" />
									<button
										onClick={() => {
											if (isMobileViewport) return
											setShowBackgroundMenu(!showBackgroundMenu)
										}}
										className="hidden md:flex h-10 w-6 items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
										title="Video Settings"
									>
										<ChevronUp className="h-3 w-3 text-white/70" />
									</button>
								</div>
							</div>
						)}
					</div>

					{/* CENTER: Main Controls */}
					<div className="flex items-center gap-1 md:gap-3 flex-1 justify-center">

						{/* Share Screen - hidden on mobile/guests (getDisplayMedia not supported) */}
						{studyRoomStyleJoinerChrome && !isMobileViewport && (
							<div className="flex flex-col items-center justify-center group">
								<button
									onClick={async () => {
										if (!navigator.mediaDevices?.getDisplayMedia) {
											showError('Not Supported', 'Screen sharing is not supported on this device or browser.')
											return
										}
										try {
											const newState = !isScreenShareEnabled
											if (newState) {
												// Enable screen share with audio capture
												const optionsWithAudio = {
													audio: {
														echoCancellation: true,
														noiseSuppression: true,
														autoGainControl: true,
													}
												}
												await localParticipant?.setScreenShareEnabled(newState, optionsWithAudio)
											} else {
												await localParticipant?.setScreenShareEnabled(newState)
											}
										} catch (err) {
											const error = err as DOMException
											if (error?.name === 'NotAllowedError') {
												showError('Permission Denied', 'Screen sharing permission was denied.')
											} else if (error?.name === 'NotSupportedError') {
												showError('Not Supported', 'Screen sharing is not supported on this device or browser.')
											} else {
												showError('Screen Share Failed', 'Could not start screen sharing. Please try again.')
											}
										}
									}}
									className={`h-9 w-9 md:h-11 md:w-11 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-sky-500/20 transition-all ${isScreenShareEnabled ? 'bg-sky-500/20 text-sky-400' : 'text-white/80 hover:text-sky-400'}`}
									title="Share Screen"
								>
									{isScreenShareEnabled ? <MonitorOff className="h-4 w-4 md:h-5 md:w-5 font-bold" /> : <MonitorUp className="h-4 w-4 md:h-5 md:w-5" />}
								</button>
							</div>
						)}

						{/* Scratch Pad */}
						<div className="flex flex-col items-center justify-center group">
							<button
								onClick={() => {
									if (!showScratchPad) {
										// Toggling Scratch Pad now opens a modal, no need to hide others automatically unless desired
									}
									setShowScratchPad(!showScratchPad)
								}}
								className={`h-11 w-11 md:h-11 md:w-11 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-sky-500/20 active:scale-95 transition-all relative ${showScratchPad ? 'bg-sky-500/20 text-sky-400' : 'text-white/80 hover:text-sky-400'}`}
								title="Scratch Pad (Pencil)"
							>
								<Pencil className="h-5 w-5 md:h-5 md:w-5" />
							</button>
						</div>

						{/* Chat */}
						<div className={`flex flex-col items-center justify-center group ${(!canViewParticipantList && !studyRoomStyleJoinerChrome) ? 'hidden' : ''}`}>
							<button
								onClick={() => {
									if (!showChat) {
										setShowParticipants(false)
										setShowTimerPanel(false)
									}
									setShowChat(!showChat)
								}}
								className={`h-11 w-11 md:h-11 md:w-11 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-sky-500/20 active:scale-95 transition-all relative ${showChat ? 'bg-sky-500/20 text-sky-400' : 'text-white/80 hover:text-sky-400'}`}
								title="Chat"
							>
								<MessageSquare className="h-5 w-5 md:h-5 md:w-5" />
							</button>
						</div>

						{studyRoomStyleJoinerChrome && (
							<div className="flex flex-col items-center justify-center group">
								{/* Participants */}
								<button
									onClick={() => {
										if (!canViewParticipantList) {
											showWarning(
												'Participant List Hidden',
												'Host has hidden the participant list. You cannot open it right now.',
											)
											return
										}
										if (!showParticipants) {
											setShowChat(false)
											setShowTimerPanel(false)
										}
										setShowParticipants(!showParticipants)
									}}
									className={`h-11 w-11 md:h-11 md:w-11 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-sky-500/20 active:scale-95 transition-all relative ${showParticipants ? 'bg-sky-500/20 text-sky-400' : 'text-white/80 hover:text-sky-400'}`}
									title={canViewParticipantList ? 'Participants' : 'Participant list is hidden by host'}
								>
									<Users className="h-5 w-5 md:h-5 md:w-5" />
									{allParticipants && allParticipants.length > 0 && (
										<span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[8px] md:text-[9px] font-bold px-1 md:px-1.5 rounded-full min-w-[14px] md:min-w-[16px] h-[14px] md:h-[16px] flex items-center justify-center border-2 border-[#141414]">
											{allParticipants.length}
										</span>
									)}
								</button>
							</div>
						)}

						{/* PiP */}
						<div className="hidden md:flex flex-col items-center justify-center group">
							<button
								onClick={() => togglePiP()}
								className={`h-9 w-9 md:h-11 md:w-11 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-sky-500/20 transition-all ${isPiPActive ? 'bg-sky-500/20 text-sky-400' : 'text-white/80 hover:text-sky-400'}`}
								title="Picture in Picture"
							>
								<PictureInPicture2 className="h-4 w-4 md:h-5 md:w-5" />
							</button>
						</div>

						
						<div className="hidden md:flex relative flex-col items-center justify-center group">
							<button
								onClick={async () => {
										try {
											await navigator.clipboard.writeText(window.location.origin + '/studyroom/' + _sessionData?.slug)
											showSuccess("URL Copied to Clipboard")
										} catch (err) {
											console.error('Failed to copy:', err)
										}
									}}
									className="h-9 w-9 md:h-11 md:w-11 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-sky-500/20 active:scale-95 transition-all relative text-white/80 hover:text-sky-400"
									title="Share"
								>
								<Share2 className="h-4 w-4 md:h-5 md:w-5" />
							</button>
						</div>

						{/* Extend Session - Only show if timer is enabled AND user is host */}
						{timerEnabled && isHost && (
							<div className="hidden md:flex relative flex-col items-center justify-center group">
								<button
									onClick={(e) => {
										e.stopPropagation();
										if (!isHost) {
											setShowTimerPanel(!showTimerPanel);
											if (!showTimerPanel) {
												setShowChat(false);
												setShowParticipants(false);
											}
										} else {
											setShowExtendMenu(!showExtendMenu);
										}
									}}
									className={`h-9 w-9 md:h-11 md:w-11 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-sky-500/20 active:scale-95 transition-all ${showTimerPanel || showExtendMenu ? 'bg-sky-500/20 text-sky-400' : 'text-white/80 hover:text-sky-400'}`}
									title={isHost ? "Timer & Extension" : "Session Timer"}
								>
									<Timer className="h-4 w-4 md:h-5 md:w-5" />
								</button>

								{showExtendMenu && (
									<div
										className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 py-1 min-w-[140px] z-50 overflow-hidden"
										onClick={(e) => e.stopPropagation()}
									>
										{[5, 10, 30].map((mins) => (
											<button
												key={mins}
												onClick={() => {
													if (hasExtended) {
														showError('Already Extended', 'Session can only be extended once');
														setShowExtendMenu(false);
														return;
													}
													// Host directly extends the session
													onExtendSession(mins);
													showSuccess('⏱️ Session Extended!', `Session extended by ${mins} minutes`);
													setShowExtendMenu(false);
												}}
												disabled={hasExtended}
												className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${hasExtended
													? 'text-white/30 cursor-not-allowed'
													: 'text-white hover:bg-white/10'
													}`}
											>
												<Clock className={`w-4 h-4 ${hasExtended ? 'text-white/20' : 'text-white/50'}`} />
												<span>{mins} minutes</span>
											</button>
										))}
									</div>
								)}
							</div>
						)}
					</div>
						


					{/* RIGHT: End call */}
					<div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
						<div className="relative shrink-0">
							<Button
								onClick={isHost ? () => setShowEndMenu(!showEndMenu) : onLeave}
								title={isHost ? "End meeting for everyone" : "Leave the meeting"}
								className={`
							h-11 md:h-11 px-4 md:px-6 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm transition-all duration-200
							flex items-center gap-1.5 md:gap-2 shadow-lg active:scale-95
							${showEndMenu
										? 'bg-red-600 text-white shadow-red-600/20 scale-105'
										: 'bg-[#252525] text-red-500 hover:bg-red-600 hover:text-white hover:shadow-red-600/20 hover:scale-105 border border-white/5 hover:border-transparent'
									}
						`}
							>
								<PhoneOff className="h-4 w-4 md:h-4 md:w-4" />
								<span className="hidden sm:inline">{isHost ? 'End' : 'Leave'}</span>
							</Button>

							{showEndMenu && (
								<>
									<div className="fixed inset-0 z-[100]" onClick={() => setShowEndMenu(false)} />
									<div className="absolute right-0 bottom-full mb-3 w-[240px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[101] p-1.5 animate-in fade-in zoom-in-95 duration-200 slide-in-from-bottom-2">
										{isHost && (
											<button
												onClick={() => {
													onEndMeeting?.()
													setShowEndMenu(false)
												}}
												className="w-full px-3 py-3 text-left text-sm rounded-xl flex items-center gap-3 transition-colors text-red-400 hover:bg-red-500/10 hover:text-red-300 group"
											>
												<div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
													<Power className="h-4 w-4" />
												</div>
												<div className="flex flex-col">
													<span className="font-semibold">End for Everyone</span>
												</div>
											</button>
										)}

										{isHost && <div className="h-px bg-white/5 mx-2 my-1" />}

										<button
											onClick={() => {
												onLeave()
												setShowEndMenu(false)
											}}
											className="w-full px-3 py-3 text-left text-sm rounded-xl flex items-center gap-3 transition-colors text-white/70 hover:bg-white/10 hover:text-white group"
										>
											<div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
												<LogOut className="h-4 w-4" />
											</div>
											<div className="flex flex-col">
												<span className="font-semibold">Leave Room</span>
											</div>
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Unified Sidebar - Tabbed Interface */}
				<>
					{/* Mobile Overlay Backdrop */}
					{(showChat || showParticipants || showScratchPad || showTimerPanel) && (
						<div
							className="fixed inset-0 bg-black/60 z-40 md:hidden"
							onClick={() => {
								setShowChat(false)
								setShowParticipants(false)
								setShowScratchPad(false)
								setShowTimerPanel(false)
							}}
						/>
					)}

					{/* Sidebar Container */}
					<div className={`fixed md:absolute right-0 top-0 bottom-0 w-full sm:w-[85%] md:w-96 bg-[#1a1a1a]/95 md:bg-[#1a1a1a]/95 backdrop-blur-md border-l border-white/10 z-[60] shadow-2xl flex flex-col transition-all duration-300 ${(showChat || showParticipants || showScratchPad || showTimerPanel)
						? 'translate-x-0 opacity-100 pointer-events-auto'
						: 'translate-x-full opacity-0 pointer-events-none'
						}`}>
						{/* Drag handle for mobile */}
						<div className="md:hidden flex justify-center py-2 relative z-10">
							<div className="w-10 h-1 bg-white/30 rounded-full" />
						</div>

						{/* Sidebar Header */}
						<div className="h-14 md:h-16 bg-gradient-to-b from-[#1a1a1a] to-[#1a1a1a]/95 border-b border-white/10 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
							<div className="flex items-center gap-2 md:gap-3">
								{showChat && (
									<>
										<MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-sky-400" />
										<span className="text-white font-semibold text-base md:text-lg">Chat</span>
									</>
								)}
								{showParticipants && (
									<>
										<Users className="h-4 w-4 md:h-5 md:w-5 text-sky-400" />
										<span className="text-white font-semibold text-base md:text-lg">Participants</span>
										{allParticipants && allParticipants.length > 0 && (
											<span className="bg-white/10 text-white text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded-full">
												{allParticipants.length}
											</span>
										)}
									</>
								)}
								{showTimerPanel && (
									<>
										<Timer className="h-4 w-4 md:h-5 md:w-5 text-sky-400" />
										<span className="text-white font-semibold text-base md:text-lg">Session Timer</span>
									</>
								)}
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setShowChat(false)
									setShowParticipants(false)
									setShowScratchPad(false)
									setShowTimerPanel(false)
								}}
								className="h-7 w-7 md:h-8 md:w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
							>
								<X className="h-3.5 w-3.5 md:h-4 md:w-4" />
							</Button>
						</div>

						{/* Content Area */}
						<div className="flex-1 flex flex-col overflow-hidden relative">
							{/* Timer View */}
							<div className={`absolute inset-0 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] ${showTimerPanel ? '' : 'hidden'}`}>
								<div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
									<div className="relative">
										<div className="h-32 w-32 rounded-full border-4 border-white/5 flex items-center justify-center">
											<div className="h-28 w-28 rounded-full border-2 border-sky-500/20 flex items-center justify-center bg-sky-500/5">
												<span className="text-3xl font-mono font-bold text-white tracking-tighter">
													{formattedTime}
												</span>
											</div>
										</div>
										<Timer className="absolute -top-1 -right-1 h-8 w-8 text-sky-400 bg-[#1a1a1a] rounded-full p-1.5 border border-white/10 shadow-lg" />
									</div>

									<div className="space-y-2">
										<h3 className="text-white font-semibold text-lg">Session Clock</h3>
										<p className="text-white/50 text-sm max-w-[200px]">
											Tracking your progress in <span className="text-sky-400">{sessionTitle || 'this session'}</span>
										</p>
									</div>

									{isHost && (
										<div className="w-full pt-4 space-y-3">
											<p className="text-xs font-bold text-white/40 uppercase tracking-widest text-left px-2">Quick Extensions</p>
											<div className="grid grid-cols-3 gap-2">
												{[5, 10, 30].map(mins => (
													<Button
														key={mins}
														variant="outline"
														size="sm"
														className="bg-white/5 border-white/10 hover:bg-sky-500/20 hover:border-sky-500/30 text-white transition-all h-10"
														onClick={() => onExtendSession?.(mins)}
													>
														+{mins}m
													</Button>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
							{/* Chat View */}
							<div className={`absolute inset-0 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] ${showChat ? '' : 'hidden'}`}>
								{channelId ? (
									<ChatWidget
										channelId={channelId}
										chatPanelActive={showChat}
										viewerSessionRole={
											isGuest ? 'guest' : isHost ? 'host' : 'joinee'
										}
										chatDisabled={chatDisabled}
										recipients={chatRecipients}
										hostUserId={hostUser?.id}
										currentUserDbId={currentUserDbId}
										allowedAudiences={
											restrictGuestChatAudiences
												? { HOST: true, EVERYONE: false, USER: false }
												: {
														EVERYONE: permissions?.allowChatEveryone ?? true,
														HOST: permissions?.allowChatHost ?? true,
														USER: permissions?.allowChatUser ?? true,
													}
										}
										guestToken={guestToken}
										guestEmail={isGuest ? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('guestEmail') : null) : null}
										className="flex-1 min-h-0 overflow-hidden"
									/>
								) : (
									<div className="flex-1 flex items-center justify-center p-6">
										<div className="text-center space-y-3">
											<div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
												<MessageSquare className="h-6 w-6 text-white/30" />
											</div>
											<p className="text-white/50 text-sm font-medium">
												Chat is not available for this session
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Participants View */}
							<div className={`absolute inset-0 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] ${showChat ? 'hidden' : ''}`}>
								{/* Host Controls Section - Only visible to hosts */}
								{isHost && (
									<div className="px-4 py-3 border-b border-white/10 bg-gradient-to-br from-[#1f1f1f] to-[#1a1a1a] flex-shrink-0">
										<div className="flex items-center gap-2 mb-3">
											<div className="h-5 w-5 rounded bg-white/10 flex items-center justify-center">
												<Settings2 className="h-3 w-3 text-white/70" />
											</div>
											<h3 className="text-xs font-bold text-white/90 uppercase tracking-wider">Restrict Participants</h3>
										</div>

										<div className="grid grid-cols-4 gap-2">
											{/* Mute All / Unmute All Toggle */}
											<Button
												onClick={() => {
													const isCurrentlyLocked = permissions?.allowAudio === false
													if (isCurrentlyLocked) {
														onUnmuteAll?.()
														onLockAudio?.(false)
														showSuccess('Audio Unlocked', 'Participants can now unmute their microphones')
													} else {
														onMuteAll?.()
														onLockAudio?.(true)
														showSuccess('Audio Locked', 'All participants have been muted')
													}
												}}
												variant="ghost"
												className={`flex flex-col items-center justify-center h-auto py-2 gap-1 rounded-lg border transition-all ${permissions?.allowAudio === false
													? 'bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20'
													: 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
													}`}
												title={permissions?.allowAudio === false ? 'Unlock audio for all participants' : 'Mute all and lock audio'}
											>
												{permissions?.allowAudio === false ? <Lock className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
												<span className="text-[10px] font-medium">{permissions?.allowAudio === false ? 'Unlock Audio' : 'Mute All'}</span>
											</Button>

											{/* Stop Video / Enable Video Toggle */}
											<Button
												onClick={() => {
													const isCurrentlyLocked = permissions?.allowVideo === false
													if (isCurrentlyLocked) {
														onEnableVideoAll?.()
														onLockVideo?.(false)
														showSuccess('Video Unlocked', 'Participants can now enable their cameras')
													} else {
														onDisableVideoAll?.()
														onLockVideo?.(true)
														showSuccess('Video Locked', 'All participant cameras have been disabled')
													}
												}}
												variant="ghost"
												className={`flex flex-col items-center justify-center h-auto py-2 gap-1 rounded-lg border transition-all ${permissions?.allowVideo === false
													? 'bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20'
													: 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
													}`}
												title={permissions?.allowVideo === false ? 'Unlock video for all participants' : 'Disable all video and lock'}
											>
												{permissions?.allowVideo === false ? <Lock className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
												<span className="text-[10px] font-medium">{permissions?.allowVideo === false ? 'Unlock Video' : 'Stop Video'}</span>
											</Button>

											{/* Lock Chat */}
											<Button
												onClick={() => {
													const isCurrentlyDisabled = chatDisabled || permissions?.allowChat === false
													if (isCurrentlyDisabled) {
														onToggleChat?.(false)
														onLockChat?.(false)
														showSuccess('Chat Unlocked', 'Participants can now send messages')
													} else {
														onToggleChat?.(true)
														onLockChat?.(true)
														showSuccess('Chat Locked', 'Participants can no longer send messages')
													}
												}}
												variant="ghost"
												className={`flex flex-col items-center justify-center h-auto py-2 gap-1 rounded-lg border transition-all ${(chatDisabled || permissions?.allowChat === false)
													? 'bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20'
													: 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
													}`}
												title={chatDisabled ? 'Enable chat' : 'Disable chat'}
											>
												{(chatDisabled || permissions?.allowChat === false) ? (
													<Lock className="h-4 w-4" />
												) : (
													<MessageSquare className="h-4 w-4" />
												)}
												<span className="text-[10px] font-medium">
													{(chatDisabled || permissions?.allowChat === false) ? 'Unlock Chat' : 'Lock Chat'}
												</span>
											</Button>

											{/* Restrict Chat to Host Only */}
											<Button
												onClick={() => {
													const isCurrentlyRestricted = roomSettings?.chatRestrictToHostOnly === true
													onRestrictChatToHostOnly?.(!isCurrentlyRestricted)
													showSuccess(
														isCurrentlyRestricted ? 'Chat Unrestricted' : 'Chat Restricted to Host Only',
														isCurrentlyRestricted
															? 'Participants can now send messages to everyone'
															: 'Participants can only send messages to the host',
													)
												}}
												variant="ghost"
												className={`flex flex-col items-center justify-center h-auto py-2 gap-1 rounded-lg border transition-all ${roomSettings?.chatRestrictToHostOnly
													? 'bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20'
													: 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
													}`}
												title={roomSettings?.chatRestrictToHostOnly ? 'Allow participants to send to everyone' : 'Restrict participants to send to host only'}
											>
												{roomSettings?.chatRestrictToHostOnly ? (
													<Lock className="h-4 w-4" />
												) : (
													<MessageSquare className="h-4 w-4" />
												)}
												<span className="text-[10px] font-medium">
													{roomSettings?.chatRestrictToHostOnly ? 'Unrestrict Chat' : 'Host Only'}
												</span>
											</Button>

											<Button
												onClick={() => {
													const isCurrentlyHidden = roomSettings?.hideParticipantList === true
													onHideParticipantList?.(!isCurrentlyHidden)
													showSuccess(
														isCurrentlyHidden ? 'Participant List Visible' : 'Participant List Hidden',
														isCurrentlyHidden
															? 'Participants can now open the participant list'
															: 'Participants can no longer open the participant list',
													)
												}}
												variant="ghost"
												className={`flex flex-col items-center justify-center h-auto py-2 gap-1 rounded-lg border transition-all ${roomSettings?.hideParticipantList
													? 'bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20'
													: 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
													}`}
												title={
													roomSettings?.hideParticipantList
														? 'Show participant list to participants'
														: 'Hide participant list from participants'
												}
											>
												{roomSettings?.hideParticipantList ? <Lock className="h-4 w-4" /> : <Users className="h-4 w-4" />}
												<span className="text-[10px] font-medium">
													{roomSettings?.hideParticipantList ? 'Show List' : 'Hide List'}
												</span>
											</Button>
										</div>
									</div>
								)}

								<div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
									<ParticipantList
										isHost={isHost}
										onMuteParticipant={onMuteParticipant}
										onUnmuteParticipant={onUnmuteParticipant}
										onDisableVideoParticipant={onDisableVideoParticipant}
										onEnableVideoParticipant={onEnableVideoParticipant}
										onLockUserAudio={onLockUserAudio}
										onLockUserVideo={onLockUserVideo}
										onLockUserChatAudience={onLockUserChatAudience}
										onRequestAudioOn={onRequestAudioOn}
										onRequestVideoOn={onRequestVideoOn}
										participantChatLocks={participantChatLocks}
										pendingParticipantRequests={pendingParticipantRequests}
										onApproveAudioRequest={hostRespondParticipantAudio}
										onApproveVideoRequest={hostRespondParticipantVideo}
										onPromoteToCohost={onPromoteToCohost}
									/>
								</div>
							</div>
						</div>
					</div>
				</>
			</div>

			{/* Background Effects Popup - Floating Panel */}
			{showBackgroundMenu && !isMobileViewport && (
				<div className="fixed bottom-20 left-1/2 -translate-x-1/2 md:left-[140px] md:translate-x-0 z-[50] animate-in slide-in-from-bottom-5 zoom-in-95 fade-in duration-200">
					{/* Popup card */}
					<div className="bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-xl md:rounded-2xl shadow-2xl border border-white/10 w-[280px] md:w-[300px] overflow-hidden">
						{/* Header */}
						<div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
							<div className="flex items-center gap-2">
								<Sparkles className="w-4 h-4 text-[#00DC6E]" />
								<span className="text-sm font-semibold text-white">Background Effects</span>
							</div>
							<button
								onClick={() => setShowBackgroundMenu(false)}
								className="h-6 w-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						</div>

						<div className="p-4 space-y-4">
							{/* Type Selector (Segmented Control) */}
							<div className="flex p-1 bg-black/40 rounded-lg">
								<button
									onClick={() => applyBackgroundEffect('none')}
									className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${backgroundMode === 'none'
										? 'bg-[#3d3d3d] text-white shadow-sm ring-1 ring-white/10'
										: 'text-white/60 hover:text-white hover:bg-white/5'
										}`}
								>
									<Ban className="w-3 h-3" />
									None
								</button>
								<button
									onClick={() => applyBackgroundEffect('blur')}
									className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${backgroundMode === 'blur'
										? 'bg-[#3d3d3d] text-white shadow-sm ring-1 ring-white/10'
										: 'text-white/60 hover:text-white hover:bg-white/5'
										}`}
								>
									<Aperture className="w-3 h-3" />
									Blur
								</button>
								<button
									onClick={() => applyBackgroundEffect('virtual')}
									className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${backgroundMode === 'virtual'
										? 'bg-[#3d3d3d] text-white shadow-sm ring-1 ring-white/10'
										: 'text-white/60 hover:text-white hover:bg-white/5'
										}`}
								>
									<ImageIcon className="w-3 h-3" />
									Image
								</button>
							</div>

							{/* Dynamic Controls */}
							<div className="min-h-[100px]">
								{backgroundMode === 'none' && (
									<div className="h-[100px] flex flex-col items-center justify-center text-center text-white/40 border-2 border-dashed border-white/5 rounded-xl">
										<p className="text-xs">No effect applied</p>
									</div>
								)}

								{backgroundMode === 'blur' && (
									<div className="space-y-3 animate-in fade-in duration-200">
										<div className="flex items-center justify-between">
											<label className="text-xs font-medium text-white/80">Blur Intensity</label>
											<span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-[#00DC6E]">{blurAmount}</span>
										</div>
										<input
											type="range"
											min="1"
											max="20"
											step="1"
											value={blurAmount}
											onChange={(e) => handleBlurSliderChange(parseInt(e.target.value))}
											className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer slider-green blur-slider"
										/>
										<div className="flex justify-between text-[10px] text-white/40">
											<span>Soft</span>
											<span>Strong</span>
										</div>
									</div>
								)}

								{backgroundMode === 'virtual' && (
									<div className="animate-in fade-in duration-200">
										<p className="text-xs font-medium text-white/50 mb-2">Select Image</p>
										<div className="grid grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
											{VIRTUAL_BACKGROUNDS.map((bg) => (
												<button
													key={bg.id}
													onClick={() => {
														setSelectedVirtualBg(bg.id)
														applyBackgroundEffect('virtual')
													}}
													className={`relative aspect-video rounded-lg overflow-hidden transition-all group ${selectedVirtualBg === bg.id
														? 'ring-2 ring-[#00DC6E] ring-offset-1 ring-offset-[#2d2d2d]'
														: 'opacity-70 hover:opacity-100 hover:ring-1 hover:ring-white/20'
														}`}
												>
													<img
														src={bg.thumbnail}
														alt={bg.name}
														className="w-full h-full object-cover"
													/>
													{selectedVirtualBg === bg.id && (
														<div className="absolute inset-0 bg-[#00DC6E]/20 flex items-center justify-center">
															<div className="bg-[#00DC6E] rounded-full p-0.5">
																<ShieldCheck className="w-2.5 h-2.5 text-white" />
															</div>
														</div>
													)}
												</button>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Permission Request Modal - Shows when host asks participant to enable audio/video */}
			{!isHost && pendingPermissionRequest && (
				<PermissionRequestModal
					type={pendingPermissionRequest.type}
					onAccept={() => {
						if (pendingPermissionRequest.type === 'audio') {
							respondToAudioRequest?.(true)
						} else {
							respondToVideoRequest?.(true)
						}
					}}
					onDeny={() => {
						if (pendingPermissionRequest.type === 'audio') {
							respondToAudioRequest?.(false)
						} else {
							respondToVideoRequest?.(false)
						}
					}}
					onDismiss={dismissPermissionRequest}
				/>
			)}

			{/* Remote Control Consent UI (Screen Sharer Side) */}
			{pendingRequestFrom && (
				<div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
					<div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-sky-500/30 shadow-2xl rounded-2xl p-5 w-80 max-w-[calc(100vw-32px)] text-center relative overflow-hidden">
						<div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none" />

						<div className="h-12 w-12 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-3">
							<MousePointer2 className="h-6 w-6 text-sky-400" />
						</div>

						<h3 className="text-white font-bold text-lg">Remote Control Request</h3>
						<p className="text-white/70 text-sm mt-1 mb-4 leading-relaxed">
							<span className="text-white font-semibold">{pendingRequestFrom.name}</span> would like to control your shared screen.
						</p>

						<div className="flex gap-2 w-full">
							<Button
								variant="outline"
								className="flex-1 bg-white/5 border-white/10 text-white/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
								onClick={denyControl}
							>
								Deny
							</Button>
							<Button
								className="flex-1 bg-sky-500 text-white hover:bg-sky-400"
								onClick={grantControl}
							>
								Grant Control
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Scratch Pad Modal Overlay - Matches provided design */}
			{showScratchPad && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
					{/* Backdrop */}
					<div
						className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
						onClick={() => setShowScratchPad(false)}
					/>

					{/* Modal Container */}
					<div className="relative w-full h-full max-w-7xl max-h-[90vh] bg-[#141414] rounded-[32px] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
						{/* Modal Header (Darker Top bar from screenshot) */}
						<div className="h-14 md:h-16 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
									<Pencil className="h-5 w-5 text-purple-400" />
								</div>
								<div>
									<h2 className="text-white font-bold text-base md:text-lg tracking-tight">Open Whiteboard</h2>
									<div className="flex items-center gap-1.5">
										<div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
										<span className="text-[10px] text-white/40 uppercase font-bold tracking-widest leading-none">Live Session</span>
									</div>
								</div>
							</div>

							<Button
								variant="ghost"
								size="icon"
								onClick={() => setShowScratchPad(false)}
								className="h-10 w-10 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all border border-transparent hover:border-white/10"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						{/* ScratchPad Component handles its own internal toolbar/save logic */}
						<div className="flex-1 bg-[#0f0f0f] relative overflow-hidden">
							<ScratchPad
								roomId={channelId || 'temp-room'}
								room={room}
								isHost={isHost}
								canEdit={permissions?.allowScratchPad !== false}
								roomTitle={sessionTitle}
								enabled={showScratchPad}
								isGuest={isGuest}
							/>
						</div>
					</div>
				</div>
			)}

			{/* Hidden Video for Persistent PiP activation - MUST be somewhat visible for browsers to allow Auto-PiP */}
			<video
				ref={persistentPipVideoRef}
				autoPlay
				muted
				playsInline
				// @ts-ignore
				autopictureinpicture="true"
				disablePictureInPicture={false}
				style={{
					position: 'fixed',
					width: '200px',
					height: '200px',
					opacity: 1,
					bottom: 0,
					right: 0,
					pointerEvents: 'none',
					zIndex: -99
				}}
			/>
		</>
	)
})

function ParticipantList({
	isHost,
	onMuteParticipant,
	onUnmuteParticipant: _onUnmuteParticipant, // Unused
	onDisableVideoParticipant,
	onEnableVideoParticipant: _onEnableVideoParticipant, // Unused
	onLockUserAudio: _onLockUserAudio, // Unused
	onLockUserVideo: _onLockUserVideo, // Unused
	onLockUserChatAudience: _onLockUserChatAudience, // Unused
	onRequestAudioOn,
	onRequestVideoOn,
	participantChatLocks: _participantChatLocks, // Unused
	pendingParticipantRequests,
	onApproveAudioRequest,
	onApproveVideoRequest,
	onPromoteToCohost: _onPromoteToCohost, // Unused
}: {
	isHost: boolean
	onMuteParticipant?: (targetUserId: string) => void
	onUnmuteParticipant?: (targetUserId: string) => void
	onDisableVideoParticipant?: (targetUserId: string) => void
	onEnableVideoParticipant?: (targetUserId: string) => void
	onLockUserAudio?: (targetUserId: string, locked: boolean) => void
	onLockUserVideo?: (targetUserId: string, locked: boolean) => void
	onLockUserChatAudience?: (
		targetUserId: string,
		audience: 'everyone' | 'host' | 'user',
		locked: boolean,
	) => void
	onRequestAudioOn?: (targetUserId: string) => void
	onRequestVideoOn?: (targetUserId: string) => void
	participantChatLocks?: Record<string, ParticipantChatLocks>
	pendingParticipantRequests?: ParticipantPermissionRequest[]
	onApproveAudioRequest?: (userId: string, accepted: boolean) => void
	onApproveVideoRequest?: (userId: string, accepted: boolean) => void
	onPromoteToCohost?: (
		participantIdentity: string,
		role: 'PARTICIPANT' | 'COHOST',
	) => void
}) {
	const participants = useParticipants()
	const { localParticipant } = useLocalParticipant()

	// Check if a participant has a pending audio request
	const hasAudioRequest = (identity: string) =>
		pendingParticipantRequests?.some(r => r.userId === identity && r.type === 'audio')

	// Check if a participant has a pending video request
	const hasVideoRequest = (identity: string) =>
		pendingParticipantRequests?.some(r => r.userId === identity && r.type === 'video')

	// Deterministic gradient color for avatars
	const getAvatarColor = (id: string) => {
		const colors = [
			'from-blue-500 to-cyan-500',
			'from-purple-500 to-pink-500',
			'from-emerald-500 to-teal-500',
			'from-orange-500 to-amber-500',
			'from-indigo-500 to-violet-500',
			'from-rose-500 to-red-500'
		];
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}
		return colors[Math.abs(hash) % colors.length];
	};

	// Sort participants: Local first, then alphabetical
	const sortedParticipants = useMemo(() => {
		return [...participants].sort((a, b) => {
			if (a.identity === localParticipant?.identity) return -1;
			if (b.identity === localParticipant?.identity) return 1;
			return (a.name || a.identity).localeCompare(b.name || b.identity);
		});
	}, [participants, localParticipant]);

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between px-3 py-3">
				<span className="text-xs font-bold text-white/60 uppercase tracking-wider">
					In Meeting
				</span>
				<span className="text-xs font-bold text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
					{participants.length}
				</span>
			</div>

			{sortedParticipants.map((participant) => {
				const isLocal = participant.identity === localParticipant?.identity
				const micPublication = Array.from(
					participant.audioTrackPublications.values(),
				).find((pub) => pub.source === Track.Source.Microphone)
				const camPublication = Array.from(
					participant.videoTrackPublications.values(),
				).find((pub) => pub.source === Track.Source.Camera)
				// Prefer live publication state for snappier icon updates after host/joinee actions.
				const isMicOn =
					participant.isMicrophoneEnabled ||
					Boolean(
						micPublication?.track &&
							!(
								(
									micPublication as unknown as {
										isMuted?: boolean
									}
								).isMuted ?? false
							),
					)
				const isCamOn =
					participant.isCameraEnabled ||
					Boolean(
						camPublication?.track &&
							!(
								(
									camPublication as unknown as {
										isMuted?: boolean
									}
								).isMuted ?? false
							),
					)
				const hasAReq = hasAudioRequest(participant.identity)
				const hasVReq = hasVideoRequest(participant.identity)
				const canControl = isHost && !isLocal
				const gradient = getAvatarColor(participant.identity)

				// Helper to get avatar
				const getAvatar = () => {
					if (!participant.metadata) return null
					try {
						return JSON.parse(participant.metadata).avatar
					} catch { return null }
				}
				const avatarUrl = getAvatar()

				return (
					<div
						key={participant.identity}
						className="group flex items-center justify-between py-3 px-4 rounded-lg hover:bg-white/8 transition-all duration-200 border border-transparent hover:border-white/5"
					>
						{/* Left: Avatar & Name */}
						<div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
							<div className={`relative h-10 w-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-semibold text-white shadow-lg flex-shrink-0 ring-2 ring-white/10 overflow-hidden`}>
								{avatarUrl ? (
									<Image
										src={avatarUrl}
										alt={participant.name || 'User'}
										width={40}
										height={40}
										className="w-full h-full object-cover"
									/>
								) : (
									participant.name?.charAt(0).toUpperCase() || participant.identity.charAt(0).toUpperCase()
								)}

								{/* Speaking ring */}
								{participant.isSpeaking && (
									<div className="absolute -inset-1 rounded-full border-2 border-[#00DC6E] opacity-100 animate-pulse" />
								)}

								{/* Minimized status indicators on avatar */}
								{!isMicOn && (
									<div className="absolute -bottom-1 -right-1 bg-[#1a1a1a] rounded-full p-0.5 border border-[#1a1a1a]">
										<div className="bg-sky-500/90 rounded-full p-0.5">
											<MicOff className="h-2 w-2 text-white" />
										</div>
									</div>
								)}
							</div>

							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<span className={`text-sm font-medium truncate ${isLocal ? 'text-white' : 'text-white/90'}`}>
										{participant.name || participant.identity}
									</span>
									{isLocal && (
										<span className="text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full font-medium">You</span>
									)}
								</div>

								{/* Status Text Line */}
								<div className="flex items-center gap-2 mt-0.5 min-h-[16px]">
									{participant.isSpeaking ? (
										<span className="text-[10px] text-[#00DC6E] flex items-center gap-1">
											<span className="w-1 h-1 bg-[#00DC6E] rounded-full animate-bounce" />
											Speaking
										</span>
									) : (hasAReq || hasVReq) ? (
										<div className="flex gap-1">
											{hasAReq && <span className="text-[10px] text-amber-500 font-medium">Req Mic</span>}
											{hasAReq && hasVReq && <span className="text-[10px] text-white/20">•</span>}
											{hasVReq && <span className="text-[10px] text-amber-500 font-medium">Req Cam</span>}
										</div>
									) : (
										<span className="text-[10px] text-white/30 truncate">
											{isMicOn ? 'Listening' : 'Muted'}
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Right: Controls */}
						<div className="flex items-center gap-1 flex-shrink-0">
							{/* Host Approve Buttons */}
							{canControl && (hasAReq || hasVReq) ? (
								<div className="flex gap-2 mr-1 animate-in slide-in-from-right-4 duration-200">
									{hasAReq && (
										<button
											onClick={() => onApproveAudioRequest?.(participant.identity, true)}
											className="h-7 px-2 flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors border border-green-500/20"
											title="Approve Mic"
										>
											<Check className="h-3.5 w-3.5" />
											<span className="text-[10px] font-bold">MIC</span>
										</button>
									)}
									{hasVReq && (
										<button
											onClick={() => onApproveVideoRequest?.(participant.identity, true)}
											className="h-7 px-2 flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors border border-green-500/20"
											title="Approve Camera"
										>
											<Check className="h-3.5 w-3.5" />
											<span className="text-[10px] font-bold">CAM</span>
										</button>
									)}
								</div>
							) : (
								/* Standard Controls (Always visible) */
								<div className="flex items-center gap-1 opacity-100">
									{/* Video Indicator/Toggle */}
									<button
										onClick={() => {
											if (!canControl) return
											if (isCamOn) {
												onDisableVideoParticipant?.(participant.identity)
											} else {
												onRequestVideoOn?.(participant.identity)
											}
										}}
										disabled={!canControl}
										className={`p-2 rounded-lg transition-all ${isCamOn
											? 'text-white/60 hover:text-white hover:bg-white/10'
											: 'text-sky-500/70 hover:text-sky-500 hover:bg-sky-500/10'
											} ${!canControl && 'cursor-default'}`}
										title={canControl ? (isCamOn ? 'Disable Video' : 'Request Video') : (isCamOn ? 'Camera On' : 'Camera Off')}
									>
										{isCamOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
									</button>

									{/* Mic Indicator/Toggle */}
									<button
										onClick={() => {
											if (!canControl) return
											if (isMicOn) {
												onMuteParticipant?.(participant.identity)
											} else {
												onRequestAudioOn?.(participant.identity)
											}
										}}
										disabled={!canControl}
										className={`p-2 rounded-lg transition-all ${isMicOn
											? 'text-white/60 hover:text-white hover:bg-white/10'
											: 'text-sky-500/70 hover:text-sky-500 hover:bg-sky-500/10'
											} ${!canControl && 'cursor-default'}`}
										title={canControl ? (isMicOn ? 'Mute' : 'Request to Unmute') : (isMicOn ? 'Mic On' : 'Mic Off')}
									>
										{isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
									</button>
								</div>
							)}
						</div>
					</div>
				)
			})}
		</div>
	)
}

// Permission Request Modal - Shows when host asks participant to enable audio/video
function PermissionRequestModal({
	type,
	onAccept,
	onDeny,
	onDismiss,
}: {
	type: 'audio' | 'video'
	onAccept: () => void
	onDeny: () => void
	onDismiss?: () => void
}) {
	const { localParticipant } = useLocalParticipant()

	const handleAccept = async () => {
		// First acknowledge host request so backend unlocks permission.
		// Do not convert accept -> deny on transient device errors.
		onAccept()
		try {
			// Small delay allows permissions update to propagate before publishing media.
			await new Promise((r) => setTimeout(r, 180))
			if (type === 'audio') {
				await localParticipant?.setMicrophoneEnabled(true)
			} else {
				await localParticipant?.setCameraEnabled(true)
			}
		} catch {
			// Keep accepted state. User can manually toggle once device/browser allows.
		}
	}

	return (
		<div className="fixed inset-0 flex items-center justify-center p-4 z-[9999999]">
			{/* Dark backdrop overlay */}
			<div
				className="absolute inset-0 bg-black/70 backdrop-blur-sm"
				onClick={onDismiss}
			/>

			{/* Modal card */}
			<div className="relative bg-[#2d2d2d] rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm animate-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
					<div className="flex items-center gap-3">
						<div className={`h-10 w-10 rounded-xl flex items-center justify-center ${type === 'audio' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
							{type === 'audio' ? <Mic className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
						</div>
						<h3 className="text-lg font-semibold text-white">
							{type === 'audio' ? 'Unmute Request' : 'Video Request'}
						</h3>
					</div>
					<button
						onClick={onDismiss}
						className="h-8 w-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-white/60 hover:text-white"
						title="Close"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					<p className="text-white/80 text-sm mb-6">
						{type === 'audio'
							? 'The host has asked you to unmute your microphone. Would you like to turn it on?'
							: 'The host has asked you to turn on your camera. Would you like to enable it?'
						}
					</p>

					<div className="flex gap-3">
						<Button
							onClick={onDeny}
							variant="ghost"
							className="flex-1 h-10 bg-white/5 hover:bg-white/10 text-white/80"
						>
							Deny
						</Button>
						<Button
							onClick={handleAccept}
							className={`flex-1 h-10 text-white ${type === 'audio' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
						>
							{type === 'audio' ? 'Turn On Mic' : 'Turn On Camera'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
