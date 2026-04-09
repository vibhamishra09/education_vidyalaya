"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { studyRoomsApi } from "@/lib/api/study-rooms.api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Menu, UserCheck, UserMinus, Users, X } from "lucide-react";

type GuestRow = { id: string; name: string; email: string; role: string };

const POLL_MS = 15000;

export function WebinarHostPanel({
  isHost = false,
  studyRoomId,
  guestParticipants,
  /** Exclude from “live guests” (e.g. host’s own registration row). */
  hostEmail,
}: {
  isHost?: boolean;
  studyRoomId: string;
  guestParticipants: GuestRow[];
  hostEmail?: string | null;
}) {
  if (!isHost) return null;

  const [open, setOpen] = useState(false);
  const [regs, setRegs] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      createdAt: string;
      guestParticipantId: string | null;
      approvalStatus: "pending" | "approved";
    }>
  >([]);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const liveGuestCount = useMemo(() => {
    const h = hostEmail?.trim().toLowerCase();
    const liveFromRoom = !h
      ? guestParticipants.length
      : guestParticipants.filter(
      (g) => g.email.trim().toLowerCase() !== h,
    ).length;
    if (liveFromRoom > 0) return liveFromRoom;
    // Fallback when live participant list is unavailable: show approved registrations
    // so host immediately sees admitted attendees reflected in this panel.
    const approved = regs.filter(
      (r) => r.approvalStatus === "approved" && (!h || r.email.trim().toLowerCase() !== h),
    ).length;
    return approved;
  }, [guestParticipants, hostEmail, regs]);

  const pendingAdmitCount = useMemo(
    () =>
      waitingRoomEnabled
        ? regs.filter((r) => r.approvalStatus === "pending").length
        : 0,
    [regs, waitingRoomEnabled],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await studyRoomsApi.listWebinarRegistrations(studyRoomId);
      setRegs(res.registrations);
      setWaitingRoomEnabled(res.waitingRoomEnabled !== false);
    } catch {
      if (!opts?.silent) setRegs([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [studyRoomId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll only while panel is open to avoid constant list churn while teaching.
  useEffect(() => {
    if (!open) return;
    void load({ silent: true });
    const id = window.setInterval(() => {
      void load({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load, open]);

  const onRemoveGuest = async (guestId: string) => {
    setRemoving(guestId);
    try {
      await studyRoomsApi.removeWebinarGuest(studyRoomId, guestId);
      await load();
    } finally {
      setRemoving(null);
    }
  };

  const onApproveRegistration = async (registrationId: string) => {
    setApproving(registrationId);
    try {
      await studyRoomsApi.approveWebinarRegistration(
        studyRoomId,
        registrationId,
      );
      await load();
    } finally {
      setApproving(null);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-expanded={false}
          aria-controls="webinar-host-panel"
          onClick={() => setOpen(true)}
          className={cn(
            "fixed left-0 top-0 z-[46]",
            "relative flex items-center justify-center p-2.5",
            "rounded-br-lg border-r border-b border-white/15 bg-[#141414]/95",
            "text-emerald-400 shadow-lg backdrop-blur-sm",
            "transition-colors hover:bg-[#1a1a1a] hover:text-emerald-300",
            "pointer-events-auto",
          )}
          title={
            pendingAdmitCount > 0
              ? `Webinar controls — ${pendingAdmitCount} waiting to be admitted`
              : "Webinar controls"
          }
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
          {pendingAdmitCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black"
              aria-hidden
            >
              {pendingAdmitCount > 9 ? "9+" : pendingAdmitCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[44] bg-black/50 backdrop-blur-[1px]"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <div
        id="webinar-host-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="webinar-host-panel-title"
        className={cn(
          "fixed top-14 left-0 bottom-0 z-[45] w-[min(100%,20rem)] max-w-[85vw]",
          "flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-2 pointer-events-auto">
          <div className="rounded-xl border border-white/10 bg-[#141414]/95 p-3 space-y-3 text-white text-sm shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-4 w-4 shrink-0 text-emerald-400" />
                <span
                  id="webinar-host-panel-title"
                  className="font-semibold truncate"
                >
                  Webinar
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-white/50 whitespace-nowrap">
                  {liveGuestCount} live guests
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label="Close webinar panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-white/60 mb-1">
                Registrations ({regs.length})
              </p>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              ) : (
                <ScrollArea className="h-[min(180px,40vh)] pr-2">
                  <ul className="space-y-1.5">
                    {regs.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-md bg-white/5 px-2 py-1.5 text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate min-w-0">
                            <span className="font-medium">{r.name}</span>
                            <span className="text-white/50"> · {r.email}</span>
                          </span>
                          <span
                            className={
                              r.approvalStatus === "approved"
                                ? "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-300"
                                : "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-200"
                            }
                          >
                            {r.approvalStatus === "approved"
                              ? "Approved"
                              : "Pending"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {waitingRoomEnabled &&
                            r.approvalStatus === "pending" && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 gap-1 bg-emerald-600/30 text-emerald-100 hover:bg-emerald-600/45"
                                disabled={approving === r.id}
                                onClick={() => void onApproveRegistration(r.id)}
                              >
                                {approving === r.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5" />
                                )}
                                Admit
                              </Button>
                            )}
                          {r.approvalStatus === "approved" && r.guestParticipantId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              disabled={removing === r.guestParticipantId}
                              onClick={() =>
                                void onRemoveGuest(r.guestParticipantId!)
                              }
                              title="Kick attendee from webinar"
                            >
                              {removing === r.guestParticipantId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <UserMinus className="h-3.5 w-3.5" />
                              )}
                              Kick
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                    {regs.length === 0 && (
                      <li className="text-white/40 text-xs">
                        No registrations yet.
                      </li>
                    )}
                  </ul>
                </ScrollArea>
              )}
            </div>

            <p className="text-[10px] text-white/40 leading-relaxed border-t border-white/10 pt-2">
              Attendee limits: they can only use mic/camera if you allowed it when
              creating the webinar; in webinar mode they don&apos;t see other
              participants&apos; video tiles.
            </p>

            <div className="border-t border-white/10 pt-2 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-white/45">
                Controls
              </p>
              {/* “Allow specific users”: admit/remove only when waiting room was enabled for this webinar */}
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 space-y-1.5">
                <p className="text-xs font-semibold text-white/90">
                  Who can join
                </p>
                {waitingRoomEnabled ? (
                  <p className="text-[11px] leading-snug text-white/55">
                    Waiting room is <span className="text-amber-200/90">on</span>{" "}
                    for this webinar. New registrations stay{" "}
                    <strong className="text-white/75">pending</strong> until you{" "}
                    <strong className="text-white/75">Admit</strong>. Use{" "}
                    <strong className="text-white/75">Kick</strong> to remove
                    an approved attendee immediately.
                  </p>
                ) : (
                  <p className="text-[11px] leading-snug text-white/55">
                    Waiting room is <span className="text-emerald-300/90">off</span>
                    — attendees are <strong className="text-white/75">approved automatically</strong>{" "}
                    (no admit step). You can still <strong className="text-white/75">Kick</strong>{" "}
                    someone who has joined.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
