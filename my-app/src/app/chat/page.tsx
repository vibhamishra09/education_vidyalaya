'use client'
import { useUser } from '@clerk/nextjs'
import { ChannelList } from '@/components/chat/ChannelList'

export default function ChatHomePage() {
	const { user, isLoaded } = useUser()
	if (!isLoaded) return <div className="p-4">Loading…</div>
	if (!user) return <div className="p-4">Please sign in.</div>
	return (
		<div className="p-4">
			<h1 className="text-xl font-bold mb-4">Your Channels</h1>
			<ChannelList />
		</div>
	)
}


