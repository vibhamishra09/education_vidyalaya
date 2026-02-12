-- Indexes for profile and study-room detail/list latency hotspots
CREATE INDEX IF NOT EXISTS "StudyRoom_createdById_idx" ON "StudyRoom"("createdById");
CREATE INDEX IF NOT EXISTS "StudyRoom_sessionStatus_date_idx" ON "StudyRoom"("sessionStatus", "date");

CREATE INDEX IF NOT EXISTS "PeerSession_requestedToId_idx" ON "PeerSession"("requestedToId");
CREATE INDEX IF NOT EXISTS "PeerSession_requestedById_idx" ON "PeerSession"("requestedById");
CREATE INDEX IF NOT EXISTS "PeerSession_sessionStatus_date_idx" ON "PeerSession"("sessionStatus", "date");

CREATE INDEX IF NOT EXISTS "Review_revieweeId_idx" ON "Review"("revieweeId");
CREATE INDEX IF NOT EXISTS "Review_reviewerId_idx" ON "Review"("reviewerId");
CREATE INDEX IF NOT EXISTS "Review_studyRoomId_idx" ON "Review"("studyRoomId");
CREATE INDEX IF NOT EXISTS "Review_peerSessionId_idx" ON "Review"("peerSessionId");

CREATE INDEX IF NOT EXISTS "StudyRoomParticipant_studyRoomId_idx" ON "StudyRoomParticipant"("studyRoomId");
