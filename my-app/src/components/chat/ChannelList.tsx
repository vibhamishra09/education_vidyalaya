'use client'
import { useEffect, useState } from 'react'
import apiClient from '@/lib/api-client'
import Link from 'next/link'

type Channel = { id: string; name: string }

export function ChannelList() {
	const [channels, setChannels] = useState<Channel[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let mounted = true
		async function load() {
			try {
				const res = await apiClient.get('/api/chat/channels')
				if (!mounted) return
				setChannels(res.data)
			} catch (e: unknown) {
				if (!mounted) return
				const errorMessage = e instanceof Error ? e.message : 'Failed to load channels'
				setError(errorMessage)
			} finally {
				if (mounted) setLoading(false)
			}
		}
		load()
		return () => {
			mounted = false
		}
	}, [])

	if (loading) return <div>Loading channels…</div>
	if (error) return <div className="text-red-600">Error: {error}</div>

	return (
		<ul className="space-y-2">
			{channels.map((c) => (
				<li key={c.id}>
					<Link href={`/chat/${c.id}`} className="text-blue-600 underline">
						{c.name}
					</Link>
				</li>
			))}
		</ul>
	)
}


