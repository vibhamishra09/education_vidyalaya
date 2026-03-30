import { useState, useEffect, useCallback, useRef } from 'react'
import { Room } from 'livekit-client'
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

export function useScratchPad({ roomId, room, isHost, canEdit = true, roomTitle, enabled }: UseScratchPadOptions) {
	const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }))
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const editorRef = useRef<Editor | null>(null)
	const { getToken } = useAuth()
	const lastSyncRef = useRef<number>(0)
	const skipRemoteUpdateRef = useRef(false)

	// Load initial state from S3
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
				if (data.content && editorRef.current) {
					loadSnapshot(editorRef.current.store, data.content)
				}
			} catch (err) {
				console.error('ScratchPad Load Error:', err)
				setError('Could not load previous scratch pad state.')
			} finally {
				setLoading(false)
			}
		}

		loadInitialState()
	}, [roomId, enabled])

	// LiveKit Sync: Remote -> Local
	useEffect(() => {
		if (!room || !enabled) return

		const handleData = (payload: Uint8Array, _participant: unknown) => {
			try {
				const decoder = new TextDecoder()
				const data = JSON.parse(decoder.decode(payload))

				if (data.type === 'scratch-pad-update' && editorRef.current) {
					skipRemoteUpdateRef.current = true
					editorRef.current.store.mergeRemoteChanges(() => {
						if (data.changes) {
							editorRef.current?.store.applyDiff(data.changes)
						}
					})
					skipRemoteUpdateRef.current = false
				}
			} catch (err) {
				// Silent fail
			}
		}

		room.on('dataReceived', handleData)
		return () => { room.off('dataReceived', handleData) }
	}, [room, enabled])

	// LiveKit Sync: Local -> Remote
	const onEditorMount = useCallback((editor: Editor) => {
		editorRef.current = editor
		
		const unlisten = editor.store.listen((change) => {
			if (skipRemoteUpdateRef.current) return
			if (change.source !== 'user') return

			// Throttle sync
			const now = Date.now()
			if (now - lastSyncRef.current < 50) return
			lastSyncRef.current = now

			// Broadcast changes
			if (room && room.state === 'connected' && canEdit) {
				const encoder = new TextEncoder()
				const payload = encoder.encode(JSON.stringify({
					type: 'scratch-pad-update',
					changes: change.changes,
				}))
				room.localParticipant.publishData(payload, {
					reliable: true
				})
			}
		}, { scope: 'document', source: 'user' })

		return () => unlisten()
	}, [room, canEdit])

	// Auto-save to S3 (Host or Solo Editor)
	useEffect(() => {
		const shouldAutoSave = (isHost || !room) && enabled && roomId && canEdit
		if (!shouldAutoSave) return

		const interval = setInterval(async () => {
			if (!editorRef.current) return

			try {
				const snapshot = getSnapshot(editorRef.current.store)
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
		}, 30000) // Save every 30s

		return () => clearInterval(interval)
	}, [isHost, enabled, roomId, room, canEdit, roomTitle, getToken])

	return {
		store,
		loading,
		error,
		onEditorMount,
	}
}
