// Server component wrapper for static export
import { ProfileClient } from "./profile-client";

// Generate static params for static export
// Returns a placeholder to satisfy static export requirements
// Actual user profiles are handled via client-side routing
export function generateStaticParams() {
  // Return a placeholder to satisfy static export requirements
  // The actual profile data is fetched client-side based on the URL param
  return [
    { userId: 'placeholder' }
  ];
}

export default function PublicProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const { userId } = params;
  
  return <ProfileClient userId={userId} />;
}
