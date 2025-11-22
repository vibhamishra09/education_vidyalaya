import { Injectable } from '@nestjs/common'
import { AccessToken, VideoGrant } from 'livekit-server-sdk'

@Injectable()
export class LivekitService {
	async createToken(params: {
		roomName: string
		identity: string
		metadata?: string
		publish?: boolean
		subscribe?: boolean
		ttl?: string
	}) {
		const key = process.env.LIVEKIT_API_KEY!
		const secret = process.env.LIVEKIT_API_SECRET!
		const ttl = params.ttl ?? '1h'
		const grant: VideoGrant = {
			roomJoin: true,
			room: params.roomName,
			canPublish: params.publish ?? true,
			canSubscribe: params.subscribe ?? true,
		}
		const at = new AccessToken(key, secret, { identity: params.identity, metadata: params.metadata, ttl })
		at.addGrant(grant)
		return at.toJwt()
	}
}


