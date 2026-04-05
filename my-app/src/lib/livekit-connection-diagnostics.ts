import type { JoinResponse, SubscriptionResponse } from '@livekit/protocol'
import type { RemoteParticipant, Room } from 'livekit-client'
import {
	ConnectionState,
	DisconnectReason,
	EngineEvent,
	RoomEvent,
} from 'livekit-client'

/** Console filter: `[LiveKit:RTC]` — signal, engine, WebRTC PC, and room lifecycle. */
const TAG = '[LiveKit:RTC]'

export type LiveKitDiagnosticsMeta = {
	sessionStableId?: string | null
	liveKitServerUrl?: string
}

function signalHost(url: string | undefined): string | undefined {
	if (!url?.trim()) return undefined
	try {
		return new URL(url).host
	} catch {
		return url.slice(0, 80)
	}
}

function disconnectReasonLabel(reason: DisconnectReason | undefined): string {
	if (reason === undefined) return 'undefined'
	const named = DisconnectReason[reason]
	return typeof named === 'string' ? named : `code_${reason}`
}

function connectionStateLabel(state: ConnectionState): string {
	const named = ConnectionState[state]
	return typeof named === 'string' ? named : String(state)
}

function subscriptionErrorSummary(resp: SubscriptionResponse): Record<string, unknown> {
	return {
		trackSid: resp.trackSid,
		err: resp.err,
		message: (resp as { message?: string }).message,
	}
}

function joinResponseSummary(j: JoinResponse): Record<string, unknown> {
	return {
		serverVersion: j.serverVersion,
		serverRegion: j.serverRegion,
		roomSid: j.room?.sid,
		roomName: j.room?.name,
	}
}

type PCTransportLike = { pc?: RTCPeerConnection }

/**
 * Subscribes to LiveKit Room + RTCEngine + peer connection state.
 * Cleanup removes all listeners (call on unmount or room swap).
 */
