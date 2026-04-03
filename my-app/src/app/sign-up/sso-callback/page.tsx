import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback signUpFallbackRedirectUrl="/onboarding" />
  );
  return <AuthenticateWithRedirectCallback signUpFallbackRedirectUrl="/onboarding" signInFallbackRedirectUrl="/onboarding" />;
}
