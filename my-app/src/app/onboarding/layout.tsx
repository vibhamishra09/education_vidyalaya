export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Completed users: middleware handles redirect (with redirect_url + cookie bridge).
  return <>{children}</>;
}
