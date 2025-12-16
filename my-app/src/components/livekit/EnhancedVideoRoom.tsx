'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { LiveKitRoom, useParticipants, useRoomContext, useTrackToggle, useTracks, GridLayout, ParticipantTile, RoomAudioRenderer, useSpeakingParticipants } from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Users, Maximize2, Minimize2, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Clock, MonitorUp, MonitorOff, Grid2X2, Presentation, Pin, PinOff } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSessionTimer } from '@/hooks/use-session-timer'
import { SessionEndWarningDialog } from '@/components/study-room/session-end-warning-dialog'
import { SessionEndedDialog } from '@/components/study-room/session-ended-dialog'
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
	const [showEnded, setShowEnded] = useState(false)
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
			
			// Host: Redirect directly to dashboard (no review)
			console.log('🏠 Host session ended, redirecting to dashboard')
			router.push('/dashboard')
		} else {
			// Participant: Show review dialog
			console.log('👤 Participant session ended, showing review dialog')
			setShowEnded(true)
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
				video={true}
				audio={{
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				}}
				token={token}
				serverUrl={serverUrl}
				connect={true}
				className="flex-1 flex flex-col overflow-hidden"
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
					open={showWarning && !showEnded}
					minutesRemaining={5}
					onClose={() => setShowWarning(false)}
				/>
			)}

			{/* Session Ended Dialog - Only for participants (not host) */}
			{timerEnabled && sessionData?.id && !isHost && (
				<SessionEndedDialog
					open={showEnded}
					sessionId={sessionData.id}
					sessionType={sessionData.sessionType}
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
	const participants = useParticipants()
	
	// Layout mode: 'focus' shows speaker large with others small, 'grid' shows equal tiles
	const [layoutMode, setLayoutMode] = useState<'focus' | 'grid'>('grid')
	
	// Pinned participant - manually pinned by user
	const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)
	
	// Use useTrackToggle hooks for video, mic, and screen share controls
	const { buttonProps: videoButtonProps, enabled: isVideoEnabled } = useTrackToggle({ source: Track.Source.Camera })
	const { buttonProps: micButtonProps, enabled: isMicEnabled } = useTrackToggle({ source: Track.Source.Microphone })
	const { buttonProps: screenShareButtonProps, enabled: isScreenShareEnabled } = useTrackToggle({ source: Track.Source.ScreenShare })
	
	const [isAudioEnabled, setIsAudioEnabled] = useState(true)

	// Get all camera and screen share tracks for the grid layout
	const allTracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ onlySubscribed: false }
	)
	
	// Separate camera and screen share tracks
	const { cameraTracks, screenShareTracks } = useMemo(() => {
		const camera = allTracks.filter(track => track.source === Track.Source.Camera)
		const screenShare = allTracks.filter(track => track.source === Track.Source.ScreenShare)
		return { cameraTracks: camera, screenShareTracks: screenShare }
	}, [allTracks])
	
	// For grid view, show all camera tracks (no filtering - let LiveKit handle duplicates)
	const tracks = cameraTracks
	
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
	
	// Separate focused track from other tracks
	// Screen share gets highest priority in focus view
	const { focusedTrack, otherTracks, isScreenShareFocused } = useMemo(() => {
		if (layoutMode === 'grid' || tracks.length === 0) {
			return { focusedTrack: null, otherTracks: tracks, isScreenShareFocused: false }
		}
		
		// Priority 1: If someone is screen sharing, show that as the main view
		if (activeScreenShare) {
			// Show all camera tracks as thumbnails when screen sharing
			return { 
				focusedTrack: activeScreenShare, 
				otherTracks: tracks, // All camera tracks go to thumbnails
				isScreenShareFocused: true 
			}
		}
		
		// Priority 2: Show focused participant's camera
		if (!focusedParticipant) {
			return { focusedTrack: null, otherTracks: tracks, isScreenShareFocused: false }
		}
		
		const focused = tracks.find(
			t => t.participant.identity === focusedParticipant.identity
		)
		const others = tracks.filter(
			t => t.participant.identity !== focusedParticipant.identity
		)
		
		// If no focused track found but we have tracks, use the first one
		if (!focused && tracks.length > 0) {
			return { focusedTrack: tracks[0], otherTracks: tracks.slice(1), isScreenShareFocused: false }
		}
		
		return { focusedTrack: focused || null, otherTracks: others, isScreenShareFocused: false }
	}, [tracks, focusedParticipant, layoutMode, activeScreenShare])

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
						/* Reset any LiveKit speaking indicator colors that might cause green overlay */
						.video-grid-container .lk-participant-tile[data-lk-speaking="true"]::before,
						.video-grid-container [data-lk-speaking="true"]::before {
							display: none !important;
						}
						
						.video-grid-container .lk-participant-tile,
						.video-grid-container [data-lk-participant-tile] {
							border: none !important;
							outline: none !important;
						}
						
						/* Override any green background from LiveKit */
						.video-grid-container .lk-video-container,
						.video-grid-container video {
							background: #2d2d2d !important;
						}
						
						/* Grid Layout - Let LiveKit handle it */
						.video-grid-container .grid-mode {
							height: 100%;
							width: 100%;
							padding: 8px;
						}
						
						@media (max-width: 768px) {
							.video-grid-container .grid-mode {
								padding: 4px;
							}
						}
						
						/* Focus Layout Styles */
						.focus-layout-container {
							display: flex;
							flex-direction: column;
							height: 100%;
							width: 100%;
							padding: 8px;
							gap: 8px;
							overflow: hidden;
						}
						
						@media (max-width: 768px) {
							.focus-layout-container {
								padding: 4px;
								gap: 4px;
							}
						}
						
						.focus-main-video {
							flex: 1;
							min-height: 0;
							border-radius: 12px;
							overflow: hidden;
							background: #2d2d2d;
							position: relative;
						}
						
						/* Prevent any color overlay on the main video */
						.focus-main-video > div,
						.focus-main-video [data-lk-participant-tile],
						.focus-main-video .lk-participant-tile {
							width: 100% !important;
							height: 100% !important;
							background: #2d2d2d !important;
						}
						
						/* Ensure video displays correctly without color tint */
						.focus-main-video video {
							object-fit: contain !important;
							background: transparent !important;
						}
						
						.focus-thumbnails {
							display: flex;
							gap: 8px;
							height: 100px;
							min-height: 100px;
							max-height: 100px;
							flex-shrink: 0;
							overflow-x: auto;
							overflow-y: hidden;
							padding: 4px 0;
							align-items: center;
						}
						
						@media (max-width: 768px) {
							.focus-thumbnails {
								height: 70px;
								min-height: 70px;
								max-height: 70px;
								gap: 4px;
							}
						}
						
						.focus-thumbnail {
							width: 140px;
							min-width: 140px;
							height: 100%;
							flex-shrink: 0;
							border-radius: 8px;
							overflow: hidden;
							background: #2d2d2d;
							border: 2px solid transparent;
							position: relative;
						}
						
						.focus-thumbnail > div {
							width: 100% !important;
							height: 100% !important;
						}
						
						.focus-thumbnail.speaking {
							border-color: #00DC6E;
						}
						
						.focus-thumbnail.pinned {
							border-color: #00DC6E;
							box-shadow: 0 0 0 2px rgba(0, 220, 110, 0.3);
						}
						
						@media (max-width: 768px) {
							.focus-thumbnail {
								width: 100px;
								min-width: 100px;
							}
						}
					`}} />
					{tracks.length > 0 ? (
						layoutMode === 'focus' && focusedTrack ? (
							<div className="focus-layout-container">
								{/* Main focused video */}
								<div className="focus-main-video relative group">
									<ParticipantTile trackRef={focusedTrack} />
									{/* Screen Share indicator */}
									{isScreenShareFocused && (
										<div className="absolute top-2 left-2 flex items-center gap-1 bg-[#008CD2] text-white text-xs px-2 py-1 rounded-full z-10">
											<MonitorUp className="h-3 w-3" />
											<span>Screen Share - {focusedTrack.participant.name || focusedTrack.participant.identity}</span>
										</div>
									)}
									{/* Pin/Unpin button overlay - only show when not screen sharing */}
									{!isScreenShareFocused && (
										<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
											<Button
												variant="ghost"
												size="sm"
												onClick={togglePinFocused}
												className={`h-8 w-8 rounded-full p-0 ${
													pinnedParticipantId === focusedParticipant?.identity
														? 'bg-[#00DC6E] text-white hover:bg-[#00b058]'
														: 'bg-black/50 text-white hover:bg-black/70'
												}`}
												title={pinnedParticipantId === focusedParticipant?.identity ? 'Unpin' : 'Pin this video'}
											>
												{pinnedParticipantId === focusedParticipant?.identity ? (
													<PinOff className="h-4 w-4" />
												) : (
													<Pin className="h-4 w-4" />
												)}
											</Button>
										</div>
									)}
									{/* Pinned indicator - only show when not screen sharing */}
									{!isScreenShareFocused && pinnedParticipantId === focusedParticipant?.identity && (
										<div className="absolute top-2 left-2 flex items-center gap-1 bg-[#00DC6E] text-white text-xs px-2 py-1 rounded-full z-10">
											<Pin className="h-3 w-3" />
											<span>Pinned</span>
										</div>
									)}
								</div>
								
								{/* Thumbnail strip for other participants */}
								{otherTracks.length > 0 && (
									<div className="focus-thumbnails">
										{otherTracks.map((track) => (
											<div 
												key={`${track.participant.identity}-${track.source}`}
												className={`focus-thumbnail cursor-pointer ${
													track.participant.isSpeaking ? 'speaking' : ''
												} ${
													pinnedParticipantId === track.participant.identity ? 'pinned' : ''
												} hover:border-white/50 transition-all`}
												onClick={() => handleThumbnailClick(track.participant.identity)}
												title={`Click to focus on ${track.participant.name || track.participant.identity}`}
											>
												<ParticipantTile trackRef={track} />
												{/* Pin indicator on thumbnail */}
												{pinnedParticipantId === track.participant.identity && (
													<div className="absolute top-1 right-1 bg-[#00DC6E] rounded-full p-0.5">
														<Pin className="h-2.5 w-2.5 text-white" />
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						) : (
							<div className="grid-mode h-full w-full">
								<GridLayout 
									tracks={tracks} 
									className="h-full w-full"
								>
									<ParticipantTile />
								</GridLayout>
							</div>
						)
					) : (
						<div className="h-full w-full flex items-center justify-center">
							<p className="text-white/50 text-sm font-sans">Waiting for participants...</p>
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
				
				{/* Video Toggle */}
				<Button
					{...videoButtonProps}
					variant="ghost"
					size="lg"
					className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 flex-shrink-0 ${
						isVideoEnabled 
							? 'bg-white/10 hover:bg-white/20 text-white' 
							: 'bg-[#ea4335] hover:bg-[#d33b2c] text-white'
					}`}
					title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
				>
					{isVideoEnabled ? <Video className="h-5 w-5 md:h-6 md:w-6" /> : <VideoOff className="h-5 w-5 md:h-6 md:w-6" />}
				</Button>

				{/* Mic Toggle */}
				<Button
					{...micButtonProps}
					variant="ghost"
					size="lg"
					className={`h-10 w-10 md:h-12 md:w-12 rounded-full transition-all p-0 flex-shrink-0 ${
						isMicEnabled 
							? 'bg-white/10 hover:bg-white/20 text-white' 
							: 'bg-[#ea4335] hover:bg-[#d33b2c] text-white'
					}`}
					title={isMicEnabled ? "Turn off microphone" : "Turn on microphone"}
				>
					{isMicEnabled ? <Mic className="h-5 w-5 md:h-6 md:w-6" /> : <MicOff className="h-5 w-5 md:h-6 md:w-6" />}
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
					{...screenShareButtonProps}
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

			{/* Chat Sidebar - Mobile: Full screen overlay, Desktop: Sidebar */}
			{showChat && (
				<>
					{/* Mobile Overlay Backdrop */}
					<div
						className="fixed inset-0 bg-black/70 z-40 md:hidden"
						onClick={() => setShowChat(false)}
					/>
					{/* Chat Panel */}
					<div className="fixed md:absolute right-0 top-0 bottom-0 w-full md:w-80 bg-[#1f1f1f] border-l border-white/5 flex flex-col z-50 md:z-10">
						<div className="h-12 md:h-14 bg-[#1f1f1f] border-b border-white/5 flex items-center justify-between px-4">
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
						<div className="flex-1 overflow-hidden min-h-0">
							{channelId ? (
								<ChatWidget channelId={channelId} className="h-full" />
							) : (
								<div className="flex items-center justify-center h-full">
									<p className="text-white/50 text-sm px-4 text-center font-sans">
										Chat is not available for this session
									</p>
								</div>
							)}
						</div>
					</div>
				</>
			)}

			{/* Participants Sidebar - Mobile: Full screen overlay, Desktop: Sidebar */}
			{showParticipants && (
				<>
					{/* Mobile Overlay Backdrop */}
					<div 
						className="fixed inset-0 bg-black/70 z-40 md:hidden"
						onClick={() => setShowParticipants(false)}
					/>
					{/* Participants Panel */}
					<div className={`fixed md:absolute right-0 top-0 bottom-0 w-full md:w-64 bg-[#1f1f1f] border-l border-white/5 flex flex-col z-50 md:z-20 ${showChat ? 'md:right-80' : ''}`}>
						<div className="h-12 md:h-14 bg-[#1f1f1f] border-b border-white/5 flex items-center justify-between px-4">
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

