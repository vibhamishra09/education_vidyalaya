import { Body, Controller, Headers, Post } from '@nestjs/common'

@Controller('api/livekit/webhooks')
export class LivekitWebhooksController {
	@Post()
	async handleEvent(@Body() body: any, @Headers('authorization') _auth?: string) {
		// Optionally verify signature if configured; for now, accept and log minimal
		// Avoid noisy logs in production; plug into your observability if needed
		return { received: true }
	}
}


