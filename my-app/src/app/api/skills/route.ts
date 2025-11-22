import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';

    // Build query parameters
    const queryParams = new URLSearchParams({
      limit,
      offset,
    });
    
    if (search) {
      queryParams.append('search', search);
    }

    const response = await fetch(`${BACKEND_URL}/api/skills?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract just the skill names for the frontend
    const skillNames = data.skills?.map((skill: { name: string }) => skill.name) || [];
    
    return NextResponse.json({
      skills: skillNames,
      pagination: data.pagination,
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}
