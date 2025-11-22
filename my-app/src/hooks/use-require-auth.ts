"use client";

import { useUser } from "@clerk/nextjs";

// Global reference to trigger sign-in modal
let globalSignInTrigger: (() => void) | null = null;

/**
 * Set the global sign-in trigger function
 * This should be called by the HiddenSignInButton component
 */
export function setGlobalSignInTrigger(trigger: () => void) {
  globalSignInTrigger = trigger;
}

/**
 * Get the global sign-in trigger function
 * This can be used by components that need to trigger sign-in
 */
export function getGlobalSignInTrigger(): (() => void) | null {
  return globalSignInTrigger;
}

/**
 * Hook to check if user is authenticated before performing an action.
 * If not authenticated, opens Clerk's sign-in modal.
 *
 * @returns A function that wraps an action with auth check
 *
 * @example
 * const requireAuth = useRequireAuth();
 *
 * const handleClick = () => {
 *   requireAuth(() => {
 *     // This code only runs if user is authenticated
 *     console.log("User is authenticated!");
 *   });
 * };
 */
export function useRequireAuth() {
  const { isSignedIn } = useUser();

  return (action: () => void) => {
    if (isSignedIn) {
      action();
    } else {
      // Trigger the sign-in modal if available
      if (globalSignInTrigger) {
        globalSignInTrigger();
      } else {
        console.warn("Sign-in trigger not available. Please ensure HiddenSignInButton is rendered.");
      }
    }
  };
}