export function attachLiveKitConnectionDiagnostics(
	room: Room | undefined,
	meta: LiveKitDiagnosticsMeta,
): () => void {
	if (!room || typeof window === 'undefined') return () => {}

	const t0 = performance.now()
	const base = () => ({
		elapsedMs: Math.round(performance.now() - t0),
		roomName: room.name,
		sessionId: meta.sessionStableId ?? undefined,
		signalHost: signalHost(meta.liveKitServerUrl),
	})

	const log = (step: string, detail?: Record<string, unknown>) => {
		console.info(TAG, step, { ...base(), ...detail })
	}

	const logWarn = (step: string, detail?: Record<string, unknown>) => {
		console.warn(TAG, step, { ...base(), ...detail })
	}

	log('diagnostics_attached', {
		initialConnectionState: connectionStateLabel(room.state),
		hint: 'PC timeout errors often mean ICE failed or connectOptions.peerConnectionTimeout was too low.',
	})

	const onConnectionStateChanged = (state: ConnectionState) => {
		log('room_connectionStateChanged', { state: connectionStateLabel(state) })
	}

	const onSignalConnected = () => {
		log('room_signalConnected')
	}

	const onConnected = () => {
		log('room_connected', {
			numParticipants: room.numParticipants,
			serverInfo: room.serverInfo ?? undefined,
		})
	}

	const onDisconnected = (reason?: DisconnectReason) => {
		logWarn('room_disconnected', {
			reason,
			reasonLabel: disconnectReasonLabel(reason),
		})
	}

	const onReconnecting = () => logWarn('room_reconnecting')
	const onReconnected = () => log('room_reconnected')
	const onSignalReconnecting = () => logWarn('room_signalReconnecting')

	const onTrackSubscriptionFailed = (
		trackSid: string,
		participant: RemoteParticipant,
		error: Error,
	) => {
		logWarn('track_subscription_failed', {
			trackSid,
			participantIdentity: participant.identity,
			errorName: error?.name,
			errorMessage: error?.message,
		})
	}

	const onMediaDevicesError = (e: Error, kind?: MediaDeviceKind) => {
		logWarn('media_devices_error', {
			kind: kind ?? null,
			errorName: e?.name,
			errorMessage: e?.message,
		})
	}

	room.on(RoomEvent.ConnectionStateChanged, onConnectionStateChanged)
	room.on(RoomEvent.SignalConnected, onSignalConnected)
	room.on(RoomEvent.Connected, onConnected)
	room.on(RoomEvent.Disconnected, onDisconnected)
	room.on(RoomEvent.Reconnecting, onReconnecting)
	room.on(RoomEvent.Reconnected, onReconnected)
	room.on(RoomEvent.SignalReconnecting, onSignalReconnecting)
	room.on(RoomEvent.TrackSubscriptionFailed, onTrackSubscriptionFailed)
	room.on(RoomEvent.MediaDevicesError, onMediaDevicesError)

	const engine = room.engine
	const pcCleanups: Array<() => void> = []

	const logPcSnapshot = (role: string, pc: RTCPeerConnection) => {
		log(`webrtc_${role}_state`, {
			connectionState: pc.connectionState,
			iceConnectionState: pc.iceConnectionState,
			iceGatheringState: pc.iceGatheringState,
			signalingState: pc.signalingState,
		})
	}

	const attachPcListeners = (transport: unknown, role: string) => {
		const pc = (transport as PCTransportLike)?.pc
		if (!pc) return

		const onConn = () => {
			const cs = pc.connectionState
			const ice = pc.iceConnectionState
			if (cs === 'failed' || ice === 'failed') {
				logWarn(`webrtc_${role}_failure`, {
					connectionState: cs,
					iceConnectionState: ice,
					iceGatheringState: pc.iceGatheringState,
					signalingState: pc.signalingState,
				})
			} else {
				log(`webrtc_${role}_state`, {
					connectionState: cs,
					iceConnectionState: ice,
				})
			}
		}

		pc.addEventListener('connectionstatechange', onConn)
		pc.addEventListener('iceconnectionstatechange', onConn)
		pcCleanups.push(() => {
			pc.removeEventListener('connectionstatechange', onConn)
			pc.removeEventListener('iceconnectionstatechange', onConn)
		})
		logPcSnapshot(role, pc)
	}

	const onEngineConnected = (joinResp: JoinResponse) => {
		log('engine_connected', joinResponseSummary(joinResp))
	}

	const onEngineDisconnected = (reason?: DisconnectReason) => {
		logWarn('engine_disconnected', {
			reason,
			reasonLabel: disconnectReasonLabel(reason),
		})
	}

	const onEngineOffline = () => logWarn('engine_offline')
	const onEngineRestarting = () => logWarn('engine_restarting')
	const onEngineRestarted = () => log('engine_restarted')
	const onEngineResuming = () => log('engine_resuming')
	const onEngineResumed = () => log('engine_resumed')

	const onSubscriptionError = (resp: SubscriptionResponse) => {
		logWarn('engine_subscription_error', subscriptionErrorSummary(resp))
	}

	const onTransportsCreated = (publisher: unknown, subscriber?: unknown) => {
		log('engine_transports_created', {
			hasPublisher: !!publisher,
			hasSubscriber: !!subscriber,
		})
		attachPcListeners(publisher, 'publisher')
		if (subscriber) attachPcListeners(subscriber, 'subscriber')
	}

	engine.on(EngineEvent.Connected, onEngineConnected)
	engine.on(EngineEvent.Disconnected, onEngineDisconnected)
	engine.on(EngineEvent.Offline, onEngineOffline)
	engine.on(EngineEvent.Restarting, onEngineRestarting)
	engine.on(EngineEvent.Restarted, onEngineRestarted)
	engine.on(EngineEvent.Resuming, onEngineResuming)
	engine.on(EngineEvent.Resumed, onEngineResumed)
	engine.on(EngineEvent.SubscriptionError, onSubscriptionError)
	engine.on(EngineEvent.TransportsCreated, onTransportsCreated)

	return () => {
		room.off(RoomEvent.ConnectionStateChanged, onConnectionStateChanged)
		room.off(RoomEvent.SignalConnected, onSignalConnected)
		room.off(RoomEvent.Connected, onConnected)
		room.off(RoomEvent.Disconnected, onDisconnected)
		room.off(RoomEvent.Reconnecting, onReconnecting)
		room.off(RoomEvent.Reconnected, onReconnected)
		room.off(RoomEvent.SignalReconnecting, onSignalReconnecting)
		room.off(RoomEvent.TrackSubscriptionFailed, onTrackSubscriptionFailed)
		room.off(RoomEvent.MediaDevicesError, onMediaDevicesError)

		engine.off(EngineEvent.Connected, onEngineConnected)
		engine.off(EngineEvent.Disconnected, onEngineDisconnected)
		engine.off(EngineEvent.Offline, onEngineOffline)
		engine.off(EngineEvent.Restarting, onEngineRestarting)
		engine.off(EngineEvent.Restarted, onEngineRestarted)
		engine.off(EngineEvent.Resuming, onEngineResuming)
		engine.off(EngineEvent.Resumed, onEngineResumed)
		engine.off(EngineEvent.SubscriptionError, onSubscriptionError)
		engine.off(EngineEvent.TransportsCreated, onTransportsCreated)

		for (const dispose of pcCleanups) dispose()
	}
}
