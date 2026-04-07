import { appendFile, mkdir } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'chat-flow.txt')

function isFileLogAllowed(): boolean {
	return (
		process.env.NODE_ENV === 'development' ||
		process.env.CHAT_FLOW_LOG_API === '1'
	)
}

/**
 * Append chat flow lines to `logs/chat-flow.txt` (Next cwd = `my-app/`).
 * Enable client with NEXT_PUBLIC_CHAT_FLOW_FILE=1; allow API with dev or CHAT_FLOW_LOG_API=1.
 */
export async function POST(request: NextRequest) {
	if (!isFileLogAllowed()) {
		return NextResponse.json({ ok: false, error: 'disabled' }, { status: 404 })
	}

	let body: { lines?: string[] }
	try {
		body = (await request.json()) as { lines?: string[] }
	} catch {
		return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
	}

	const lines = Array.isArray(body.lines) ? body.lines : []
	if (lines.length === 0) {
		return NextResponse.json({ ok: true, appended: 0 })
	}

	const block =
		lines.map((l) => (typeof l === 'string' ? l : String(l))).join('\n') + '\n'

	try {
		await mkdir(LOG_DIR, { recursive: true })
		await appendFile(LOG_FILE, block, 'utf8')
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'write failed'
		return NextResponse.json({ ok: false, error: msg }, { status: 500 })
	}

	return NextResponse.json({ ok: true, appended: lines.length })
}
