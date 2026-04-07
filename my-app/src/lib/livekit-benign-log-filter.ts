import { getLogger, LoggerNames } from 'livekit-client'

/**
 * LiveKit sometimes logs at `error` when a remote track arrives before the
 * RemoteParticipant row exists (reconnect / reordering) or after leave. The
 * SDK returns early; the log is noise and triggers Next.js dev error overlays.
 */
const BENIGN = [
	"Tried to add a track for a participant, that's not present",
	"Tried to add a track whose 'sid' could not be found for a participant",
	"Tried to add a track whose 'sid' could not be determined for a participant",
]

let patched = false

export function installLiveKitBenignRoomLogFilter(): void {
	if (typeof window === 'undefined' || patched) return
	patched = true

	const logger = getLogger(LoggerNames.Room)
	const originalFactory = logger.methodFactory

	logger.methodFactory = (methodName, level, loggerName) => {
		const raw = originalFactory(methodName, level, loggerName)
		return (message: unknown, ...rest: unknown[]) => {
			if (
				methodName === 'error' &&
				typeof message === 'string' &&
				BENIGN.some((s) => message.includes(s))
			) {
				logger.debug(message, ...(rest as [object?]))
				return
			}
			;(raw as (m: unknown, ...r: unknown[]) => void)(message, ...rest)
		}
	}
	logger.setLevel(logger.getLevel())
}

if (typeof window !== 'undefined') {
	installLiveKitBenignRoomLogFilter()
}
