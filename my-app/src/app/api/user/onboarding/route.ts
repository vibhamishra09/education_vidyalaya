import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  console.log('🔍 API route called');
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const displayName = formData.get('displayName') as string;
    const avatar = formData.get('avatar') as string;
    const bio = formData.get('bio') as string;
    const location = formData.get('location') as string;
    const school = formData.get('school') as string;
    const hourlyRate = parseFloat(formData.get('hourlyRate') as string || '0');
    const skillsIHave = JSON.parse(formData.get('skillsIHave') as string || '[]');
    const skillsIWant = JSON.parse(formData.get('skillsIWant') as string || '[]');

    // Get user data from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    
    const clerkId = userId;
    const name = displayName || clerkUser.fullName || clerkUser.username || 'Anonymous';
    const email = clerkUser.primaryEmailAddress?.emailAddress || '';

    // Call the backend API to create/update user
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    console.log('🔍 Calling backend API to complete onboarding');
    const response = await fetch(`${backendUrl}/api/users/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId,
        name,
        email,
        avatar,
        bio,
        location: location || undefined,
        school: school || undefined,
        hourlyRate: hourlyRate > 0 ? hourlyRate : undefined,
        skillsIHave,
        skillsIWant,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Failed to complete onboarding" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Update Clerk user metadata to mark onboarding as complete
    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Onboarding API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
