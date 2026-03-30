import { useState, useEffect, useCallback, useRef } from 'react'
import { Room, RoomEvent } from 'livekit-client'
import { createTLStore, defaultShapeUtils, Editor, loadSnapshot, getSnapshot } from 'tldraw'
import { useAuth } from '@clerk/nextjs'

interface UseScratchPadOptions {
	roomId: string
	room?: Room
	isHost?: boolean
	canEdit?: boolean
	roomTitle?: string
	enabled?: boolean
}

export type ScratchPadMode = 'shared' | 'personal'

export function useScratchPad({ roomId, room, isHost, canEdit = true, roomTitle, enabled }: UseScratchPadOptions) {
	const [sharedStore] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }))
	const [personalStore] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }))
	const [mode, setMode] = useState<ScratchPadMode>('shared')
	
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const editorRef = useRef<Editor | null>(null)
	const { getToken } = useAuth()
	const lastSyncRef = useRef<number>(0)
	const skipRemoteUpdateRef = useRef(false)

	// Load initial state from S3 (Only for shared store)
	useEffect(() => {
		if (!enabled || !roomId) return

		async function loadInitialState() {
			try {
				setLoading(true)
				const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scratch-pad/${roomId}`)
				
				if (response.status === 404) {
					console.log('ScratchPad: No previous state found (expected for new rooms).')
					setLoading(false)
					return
				}

				if (!response.ok) {
					const errorText = await response.text().catch(() => 'Unknown error')
					throw new Error(`Failed to load scratch pad: ${response.status} ${errorText}`)
				}

				const data = await response.json()
				if (data.content) {
					loadSnapshot(sharedStore, data.content)
				}
			} catch (err) {
				console.error('ScratchPad Load Error:', err)
				setError('Could not load previous scratch pad state.')
			} finally {
				setLoading(false)
			}
		}

		loadInitialState()
	}, [roomId, enabled, sharedStore])

	// LiveKit Sync: Remote -> Local (Only for shared store)
	useEffect(() => {
		if (!room || !enabled) return

		const handleData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
			// Support both legacy (no topic) and new topic-based sync
			if (topic && topic !== 'scratch-pad-update') return

			try {
				const decoder = new TextDecoder()
				const data = JSON.parse(decoder.decode(payload))

				if (data.type === 'scratch-pad-update') {
					skipRemoteUpdateRef.current = true
					sharedStore.mergeRemoteChanges(() => {
						if (data.changes) {
							sharedStore.applyDiff(data.changes)
						}
					})
					skipRemoteUpdateRef.current = false
				}
			} catch (err) {
				// Silent fail
			}
		}

		room.on(RoomEvent.DataReceived, handleData)
		return () => { room.off(RoomEvent.DataReceived, handleData) }
	}, [room, enabled, sharedStore])

	// LiveKit Sync: Local -> Remote (Shared Store Listener)
	useEffect(() => {
		if (!room || room.state !== 'connected') return

		const unlisten = sharedStore.listen((change) => {
			if (skipRemoteUpdateRef.current) return
			if (change.source !== 'user') return
			if (!canEdit) return

			// Throttle sync
			const now = Date.now()
			if (now - lastSyncRef.current < 50) return
			lastSyncRef.current = now

			// Broadcast changes to everyone else at the Room level
			const encoder = new TextEncoder()
			const payload = encoder.encode(JSON.stringify({
				type: 'scratch-pad-update',
				changes: change.changes,
			}))
			
			room.localParticipant.publishData(payload, {
				reliable: true,
				topic: 'scratch-pad-update'
			}).catch(err => console.error("ScratchPad sync error:", err))
		}, { scope: 'document', source: 'user' })

		return () => unlisten()
	}, [room, canEdit, sharedStore])

	const onEditorMount = useCallback((editor: Editor) => {
		editorRef.current = editor
	}, [])

	// Auto-save to S3 (Host only, for shared board)
	useEffect(() => {
		const shouldAutoSave = isHost && enabled && roomId && canEdit
		if (!shouldAutoSave) return

		const interval = setInterval(async () => {
			try {
				const snapshot = getSnapshot(sharedStore)
				const token = await getToken()
				await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scratch-pad/${roomId}`, {
					method: 'POST',
					headers: { 
						'Content-Type': 'application/json',
						...(token ? { Authorization: `Bearer ${token}` } : {})
					},
					body: JSON.stringify({ content: snapshot, roomTitle }),
				})
			} catch (err) {
				console.error('ScratchPad Auto-save Error:', err)
			}
		}, 30000)

		return () => clearInterval(interval)
	}, [isHost, enabled, roomId, canEdit, roomTitle, getToken, sharedStore])

	return {
		store: mode === 'shared' ? sharedStore : personalStore,
		mode,
		setMode,
		loading,
		error,
		onEditorMount,
	}
}
