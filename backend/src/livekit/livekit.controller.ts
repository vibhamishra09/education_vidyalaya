import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { LivekitService } from './livekit.service'
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard'

@UseGuards(ClerkAuthGuard)
@Controller('api/livekit')
export class LivekitController {
	constructor(private readonly livekit: LivekitService) {}

	@Post('token')
	async token(
		@Body() body: { roomName: string; publish?: boolean; subscribe?: boolean; metadata?: string },
		@Req() req: any,
	) {
		const identity = req.userId as string
		const token = await this.livekit.createToken({
			roomName: body.roomName,
			identity,
			metadata: body.metadata,
			publish: body.publish,
			subscribe: body.subscribe,
		})
		return { token }
	}
}


