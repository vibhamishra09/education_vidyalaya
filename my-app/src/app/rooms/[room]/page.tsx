'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { EnhancedVideoRoom } from '@/components/livekit/EnhancedVideoRoom'
import apiClient from '@/lib/api-client'
import { Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RoomPage() {
	const params = useParams<{ room: string }>()
	const router = useRouter()
	const roomName = params.room
	const { getToken } = useAuth()
	const [token, setToken] = useState<string | null>(null)
	const [channelId, setChannelId] = useState<string | null>(null)
	const [sessionData, setSessionData] = useState<{
		id: string;
		date: string;
		duration: number;
		sessionType: 'studyRoom' | 'peerSession';
		sessionStatus?: string;
		[key: string]: unknown;
	} | null>(null)
	const [isHost, setIsHost] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [sessionEnded, setSessionEnded] = useState(false)

	useEffect(() => {
		let mounted = true
		async function initialize() {
			try {
				const clerkToken = await getToken()
				if (!clerkToken) {
					throw new Error('Not authenticated')
				}

				// Extract room type and ID from room name
				// Format: studyroom-{id} or peersession-{id}
				const isStudyRoom = roomName.startsWith('studyroom-')
				const isPeerSession = roomName.startsWith('peersession-')
				// ID comes after the prefix, handle UUIDs with hyphens
				const roomId = isStudyRoom 
					? roomName.slice('studyroom-'.length)
					: isPeerSession 
						? roomName.slice('peersession-'.length)
						: roomName.split('-')[1]

				// Fetch LiveKit token, channel ID, and session data
				const promises: Promise<{ data: { token?: string; channelId?: string; [key: string]: unknown } } | null>[] = [
					axios.post(
						`${process.env.NEXT_PUBLIC_API_URL}/api/livekit/token`,
						{ roomName },
						{
							headers: {
								Authorization: `Bearer ${clerkToken}`,
							},
						}
					),
					apiClient.get(`/api/chat/channel-by-room/${roomName}`, {
						headers: {
							Authorization: `Bearer ${clerkToken}`,
						},
					}).catch(() => null), // Channel might not exist, that's OK
				]

				// Add session data fetch if it's a study room or peer session
				if (isStudyRoom && roomId) {
					promises.push(
						apiClient.get(`/api/study-rooms/${roomId}`, {
							headers: {
								Authorization: `Bearer ${clerkToken}`,
							},
						})
					)
				} else if (isPeerSession && roomId) {
					promises.push(
						apiClient.get(`/api/peer-sessions/${roomId}`, {
							headers: {
								Authorization: `Bearer ${clerkToken}`,
							},
						})
					)
				}

				const results = await Promise.all(promises)

				if (!mounted) return
				if (results[0]?.data?.token) {
					setToken(results[0].data.token as string)
				}
				if (results[1]?.data?.channelId) {
					setChannelId(results[1].data.channelId as string)
				}
				if (results[2]?.data) {
					// Add session type to sessionData
					const data = results[2].data as { id: string; date: string; duration: number; sessionStatus?: string; [key: string]: unknown };
					
					console.log('📊 [RoomPage] Session data loaded:', {
						id: data.id,
						date: data.date,
						duration: data.duration,
						sessionStatus: data.sessionStatus,
						type: isStudyRoom ? 'studyRoom' : 'peerSession',
					})
					
					// Check if session is already completed or not completed (expired)
					if (data.sessionStatus === 'DONE' || data.sessionStatus === 'CANCELLED' || data.sessionStatus === 'NOT_COMPLETED') {
						setSessionEnded(true)
						setSessionData({
							...data,
							sessionType: isStudyRoom ? 'studyRoom' : 'peerSession',
						})
						setLoading(false)
						return
					}
					
					setSessionData({
						...data,
						sessionType: isStudyRoom ? 'studyRoom' : 'peerSession',
					})

					// Check if current user is the host
					try {
						const endpoint = isStudyRoom 
							? `/api/study-rooms/${roomId}/is-host`
							: `/api/peer-sessions/${roomId}/is-host`
						const hostResponse = await apiClient.get(endpoint, {
							headers: {
								Authorization: `Bearer ${clerkToken}`,
							},
						})
						if (mounted) {
							setIsHost(hostResponse.data.isHost || false)
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
				const errorMessage = e instanceof Error ? e.message : 'Failed to initialize'
				setError(errorMessage)
			} finally {
				if (mounted) setLoading(false)
			}
		}
		if (roomName) {
			initialize()
		}
		return () => {
			mounted = false
		}
	}, [roomName, getToken])

	if (loading) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-black">
				<div className="text-center text-white">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
					<p>Connecting to video call...</p>
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

	if (sessionEnded) {
		const isNotCompleted = sessionData?.sessionStatus === 'NOT_COMPLETED';
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
				<div className="text-center max-w-md mx-auto p-8">
					<div className="flex justify-center mb-6">
						<div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center ring-2 ring-red-500/30">
							<XCircle className="h-10 w-10 text-red-400" />
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
							className="w-full bg-primary hover:bg-primary/90"
						>
							Go to Dashboard
						</Button>
						{/* Only show feedback button for completed sessions, not for NOT_COMPLETED */}
						{sessionData?.id && !isNotCompleted && (
							<Button 
								variant="outline"
								onClick={() => router.push(`/session-feedback/${sessionData.id}?type=${sessionData.sessionType}&isHost=false`)}
								className="w-full border-white/20 text-white hover:bg-white/10"
							>
								Leave Feedback
							</Button>
						)}
					</div>
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

	const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL as string
	return <EnhancedVideoRoom token={token} serverUrl={serverUrl} channelId={channelId} sessionData={sessionData} isHost={isHost} />
}


