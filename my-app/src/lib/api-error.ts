/**
 * Axios rejects with `response.data` (see api-client interceptor), not full AxiosError.
 * NestJS often returns `{ statusCode, message: string | { code, message } }`.
 */
export type ParsedApiError = {
	code?: string
	message: string
	statusCode?: number
}

export function parseRejectedApiError(error: unknown): ParsedApiError {
	if (error == null) {
		return { message: 'Something went wrong. Please try again.' }
	}
	if (typeof error === 'string') {
		return { message: error }
	}
	if (error instanceof Error) {
		return { message: error.message || 'Something went wrong.' }
	}
	if (typeof error !== 'object') {
		return { message: 'Something went wrong.' }
	}

	const e = error as Record<string, unknown>

	if (e.response && typeof e.response === 'object') {
		const data = (e.response as Record<string, unknown>).data
		if (data && typeof data === 'object') {
			return parseRejectedApiError(data)
		}
	}

	const statusCode =
		typeof e.statusCode === 'number' ? e.statusCode : undefined

	if (typeof e.code === 'string' && typeof e.message === 'string') {
		return {
			code: e.code,
			message: e.message,
			statusCode,
		}
	}

	const msg = e.message
	if (typeof msg === 'string') {
		return {
			message: msg,
			statusCode,
			code: typeof e.code === 'string' ? e.code : undefined,
		}
	}

	if (Array.isArray(msg)) {
		return {
			message: msg.map(String).join('; '),
			statusCode,
		}
	}

	if (msg && typeof msg === 'object') {
		const m = msg as Record<string, unknown>
		const code = typeof m.code === 'string' ? m.code : undefined
		let text: string | undefined
		if (typeof m.message === 'string') {
			text = m.message
		} else if (Array.isArray(m.message)) {
			text = (m.message as unknown[]).map(String).join('; ')
		}
		return {
			code,
			message: text || code || 'Request failed',
			statusCode,
		}
	}

	try {
		const s = JSON.stringify(e)
		if (s && s !== '{}') {
			return { message: s, statusCode }
		}
	} catch {
		/* ignore */
	}

	return { message: 'Request failed', statusCode }
}
