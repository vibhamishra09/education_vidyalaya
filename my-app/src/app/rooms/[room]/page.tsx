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

				// Fetch LiveKit token and channel ID in parallel
				const [tokenRes, channelRes] = await Promise.all([
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
					}).catch(() => null) // Channel might not exist, that's OK
				])

				if (!mounted) return
				setToken(tokenRes.data.token)
				if (channelRes?.data?.channelId) {
					setChannelId(channelRes.data.channelId)
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
	return <EnhancedVideoRoom token={token} serverUrl={serverUrl} channelId={channelId} />
}


