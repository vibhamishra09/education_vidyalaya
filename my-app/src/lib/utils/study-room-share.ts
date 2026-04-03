/**
 * Public study room URLs: one path shape, optional join intent for shared links.
 * Shared links use ?join=1 so after sign-in we can join in one step without extra clicks.
 */
export const STUDY_ROOM_JOIN_PARAM = "join";
export const STUDY_ROOM_JOIN_VALUE = "1";

export function getStudyRoomPagePath(roomSegment: string): string {
  return `/studyroom/${encodeURIComponent(roomSegment)}`;
}

/** Path with join intent (use for router.push from browse/cards). */
export function getStudyRoomPagePathWithJoinIntent(roomSegment: string): string {
  return `${getStudyRoomPagePath(roomSegment)}?${STUDY_ROOM_JOIN_PARAM}=${STUDY_ROOM_JOIN_VALUE}`;
}

/** Absolute URL for copy / Web Share API — includes ?join=1 for recipients. */
export function getStudyRoomShareUrl(roomSegment: string): string {
  const path = getStudyRoomPagePathWithJoinIntent(roomSegment);
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}
