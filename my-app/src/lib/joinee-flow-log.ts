/**
 * Minimal joinee flow logger shim for client traces.
 */
export function isJoineeFlowFileEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_JOINEE_FLOW_FILE === '1') return true
  if (process.env.NEXT_PUBLIC_JOINEE_FLOW_FILE === '0') return false
  return process.env.NODE_ENV === 'development'
}

export function shouldTraceJoinee(
  isGuestMode: boolean,
  viewerSessionRole: string,
): boolean {
  return isGuestMode || viewerSessionRole === 'joinee' || viewerSessionRole === 'guest'
}

export function joineeFlowLog(step: string, detail?: Record<string, unknown>): void {
  if (!isJoineeFlowFileEnabled() || typeof window === 'undefined') return
  try {
    void fetch('/api/dev/joinee-flow-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          `${new Date().toISOString()}\t${step}\t${JSON.stringify(detail ?? {})}`,
        ],
      }),
      keepalive: true,
    })
  } catch {
    // best-effort logging only
  }
}
