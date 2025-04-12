import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/utils/auth';
import prisma from '@/app/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;
    
    console.log('Fetching user profile for ID:', id);
    console.log('Session:', session ? 'Authenticated' : 'Not authenticated');

    // For debugging, allow access without authentication in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: bypassing authentication check');
    } else if (!session?.user?.email) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure we have a valid session with user ID
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const currentUserId = session.user.id;

    // First check if the user exists
    const userExists = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!userExists) {
      console.log('User not found with ID:', id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If the user is viewing their own profile, allow access
    if (currentUserId === id) {
      console.log('User viewing their own profile');
    } else {
      // Remove the restriction that checks if users have ridden together
      console.log('User viewing another profile');
    }

    console.log('User profile fetched successfully');
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phoneNumber: true,
        createdAt: true,
        reviewsReceived: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        reviewsGiven: {
          include: {
            reviewed: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            rides: true,
            bookings: true,
          },
        },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow users to update their own profile
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { phoneNumber, image } = body;

    // Validate phone number format
    if (phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(phoneNumber && { phoneNumber }),
        ...(image && { image }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
} 