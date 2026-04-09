import { useState, useEffect, useCallback, useRef } from 'react'
import { Room, RoomEvent, ConnectionState } from 'livekit-client'
import { createTLStore, Editor, createTLSchema } from 'tldraw'
import { useAuth } from '@clerk/nextjs'

interface UseScratchPadOptions {
	roomId: string
	room?: Room
	isHost?: boolean
	canEdit?: boolean
	roomTitle?: string
	enabled?: boolean
	isGuest?: boolean
}

export type ScratchPadMode = 'shared' | 'personal'

export function useScratchPad({ roomId, room, isHost, canEdit = true, roomTitle, enabled, isGuest = false }: UseScratchPadOptions) {
	const [sharedStore] = useState(() => createTLStore({ schema: createTLSchema() }))
	const [personalStore] = useState(() => createTLStore({ schema: createTLSchema() }))
	const [mode, setMode] = useState<ScratchPadMode>(room ? 'shared' : 'personal')
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
	const [lastSaved, setLastSaved] = useState<Date | null>(null)
	
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [saveError, setSaveError] = useState<string | null>(null)
	const editorRef = useRef<Editor | null>(null)
	const { getToken } = useAuth()
	const lastSyncRef = useRef<number>(0)
	const lastSuccessfulSaveRef = useRef<number>(0)
	const hasLoadedRef = useRef<boolean>(false)
	const loadedRoomIdRef = useRef<string | null>(null)
	const skipRemoteUpdateRef = useRef(false)

	const LOG_TAG = '[ScratchPad-V12_ALIVE]'
	const schema = createTLSchema()

	// Load initial state from S3
	useEffect(() => {
		if (!enabled || !roomId) return
		if (hasLoadedRef.current && loadedRoomIdRef.current === roomId) return

		async function loadInitialState() {
			try {
				setLoading(true)
				const token = await getToken()
				await new Promise(resolve => setTimeout(resolve, 300))
				
				console.log(`${LOG_TAG} Loading state for ${roomId}...`)
				const response = await fetch(`/api/scratch-pad/${roomId}`, {
					headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
				})

				if (response.ok) {
					const data = await response.json()
					if (data?.content) {
						const storeRecords = (data.content.store || data.content) as Record<string, any>
						const recordArray = Object.values(storeRecords)
						
						sharedStore.mergeRemoteChanges(() => {
							sharedStore.put(recordArray)
						})
						personalStore.mergeRemoteChanges(() => {
							personalStore.put(recordArray)
						})
						console.log(`${LOG_TAG} Loaded ${recordArray.length} records.`)
					}
				}
				hasLoadedRef.current = true
				loadedRoomIdRef.current = roomId
			} catch (err) {
				console.error(`${LOG_TAG} Load failed:`, err)
				setError('Could not load scratch pad state.')
			} finally {
				setLoading(false)
			}
		}

		loadInitialState()
	}, [roomId, enabled, sharedStore, personalStore, getToken])

	// LiveKit Sync: Remote -> Local
	useEffect(() => {
		if (!room || !enabled) return

		const handleData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
			if (topic !== 'scratch-pad-update') return
			try {
				const data = JSON.parse(new TextDecoder().decode(payload))
				if (data.type === 'scratch-pad-update') {
					skipRemoteUpdateRef.current = true
					sharedStore.mergeRemoteChanges(() => {
						if (data.changes) sharedStore.applyDiff(data.changes)
					})
					skipRemoteUpdateRef.current = false
				}
			} catch (e) {}
		}

		room.on(RoomEvent.DataReceived, handleData)
		return () => { room.off(RoomEvent.DataReceived, handleData) }
	}, [room, enabled, sharedStore])

	// LiveKit Sync: Local -> Remote
	useEffect(() => {
		if (!room || room.state !== ConnectionState.Connected) return

		const unlisten = sharedStore.listen((change) => {
			if (skipRemoteUpdateRef.current || change.source !== 'user' || !canEdit) return
			const now = Date.now()
			if (now - lastSyncRef.current < 50) return
			lastSyncRef.current = now

			const payload = new TextEncoder().encode(JSON.stringify({
				type: 'scratch-pad-update',
				changes: change.changes,
			}))
			
			room.localParticipant.publishData(payload, { reliable: true, topic: 'scratch-pad-update' })
				.catch(err => console.error(`${LOG_TAG} Sync failed:`, err))
		}, { scope: 'document', source: 'user' })

		return () => unlisten()
	}, [room, canEdit, sharedStore])

	const performSave = useCallback(async (isAuto = false) => {
		if (saveStatus === 'saving' || !hasLoadedRef.current) return false
		if (isGuest && mode === 'shared') return false

		const activeStore = mode === 'shared' ? sharedStore : personalStore
		const records = activeStore.allRecords()

		if (records.length <= 2 && isAuto) {
			console.log(`${LOG_TAG} Skipping empty auto-save (${records.length} records)`)
			return false
		}

		setSaveStatus('saving')
		try {
			const token = await getToken()
			const snapshot = {
				store: Object.fromEntries(records.map((r) => [r.id, r] as const)),
				schema: schema.serialize(),
			}

			const response = await fetch(`/api/scratch-pad/${roomId}`, {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({ 
					content: snapshot, 
					roomTitle,
					isPersonal: mode === 'personal' 
				}),
			})

			if (response.ok) {
				setSaveStatus('saved')
				lastSuccessfulSaveRef.current = Date.now()
				setLastSaved(new Date())
				setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000)
				return true
			}
			throw new Error(`Status ${response.status}`)
		} catch (err) {
			console.error(`${LOG_TAG} Save failed:`, err)
			setSaveStatus('error')
			setSaveError('Save failed')
			return false
		}
	}, [roomId, mode, sharedStore, personalStore, isGuest, roomTitle, saveStatus, getToken, schema])

	const onEditorMount = useCallback((editor: Editor) => {
		editorRef.current = editor
		editor.updateInstanceState({ isReadonly: !canEdit })
	}, [canEdit])

	useEffect(() => {
		if (editorRef.current) {
			editorRef.current.updateInstanceState({ isReadonly: !canEdit })
		}
	}, [canEdit])

	// Auto-save debounce
	const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
	useEffect(() => {
		if (!enabled || loading) return
		const activeStore = mode === 'shared' ? sharedStore : personalStore
		const unlisten = activeStore.listen((change) => {
			if (change.source !== 'user') return
			if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
			autoSaveTimerRef.current = setTimeout(() => performSave(true), 2000)
		}, { scope: 'document', source: 'user' })
		return () => { unlisten(); if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
	}, [mode, enabled, loading, sharedStore, personalStore, performSave])

	return {
		store: mode === 'shared' ? sharedStore : personalStore,
		mode, setMode, loading, syncStatus: saveStatus, error, saveError, onEditorMount,
		saveManual: () => performSave(false),
		lastSaved
	}
}
