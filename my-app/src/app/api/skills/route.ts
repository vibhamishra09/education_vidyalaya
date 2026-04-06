import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/** Forward Clerk/Bearer token so createSkill reaches Nest with auth (same as other /api proxies). */
function authHeaders(request: NextRequest): HeadersInit {
  const auth = request.headers.get('authorization');
  return {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: auth } : {}),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const response = await fetch(`${BACKEND_URL}/api/skills`, {
      method: 'POST',
      headers: authHeaders(request),
      body: body || '{}',
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error creating skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 },
    );
  }
}

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
