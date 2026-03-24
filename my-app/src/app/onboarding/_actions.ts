'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { getBackendUrlForServer } from '@/lib/server-backend-url'
import { messageFromNestJsonBody } from '@/lib/utils/error-handling'

export const completeOnboarding = async (formData: FormData) => {
  const { isAuthenticated, userId, getToken } = await auth()

  if (!isAuthenticated || !userId) {
    return { message: 'No Logged In User' }
  }

  const token = await getToken()
  if (!token) {
    return { error: 'Could not issue session token for API. Please sign in again.' }
  }

  const client = await clerkClient()

  try {
    // Get user data from Clerk
    const clerkUser = await client.users.getUser(userId)
    
    // Prepare onboarding data
    const onboardingData = {
      clerkId: userId,
      name: clerkUser.fullName || clerkUser.username || 'Anonymous',
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      avatar: formData.get('avatar') as string || clerkUser.imageUrl,
      bio: formData.get('bio') as string || null,
      skillsIHave: JSON.parse(formData.get('skillsIHave') as string || '[]'),
      skillsIWant: JSON.parse(formData.get('skillsIWant') as string || '[]'),
    }

    const backendUrl = getBackendUrlForServer()
    const response = await fetch(`${backendUrl}/api/users/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(onboardingData),
    })

    if (!response.ok) {
      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      return {
        error: messageFromNestJsonBody(payload, 'Failed to complete onboarding'),
      }
    }

    // Update Clerk user metadata to mark onboarding as complete
    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
      },
    })

    return { message: 'Onboarding completed successfully' }
  } catch (err) {
    console.error('Onboarding error:', err)
    return { error: 'There was an error updating the user metadata.' }
  }
}
