'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { LiveKitRoom, useParticipants, useRoomContext, useTrackToggle, useTracks, GridLayout, ParticipantTile, RoomAudioRenderer } from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Users, Maximize2, Minimize2, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Clock, MonitorUp, MonitorOff } from 'lucide-react'
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
}) {
	const room = useRoomContext()
	const params = useParams<{ room: string }>()
	
	// Use useTrackToggle hooks for video, mic, and screen share controls
	const { buttonProps: videoButtonProps, enabled: isVideoEnabled } = useTrackToggle({ source: Track.Source.Camera })
	const { buttonProps: micButtonProps, enabled: isMicEnabled } = useTrackToggle({ source: Track.Source.Microphone })
	const { buttonProps: screenShareButtonProps, enabled: isScreenShareEnabled } = useTrackToggle({ source: Track.Source.ScreenShare })
	
	const [isAudioEnabled, setIsAudioEnabled] = useState(true)

	// Get all camera and screen share tracks for the grid layout
	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ onlySubscribed: false }
	)

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
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowParticipants(!showParticipants)}
							className={`h-9 w-9 md:h-10 md:w-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all p-0 ${
								showParticipants ? 'bg-white/10 text-white' : ''
							}`}
							title="Participants"
						>
							<Users className="h-4 w-4 md:h-5 md:w-5" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowChat(!showChat)}
							className={`h-9 w-9 md:h-10 md:w-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all p-0 ${
								showChat ? 'bg-white/10 text-white' : ''
							}`}
							title="Chat"
						>
							<MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={toggleFullscreen}
							className="h-9 w-9 md:h-10 md:w-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all p-0 hidden md:flex"
							title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
						>
							{isFullscreen ? <Minimize2 className="h-4 w-4 md:h-5 md:w-5" /> : <Maximize2 className="h-4 w-4 md:h-5 md:w-5" />}
						</Button>
					</div>
				</div>

				{/* Video Grid - Google Meet style - Properly constrained and centered */}
				<div className="flex-1 overflow-hidden bg-[#202124] relative min-h-0 video-grid-container">
					<style dangerouslySetInnerHTML={{__html: `
						/* Hide scrollbars on mobile */
						@media (max-width: 768px) {
							* {
								-webkit-overflow-scrolling: touch;
								scrollbar-width: none !important;
								-ms-overflow-style: none !important;
							}
							*::-webkit-scrollbar {
								display: none !important;
								width: 0 !important;
								height: 0 !important;
							}
						}
						
						.video-grid-container [class*="lk-grid"],
						.video-grid-container [class*="grid-layout"],
						.video-grid-container > div[class*="grid"] {
							display: grid !important;
							height: 100% !important;
							width: 100% !important;
							overflow: hidden !important;
							place-items: center !important;
							grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)) !important;
							grid-auto-rows: minmax(0, 1fr) !important;
							gap: 0 !important;
							margin: 0 !important;
							padding: 0 !important;
						}
						.video-grid-container [class*="lk-participant"],
						.video-grid-container [class*="participant-tile"],
						.video-grid-container > div[class*="grid"] > div {
							width: 100% !important;
							height: 100% !important;
							max-width: 100% !important;
							max-height: 100% !important;
							display: flex !important;
							align-items: center !important;
							justify-content: center !important;
							overflow: hidden !important;
							position: relative !important;
						}
						/* Ensure participant names are visible */
						.video-grid-container [class*="lk-participant"] [class*="name"],
						.video-grid-container [class*="participant-tile"] [class*="name"],
						.video-grid-container [class*="lk-participant"] [class*="identity"],
						.video-grid-container [class*="participant-tile"] [class*="identity"],
						.video-grid-container [class*="lk-participant"] > div:not([class*="video"]):not([class*="canvas"]),
						.video-grid-container [class*="participant-tile"] > div:not([class*="video"]):not([class*="canvas"]) {
							display: block !important;
							visibility: visible !important;
							opacity: 1 !important;
							z-index: 10 !important;
						}
						.video-grid-container video,
						.video-grid-container canvas {
							width: 100% !important;
							height: 100% !important;
							object-fit: contain !important;
							max-width: 100% !important;
							max-height: 100% !important;
						}
					`}} />
					{tracks.length > 0 ? (
						<GridLayout 
							tracks={tracks} 
							className="h-full w-full"
						>
							<ParticipantTile />
						</GridLayout>
					) : (
						<div className="h-full w-full flex items-center justify-center">
							<p className="text-white/50 text-sm font-sans">Waiting for participants...</p>
						</div>
					)}
					<RoomAudioRenderer />
				</div>
			</div>

			{/* Controls Bar - Google Meet style, fixed at bottom - Always visible */}
			<div className={`fixed bottom-0 left-0 right-0 h-16 md:h-20 bg-[#1f1f1f] border-t border-white/5 flex items-center justify-center gap-1.5 md:gap-3 px-2 md:px-4 z-50 ${showChat && !showParticipants ? 'md:right-80' : ''} ${showParticipants && !showChat ? 'md:right-64' : ''} ${showChat && showParticipants ? 'md:right-[22rem]' : ''}`} style={{ overflowX: 'hidden', overflowY: 'hidden' }}>
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

