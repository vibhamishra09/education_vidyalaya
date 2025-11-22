'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
// import { redirect } from 'next/navigation'

export const completeOnboarding = async (formData: FormData) => {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated) {
    return { message: 'No Logged In User' }
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

    // Call the backend API to create/update user
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${backendUrl}/api/users/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onboardingData),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to complete onboarding' }
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
