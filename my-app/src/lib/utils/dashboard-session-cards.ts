import type {
  PastSession,
  PastStudyRoom,
  UpcomingSession,
  UpcomingStudyRoom,
} from "@/types/api.types";

/** Props shape expected by `SessionList` cards (structural). */
export type DashboardSessionCard = {
  id: string;
  title: string;
  date: Date | string;
  duration: number;
  skills?: Array<{ id: string; name: string } | string>;
  description?: string;
  hostName?: string;
  participantCount?: number;
  maxParticipants?: number;
  requestedBy?: unknown;
  detailsEditedForViewer?: boolean;
  peerSessionEditable?: boolean;
  slug: string | null;
  sessionStatus?: string;
};

export function isPeerSessionEditable(status: string | undefined): boolean {
  return (
    status === "PENDING" ||
    status === "UPCOMING" ||
    status === "ONGOING"
  );
}

type TimedSlot = {
  date: Date | string;
  duration: number;
  sessionStatus?: string;
};

/** In the upcoming list: exclude ONGOING and sessions happening right now. */
export function isDashboardUpcomingSlot(item: TimedSlot): boolean {
  if (item.sessionStatus === "ONGOING") return false;
  const now = Date.now();
  const start = new Date(item.date).getTime();
  const end = start + item.duration * 60_000;
  return !(now >= start && now <= end);
}

export function isDashboardOngoingSlot(item: TimedSlot): boolean {
  if (item.sessionStatus === "ONGOING") return true;
  const now = Date.now();
  const start = new Date(item.date).getTime();
  const end = start + item.duration * 60_000;
  return now >= start && now <= end;
}

export function isDashboardStudyRoomSlot(
  s: UpcomingSession | UpcomingStudyRoom,
): s is UpcomingStudyRoom {
  return "maxParticipants" in s;
}

export function peerDashboardCard(
  s: PastSession | UpcomingSession,
  myUserId: string | undefined,
  withPeerEdit: boolean,
): DashboardSessionCard {
  return {
    id: s.id,
    title: s.title,
    date: s.date,
    duration: s.duration,
    skills: s.skills,
    description: s.description,
    requestedBy: s.requestedBy,
    hostName: s.peer?.name,
    detailsEditedForViewer: !!(s.hostDetailsUpdatedAt && myUserId),
    ...(withPeerEdit && {
      peerSessionEditable: isPeerSessionEditable(s.sessionStatus),
    }),
    slug: null,
    sessionStatus: s.sessionStatus,
  };
}

export function studyRoomDashboardCard(
  sr: PastStudyRoom | UpcomingStudyRoom,
  myUserId: string | undefined,
): DashboardSessionCard {
  return {
    id: sr.id,
    title: sr.title,
    date: sr.date,
    duration: sr.duration,
    skills: sr.skills,
    description: sr.description,
    hostName: sr.createdBy?.name,
    participantCount: sr.participantCount,
    maxParticipants: sr.maxParticipants,
    detailsEditedForViewer: !!(
      sr.hostDetailsUpdatedAt &&
      myUserId &&
      sr.createdBy?.id !== myUserId
    ),
    slug: sr.slug,
    sessionStatus: (sr as any).status || (sr as any).roomStatus,
  };
}

export function ongoingDashboardCard(
  session: UpcomingSession | UpcomingStudyRoom,
  myUserId: string | undefined,
): DashboardSessionCard {
  if (isDashboardStudyRoomSlot(session)) {
    return studyRoomDashboardCard(session, myUserId);
  }
  return peerDashboardCard(session, myUserId, true);
}
