'use client'
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { LiveKitRoom, useParticipants, useRoomContext, useTracks, RoomAudioRenderer, useSpeakingParticipants, VideoTrack, useLocalParticipant, isTrackReference } from '@livekit/components-react'
import { Track, RoomOptions, VideoPresets, LocalVideoTrack } from 'livekit-client'
import '@livekit/components-styles'
import { BackgroundProcessor, BackgroundBlur, VirtualBackground, BackgroundOptions } from '@livekit/track-processors'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Users, Maximize2, Minimize2, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Clock, MonitorUp, MonitorOff, Grid2X2, Presentation, Pin, PinOff, User, PictureInPicture2, Camera, CameraOff, Sparkles, TimerReset, Lock, Unlock, Settings2, PhoneOff } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSessionTimer } from '@/hooks/use-session-timer'
import { SessionEndWarningDialog } from '@/components/study-room/session-end-warning-dialog'
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
import { useSessionModeration, RoomPermissions, PermissionRequest, ParticipantPermissionRequest } from '@/hooks/use-session-moderation'

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
interface SessionData {
	id: string;
	date: string;
	duration: number;
	sessionType: 'studyRoom' | 'peerSession';
	[key: string]: unknown;
}

interface EnhancedVideoRoomProps {
	token: string
	serverUrl: string
	channelId?: string | null
	sessionData?: SessionData | null
	isHost?: boolean
}

