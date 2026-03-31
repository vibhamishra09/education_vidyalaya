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
	const [mode, setMode] = useState<ScratchPadMode>('personal')
	const [saving, setSaving] = useState(false)
	
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
				const token = await getToken()
				
				// Try fetching standard roomId first
				console.log(`[ScratchPad] Fetching initial state for roomId: ${roomId}`);
				let response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scratch-pad/${roomId}`, {
					headers: {
						...(token ? { Authorization: `Bearer ${token}` } : {})
					}
				})

				let data = null;
				if (response.ok) {
					data = await response.json();
				}

				// Fallback: If no content found, try prefixed ID for older/mismatched sessions
				if (!data?.content) {
					const prefix = roomId.includes('-') ? '' : (window.location.pathname.includes('studyroom') ? 'studyroom-' : 'peersession-');
					if (prefix && !roomId.startsWith(prefix)) {
						const fallbackId = `${prefix}${roomId}`;
						console.log(`[ScratchPad] Trying fallback fetch for roomId: ${fallbackId}`);
						const fallbackRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scratch-pad/${fallbackId}`, {
							headers: {
								...(token ? { Authorization: `Bearer ${token}` } : {})
							}
						});
						if (fallbackRes.ok) {
							const fallbackData = await fallbackRes.json();
							if (fallbackData?.content) {
								data = fallbackData;
								console.log(`[ScratchPad] Found content via fallback ID: ${fallbackId}`);
							}
						}
					}
				}
				
				if (data?.content) {
					console.log(`[ScratchPad] Loading snapshot into stores...`);
					loadSnapshot(personalStore, data.content)
					loadSnapshot(sharedStore, data.content)
				} else {
					console.log(`[ScratchPad] No previous state found for room.`);
				}
			} catch (err) {
				console.error('ScratchPad Load Error:', err)
				setError('Could not load previous scratch pad state.')
			} finally {
				setLoading(false)
			}
		}

		loadInitialState()
	}, [roomId, enabled, sharedStore, personalStore, getToken])

	// LiveKit Sync: Remote -> Local (Only for shared store)
	useEffect(() => {
		if (!room || !enabled) return

		const handleData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
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
			} catch {
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

			// Require connection state to be connected before attempting to broadcast
			if (room.state !== 'connected') return

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

	const stateRef = useRef({ mode, roomId, roomTitle, enabled, canEdit, isHost })
	useEffect(() => {
		stateRef.current = { mode, roomId, roomTitle, enabled, canEdit, isHost }
		if (editorRef.current) {
			editorRef.current.updateInstanceState({ isReadonly: !canEdit })
		}
	}, [mode, roomId, roomTitle, enabled, canEdit, isHost])

	const performSave = useCallback(async (isAuto = false) => {
		const { mode: currentMode, roomId: currentId, roomTitle: currentTitle, enabled: isEnabled } = stateRef.current
		if (!isEnabled || !currentId) return false

		try {
			if (!isAuto) setSaving(true)
			const activeStore = currentMode === 'personal' ? personalStore : sharedStore
			const snapshot = getSnapshot(activeStore)
			const token = await getToken()
			
			const url = `${process.env.NEXT_PUBLIC_API_URL}/api/scratch-pad/${currentId}`
			if (!isAuto) console.log(`[ScratchPad] Saving (${currentMode}): ${url}`)

			const response = await fetch(url, {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				body: JSON.stringify({ 
					content: snapshot, 
					roomTitle: currentTitle,
					isPersonal: currentMode === 'personal' 
				}),
			})
			
			if (!response.ok) {
				const errorText = await response.text().catch(() => 'No error body')
				console.error(`[ScratchPad] Save failed: ${response.status}`, errorText)
				return false
			}
			
			if (!isAuto) console.log('[ScratchPad] Save successful')
			return true
		} catch (err) {
			console.error('[ScratchPad] Save Error:', err)
			return false
		} finally {
			if (!isAuto) setSaving(false)
		}
	}, [personalStore, sharedStore, getToken])

	const saveManual = useCallback(() => performSave(false), [performSave])

	// Auto-save to S3 (Host only or Solo mode)
	useEffect(() => {
		const shouldAutoSave = isHost && enabled && roomId && canEdit && !loading
		if (!shouldAutoSave) return

		const interval = setInterval(() => {
			performSave(true).catch(err => console.error('Auto-save Interval Error:', err))
		}, 30000)

		return () => clearInterval(interval)
	}, [isHost, enabled, roomId, canEdit, loading, performSave])

	// Save on Unmount (Close)
	useEffect(() => {
		return () => {
			const { enabled: isEnabled, roomId: currentId, canEdit: canUserEdit } = stateRef.current
			if (isEnabled && currentId && canUserEdit) {
				console.log('[ScratchPad] Component unmounting, triggering final save...')
				// Fire and forget final save on unmount
				performSave(true).catch(err => console.warn('[ScratchPad] Final unmount save failed:', err))
			}
		}
	}, [performSave])

	return {
		store: mode === 'shared' ? sharedStore : personalStore,
		mode,
		setMode,
		loading,
		saving,
		error,
		onEditorMount,
		saveManual
	}
}
