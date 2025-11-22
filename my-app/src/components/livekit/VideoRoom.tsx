'use client'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'

export function VideoRoom(props: { token: string; serverUrl: string }) {
	return (
		<LiveKitRoom serverUrl={props.serverUrl} token={props.token} connect>
			<VideoConference />
		</LiveKitRoom>
	)
}