export function EnhancedVideoRoom({ token, serverUrl, channelId, sessionData, isHost = false }: EnhancedVideoRoomProps) {
	const [showChat, setShowChat] = useState(false) // Start hidden on mobile
	const [showParticipants, setShowParticipants] = useState(false)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [showWarning, setShowWarning] = useState(false)
	const router = useRouter()
	const { showSuccess } = useToast()
	const { getToken } = useAuth()
	const { user } = useUser()
	const queryClient = useQueryClient()
	
	// Socket.io for transcripts
	const [transcriptSocket, setTranscriptSocket] = useState<Socket | null>(null)
	const socketConnectingRef = useRef(false)
	
	// Auth token for socket connection
	const [authToken, setAuthToken] = useState<string | null>(null)
	
	// Loading state when ending meeting
	const [endingMeeting, setEndingMeeting] = useState(false)
	
	// Confirmation dialog for ending meeting
	const [showEndConfirmation, setShowEndConfirmation] = useState(false)
	
	// Get auth token on mount
	useEffect(() => {
		async function fetchToken() {
			const token = await getToken()
			setAuthToken(token)
		}
		fetchToken()
	}, [getToken])

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
	
	// Debug logging for timer
	useEffect(() => {
		console.log('🕐 [EnhancedVideoRoom] Timer debug:', {
			sessionData: sessionData ? { id: sessionData.id, date: sessionData.date, duration: sessionData.duration, sessionType: sessionData.sessionType } : null,
			sessionStartTime: sessionStartTime?.toISOString(),
			sessionDuration,
			timerEnabled,
			showModeratorControls,
			isHost,
		})
	}, [sessionData, sessionStartTime, sessionDuration, timerEnabled, showModeratorControls, isHost])
	
	// Session extension hook
	const {
		hasExtended,
		extendedEndTime,
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
		endMeetingForAll,
		lockAudio,
		lockVideo,
		lockChat,
		lockUserAudio,
		lockUserVideo,
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
	} = useSessionModeration({
		sessionId: sessionData?.id || null,
		sessionType: sessionData?.sessionType || null,
		isHost,
		token: authToken,
		userId: user?.id,
		enabled: !!sessionData?.id,
	})

	// Redirect all clients when server signals meeting ended
	useEffect(() => {
		if (!meetingEnded) return
		const redirectUrl = `/session-feedback/${sessionData?.id}?type=${sessionData?.sessionType}&isHost=${isHost}`
		router.push(redirectUrl)
	}, [meetingEnded, sessionData?.id, sessionData?.sessionType, isHost, router])
	
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
					await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/study-rooms/${sessionData.id}/complete`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${authTokenValue}`,
						},
					})
				} else if (sessionData.sessionType === 'peerSession') {
					await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/peer-sessions/${sessionData.id}/complete`, {
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${authTokenValue}`,
						},
					})
				}
				
				// Invalidate queries
				await queryClient.invalidateQueries({ queryKey: streakKeys.current() })
				await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
				await queryClient.invalidateQueries({ queryKey: achievementKeys.all })
			} catch (error) {
				console.error('Error completing session:', error)
			}
		}
		
		// End meeting for all participants via socket
		endMeetingForAll()
		
		// Fallback: If socket event doesn't trigger redirect within 3 seconds, redirect manually (host only)
		setTimeout(() => {
			const redirectUrl = `/session-feedback/${sessionData?.id}?type=${sessionData?.sessionType}&isHost=${isHost}`
			console.log('🎯 Fallback redirect for host:', redirectUrl)
			router.push(redirectUrl)
		}, 3000)
	}, [sessionData?.id, sessionData?.sessionType, getToken, queryClient, endMeetingForAll, isHost, router])
	
	const handleTimeUp = useCallback(async () => {
		// Set loading state
		setEndingMeeting(true)
		
		// Timer expired - auto-complete the session (payment processed, redirect to review)
		if (sessionData?.id && sessionData?.sessionType && isHost) {
			try {
				const authToken = await getToken()
				
				if (sessionData.sessionType === 'studyRoom') {
					// For study rooms, mark as completed
					const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/study-rooms/${sessionData.id}/complete`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${authToken}`,
						},
					})
					
					if (!response.ok) {
						console.error('Failed to complete study room:', response.status, await response.text())
					} else {
						console.log('✅ Study room time expired - marked as COMPLETED')
					}
				} else if (sessionData.sessionType === 'peerSession') {
					// For peer sessions, mark as completed (payment processed)
					const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/peer-sessions/${sessionData.id}/complete`, {
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${authToken}`,
						},
					})
					
					if (!response.ok) {
						console.error('Failed to complete peer session:', response.status, await response.text())
					} else {
						console.log('✅ Peer session time expired - marked as COMPLETED')
					}
				}
				
				// Invalidate queries
				await queryClient.invalidateQueries({ queryKey: streakKeys.current() })
				await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
				await queryClient.invalidateQueries({ queryKey: achievementKeys.all })
			} catch (error) {
				console.error('Error completing session:', error)
			}
		}
		
		// Redirect to session feedback page for review
		const redirectUrl = `/session-feedback/${sessionData?.id}?type=${sessionData?.sessionType}&isHost=${isHost}`
		console.log('🎯 Session time up, redirecting to feedback:', redirectUrl)
		router.push(redirectUrl)
	}, [sessionData?.id, sessionData?.sessionType, isHost, getToken, queryClient, router])

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
	
	// Handle approving extension request from the dialog
	const handleApproveExtension = useCallback(() => {
		approveExtension(currentEndTime)
	}, [approveExtension, currentEndTime])
	
	// Show toast when session is extended
	useEffect(() => {
		if (hasExtended && extendedEndTime) {
			showSuccessRef.current('⏱️ Session Extended!', 'The session has been extended by 10 minutes.')
		}
	}, [hasExtended, extendedEndTime])

	// Auto-show chat on desktop, hide on mobile
	useEffect(() => {
		const checkScreenSize = () => {
			if (window.innerWidth >= 768) { // md breakpoint
				setShowChat(true)
			} else {
				setShowChat(false)
			}
		}
		checkScreenSize()
		window.addEventListener('resize', checkScreenSize)
		return () => window.removeEventListener('resize', checkScreenSize)
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
				
				const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'
				console.log('🔌 [Transcripts] Connecting to WebSocket endpoint:', url)
				console.log('🔌 [Transcripts] Session ID:', sessionData?.id)
				console.log('🔌 [Transcripts] User ID:', user?.id)
				
				socket = io(url, {
					transports: ['websocket'],
					auth: { token: authToken },
					reconnection: true,
					reconnectionAttempts: 5,
					reconnectionDelay: 1000,
				})
				
				socket.on('connect', () => {
					console.log('✅ [Transcripts] Socket connected successfully!')
					console.log('🎤 [Transcripts] Speech recognition will now start')
					setTranscriptSocket(socket) // Set socket only after successful connection
				})
				
				socket.on('connect_error', (err: Error) => {
					console.error('🚨 [Transcripts] Socket connection failed!')
					console.error('🚨 [Transcripts] Error details:', err.message)
					console.error('🚨 [Transcripts] Check if backend is running on:', url)
					setTranscriptSocket(null) // Clear socket on connection error
				})
				
				socket.on('disconnect', (reason) => {
					console.log('🔌 [Transcripts] Socket disconnected:', reason)
					console.log('⏸️  [Transcripts] Speech recognition paused')
					setTranscriptSocket(null) // Clear socket on disconnect
				})
				
				// Add transcript-specific event handlers
				socket.on('transcript-received', (data) => {
					console.log('📝 [Transcripts] Server acknowledged transcript:', data.text?.substring(0, 50))
				})
				
				socket.on('transcript-error', (error) => {
					console.error('❌ [Transcripts] Server error:', error)
				})
			} catch (err) {
				console.error('❌ [Transcripts] Failed to connect socket:', err)
			}
		}
		
		connectTranscriptSocket()
		
		return () => {
			socketConnectingRef.current = false
			if (socket) {
				socket.disconnect()
				console.log('🛑 [Transcripts] Socket disconnected')
			}
			setTranscriptSocket(null)
		}
	}, [sessionData?.id, user, getToken])
	
	// Enable speech recognition
	const { isListening, error: speechError } = useSpeechRecognition({
		callId: sessionData?.id || null,
		userId: user?.id || null,
		socket: transcriptSocket,
		enabled: !!sessionData?.id && !!user && !!transcriptSocket,
	})
	
	// Log speech recognition status
	useEffect(() => {
		if (isListening) {
			console.log('🎤 [SpeechRecognition] Listening...')
		}
		if (speechError) {
			console.error('🚨 [SpeechRecognition] Error:', speechError)
		}
	}, [isListening, speechError])

	const handleLeave = useCallback(() => {
		router.back()
	}, [router])

	// Memoize LiveKit room options to avoid passing a new object every render
	const roomOptions = useMemo(() => ({
		videoCaptureDefaults: {
			resolution: VideoPresets.h720,
		},
		audioCaptureDefaults: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
		adaptiveStream: true,
		dynacast: true,
		publishDefaults: {
			videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
		},
	} as RoomOptions), [])

	return (
		<div className="h-screen w-screen flex flex-col bg-[#202124] overflow-hidden fixed inset-0">
			<LiveKitRoom
				video={false}
				audio={true}
				token={token}
				serverUrl={serverUrl}
				connect={true}
				className="flex-1 flex flex-col overflow-hidden"
				options={roomOptions}
			>
				<VideoRoomContent
					showChat={showChat}
					setShowChat={setShowChat}
					showParticipants={showParticipants}
					setShowParticipants={setShowParticipants}
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
					onRequestExtension={handleRequestExtension}
					onExtendSession={() => approveExtension(currentEndTime)}
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
					permissions={permissions}
					onLockAudio={lockAudio}
					onLockVideo={lockVideo}
					onLockChat={lockChat}
					onLockUserAudio={lockUserAudio}
					onLockUserVideo={lockUserVideo}
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
					minutesRemaining={5}
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
	showChat,
	setShowChat,
	showParticipants,
	setShowParticipants,
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
	onLockAudio,
	onLockVideo,
	onLockChat,
	onLockUserAudio,
	onLockUserVideo,
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
}: {
	showChat: boolean
	setShowChat: (show: boolean) => void
	showParticipants: boolean
	setShowParticipants: (show: boolean) => void
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
	onRequestExtension: () => void
	onExtendSession: () => void
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
	onLockAudio?: (locked: boolean) => void
	onLockVideo?: (locked: boolean) => void
	onLockChat?: (locked: boolean) => void
	onLockUserAudio?: (targetUserId: string, locked: boolean) => void
	onLockUserVideo?: (targetUserId: string, locked: boolean) => void
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
}) {
	const room = useRoomContext()
	const params = useParams<{ room: string }>()
	const { showWarning } = useToast()
	
	// Get participants list for name lookup
	const allParticipants = useParticipants()
	
	// Get local participant state directly - most reliable source of truth
	const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()
	
	// Track pending requests to show toast when new requests arrive
	const prevRequestCountRef = useRef(0)
	useEffect(() => {
		if (!isHost || !pendingParticipantRequests) return
		
		// Check if a new request was added
		if (pendingParticipantRequests.length > prevRequestCountRef.current) {
			// Find the newest request
			const newest = pendingParticipantRequests[pendingParticipantRequests.length - 1]
			// Look up participant name from room
			const participant = allParticipants.find(p => p.identity === newest.userId)
			const displayName = participant?.name || newest.userId
			
			if (newest.type === 'audio') {
				showWarning('Permission Request', `${displayName} is requesting to unmute`)
			} else {
				showWarning('Permission Request', `${displayName} is requesting to enable camera`)
			}
		}
		prevRequestCountRef.current = pendingParticipantRequests.length
	}, [pendingParticipantRequests, isHost, showWarning, allParticipants])
	
	// Layout mode: 'focus' shows speaker large with others small, 'grid' shows equal tiles
	const [layoutMode, setLayoutMode] = useState<'focus' | 'grid'>('grid')
	
	// Pinned participant - manually pinned by user
	const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)
	
	const [isAudioEnabled, setIsAudioEnabled] = useState(true)
	
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
	// CRITICAL: Store localParticipant in ref to avoid callback recreation on every audio level update
	const localParticipantRef = useRef(localParticipant)
	// Prevent concurrent effect applications
	const isApplyingEffectRef = useRef(false)
	
	// Keep refs in sync with state
	useEffect(() => { blurAmountRef.current = blurAmount }, [blurAmount])
	useEffect(() => { selectedVirtualBgRef.current = selectedVirtualBg }, [selectedVirtualBg])
	useEffect(() => { backgroundModeRef.current = backgroundMode }, [backgroundMode])
	// CRITICAL: Keep localParticipant ref in sync
	useEffect(() => { localParticipantRef.current = localParticipant }, [localParticipant])

	// Listen for moderation socket events and apply local actions
	useEffect(() => {
		if (!moderationSocket) return

		const handleMute = (data: { action: 'mute' | 'unmute'; targetUserId?: string; hostClerkId?: string; isLocked?: boolean }) => {
			try {
				// If targetUserId is specified and it's not this user, skip
				if (data.targetUserId && data.targetUserId !== currentUserId) return
				// If this is a global action (no targetUserId) but current user is the host, skip
				// The host should NEVER be affected by global mute actions
				if (!data.targetUserId && data.hostClerkId && data.hostClerkId === currentUserId) return
				if (!localParticipant) return
				const enable = data.action === 'unmute'
				localParticipant.setMicrophoneEnabled(enable).catch(() => {})
				
				// Show toast notification when host mutes this participant
				if (data.action === 'mute' && data.targetUserId === currentUserId) {
					showWarning(
						'Microphone muted',
						data.isLocked 
							? 'The host has muted your microphone and locked it. You cannot unmute until the host allows it.'
							: 'The host has muted your microphone.'
					)
				}
			} catch (err) {
				console.warn('Error applying mute action:', err)
			}
		}

		const handleVideo = (data: { action: 'disable' | 'enable'; targetUserId?: string; hostClerkId?: string; isLocked?: boolean }) => {
			try {
				// If targetUserId is specified and it's not this user, skip
				if (data.targetUserId && data.targetUserId !== currentUserId) return
				// If this is a global action (no targetUserId) but current user is the host, skip
				// The host should NEVER be affected by global video disable actions
				if (!data.targetUserId && data.hostClerkId && data.hostClerkId === currentUserId) return
				if (!localParticipant) return
				const enable = data.action === 'enable'
				localParticipant.setCameraEnabled(enable).catch(() => {})
				
				// Show toast notification when host disables video for this participant
				if (data.action === 'disable' && data.targetUserId === currentUserId) {
					showWarning(
						'Camera disabled',
						data.isLocked 
							? 'The host has disabled your camera and locked it. You cannot enable it until the host allows it.'
							: 'The host has disabled your camera.'
					)
				}
			} catch (err) {
				console.warn('Error applying video action:', err)
			}
		}

		moderationSocket.on('moderation-mute', handleMute)
		moderationSocket.on('moderation-video', handleVideo)

		return () => {
			moderationSocket.off('moderation-mute', handleMute)
			moderationSocket.off('moderation-video', handleVideo)
		}
	}, [moderationSocket, currentUserId, localParticipant, showWarning])

	// Enforce permission locks on initial join and when permissions change
	// This ensures that when a participant rejoins/refreshes, they respect the locked state
	useEffect(() => {
		if (!localParticipant || isHost) return
		
		// If audio is locked and mic is on, force disable it
		if (permissions && !permissions.allowAudio && localParticipant.isMicrophoneEnabled) {
			console.log('[permissions] Audio is locked, disabling microphone')
			localParticipant.setMicrophoneEnabled(false).catch(() => {})
		}
		
		// If video is locked and camera is on, force disable it
		if (permissions && !permissions.allowVideo && localParticipant.isCameraEnabled) {
			console.log('[permissions] Video is locked, disabling camera')
			localParticipant.setCameraEnabled(false).catch(() => {})
		}
	}, [permissions, localParticipant, isHost])
	
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
		if (pinnedParticipantId && !activeScreenShare) {
			if (room?.localParticipant?.identity === pinnedParticipantId) {
				return room.localParticipant
			}
			const pinned = Array.from(room?.remoteParticipants.values() || []).find(
				p => p.identity === pinnedParticipantId
			)
			if (pinned) return pinned
		}
		
		// Priority 3: Debounced speaking participant (requires sustained speaking)
		if (debouncedSpeakerId && !activeScreenShare) {
			if (room?.localParticipant?.identity === debouncedSpeakerId) {
				return room.localParticipant
			}
			const speaker = Array.from(room?.remoteParticipants.values() || []).find(
				p => p.identity === debouncedSpeakerId
			)
			if (speaker) return speaker
		}
		
		// Priority 4: Host or first remote
		if (room?.localParticipant) {
			if (isHost) {
				return room.localParticipant
			}
			const remotes = Array.from(room.remoteParticipants.values())
			return remotes[0] || room.localParticipant
		}
		return null
	}, [debouncedSpeakerId, room, isHost, pinnedParticipantId, activeScreenShare])
	
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
		// Prevent concurrent applications which cause flickering
		if (isApplyingEffectRef.current) {
			console.log('⏳ Effect application already in progress, skipping...')
			return
		}
		
		isApplyingEffectRef.current = true
		console.log('🎨 Applying background effect:', mode, intensity ? `with intensity ${intensity}` : '')
		
		try {
			// CRITICAL: Access localParticipant from ref, not from closure
			const participant = localParticipantRef.current
			
			// Check if camera is enabled
			if (!participant?.isCameraEnabled) {
				console.warn('⚠️ Camera is not enabled')
				alert('Please turn on your camera first to use background effects')
				return
			}
			
			// Get local video track
			const videoPublication = Array.from(participant.videoTrackPublications.values()).find(
				pub => pub.source === Track.Source.Camera
			)
			const localVideoTrack = videoPublication?.track as LocalVideoTrack | undefined
			
			console.log('📹 Video track found:', !!localVideoTrack)
			
			if (!localVideoTrack) {
				console.error('❌ No local video track found')
				alert('Could not find video track. Please ensure your camera is working.')
				return
			}
			
			// Use refs for current values to avoid stale closures
			const blurRadius = intensity ?? blurAmountRef.current
			const currentSelectedBg = selectedVirtualBgRef.current
			
			// OPTIMIZATION: If processor already exists, use switchTo for smooth transitions
			// This avoids destroying and recreating the processor which causes flickering
			if (processorRef.current) {
				console.log('🔄 Processor exists, using switchTo for smooth transition...')
				if (mode === 'blur') {
					await processorRef.current.switchTo({ mode: 'background-blur', blurRadius })
					if (intensity !== undefined) setBlurAmount(intensity)
					console.log('✅ Switched to background blur')
				} else if (mode === 'virtual') {
					const selectedBg = VIRTUAL_BACKGROUNDS[currentSelectedBg]
					await processorRef.current.switchTo({ 
						mode: 'virtual-background', 
						imagePath: selectedBg.url
					})
					console.log('✅ Switched to virtual background:', selectedBg.name)
				} else {
					// Mode is 'none' - remove processor
					console.log('🧹 Removing processor...')
					await localVideoTrack.stopProcessor()
					processorRef.current = null
					console.log('✅ Background effect removed')
				}
			} else if (mode !== 'none') {
				// Only create new processor if one doesn't exist
				console.log('🆕 No existing processor, creating new BackgroundProcessor...')
				
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
				
				console.log('✅ BackgroundProcessor applied successfully')
			}
			
			setBackgroundMode(mode)
			console.log('✅ Background mode set to:', mode)
		} catch (err) {
			console.error('❌ Failed to apply background effect:', err)
			const error = err as Error
			alert(`Failed to apply background effect: ${error.message}\n\nTip: Make sure you have good lighting and your browser supports this feature.`)
		} finally {
			isApplyingEffectRef.current = false
		}
	// CRITICAL: Empty dependency array - all values accessed via refs
	// This prevents the callback from being recreated on every render/state change
	}, [])
	
	// Debounced blur radius update - only updates the blur radius without recreating processor
	// STABILIZED: Uses ref for backgroundMode check
	const updateBlurRadius = useCallback(async (newRadius: number) => {
		if (!processorRef.current || backgroundModeRef.current !== 'blur') return
		
		try {
			console.log(`🎚️ Updating blur radius to ${newRadius}...`)
			// Use switchTo for smooth radius update without recreating the processor
			await processorRef.current.switchTo({ mode: 'background-blur', blurRadius: newRadius })
			console.log('✅ Blur radius updated smoothly')
		} catch (err) {
			console.error('❌ Failed to update blur radius:', err)
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
					localVideoTrack.stopProcessor().catch(console.error)
				}
			}
		}
	}, [localParticipant])
	
	// Sort camera tracks: local participant first, then speaking, then others
	const sortedCameraTracks = useMemo(() => {
		return [...cameraTracks].sort((a, b) => {
			const aIsLocal = a.participant.isLocal
			const bIsLocal = b.participant.isLocal
			const aIsSpeaking = a.participant.isSpeaking
			const bIsSpeaking = b.participant.isSpeaking
			
			// Local participant always first
			if (aIsLocal && !bIsLocal) return -1
			if (!aIsLocal && bIsLocal) return 1
			
			// Speaking participants next
			if (aIsSpeaking && !bIsSpeaking) return -1
			if (!aIsSpeaking && bIsSpeaking) return 1
			
			return 0
		})
	}, [cameraTracks])

	// Separate focused track from other tracks
	// Screen share gets highest priority in focus view
	const { focusedTrack, isScreenShareFocused } = useMemo(() => {
		if (layoutMode === 'grid') {
			return { focusedTrack: null, otherTracks: cameraTracks, isScreenShareFocused: false }
		}
		
		// Check if no tracks at all (no camera and no screen share)
		if (sortedCameraTracks.length === 0 && !activeScreenShare) {
			return { focusedTrack: null, otherTracks: sortedCameraTracks, isScreenShareFocused: false }
		}
		
		// Priority 1: If someone is screen sharing, show that as the main view
		if (activeScreenShare) {
			// Show all camera tracks as thumbnails when screen sharing
			return { 
				focusedTrack: activeScreenShare, 
				otherTracks: sortedCameraTracks, // All camera tracks go to thumbnails
				isScreenShareFocused: true 
			}
		}
		
		// Priority 2: Show focused participant's camera
		if (!focusedParticipant) {
			return { focusedTrack: null, otherTracks: sortedCameraTracks, isScreenShareFocused: false }
		}
		
		const focused = sortedCameraTracks.find(
			t => t.participant.identity === focusedParticipant.identity
		)
		const others = sortedCameraTracks.filter(
			t => t.participant.identity !== focusedParticipant.identity
		)
		
		// If no focused track found but we have tracks, use the first one
		if (!focused && sortedCameraTracks.length > 0) {
			return { focusedTrack: sortedCameraTracks[0], otherTracks: sortedCameraTracks.slice(1), isScreenShareFocused: false }
		}
		
		return { focusedTrack: focused || null, otherTracks: others, isScreenShareFocused: false }
	}, [sortedCameraTracks, focusedParticipant, layoutMode, activeScreenShare, cameraTracks])

	const toggleAudio = () => {
		// Toggle audio output (mute/unmute all remote audio)
		if (room) {
			const enabled = !isAudioEnabled
			setIsAudioEnabled(enabled)
			// Mute/unmute all remote audio tracks by setting volume
			room.remoteParticipants.forEach((participant) => {
				participant.audioTrackPublications.forEach((publication) => {
					if (publication.track && 'setVolume' in publication.track) {
						(publication.track as unknown as { setVolume: (volume: number) => void }).setVolume(enabled ? 1 : 0)
					}
				})
			})
		}
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
	const pipVideoRef = useRef<HTMLVideoElement | null>(null)
	
	// Toggle native PiP mode
	const togglePiP = useCallback(async () => {
		try {
			// Check if PiP is supported
			if (!document.pictureInPictureEnabled) {
				console.warn('Picture-in-Picture is not supported in this browser')
				return
			}
			
			// If already in PiP, exit
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture()
				setIsPiPActive(false)
				return
			}
			
			// Find the video element to put in PiP
			// First try to find the focused video, then fallback to any video in the room
			let videoElement: HTMLVideoElement | null = null
			
			// Try to find video in focus-main-video first
			const focusMainVideo = document.querySelector('.focus-main-video video') as HTMLVideoElement
			if (focusMainVideo) {
				videoElement = focusMainVideo
			} else {
				// Fallback to any video in the grid
				const gridVideo = document.querySelector('.custom-grid-tile video, .lk-participant-tile video') as HTMLVideoElement
				if (gridVideo) {
					videoElement = gridVideo
				}
			}
			
			if (videoElement) {
				await videoElement.requestPictureInPicture()
				setIsPiPActive(true)
				pipVideoRef.current = videoElement
			} else {
				console.warn('No video element found for PiP')
			}
		} catch (error) {
			console.error('Error toggling PiP:', error)
		}
	}, [])
	
	// Auto-trigger PiP on visibility change (like Google Meet)
	useEffect(() => {
		const handleVisibilityChange = async () => {
			if (!document.pictureInPictureEnabled) return
			
			// When page becomes hidden and we have video, try to enter PiP
			if (document.hidden && !document.pictureInPictureElement) {
				// Find any active video element
				const videoElement = document.querySelector('.focus-main-video video, .custom-grid-tile video, .lk-participant-tile video') as HTMLVideoElement
				if (videoElement && videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
					try {
						await videoElement.requestPictureInPicture()
						setIsPiPActive(true)
						pipVideoRef.current = videoElement
					} catch (error) {
						// User may have denied PiP permission, silently fail
						console.log('Auto PiP not available:', error)
					}
				}
			}
		}
		
		// Listen for PiP exit
		const handlePiPExit = () => {
			setIsPiPActive(false)
			pipVideoRef.current = null
		}
		
		document.addEventListener('visibilitychange', handleVisibilityChange)
		document.addEventListener('leavepictureinpicture', handlePiPExit)
		
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			document.removeEventListener('leavepictureinpicture', handlePiPExit)
		}
	}, [])

	return (
		<>
			<div className="flex-1 flex relative bg-[#202124] overflow-hidden h-full w-full">
			{/* Main Video Area */}
			<div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${showChat && !showParticipants ? 'md:mr-80' : ''} ${showParticipants && !showChat ? 'md:mr-64' : ''} ${showChat && showParticipants ? 'md:mr-[22rem]' : ''}`}>
				{/* Top Bar - Google Meet style */}
				<div className="h-12 md:h-14 bg-[#1f1f1f] border-b border-white/5 flex items-center justify-between px-4 md:px-6 z-30 flex-shrink-0">
					{/* Logo and Room Info */}
					<div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
						<div className="flex items-center gap-2 md:gap-3 min-w-0">
							<div className="relative h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
								<Image
									src="/webyalaya-main-logo.svg"
									alt="Webyalaya"
									fill
									className="object-contain"
									priority
								/>
							</div>
							<div className="flex flex-col min-w-0">
								<span className="text-white font-sans font-medium text-sm md:text-base leading-tight truncate">
									{sessionTitle || 'Webyalaya'}
								</span>
								<span className="text-white/50 text-xs md:text-sm truncate">
									{sessionTitle ? 'Video Call' : (params?.room?.replace('session-', '').replace('studyroom-', '') || 'Video Call')}
								</span>
							</div>
						</div>

						{/* Session Timer */}
						{timerEnabled && (
							<div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 bg-white/5 rounded-md">
								<Clock className="h-4 w-4 text-white/70" />
								<span
									className={`font-mono font-medium text-sm ${
										minutesLeft <= 2 ? "text-[#ea4335]" : "text-white/90"
									}`}
								>
									{formattedTime}
								</span>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
						{/* Layout Toggle Button - Visible on all devices */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setLayoutMode(layoutMode === 'focus' ? 'grid' : 'focus')}
							className={`h-9 w-9 md:h-10 md:w-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all p-0 flex items-center justify-center ${
								layoutMode === 'focus' ? 'bg-white/10 text-white' : ''
							}`}
							title={layoutMode === 'focus' ? "Switch to grid view" : "Switch to speaker view"}
						>
							{layoutMode === 'grid' ? <Presentation className="h-4 w-4 md:h-5 md:w-5" /> : <Grid2X2 className="h-4 w-4 md:h-5 md:w-5" />}
						</Button>
						{/* Participants Button */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowParticipants(!showParticipants)}
							className={`h-9 w-9 md:h-10 md:w-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all p-0 flex items-center justify-center ${
								showParticipants ? 'bg-white/10 text-white' : ''
							}`}
							title="Participants"
						>
							<Users className="h-4 w-4 md:h-5 md:w-5" />
						</Button>
						{/* Chat Button */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowChat(!showChat)}
							className={`h-9 w-9 md:h-10 md:w-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all p-0 flex items-center justify-center ${
								showChat ? 'bg-white/10 text-white' : ''
							}`}
							title="Chat"
						>
							<MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
						</Button>
						{/* Fullscreen Toggle - Desktop only in top bar */}
						<Button
							variant="ghost"
							size="sm"
							onClick={toggleFullscreen}
							className="h-9 w-9 md:h-10 md:w-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all p-0 hidden md:flex items-center justify-center"
							title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
						>
							{isFullscreen ? <Minimize2 className="h-4 w-4 md:h-5 md:w-5" /> : <Maximize2 className="h-4 w-4 md:h-5 md:w-5" />}
						</Button>
					</div>
				</div>

				{/* Video Grid - Properly constrained */}
				<div className="flex-1 overflow-hidden bg-[#202124] relative min-h-0 video-grid-container pb-20">
					<style dangerouslySetInnerHTML={{__html: `
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
						border-radius: 12px !important;
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
						background: linear-gradient(transparent, rgba(0,0,0,0.8)) !important;
						padding: 8px 12px !important;
						font-size: 13px !important;
						font-weight: 500 !important;
						text-shadow: 0 1px 3px rgba(0,0,0,0.8) !important;
						position: absolute !important;
						bottom: 0 !important;
						left: 0 !important;
						right: 0 !important;
						z-index: 10 !important;
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
							padding: 6px 8px !important;
						}
					}
					
					/* Focus/Presenter Layout Styles - Like Zoom/GMeet */
					.focus-layout-container {
						display: flex;
						flex-direction: column;
						height: 100%;
						width: 100%;
						padding: 12px;
						gap: 12px;
						overflow: hidden;
					}
					
					@media (max-width: 768px) {
						.focus-layout-container {
							padding: 8px;
							gap: 8px;
						}
					}
					
					/* Main video area - centered with max size */
					.focus-main-wrapper {
						flex: 1;
						display: flex;
						align-items: center;
						justify-content: center;
						min-height: 0;
						overflow: hidden;
					}
					
					.focus-main-video {
						position: relative;
						width: 100%;
						max-width: 900px;
						height: 100%;
						max-height: calc(100% - 20px);
						aspect-ratio: 16 / 9;
						border-radius: 12px;
						overflow: hidden;
						background: #1a1a1a;
						display: flex;
						align-items: center;
						justify-content: center;
					}
					
					@media (max-width: 768px) {
						.focus-main-video {
							border-radius: 8px;
							max-width: 100%;
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
						padding: 12px 16px;
						background: linear-gradient(transparent, rgba(0,0,0,0.8));
						display: flex;
						align-items: center;
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
							padding: 8px 12px;
						}
						.focus-participant-name span {
							font-size: 12px;
						}
					}
					
					/* Thumbnail strip at bottom - always visible */
					.focus-thumbnails {
						display: flex !important;
						gap: 8px;
						height: 100px;
						min-height: 100px;
						flex-shrink: 0;
						overflow-x: auto;
						overflow-y: hidden;
						padding: 4px 8px;
						align-items: center;
						justify-content: flex-start;
						background: rgba(0,0,0,0.3);
						border-radius: 8px;
						scrollbar-width: thin;
						scrollbar-color: rgba(255,255,255,0.3) transparent;
					}
					
					.focus-thumbnails::-webkit-scrollbar {
						height: 4px;
					}
					
					.focus-thumbnails::-webkit-scrollbar-track {
						background: transparent;
					}
					
					.focus-thumbnails::-webkit-scrollbar-thumb {
						background: rgba(255,255,255,0.3);
						border-radius: 2px;
					}
					
					@media (max-width: 768px) {
						.focus-thumbnails {
							height: 80px;
							min-height: 80px;
							gap: 6px;
							padding: 4px;
						}
					}
					
					/* Individual thumbnail */
					.focus-thumbnail {
						position: relative;
						width: 140px;
						min-width: 140px;
						height: 100%;
						flex-shrink: 0;
						border-radius: 8px;
						overflow: hidden;
						background: #2d2d2d;
						border: 2px solid transparent;
						cursor: pointer;
						transition: all 0.2s ease;
					}
					
					.focus-thumbnail:hover {
						border-color: rgba(255,255,255,0.5);
						transform: scale(1.02);
					}
					
					.focus-thumbnail > div,
					.focus-thumbnail .lk-participant-tile {
						width: 100% !important;
						height: 100% !important;
						position: absolute !important;
						top: 0 !important;
						left: 0 !important;
					}
					
					.focus-thumbnail.speaking {
						border-color: #00DC6E;
						box-shadow: 0 0 0 2px rgba(0, 220, 110, 0.3);
					}
					
					.focus-thumbnail.pinned {
						border-color: #00DC6E;
						border-width: 3px;
						box-shadow: 0 0 0 2px rgba(0, 220, 110, 0.3);
					}
					
					.focus-thumbnail.active {
						border-color: #008CD2;
						box-shadow: 0 0 0 2px rgba(0, 140, 210, 0.3);
					}
					
					/* Thumbnail name label */
					.focus-thumbnail-name {
						position: absolute;
						bottom: 0;
						left: 0;
						right: 0;
						padding: 4px 6px;
						background: linear-gradient(transparent, rgba(0,0,0,0.9));
						z-index: 15;
					}
					
					.focus-thumbnail-name span {
						color: white !important;
						font-size: 10px;
						font-weight: 500;
						display: block;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
					}
					
					@media (max-width: 768px) {
						.focus-thumbnail {
							width: 100px;
							min-width: 100px;
							border-radius: 6px;
						}
						.focus-thumbnail-name {
							padding: 2px 4px;
						}
						.focus-thumbnail-name span {
							font-size: 9px;
						}
					}
					
					/* Hide default LiveKit name in thumbnails (we use our own) */
					.focus-thumbnail .lk-participant-name,
					.focus-thumbnail .lk-participant-metadata {
						display: none !important;
					}
					
					/* View More button in thumbnail strip */
					.focus-view-more {
						min-width: 90px;
					}
					
					/* Custom Grid Layout - Fixed to prevent overlapping */
					.custom-grid {
						display: grid;
						gap: 12px;
						height: 100%;
						width: 100%;
						padding: 12px;
						align-content: center;
						justify-content: center;
						overflow: hidden;
					}
					
					/* 1 participant - centered large */
					.custom-grid[data-count="1"] {
						grid-template-columns: minmax(0, 800px);
						grid-template-rows: minmax(0, 1fr);
					}
					
					/* 2 participants - side by side */
					.custom-grid[data-count="2"] {
						grid-template-columns: repeat(2, minmax(0, 1fr));
						grid-template-rows: minmax(0, 1fr);
						max-height: 60%;
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
					
					/* 7+ participants - 3x3 or more */
					.custom-grid[data-count="7"],
					.custom-grid[data-count="8"],
					.custom-grid[data-count="9"] {
						grid-template-columns: repeat(3, minmax(0, 1fr));
						grid-template-rows: repeat(3, minmax(0, 1fr));
					}
					
					/* Fallback for many participants */
					.custom-grid {
						grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
						grid-auto-rows: minmax(150px, 1fr);
					}
					
					@media (max-width: 768px) {
						.custom-grid {
							gap: 8px;
							padding: 8px;
						}
						
						.custom-grid[data-count="1"] {
							grid-template-columns: 1fr;
						}
						
						.custom-grid[data-count="2"],
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
					
					@media (max-width: 480px) {
						.custom-grid[data-count="2"] {
							grid-template-columns: 1fr;
							grid-template-rows: repeat(2, minmax(0, 1fr));
						}
					}
					
					.custom-grid-tile {
						position: relative;
						width: 100%;
						height: 100%;
						min-height: 0;
						min-width: 0;
						border-radius: 12px;
						overflow: hidden;
						background: #2d2d2d;
					}
					
					@media (max-width: 768px) {
						.custom-grid-tile {
							border-radius: 8px;
						}
					}
					
					.custom-grid-tile .lk-participant-tile,
					.custom-grid-tile > div:first-child {
						position: absolute !important;
						top: 0 !important;
						left: 0 !important;
						right: 0 !important;
						bottom: 0 !important;
						width: 100% !important;
						height: 100% !important;
					}
					
					.custom-grid-tile.speaking {
						box-shadow: 0 0 0 3px #00DC6E;
					}
					`}} />
					{/* Layout rendering */}
					{layoutMode === 'focus' ? (
						<div className="focus-layout-container">
							{/* Main focused video wrapper - centers the video */}
							<div className="focus-main-wrapper">
								{focusedTrack ? (
									<div className={`focus-main-video relative group ${
										!isScreenShareFocused && pinnedParticipantId === focusedTrack?.participant?.identity 
											? 'ring-4 ring-[#00DC6E] ring-offset-2 ring-offset-[#202124]' 
											: ''
									}`}>
												{/* Always show avatar background */}
												<div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d] z-[1]">
													<div className="w-24 h-24 rounded-full bg-[#444] flex items-center justify-center">
														<User className="w-14 h-14 text-[#888]" />
													</div>
												</div>
												{/* Video layer on top - ONLY render when there's actual video track */}
												{isTrackReference(focusedTrack) && (isScreenShareFocused || focusedTrack.publication?.track) && (
													<div className="absolute inset-0 z-[2]">
														<VideoTrack trackRef={focusedTrack} className="w-full h-full object-contain" />
													</div>
												)}
												{/* Participant name overlay at bottom */}
												<div className="focus-participant-name">
													{focusedTrack.participant.isSpeaking && (
														<span className="w-2 h-2 rounded-full bg-[#00DC6E] animate-pulse" />
													)}
													<span>{focusedTrack.participant.name || focusedTrack.participant.identity}</span>
													{isScreenShareFocused && (
														<span className="text-white/60 text-xs ml-1">(Screen Share)</span>
													)}
													{/* Pinned text indicator in name bar */}
													{!isScreenShareFocused && pinnedParticipantId === focusedTrack?.participant?.identity && (
														<span className="ml-2 text-[#00DC6E] text-xs flex items-center gap-1">
															<Pin className="h-3 w-3" />
															Pinned
														</span>
													)}
												</div>
												
												{/* Audio/Video status icons in top-right corner (like Zoom) */}
												<div className="absolute top-3 right-3 flex items-center gap-2 z-20">
													{!focusedTrack.participant.isMicrophoneEnabled && (
														<div className="bg-black/70 px-2 py-1 rounded flex items-center gap-1" title="Muted">
															<MicOff className="h-4 w-4 text-red-500" />
														</div>
													)}
													{!focusedTrack.participant.isCameraEnabled && !isScreenShareFocused && (
														<div className="bg-black/70 px-2 py-1 rounded flex items-center gap-1" title="Camera off">
															<VideoOff className="h-4 w-4 text-red-500" />
														</div>
													)}
												</div>
										
										{/* Pin/Unpin button overlay - only show when not screen sharing */}
										{!isScreenShareFocused && (
											<div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
												<Button
													variant="ghost"
													size="sm"
													onClick={togglePinFocused}
													className={`h-8 w-8 rounded-full p-0 ${
														pinnedParticipantId === focusedTrack?.participant?.identity
															? 'bg-[#00DC6E] text-white hover:bg-[#00b058]'
															: 'bg-black/60 text-white hover:bg-black/80'
													}`}
													title={pinnedParticipantId === focusedTrack?.participant?.identity ? 'Unpin' : 'Pin this video'}
												>
													{pinnedParticipantId === focusedTrack?.participant?.identity ? (
														<PinOff className="h-4 w-4" />
													) : (
														<Pin className="h-4 w-4" />
													)}
												</Button>
											</div>
										)}
										
										{/* Screen Share indicator badge */}
										{isScreenShareFocused && (
											<div className="absolute top-3 left-3 flex items-center gap-1 bg-[#008CD2] text-white text-xs px-2 py-1 rounded-full z-10">
												<MonitorUp className="h-3 w-3" />
												<span>Screen Share</span>
											</div>
										)}
									</div>
								) : (
									<div className="focus-main-video flex items-center justify-center">
										<div className="flex flex-col items-center gap-3">
											<div className="w-20 h-20 rounded-full bg-[#444] flex items-center justify-center">
												<User className="w-12 h-12 text-[#888]" />
											</div>
											<p className="text-white/50 text-sm">No participant selected</p>
										</div>
									</div>
								)}
							</div>
							
							{/* Thumbnail strip at bottom - always show all participants */}
							<div className="focus-thumbnails">
								{sortedCameraTracks.map((track) => {
									const isActive = focusedTrack?.participant?.identity === track.participant.identity && !isScreenShareFocused
									const isLocal = track.participant.isLocal
									const isMuted = !track.participant.isMicrophoneEnabled
									return (
										<div 
											key={`thumb-${track.participant.identity}`}
											className={`focus-thumbnail ${
												track.participant.isSpeaking ? 'speaking' : ''
											} ${
												pinnedParticipantId === track.participant.identity ? 'pinned' : ''
											} ${isActive ? 'active' : ''} ${isLocal ? 'local' : ''}`}
											onClick={() => handleThumbnailClick(track.participant.identity)}
										>
											{/* Avatar background layer - always visible */}
											<div className="absolute inset-0 flex items-center justify-center bg-[#3d3d3d] z-[1]">
												<div className="w-10 h-10 rounded-full bg-[#555] flex items-center justify-center">
													<User className="w-6 h-6 text-[#888]" />
												</div>
											</div>
											{/* Video layer on top - ONLY render when there's actual video track */}
											{isTrackReference(track) && track.publication?.track && (
												<div className="absolute inset-0 z-[2]">
													<VideoTrack trackRef={track} className="w-full h-full object-cover" />
												</div>
											)}
											{/* Mute indicator icon (top right) */}
											{isMuted && (
												<div className="absolute top-1 right-1 bg-black/70 px-1.5 py-1 rounded flex items-center z-20" title="Muted">
													<MicOff className="h-3 w-3 text-red-500" />
												</div>
											)}
											{/* Name label with pin indicator text */}
											<div className="focus-thumbnail-name">
												<span>{isLocal ? 'You' : (track.participant.name || track.participant.identity?.slice(0, 10))}</span>
												{pinnedParticipantId === track.participant.identity && (
													<Pin className="h-2.5 w-2.5 text-[#00DC6E] ml-1 inline" />
												)}
											</div>
											{/* Speaking indicator - only show if not pinned to avoid visual clutter */}
											{track.participant.isSpeaking && pinnedParticipantId !== track.participant.identity && (
												<div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[#00DC6E] animate-pulse z-10" />
											)}
										</div>
									)
								})}
								{/* View More button - switch to grid view */}
								{sortedCameraTracks.length > 0 && (
									<button
										onClick={() => setLayoutMode('grid')}
										className="focus-view-more flex-shrink-0 px-4 h-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer border-none"
									>
										<Grid2X2 className="h-4 w-4 text-white" />
										<span className="text-white text-xs font-medium whitespace-nowrap">View All</span>
									</button>
								)}
							</div>
						</div>
					) : (
						<div className="grid-mode h-full w-full p-2">
							{/* Custom Grid layout with pin buttons */}
							<div className="custom-grid" data-count={Math.min(sortedCameraTracks.length, 9)}>
								{sortedCameraTracks.map((track) => {
									const isLocal = track.participant.isLocal
									const hasVideo = isTrackReference(track) && track.publication?.track
									const isMuted = !track.participant.isMicrophoneEnabled
									const isVideoOff = !track.participant.isCameraEnabled
									return (
										<div 
											key={`grid-${track.participant.identity}`}
											className={`custom-grid-tile group ${track.participant.isSpeaking ? 'speaking' : ''}`}
										>
											{/* Avatar background layer - always visible */}
											<div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d] z-[1]">
												<div className="w-16 h-16 rounded-full bg-[#444] flex items-center justify-center">
													<User className="w-10 h-10 text-[#888]" />
												</div>
											</div>
											{/* Video layer on top - ONLY render when there's actual video track */}
											{hasVideo && (
												<div className="absolute inset-0 z-[2]">
													<VideoTrack trackRef={track} className="w-full h-full object-cover" />
												</div>
											)}
											{/* Pin button overlay */}
											<button
												onClick={(e) => {
													e.stopPropagation()
													pinAndSwitchToPresenter(track.participant.identity)
												}}
												className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
												title="Pin and switch to presenter view"
											>
												<Pin className="h-4 w-4 text-white" />
											</button>
											{/* Speaking indicator */}
											{track.participant.isSpeaking && (
												<div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-[#00DC6E] animate-pulse z-20" />
											)}
											{/* Bottom bar with name and audio/video status (like Zoom) */}
											<div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/80 to-transparent z-20">
												<span className="text-white text-sm font-medium truncate max-w-[70%]">
													{isLocal ? 'You' : (track.participant.name || track.participant.identity)}
												</span>
												<div className="flex items-center gap-1.5">
													{/* Mic status icon */}
													{isMuted ? (
														<div className="w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center" title="Muted">
															<MicOff className="h-3.5 w-3.5 text-white" />
														</div>
													) : (
														<div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center" title="Unmuted">
															<Mic className="h-3.5 w-3.5 text-white" />
														</div>
													)}
													{/* Video status icon */}
													{isVideoOff && (
														<div className="w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center" title="Camera off">
															<VideoOff className="h-3.5 w-3.5 text-white" />
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
					<RoomAudioRenderer />
				</div>
			</div>

			{/* Controls Bar - Google Meet style, fixed at bottom - Always visible including fullscreen */}
			<div 
				className={`fixed bottom-0 left-0 right-0 h-16 md:h-20 bg-[#1f1f1f]/95 backdrop-blur-sm border-t border-white/5 flex items-center justify-center gap-1.5 md:gap-3 px-2 md:px-4 overflow-hidden z-[9999] ${showChat && !showParticipants ? 'md:right-80' : ''} ${showParticipants && !showChat ? 'md:right-64' : ''} ${showChat && showParticipants ? 'md:right-[22rem]' : ''}`} 
			>
				{/* Mobile Timer - Show timer on mobile in control bar */}
				{timerEnabled && (
					<div className="flex md:hidden items-center gap-1.5 px-2.5 py-1.5 bg-white/10 rounded-lg mr-2 flex-shrink-0">
						<Clock className="h-3.5 w-3.5 text-white/90 flex-shrink-0" />
						<span
							className={`font-mono font-medium text-xs leading-none ${
								minutesLeft <= 2 ? "text-[#ea4335]" : "text-white"
							}`}
						>
							{formattedTime}
						</span>
					</div>
				)}
				
				{/* Video Toggle - Use local participant state directly */}
				<Button
					onClick={async () => {
						try {
							const participant = room?.localParticipant
							if (!participant) return
							
							const newState = !participant.isCameraEnabled
							
							// Check permission lock before enabling (non-hosts only)
							if (newState && !isHost && permissions && !permissions.allowVideo) {
								// Locked - send request to host
								participantRequestVideo?.()
								return
							}
							
							await participant.setCameraEnabled(newState)
						} catch (err) {
							// Show user-friendly error messages
							const error = err as Error & { name?: string }
							if (error?.name === 'NotReadableError' || error?.message?.includes('Device in use')) {
								alert('Camera is being used by another application. Please close other apps using your camera and try again.')
							} else if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission denied')) {
								alert('Camera access was denied. Please allow camera permissions in your browser settings.')
							} else if (error?.name === 'NotFoundError') {
								alert('No camera found. Please connect a camera and try again.')
							} else {
								alert(`Could not access camera: ${error?.message || 'Unknown error'}`)
							}
						}
					}}
					variant="ghost"
					size="lg"
					className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 flex-shrink-0 ${
						(room?.localParticipant?.isCameraEnabled ?? isCameraEnabled)
							? 'bg-white/10 hover:bg-white/20 text-white' 
							: 'bg-[#ea4335] hover:bg-[#d33b2c] text-white'
					}`}
					title={(room?.localParticipant?.isCameraEnabled ?? isCameraEnabled) ? "Turn off camera" : "Turn on camera"}
				>
					{(room?.localParticipant?.isCameraEnabled ?? isCameraEnabled) ? <Video className="h-5 w-5 md:h-6 md:w-6" /> : <VideoOff className="h-5 w-5 md:h-6 md:w-6" />}
				</Button>

				{/* Background Effects Button - Always visible */}
				<div className="relative">
					<Button
						onClick={() => {
							if (!(room?.localParticipant?.isCameraEnabled ?? isCameraEnabled)) {
								alert('Please turn on your camera first to use background effects')
								return
							}
							setShowBackgroundMenu(!showBackgroundMenu)
						}}
						variant="ghost"
						size="lg"
						className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 flex-shrink-0 ${
							backgroundMode !== 'none'
								? 'bg-[#00DC6E] hover:bg-[#00b058] text-white' 
								: 'bg-white/10 hover:bg-white/20 text-white'
						}`}
						title="Background effects (Blur/Virtual BG)"
					>
						<Sparkles className="h-5 w-5 md:h-6 md:w-6" />
					</Button>
				</div>

				{/* Mic Toggle */}
				<Button
					onClick={async () => {
						try {
							const participant = room?.localParticipant
							if (!participant) return
							
							const newState = !participant.isMicrophoneEnabled
							
							// Check permission lock before enabling (non-hosts only)
							if (newState && !isHost && permissions && !permissions.allowAudio) {
								// Locked - send request to host
								participantRequestAudio?.()
								return
							}
							
							await participant.setMicrophoneEnabled(newState)
						} catch {
							// Mic toggle failed silently
						}
					}}
					variant="ghost"
					size="lg"
					className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 flex-shrink-0 ${
						(room?.localParticipant?.isMicrophoneEnabled ?? isMicrophoneEnabled)
							? 'bg-white/10 hover:bg-white/20 text-white' 
							: 'bg-[#ea4335] hover:bg-[#d33b2c] text-white'
					}`}
					title={(room?.localParticipant?.isMicrophoneEnabled ?? isMicrophoneEnabled) ? "Turn off microphone" : "Turn on microphone"}
				>
					{(room?.localParticipant?.isMicrophoneEnabled ?? isMicrophoneEnabled) ? <Mic className="h-5 w-5 md:h-6 md:w-6" /> : <MicOff className="h-5 w-5 md:h-6 md:w-6" />}
				</Button>

				{/* Audio Output Toggle - Hidden on mobile */}
				<Button
					onClick={toggleAudio}
					variant="ghost"
					size="lg"
					className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 hidden md:flex flex-shrink-0 ${
						isAudioEnabled 
							? 'bg-white/10 hover:bg-white/20 text-white' 
							: 'bg-white/5 hover:bg-white/10 text-white/50'
					}`}
					title={isAudioEnabled ? "Mute all" : "Unmute all"}
				>
					{isAudioEnabled ? <Volume2 className="h-5 w-5 md:h-6 md:w-6" /> : <VolumeX className="h-5 w-5 md:h-6 md:w-6" />}
				</Button>

				{/* Screen Share Toggle */}
				<Button
					onClick={async () => {
						try {
							const newState = !isScreenShareEnabled
							await localParticipant?.setScreenShareEnabled(newState)
						} catch {
							// Screen share toggle failed silently
						}
					}}
					variant="ghost"
					size="lg"
					className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 hidden md:flex flex-shrink-0 ${
						isScreenShareEnabled 
							? 'bg-[#00DC6E] hover:bg-[#00b058] text-white' 
							: 'bg-white/10 hover:bg-white/20 text-white'
					}`}
					title={isScreenShareEnabled ? "Stop sharing" : "Share screen"}
				>
					{isScreenShareEnabled ? <MonitorOff className="h-5 w-5 md:h-6 md:w-6" /> : <MonitorUp className="h-5 w-5 md:h-6 md:w-6" />}
				</Button>

				{/* Fullscreen Toggle - Visible on all devices */}
				<Button
					onClick={toggleFullscreen}
					variant="ghost"
					size="lg"
					className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 flex-shrink-0 ${
						isFullscreen 
							? 'bg-white/20 text-white' 
							: 'bg-white/10 hover:bg-white/20 text-white'
					}`}
					title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
				>
					{isFullscreen ? <Minimize2 className="h-5 w-5 md:h-6 md:w-6" /> : <Maximize2 className="h-5 w-5 md:h-6 md:w-6" />}
				</Button>

				{/* Native PiP Mode - Floats over desktop like Google Meet */}
				<Button
					onClick={togglePiP}
					variant="ghost"
					size="lg"
					className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 flex-shrink-0 ${
						isPiPActive 
							? 'bg-[#00DC6E] hover:bg-[#00b058] text-white' 
							: 'bg-white/10 hover:bg-white/20 text-white'
					}`}
					title={isPiPActive ? "Exit Picture-in-Picture" : "Picture-in-Picture (floats over desktop)"}
				>
					<PictureInPicture2 className="h-5 w-5 md:h-6 md:w-6" />
				</Button>

				{/* Session Extension Button - Only show when timer is enabled */}
				{timerEnabled && (
					<Button
						onClick={isHost ? onExtendSession : () => onRequestExtension()}
						variant="ghost"
						size="lg"
						disabled={hasExtended}
						className={`h-10 px-3 md:h-12 md:px-4 rounded-full transition-all flex-shrink-0 flex items-center gap-1.5 ${
							hasExtended
								? 'bg-white/5 text-white/40 cursor-not-allowed'
								: 'bg-white/10 hover:bg-white/20 text-white'
						}`}
						title={
							hasExtended 
								? "Session already extended" 
								: isHost 
									? "Extend session by 10 minutes" 
									: "Request to extend session by 10 minutes"
						}
					>
						<TimerReset className="h-4 w-4 md:h-5 md:w-5" />
						<span className="hidden md:inline text-xs md:text-sm font-medium">
							{hasExtended ? "Extended" : isHost ? "+10m" : "Request +10m"}
						</span>
					</Button>
				)}

				{/* Moderation Buttons - Host only: End meeting button for peer sessions and study rooms */}
				{isHost && showModeratorControls && (
					<Button
						onClick={onEndMeeting}
						disabled={endingMeeting}
						variant="ghost"
						size="lg"
						className="h-10 px-3 md:h-12 md:px-6 rounded-full bg-[#ea4335] hover:bg-[#d33b2c] text-white font-medium text-xs md:text-base flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
						title="End meeting for all participants"
					>
						{endingMeeting ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1.5" />
								Ending...
							</>
						) : (
							<>
								<PhoneOff className="h-4 w-4 md:h-5 md:w-5 mr-1.5" />
								End All
							</>
						)}
					</Button>
				)}

				{/* Leave Button - Always visible */}
				<Button
					onClick={onLeave}
					variant="ghost"
					size="lg"
					className="h-10 px-3 md:h-12 md:px-6 rounded-full bg-[#ea4335] hover:bg-[#d33b2c] text-white font-medium text-xs md:text-base flex-shrink-0"
					title="Leave the meeting"
				>
					Leave
				</Button>
			</div>

			{/* Chat Sidebar - Mobile: Bottom sheet, Desktop: Sidebar */}
			{showChat && (
				<>
					{/* Mobile Overlay Backdrop - semi-transparent to show video behind */}
					<div
						className="fixed inset-0 bg-black/40 z-40 md:hidden"
						onClick={() => setShowChat(false)}
					/>
					{/* Chat Panel - Mobile: Bottom sheet style, Desktop: Sidebar */}
					<div className="fixed md:absolute right-0 md:top-0 bottom-16 md:bottom-0 left-0 md:left-auto w-full md:w-80 h-[55vh] md:h-full bg-[#1f1f1f] border-t md:border-t-0 md:border-l border-white/10 z-50 md:z-10 rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none flex flex-col">
						{/* Drag handle for mobile */}
						<div className="md:hidden flex justify-center py-2">
							<div className="w-10 h-1 bg-white/30 rounded-full" />
						</div>
						{/* Header */}

						<div className="h-10 md:h-14 bg-[#1f1f1f] border-b border-white/5 flex items-center justify-between px-4 flex-shrink-0">
							<h3 className="font-medium text-sm md:text-base text-white font-sans">Chat</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowChat(false)}
								className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						{/* Chat content - uses all remaining space */}
						{channelId ? (
					<ChatWidget 
						channelId={channelId} 
						chatDisabled={chatDisabled}
						className="flex-1 min-h-0 overflow-hidden" 
					/>
			) : (
				<div className="flex-1 flex items-center justify-center">
					<p className="text-white/50 text-sm px-4 text-center font-sans">
						Chat is not available for this session
					</p>
				</div>
			)}
		</div>
	</>
)}

		{/* Participants Sidebar - Mobile: Bottom sheet, Desktop: Sidebar */}
		{showParticipants && (
			<>
				<div className={`fixed md:absolute right-0 md:top-0 bottom-0 left-0 md:left-auto w-full md:w-72 h-[60vh] md:h-full bg-[#1f1f1f] border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-50 md:z-20 rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none ${showChat ? 'md:right-80' : ''}`}>
						{/* Drag handle for mobile */}
						<div className="md:hidden flex justify-center py-2">
							<div className="w-10 h-1 bg-white/30 rounded-full" />
						</div>
						<div className="h-10 md:h-14 bg-[#1f1f1f] border-b border-white/5 flex items-center justify-between px-4">
							<h3 className="font-medium text-sm md:text-base text-white font-sans">Participants</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowParticipants(false)}
								className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						
						{/* Host Controls Section - Only visible to hosts */}
						{isHost && (
							<div className="p-3 md:p-4 border-b border-white/10 bg-[#252525]">
								<div className="flex items-center gap-2 mb-3">
									<Settings2 className="h-4 w-4 text-white/60" />
									<span className="text-xs font-medium text-white/80 uppercase tracking-wider">Host Controls</span>
								</div>
								
								{/* Permission Locks */}
								<div className="space-y-2">
									{/* Audio Lock Toggle */}
									<div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
										<div className="flex items-center gap-2">
											<Mic className="h-4 w-4 text-white/70" />
											<span className="text-sm text-white/90">Participant Audio</span>
										</div>
										<Button
											onClick={() => {
												const isCurrentlyLocked = permissions?.allowAudio === false
												if (isCurrentlyLocked) {
													// Unlock audio
													onLockAudio?.(false)
												} else {
													// Lock audio and mute all
													onLockAudio?.(true)
													onMuteAll?.()
												}
											}}
											variant="ghost"
											size="sm"
											className={`h-7 w-7 p-0 rounded-full transition-colors ${
												permissions?.allowAudio === false 
													? 'bg-[#ea4335]/20 text-[#ea4335] hover:bg-[#ea4335]/30' 
													: 'bg-white/10 text-white/70 hover:bg-white/20'
											}`}
											title={permissions?.allowAudio === false ? 'Unlock audio for all' : 'Lock audio (prevent unmuting)'}
										>
											{permissions?.allowAudio === false ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
										</Button>
									</div>
									
									{/* Video Lock Toggle */}
									<div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
										<div className="flex items-center gap-2">
											<Video className="h-4 w-4 text-white/70" />
											<span className="text-sm text-white/90">Participant Video</span>
										</div>
										<Button
											onClick={() => {
												const isCurrentlyLocked = permissions?.allowVideo === false
												if (isCurrentlyLocked) {
													// Unlock video
													onLockVideo?.(false)
												} else {
													// Lock video and disable all
													onLockVideo?.(true)
													onDisableVideoAll?.()
												}
											}}
											variant="ghost"
											size="sm"
											className={`h-7 w-7 p-0 rounded-full transition-colors ${
												permissions?.allowVideo === false 
													? 'bg-[#ea4335]/20 text-[#ea4335] hover:bg-[#ea4335]/30' 
													: 'bg-white/10 text-white/70 hover:bg-white/20'
											}`}
											title={permissions?.allowVideo === false ? 'Unlock video for all' : 'Lock video (prevent enabling)'}
										>
											{permissions?.allowVideo === false ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
										</Button>
									</div>
									
									{/* Chat Lock Toggle */}
									<div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
										<div className="flex items-center gap-2">
											<MessageSquare className="h-4 w-4 text-white/70" />
											<span className="text-sm text-white/90">Participant Chat</span>
										</div>
										<Button
											onClick={() => {
												const isCurrentlyDisabled = chatDisabled || permissions?.allowChat === false
												if (isCurrentlyDisabled) {
													// Enable chat
													onToggleChat?.(false)
													onLockChat?.(false)
												} else {
													// Disable chat
													onToggleChat?.(true)
													onLockChat?.(true)
												}
											}}
											variant="ghost"
											size="sm"
											className={`h-7 w-7 p-0 rounded-full transition-colors ${
												chatDisabled 
													? 'bg-[#ea4335]/20 text-[#ea4335] hover:bg-[#ea4335]/30' 
													: 'bg-white/10 text-white/70 hover:bg-white/20'
											}`}
											title={chatDisabled ? 'Enable chat for all' : 'Disable chat for all'}
										>
											{chatDisabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
										</Button>
									</div>
								</div>
								
								{/* Quick Actions */}
								<div className="flex gap-2 mt-3">
									<Button
										onClick={() => {
											onMuteAll?.()
											onLockAudio?.(true) // Also lock to prevent unmuting
										}}
										variant="ghost"
										size="sm"
										className="flex-1 h-8 text-xs bg-white/5 hover:bg-white/10 text-white/80"
										title="Mute all participants and lock audio"
									>
										<VolumeX className="h-3.5 w-3.5 mr-1" />
										Mute All
									</Button>
									<Button
										onClick={() => {
											onDisableVideoAll?.()
											onLockVideo?.(true) // Also lock to prevent enabling
										}}
										variant="ghost"
										size="sm"
										className="flex-1 h-8 text-xs bg-white/5 hover:bg-white/10 text-white/80"
										title="Turn off all participant videos and lock"
									>
										<CameraOff className="h-3.5 w-3.5 mr-1" />
										Video Off
									</Button>
								</div>
							</div>
						)}
						
						<div className="flex-1 overflow-y-auto p-3 md:p-4">
							<ParticipantList
								isHost={isHost}
								onMuteParticipant={onMuteParticipant}
								onUnmuteParticipant={onUnmuteParticipant}
								onDisableVideoParticipant={onDisableVideoParticipant}
								onEnableVideoParticipant={onEnableVideoParticipant}
								onLockUserAudio={onLockUserAudio}
								onLockUserVideo={onLockUserVideo}
								onRequestAudioOn={onRequestAudioOn}
								onRequestVideoOn={onRequestVideoOn}
								pendingParticipantRequests={pendingParticipantRequests}
								onApproveAudioRequest={hostRespondParticipantAudio}
								onApproveVideoRequest={hostRespondParticipantVideo}
							/>
						</div>
					</div>
				</>
			)}
		</div>

		{/* Background Effects Popup - At root level, outside all containers */}
		{showBackgroundMenu && (
			<div className="fixed inset-0 flex items-center justify-center p-4 z-[9999999]">
				{/* Dark backdrop overlay */}
				<div 
					className="absolute inset-0 bg-black/70 backdrop-blur-sm"
					onClick={() => setShowBackgroundMenu(false)}
				/>
				
				{/* Popup card */}
				<div className="relative bg-[#2d2d2d] rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm animate-in zoom-in-95 duration-200">
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
								<Sparkles className="h-5 w-5 text-white" />
							</div>
							<h3 className="text-lg font-semibold text-white">Background Effects</h3>
						</div>
						<button
							onClick={() => setShowBackgroundMenu(false)}
							className="h-8 w-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-white/60 hover:text-white"
							title="Close background effects"
							aria-label="Close background effects"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
					
					{/* Options */}
					<div className="p-3">
						<button
							onClick={() => {
								applyBackgroundEffect('none')
								setShowBackgroundMenu(false)
							}}
							className={`w-full px-4 py-4 rounded-xl text-left text-sm transition-all flex items-center gap-3 mb-2 ${
								backgroundMode === 'none' 
									? 'bg-[#00DC6E]/10 border-2 border-[#00DC6E] text-[#00DC6E] font-medium shadow-lg shadow-[#00DC6E]/20' 
									: 'bg-white/5 hover:bg-white/10 text-white border-2 border-transparent'
							}`}
						>
							<div className={`w-3 h-3 rounded-full ${
								backgroundMode === 'none' ? 'bg-[#00DC6E]' : 'border-2 border-white/30'
							}`} />
							<div>
								<div className="font-medium">None</div>
								<div className="text-xs text-white/60 mt-0.5">Show original background</div>
							</div>
						</button>
						
<div className="mb-2">
						<button
							onClick={() => {
								if (backgroundMode !== 'blur') {
									applyBackgroundEffect('blur')
								}
							}}
							className={`w-full px-4 py-4 rounded-xl text-left text-sm transition-all flex items-center gap-3 ${
								backgroundMode === 'blur' 
									? 'bg-[#00DC6E]/10 border-2 border-[#00DC6E] text-[#00DC6E] font-medium shadow-lg shadow-[#00DC6E]/20' 
									: 'bg-white/5 hover:bg-white/10 text-white border-2 border-transparent'
							}`}
						>
							<div className={`w-3 h-3 rounded-full ${
								backgroundMode === 'blur' ? 'bg-[#00DC6E]' : 'border-2 border-white/30'
							}`} />
							<div>
								<div className="font-medium">Blur Background</div>
								<div className="text-xs text-white/60 mt-0.5">Blur everything behind you</div>
							</div>
						</button>
						
						{/* Blur Intensity Slider - Only shown when blur is active */}
						{backgroundMode === 'blur' && (
							<div className="px-4 py-3 bg-white/5 rounded-xl mt-2">
								<div className="flex items-center justify-between mb-2">
									<label className="text-xs font-medium text-white/80">Blur Intensity</label>
									<span className="text-xs font-mono text-[#00DC6E]">{blurAmount}</span>
								</div>
								<input
									type="range"
									min="1"
									max="20"
									step="1"
									value={blurAmount}
									onChange={(e) => handleBlurSliderChange(parseInt(e.target.value))}
									className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-green blur-slider"
									title={`Blur intensity: ${blurAmount}`}
									aria-label="Blur intensity slider"
								/>
								<div className="flex justify-between text-xs text-white/40 mt-1">
									<span>Subtle</span>
									<span>Strong</span>
								</div>
							</div>
						)}
					</div>
					
					<div className="mb-2">
						<button
							onClick={() => {
								if (backgroundMode !== 'virtual') {
									applyBackgroundEffect('virtual')
								}
							}}
							className={`w-full px-4 py-4 rounded-xl text-left text-sm transition-all flex items-center gap-3 ${
								backgroundMode === 'virtual' 
									? 'bg-[#00DC6E]/10 border-2 border-[#00DC6E] text-[#00DC6E] font-medium shadow-lg shadow-[#00DC6E]/20' 
									: 'bg-white/5 hover:bg-white/10 text-white border-2 border-transparent'
							}`}
						>
							<div className={`w-3 h-3 rounded-full ${
								backgroundMode === 'virtual' ? 'bg-[#00DC6E]' : 'border-2 border-white/30'
							}`} />
							<div>
								<div className="font-medium">Virtual Background</div>
								<div className="text-xs text-white/60 mt-0.5">Replace with custom image</div>
							</div>
						</button>
						
						{/* Virtual Background Options - Only shown when virtual is active */}
						{backgroundMode === 'virtual' && (
							<div className="px-4 py-3 bg-white/5 rounded-xl mt-2">
								<div className="mb-2">
									<label className="text-xs font-medium text-white/80">Choose Background</label>
								</div>
								<div className="grid grid-cols-3 gap-2">
									{VIRTUAL_BACKGROUNDS.map((bg: { id: number; name: string; url: string; thumbnail: string }) => (
										<button
											key={bg.id}
											onClick={() => {
												setSelectedVirtualBg(bg.id)
												applyBackgroundEffect('virtual')
											}}
											className={`relative rounded-lg overflow-hidden transition-all ${
												selectedVirtualBg === bg.id
													? 'ring-2 ring-[#00DC6E] ring-offset-2 ring-offset-[#2d2d2d]'
													: 'opacity-60 hover:opacity-100'
											}`}
										>
											<img
												src={bg.thumbnail}
												alt={bg.name}
												className="w-full h-16 object-cover"
											/>
											<div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
												<p className="text-xs text-white font-medium truncate">{bg.name}</p>
											</div>
											{selectedVirtualBg === bg.id && (
												<div className="absolute top-1 right-1 bg-[#00DC6E] rounded-full p-0.5">
													<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
														<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
													</svg>
												</div>
											)}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
					</div>
					
					{/* Footer note */}
					<div className="px-6 py-3 bg-white/5 rounded-b-2xl">
						<p className="text-xs text-white/50 text-center">
							💡 Effects work best in well-lit environments
						</p>
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
	</>
)
})

function ParticipantList({
	isHost,
	onMuteParticipant,
	onUnmuteParticipant,
	onDisableVideoParticipant,
	onEnableVideoParticipant,
	onLockUserAudio,
	onLockUserVideo,
	onRequestAudioOn,
	onRequestVideoOn,
	pendingParticipantRequests,
	onApproveAudioRequest,
	onApproveVideoRequest,
}: {
	isHost: boolean
	onMuteParticipant?: (targetUserId: string) => void
	onUnmuteParticipant?: (targetUserId: string) => void
	onDisableVideoParticipant?: (targetUserId: string) => void
	onEnableVideoParticipant?: (targetUserId: string) => void
	onLockUserAudio?: (targetUserId: string, locked: boolean) => void
	onLockUserVideo?: (targetUserId: string, locked: boolean) => void
	onRequestAudioOn?: (targetUserId: string) => void
	onRequestVideoOn?: (targetUserId: string) => void
	pendingParticipantRequests?: ParticipantPermissionRequest[]
	onApproveAudioRequest?: (userId: string, accepted: boolean) => void
	onApproveVideoRequest?: (userId: string, accepted: boolean) => void
}) {
	const participants = useParticipants()
	const { localParticipant } = useLocalParticipant()

	// Check if a participant has a pending audio request
	const hasAudioRequest = (identity: string) => 
		pendingParticipantRequests?.some(r => r.userId === identity && r.type === 'audio')
	
	// Check if a participant has a pending video request
	const hasVideoRequest = (identity: string) => 
		pendingParticipantRequests?.some(r => r.userId === identity && r.type === 'video')

	return (
		<div className="space-y-1">
			{participants.length === 0 ? (
				<div className="text-center py-6 md:py-8">
					<p className="text-xs md:text-sm text-white/50 font-sans">No other participants</p>
				</div>
			) : (
				participants.map((participant) => {
					const isLocal = participant.identity === localParticipant?.identity
					const isMicOn = participant.isMicrophoneEnabled
					const isCamOn = participant.isCameraEnabled

					return (
						<div
							key={participant.identity}
							className="flex items-start gap-3 p-2 md:p-3 rounded-lg hover:bg-white/5 transition-colors group"
						>
							<div className="relative h-9 w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-[#008CD2] to-[#00DC6E] flex items-center justify-center text-white font-medium flex-shrink-0 text-sm md:text-base font-sans">
								{participant.name?.charAt(0).toUpperCase() || participant.identity.charAt(0).toUpperCase()}
								{participant.isSpeaking && (
									<div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 md:h-3.5 md:w-3.5 bg-[#00DC6E] rounded-full border-2 border-[#1f1f1f] animate-pulse" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-medium text-sm md:text-base text-white truncate font-sans">
									{participant.name || participant.identity}
									{isLocal && <span className="text-white/50 text-xs ml-1">(You)</span>}
								</p>
								{participant.isSpeaking && (
									<p className="text-xs text-[#00DC6E] mt-0.5 font-sans">Speaking</p>
								)}
								{/* Show pending request indicator */}
								{isHost && !isLocal && hasAudioRequest(participant.identity) && (
									<p className="text-xs text-amber-400 mt-0.5 font-sans animate-pulse">🎤 Requesting to unmute</p>
								)}
								{isHost && !isLocal && hasVideoRequest(participant.identity) && (
									<p className="text-xs text-amber-400 mt-0.5 font-sans animate-pulse">📹 Requesting camera</p>
								)}
							</div>

							{/* Host moderation buttons - only show for remote participants */}
							{isHost && !isLocal && (
								<div className="flex flex-col items-end gap-1.5 flex-shrink-0">
									{/* Approve request buttons - shown above mic/video buttons */}
									{(hasAudioRequest(participant.identity) || hasVideoRequest(participant.identity)) && (
										<div className="flex gap-1">
											{hasAudioRequest(participant.identity) && (
												<button
													onClick={() => onApproveAudioRequest?.(participant.identity, true)}
													className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
													title="Approve unmute request"
												>
													✓ Unmute
												</button>
											)}
											{hasVideoRequest(participant.identity) && (
												<button
													onClick={() => onApproveVideoRequest?.(participant.identity, true)}
													className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
													title="Approve video request"
												>
													✓ Video
												</button>
											)}
										</div>
									)}
									{/* Mic/Video control buttons */}
									<div className="flex gap-1">
										{/* Individual mute button - mutes and locks, or requests unmute */}
										<button
											onClick={() => {
												if (isMicOn) {
													// Mute this participant (also locks their audio permission)
													onMuteParticipant?.(participant.identity)
												} else {
													// Request unmute - cannot force due to browser privacy
													onRequestAudioOn?.(participant.identity)
												}
											}}
											className={`p-1.5 rounded-full transition-colors ${isMicOn ? 'hover:bg-red-500/20 text-white/60 hover:text-red-400' : hasAudioRequest(participant.identity) ? 'bg-amber-500/30 text-amber-400' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
											title={isMicOn ? 'Mute this participant' : 'Ask to unmute'}
										>
											{isMicOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
										</button>
										{/* Individual video button - disables and locks, or requests video on */}
										<button
											onClick={() => {
												if (isCamOn) {
													// Disable video for this participant (also locks their video permission)
													onDisableVideoParticipant?.(participant.identity)
												} else {
													// Request video on - cannot force due to browser privacy
													onRequestVideoOn?.(participant.identity)
												}
											}}
											className={`p-1.5 rounded-full transition-colors ${isCamOn ? 'hover:bg-red-500/20 text-white/60 hover:text-red-400' : hasVideoRequest(participant.identity) ? 'bg-amber-500/30 text-amber-400' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
											title={isCamOn ? 'Turn off video' : 'Ask to start video'}
										>
											{isCamOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
										</button>
									</div>
								</div>
							)}
						</div>
					)
				})
			)}
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
		try {
			if (type === 'audio') {
				await localParticipant?.setMicrophoneEnabled(true)
			} else {
				await localParticipant?.setCameraEnabled(true)
			}
			onAccept()
		} catch (err) {
			console.error('Failed to enable device:', err)
			onDeny()
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
