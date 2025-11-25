'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { EnhancedVideoRoom } from '@/components/livekit/EnhancedVideoRoom'
import apiClient from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

export default function RoomPage() {
	const params = useParams<{ room: string }>()
	const roomName = params.room
	const { getToken } = useAuth()
	const [token, setToken] = useState<string | null>(null)
	const [channelId, setChannelId] = useState<string | null>(null)
	const [sessionData, setSessionData] = useState<any>(null)
	const [isHost, setIsHost] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)

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
				const roomId = roomName.split('-')[1]

				// Fetch LiveKit token, channel ID, and session data
				const promises: Promise<any>[] = [
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
				setToken(results[0].data.token)
				if (results[1]?.data?.channelId) {
					setChannelId(results[1].data.channelId)
				}
				if (results[2]?.data) {
					// Add session type to sessionData
					setSessionData({
						...results[2].data,
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
					} catch (hostError) {
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


