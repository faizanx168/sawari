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

    // First check if the user exists
    const userExists = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!userExists) {
      console.log('User not found with ID:', id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User found, fetching full profile');
    
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

    console.log('User profile fetched successfully');
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 