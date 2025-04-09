import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/utils/auth';
import prisma from '@/app/lib/prisma';
import { RideStatusEnum } from '@/app/types/zod';     

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { status } = await req.json();

    // Validate status
    if (!status || !RideStatusEnum.safeParse(status).success) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Check if ride exists and belongs to user
    const existingRide = await prisma.ride.findUnique({
      where: {
        id,
        driverId: session.user.id,
      },
    });

    if (!existingRide) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    // Update ride status
    const updatedRide = await prisma.ride.update({
      where: { id },
      data: { status },
      include: {
        pickupLocation: true,
        dropoffLocation: true,
        driver: {
          select: {
            name: true,
            email: true,
          },
        },
        car: true,
      },
    });

    return NextResponse.json(updatedRide);
  } catch (error) {
    console.error('Error updating ride status:', error);
    return NextResponse.json(
      { error: 'Failed to update ride status' },
      { status: 500 }
    );
  }
} 