import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/utils/auth';
import prisma from '@/app/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if users have ridden together
    const haveRiddenTogether = await prisma.booking.findFirst({
      where: {
        OR: [
          // Current user was a passenger and target user was the driver
          {
            userId: currentUser.id,
            ride: {
              driverId: userId,
              status: 'COMPLETED'
            }
          },
          // Target user was a passenger and current user was the driver
          {
            userId: userId,
            ride: {
              driverId: currentUser.id,
              status: 'COMPLETED'
            }
          },
          // Both users were passengers on the same ride
          {
            userId: currentUser.id,
            ride: {
              bookings: {
                some: {
                  userId: userId,
                  status: 'COMPLETED'
                }
              },
              status: 'COMPLETED'
            }
          }
        ]
      }
    });

    return NextResponse.json({ haveRiddenTogether: !!haveRiddenTogether });
  } catch (error) {
    console.error('Error checking user connection:', error);
    return NextResponse.json(
      { error: 'Failed to check user connection' },
      { status: 500 }
    );
  }
} 