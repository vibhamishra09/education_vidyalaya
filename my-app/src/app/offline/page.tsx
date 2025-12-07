import { OfflineClient } from "./offline-client";

// Force dynamic rendering to skip prerendering
export const dynamic = 'force-dynamic';

export default function OfflinePage() {
  return <OfflineClient />;
}
