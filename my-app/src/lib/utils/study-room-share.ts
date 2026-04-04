import { getPublicAppOrigin } from "@/lib/utils/public-url";

/**
 * Public study room URLs: one path shape, optional join intent for shared links.
 * Shared links use ?join=1 so after sign-in we can join in one step without extra clicks.
 */
export const STUDY_ROOM_JOIN_PARAM = "join";
export const STUDY_ROOM_JOIN_VALUE = "1";

export function getStudyRoomPagePath(roomId: string): string {
  return `/studyroom/${roomId}`;
}

/** Path with join intent (use for router.push from browse/cards). */
export function getStudyRoomPagePathWithJoinIntent(roomId: string): string {
  return `${getStudyRoomPagePath(roomId)}?${STUDY_ROOM_JOIN_PARAM}=${STUDY_ROOM_JOIN_VALUE}`;
}

/** Absolute URL for copy / Web Share API — includes ?join=1 for recipients. */
export function getStudyRoomShareUrl(roomId: string): string {
  const path = getStudyRoomPagePathWithJoinIntent(roomId);
  const origin = getPublicAppOrigin();
  return origin ? `${origin}${path}` : path;
}
