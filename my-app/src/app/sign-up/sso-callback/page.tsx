import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback signUpFallbackRedirectUrl="/dashboard" />
  );
  return <AuthenticateWithRedirectCallback signUpFallbackRedirectUrl="/onboarding" signInFallbackRedirectUrl="/onboarding" />;
}
