import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  async createToken(params: {
    roomName: string;
    identity: string;
    name?: string;
    metadata?: string;
    publish?: boolean;
    subscribe?: boolean;
    /** Data channel (chat); keep true for webinar attendees */
    publishData?: boolean;
    ttl?: string;
  }) {
    const key = process.env.LIVEKIT_API_KEY;
    const secret = process.env.LIVEKIT_API_SECRET;

    if (!key || !secret) {
      throw new InternalServerErrorException(
        'LiveKit is not configured. Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET in backend/.env.',
      );
    }

    const ttl = params.ttl ?? '1h';
    const grant: VideoGrant = {
      roomJoin: true,
      room: params.roomName,
      canPublish: params.publish ?? true,
      canSubscribe: params.subscribe ?? true,
      canPublishData: params.publishData ?? true, // Enable data channel for chat
    };
    const at = new AccessToken(key, secret, {
      identity: params.identity,
      name: params.name,
      metadata: params.metadata,
      ttl,
    });
    at.addGrant(grant);
    return at.toJwt();
  }
}
