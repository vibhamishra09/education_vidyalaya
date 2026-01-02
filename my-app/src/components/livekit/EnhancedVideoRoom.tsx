'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { LiveKitRoom, useParticipants, useRoomContext, useTracks, RoomAudioRenderer, useSpeakingParticipants, VideoTrack, useLocalParticipant, isTrackReference } from '@livekit/components-react'
import { Track, RoomOptions, VideoPresets } from 'livekit-client'
import '@livekit/components-styles'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Users, Maximize2, Minimize2, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Clock, MonitorUp, MonitorOff, Grid2X2, Presentation, Pin, PinOff, User, PictureInPicture2 } from 'lucide-react'
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
	
	const handleTimeUp = useCallback(async () => {
		// Only host should call the backend to complete the session
		if (sessionData?.id && sessionData?.sessionType && isHost) {
			try {
				const authToken = await getToken()
				
				if (sessionData.sessionType === 'studyRoom') {
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
						console.log('✅ Study room completed, streaks updated')
						// Invalidate queries to refresh UI (streaks + dashboard + achievements)
						await queryClient.invalidateQueries({ queryKey: streakKeys.current() })
						await queryClient.invalidateQueries({ queryKey: streakKeys.history(14) })
						await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
						await queryClient.invalidateQueries({ queryKey: achievementKeys.all })
						await queryClient.invalidateQueries({ queryKey: ['profile'] })
					}
				} else if (sessionData.sessionType === 'peerSession') {
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
						console.log('✅ Peer session completed, streaks updated')
						// Invalidate queries to refresh UI (streaks + dashboard + achievements)
						await queryClient.invalidateQueries({ queryKey: streakKeys.current() })
						await queryClient.invalidateQueries({ queryKey: streakKeys.history(14) })
						await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
						await queryClient.invalidateQueries({ queryKey: achievementKeys.all })
						await queryClient.invalidateQueries({ queryKey: ['profile'] })
					}
				}
			} catch (error) {
				console.error('Error completing session:', error)
			}
			
			// Host: Redirect to feedback page
			console.log('🏠 Host session ended, redirecting to feedback page')
			router.push(`/session-feedback/${sessionData?.id}?type=${sessionData?.sessionType}&isHost=true`)
		} else {
			// Participant: Redirect to feedback page (starts with review)
			console.log('👤 Participant session ended, redirecting to feedback page')
			if (sessionData?.id) {
				router.push(`/session-feedback/${sessionData.id}?type=${sessionData.sessionType}&isHost=false`)
			} else {
				router.push('/dashboard')
			}
		}
	}, [sessionData?.id, sessionData?.sessionType, isHost, getToken, queryClient, router])

	const handleWarning = useCallback((minutes: number) => {
		setShowWarning(true)
		showSuccessRef.current('⏰ Session Ending Soon', `Your session will end in ${minutes} minutes.`)
	}, [])
	
	const { formattedTime, minutesLeft } = useSessionTimer({
		startTime: sessionStartTimestamp,
		duration: sessionDuration || 60,
		enabled: timerEnabled,
		onTimeUp: handleTimeUp,
		onWarning: handleWarning,
	})

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

	const handleLeave = () => {
		router.back()
	}

	return (
		<div className="h-screen w-screen flex flex-col bg-[#202124] overflow-hidden" style={{ overflow: 'hidden', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
			<LiveKitRoom
				video={false}
				audio={true}
				token={token}
				serverUrl={serverUrl}
				connect={true}
				className="flex-1 flex flex-col overflow-hidden"
				options={{
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
				} as RoomOptions}
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
					formattedTime={formattedTime}
					minutesLeft={minutesLeft}
					sessionTitle={sessionData?.title as string | undefined}
					isHost={isHost}
				/>
		</LiveKitRoom>

		{/* Warning Dialog - Shows at 5 minutes (Only for host) */}
		{timerEnabled && isHost && (
			<SessionEndWarningDialog
					open={showWarning}
					minutesRemaining={5}
					onClose={() => setShowWarning(false)}
				/>
			)}
		</div>
	)
}

function VideoRoomContent({
	showChat,
	setShowChat,
	showParticipants,
	setShowParticipants,
	isFullscreen,
	setIsFullscreen,
	channelId,
	onLeave,
	timerEnabled,
	formattedTime,
	minutesLeft,
	sessionTitle,
	isHost,
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
	formattedTime: string
	minutesLeft: number
	sessionTitle?: string
	isHost: boolean
}) {
	const room = useRoomContext()
	const params = useParams<{ room: string }>()
	
	// Get local participant state directly - most reliable source of truth
	const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant()
	
	// Layout mode: 'focus' shows speaker large with others small, 'grid' shows equal tiles
	const [layoutMode, setLayoutMode] = useState<'focus' | 'grid'>('grid')
	
	// Pinned participant - manually pinned by user
	const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)
	
	const [isAudioEnabled, setIsAudioEnabled] = useState(true)

	// Get all camera tracks using useTracks - the standard way
	const cameraTracks = useTracks(
		[{ source: Track.Source.Camera, withPlaceholder: true }],
		{ onlySubscribed: false }
	)
	
	// Get screen share tracks
	const screenShareTracks = useTracks(
		[{ source: Track.Source.ScreenShare, withPlaceholder: false }]
	)
	

	
	// Find the focused participant (screenShare > pinned > speaking > host)
	const speakingParticipants = useSpeakingParticipants()
	
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
		
		// Priority 3: Speaking participant
		if (speakingParticipants.length > 0 && !activeScreenShare) {
			return speakingParticipants[0]
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
	}, [speakingParticipants, room, isHost, pinnedParticipantId, activeScreenShare])
	
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
		<div className="flex-1 flex relative bg-[#202124] overflow-hidden" style={{ overflow: 'hidden', height: '100%', width: '100%' }}>
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
				<div className="flex-1 overflow-hidden bg-[#202124] relative min-h-0 video-grid-container" style={{ paddingBottom: '80px' }}>
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
					
					/* Custom Grid Layout */
					.custom-grid {
						display: grid;
						grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
						gap: 8px;
						height: 100%;
						width: 100%;
						padding: 4px;
						align-content: center;
					}
					
					@media (max-width: 768px) {
						.custom-grid {
							grid-template-columns: 1fr 1fr;
							grid-auto-rows: minmax(auto, 1fr);
							gap: 6px;
							padding: 8px;
							align-content: start;
						}
					}
					
					/* 2 participants - equal split */
					.custom-grid:has(> :nth-child(2):last-child) {
						grid-template-columns: repeat(2, 1fr);
					}
					
					/* 3-4 participants - 2x2 grid */
					.custom-grid:has(> :nth-child(3):last-child),
					.custom-grid:has(> :nth-child(4):last-child) {
						grid-template-columns: repeat(2, 1fr);
					}
					
					/* Mobile: Stack vertically for 2 participants for better visibility */
					@media (max-width: 480px) {
						.custom-grid:has(> :nth-child(2):last-child) {
							grid-template-columns: 1fr;
							grid-template-rows: 1fr 1fr;
							gap: 8px;
						}
					}
					
					.custom-grid-tile {
						position: relative;
						width: 100%;
						aspect-ratio: 16 / 9;
						border-radius: 12px;
						overflow: hidden;
						background: #2d2d2d;
					}
					
					@media (max-width: 768px) {
						.custom-grid-tile {
							aspect-ratio: 4 / 3;
							border-radius: 8px;
							min-height: 0;
						}
					}
					
					@media (max-width: 480px) {
						.custom-grid-tile {
							aspect-ratio: 16 / 9;
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
							<div className="custom-grid">
								{sortedCameraTracks.map((track) => {
									const isLocal = track.participant.isLocal
									const hasVideo = isTrackReference(track) && track.publication?.track
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
											{/* You label for local participant */}
											{isLocal && (
												<div className="absolute bottom-10 left-2 bg-[#008CD2] text-white text-xs px-2 py-0.5 rounded-full z-20">
													You
												</div>
											)}
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
				className={`fixed bottom-0 left-0 right-0 h-16 md:h-20 bg-[#1f1f1f]/95 backdrop-blur-sm border-t border-white/5 flex items-center justify-center gap-1.5 md:gap-3 px-2 md:px-4 ${showChat && !showParticipants ? 'md:right-80' : ''} ${showParticipants && !showChat ? 'md:right-64' : ''} ${showChat && showParticipants ? 'md:right-[22rem]' : ''}`} 
				style={{ 
					overflowX: 'hidden', 
					overflowY: 'hidden', 
					zIndex: 9999,  // Highest z-index to appear above everything including fullscreen
					position: 'fixed',  // Ensure it stays fixed
				}}
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

				{/* Mic Toggle */}
				<Button
					onClick={async () => {
						try {
							const participant = room?.localParticipant
							if (!participant) return
							
							const newState = !participant.isMicrophoneEnabled
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

				{/* Leave Button - Always visible */}
				<Button
					onClick={onLeave}
					variant="ghost"
					size="lg"
					className="h-10 px-3 md:h-12 md:px-6 rounded-full bg-[#ea4335] hover:bg-[#d33b2c] text-white font-medium text-xs md:text-base flex-shrink-0"
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
							<ChatWidget channelId={channelId} className="flex-1 min-h-0 overflow-hidden" />
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
					{/* Mobile Overlay Backdrop */}
					<div 
						className="fixed inset-0 bg-black/40 z-40 md:hidden"
						onClick={() => setShowParticipants(false)}
					/>
					{/* Participants Panel - Mobile: Bottom sheet, Desktop: Sidebar */}
					<div className={`fixed md:absolute right-0 md:top-0 bottom-0 left-0 md:left-auto w-full md:w-64 h-[50vh] md:h-full bg-[#1f1f1f] border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-50 md:z-20 rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none ${showChat ? 'md:right-80' : ''}`}>
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
						<div className="flex-1 overflow-y-auto p-3 md:p-4">
							<ParticipantList />
						</div>
					</div>
				</>
			)}
		</div>
	)
}

function ParticipantList() {
	const participants = useParticipants()

	return (
		<div className="space-y-1">
			{participants.length === 0 ? (
				<div className="text-center py-6 md:py-8">
					<p className="text-xs md:text-sm text-white/50 font-sans">No other participants</p>
				</div>
			) : (
				participants.map((participant) => (
					<div
						key={participant.identity}
						className="flex items-center gap-3 p-2 md:p-3 rounded-lg hover:bg-white/5 transition-colors group"
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
							</p>
							{participant.isSpeaking && (
								<p className="text-xs text-[#00DC6E] mt-0.5 font-sans">Speaking</p>
							)}
						</div>
					</div>
				))
			)}
		</div>
	)
}

