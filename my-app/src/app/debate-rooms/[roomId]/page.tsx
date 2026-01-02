import DebateRoomClient from './debate-room-client';

// Page component (Server Component that renders Client Component)
export default async function DebateRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  
  return <DebateRoomClient roomId={roomId} />;
}
