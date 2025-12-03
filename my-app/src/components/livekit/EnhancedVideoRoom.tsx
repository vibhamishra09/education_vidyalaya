'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { LiveKitRoom, useParticipants, useRoomContext, useTrackToggle, useTracks, GridLayout, ParticipantTile, RoomAudioRenderer } from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Users, Maximize2, Minimize2, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Clock } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSessionTimer } from '@/hooks/use-session-timer'
import { SessionEndWarningDialog } from '@/components/study-room/session-end-warning-dialog'
import { SessionEndedDialog } from '@/components/study-room/session-ended-dialog'
import { useToast } from '@/contexts/toast-context'
import { useAuth, useUser } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import { streakKeys } from '@/hooks/use-streaks'
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
						// Invalidate streak queries to refresh UI
						await queryClient.invalidateQueries({ queryKey: streakKeys.current() })
						await queryClient.invalidateQueries({ queryKey: streakKeys.history(14) })
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
						// Invalidate streak queries to refresh UI
						await queryClient.invalidateQueries({ queryKey: streakKeys.current() })
						await queryClient.invalidateQueries({ queryKey: streakKeys.history(14) })
					}
				}
			} catch (error) {
				console.error('Error completing session:', error)
			}
		}
		// Show ended dialog for all users (host and participants)
		setShowEnded(true)
	}, [sessionData?.id, sessionData?.sessionType, isHost, getToken, queryClient])

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
		<div className="h-screen w-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
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
				className="flex-1 flex flex-col"
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
					isRecording={isListening}
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

			{/* Session Ended Dialog */}
			{timerEnabled && sessionData?.id && (
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
	isRecording,
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
	isRecording?: boolean
}) {
	const room = useRoomContext()
	const params = useParams<{ room: string }>()
	
	// Use useTrackToggle hooks for video and mic controls
	const { buttonProps: videoButtonProps, enabled: isVideoEnabled } = useTrackToggle({ source: Track.Source.Camera })
	const { buttonProps: micButtonProps, enabled: isMicEnabled } = useTrackToggle({ source: Track.Source.Microphone })
	
	const [isAudioEnabled, setIsAudioEnabled] = useState(true)

	// Get all camera tracks for the grid layout
	const tracks = useTracks(
		[{ source: Track.Source.Camera, withPlaceholder: true }],
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
		<div className="flex-1 flex relative">
			{/* Main Video Area */}
			<div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${showChat && !showParticipants ? 'md:mr-80' : ''} ${showParticipants && !showChat ? 'md:mr-64' : ''} ${showChat && showParticipants ? 'md:mr-[22rem]' : ''}`}>
				{/* Clean Top Bar */}
				<div className="h-12 md:h-14 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-3 md:px-6 z-30">
					{/* Logo and Room Info */}
					<div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
						<div className="flex items-center gap-2 md:gap-3 min-w-0">
							<div className="relative h-6 w-6 md:h-8 md:w-8 rounded-lg overflow-hidden flex-shrink-0">
								<Image
									src="/webyalaya-main-logo.svg"
									alt="Webyalaya"
									fill
									className="object-contain p-1"
									priority
								/>
							</div>
							<div className="flex flex-col min-w-0">
								<span className="text-white font-brand text-xs md:text-sm leading-tight truncate">Webyalaya</span>
								<span className="text-white/60 text-[10px] md:text-xs truncate">
									{params.room?.replace('session-', '').replace('studyroom-', '') || 'Video Call'}
								</span>
							</div>
						</div>

						{/* Session Timer */}
						{timerEnabled && (
							<div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
								<Clock className="h-4 w-4 text-white/80" />
								<span
									className={`font-mono font-semibold text-sm ${
										minutesLeft <= 2 ? "text-red-400 animate-pulse" : "text-white"
									}`}
								>
									{formattedTime}
								</span>
							</div>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
						{/* AI Transcript Recording Indicator */}
						{isRecording && (
							<div className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-500/30">
								<div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
								<span className="text-red-400 text-[10px] md:text-xs font-medium hidden md:inline">AI Recording</span>
								<span className="text-red-400 text-[10px] font-medium md:hidden">REC</span>
							</div>
						)}

						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowParticipants(!showParticipants)}
							className={`h-8 w-8 md:h-9 md:w-auto md:px-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all p-0 ${
								showParticipants ? 'bg-white/10 text-white' : ''
							}`}
						>
							<Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowChat(!showChat)}
							className={`h-8 w-8 md:h-9 md:w-auto md:px-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all p-0 ${
								showChat ? 'bg-white/10 text-white' : ''
							}`}
						>
							<MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={toggleFullscreen}
							className="h-8 w-8 md:h-9 md:w-auto md:px-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all p-0 hidden md:flex"
						>
							{isFullscreen ? <Minimize2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Maximize2 className="h-3.5 w-3.5 md:h-4 md:w-4" />}
						</Button>
					</div>
				</div>

				{/* Video Grid - Clean and Spacious */}
				<div className="flex-1 overflow-y-auto bg-black/50 relative pb-16 md:pb-20">
					{tracks.length > 0 ? (
						<GridLayout tracks={tracks} className="h-full w-full min-h-full">
							<ParticipantTile />
						</GridLayout>
					) : (
						<div className="h-full w-full flex items-center justify-center">
							<p className="text-white/60 text-sm">Waiting for participants...</p>
						</div>
					)}
					<RoomAudioRenderer />
				</div>
			</div>

			{/* Custom Controls Bar - Fixed at bottom */}
			<div className={`fixed bottom-0 left-0 right-0 h-16 md:h-20 bg-black/60 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-2 md:gap-3 px-2 md:px-6 z-50 ${showChat && !showParticipants ? 'md:right-80' : ''} ${showParticipants && !showChat ? 'md:right-64' : ''} ${showChat && showParticipants ? 'md:right-[22rem]' : ''}`}>
					{/* Video Toggle */}
					<Button
						{...videoButtonProps}
						variant={isVideoEnabled ? "default" : "destructive"}
						size="lg"
						className={`h-10 w-10 md:h-12 md:w-auto md:px-6 rounded-full transition-all p-0 ${
							isVideoEnabled 
								? 'bg-white/20 hover:bg-white/30 text-white' 
								: 'bg-red-600 hover:bg-red-700 text-white'
						}`}
					>
						{isVideoEnabled ? <Video className="h-4 w-4 md:h-5 md:w-5" /> : <VideoOff className="h-4 w-4 md:h-5 md:w-5" />}
					</Button>

					{/* Mic Toggle */}
					<Button
						{...micButtonProps}
						variant={isMicEnabled ? "default" : "destructive"}
						size="lg"
						className={`h-10 w-10 md:h-12 md:w-auto md:px-6 rounded-full transition-all p-0 ${
							isMicEnabled 
								? 'bg-white/20 hover:bg-white/30 text-white' 
								: 'bg-red-600 hover:bg-red-700 text-white'
						}`}
					>
						{isMicEnabled ? <Mic className="h-4 w-4 md:h-5 md:w-5" /> : <MicOff className="h-4 w-4 md:h-5 md:w-5" />}
					</Button>

					{/* Audio Output Toggle - Hidden on mobile */}
					<Button
						onClick={toggleAudio}
						variant={isAudioEnabled ? "default" : "secondary"}
						size="lg"
						className={`h-10 w-10 md:h-12 md:w-auto md:px-6 rounded-full transition-all p-0 hidden md:flex ${
							isAudioEnabled 
								? 'bg-white/20 hover:bg-white/30 text-white' 
								: 'bg-white/10 hover:bg-white/20 text-white/60'
						}`}
					>
						{isAudioEnabled ? <Volume2 className="h-4 w-4 md:h-5 md:w-5" /> : <VolumeX className="h-4 w-4 md:h-5 md:w-5" />}
					</Button>

					{/* Leave Button */}
					<Button
						onClick={onLeave}
						variant="destructive"
						size="lg"
						className="h-10 px-4 md:h-12 md:px-8 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs md:text-base"
					>
						Leave
					</Button>
				</div>

			{/* Chat Sidebar - Mobile: Full screen overlay, Desktop: Sidebar */}
			{showChat && (
				<>
					{/* Mobile Overlay Backdrop */}
					<div
						className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
						onClick={() => setShowChat(false)}
					/>
					{/* Chat Panel */}
					<div className="fixed md:absolute right-0 top-0 bottom-0 w-full md:w-80 bg-card/95 backdrop-blur-xl border-l border-border flex flex-col shadow-2xl z-50 md:z-10">
						<div className="h-12 md:h-14 bg-card/60 backdrop-blur-md border-b border-border flex items-center justify-between px-4">
							<h3 className="font-semibold text-sm text-foreground">Chat</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowChat(false)}
								className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						<div className="flex-1 overflow-hidden min-h-0">
							{channelId ? (
								<ChatWidget channelId={channelId} className="h-full" />
							) : (
								<div className="flex items-center justify-center h-full">
									<p className="text-muted-foreground text-sm px-4 text-center">
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
						className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
						onClick={() => setShowParticipants(false)}
					/>
					{/* Participants Panel */}
					<div className={`fixed md:absolute right-0 top-0 bottom-0 w-full md:w-64 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-2xl z-50 md:z-20 ${showChat ? 'md:right-80' : ''}`}>
						<div className="h-12 md:h-14 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4">
							<h3 className="font-semibold text-sm text-white">Participants</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowParticipants(false)}
								className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
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
		<div className="space-y-1.5 md:space-y-2">
			{participants.length === 0 ? (
				<div className="text-center py-6 md:py-8">
					<p className="text-xs md:text-sm text-white/50">No other participants</p>
				</div>
			) : (
				participants.map((participant) => (
					<div
						key={participant.identity}
						className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-white/5 transition-colors group"
					>
						<div className="relative h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0 text-xs md:text-sm">
							{participant.name?.charAt(0).toUpperCase() || participant.identity.charAt(0).toUpperCase()}
							{participant.isSpeaking && (
								<div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 md:h-3 md:w-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-xs md:text-sm text-white truncate">
								{participant.name || participant.identity}
							</p>
							{participant.isSpeaking && (
								<p className="text-[10px] md:text-xs text-green-400 mt-0.5">Speaking</p>
							)}
						</div>
					</div>
				))
			)}
		</div>
	)
}

