import { SessionStatus } from "@/types";

export function formatDateTimeInTimezone(
  isoDate: string | Date,
  timeZone: string,
): { date: string; time: string } {
  const d = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  if (Number.isNaN(d.getTime())) {
    return { date: "", time: "" };
  }
  const tz = timeZone || "UTC";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

const STUDY_ROOM_HOST_EDIT_BLOCKED: SessionStatus[] = [
  SessionStatus.DONE,
  SessionStatus.CANCELLED,
  SessionStatus.NOT_COMPLETED,
];

/**
 * Teacher/host may edit details while the session is upcoming or live.
 * After the meeting ends (done, cancelled, or marked not completed), editing is disabled.
 */
/**
 * Browse/cards show "live" only when the API says ongoing and the scheduled start is not in the future.
 * Fixes stale ONGOING after the host reschedules without the backend having flipped status yet.
 */
export function studyRoomCardDisplayLive(
  sessionStatus: SessionStatus | string | null | undefined,
  scheduledAt: Date | string | null | undefined,
): boolean {
  if (sessionStatus !== SessionStatus.ONGOING && sessionStatus !== "ONGOING") return false;
  if (scheduledAt == null) return true;
  const t = new Date(scheduledAt).getTime();
  if (Number.isNaN(t)) return true;
  return t <= Date.now();
}

export function canStudyRoomHostEditFromCard(opts: {
  currentUserId?: string | null;
  hostUserId?: string;
  sessionStatus: SessionStatus;
}): boolean {
  if (
    !opts.currentUserId ||
    !opts.hostUserId ||
    opts.currentUserId !== opts.hostUserId
  ) {
    return false;
  }
  return !STUDY_ROOM_HOST_EDIT_BLOCKED.includes(opts.sessionStatus);
}
