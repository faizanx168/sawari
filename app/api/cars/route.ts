import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/utils/auth';
import prisma from '@/app/lib/prisma';
import { CreateCarInput, CreateCarInputType } from '../../types/zod';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate input data
    const validatedData = CreateCarInput.parse(data) as CreateCarInputType;

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create the car
    const car = await prisma.car.create({
      data: {
        make: validatedData.make,
        model: validatedData.model,
        year: validatedData.year,
        color: validatedData.color,
        licensePlate: validatedData.licensePlate,
        seats: validatedData.seats,
        userId: user.id,
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(car);
  } catch (error) {
    console.error('Error creating car:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create car' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('GET /api/cars - Starting request');
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'Authenticated' : 'Not authenticated');

    if (!session?.user?.email) {
      console.log('Unauthorized: No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID
    console.log('Finding user with email:', session.user.email);
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log('User not found for email:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Finding cars for user ID:', user.id);
    const cars = await prisma.car.findMany({
      where: {
        userId: user.id,
      },
      include: {
        images: true,
      },
    });

    console.log(`Found ${cars.length} cars for user`);
    return NextResponse.json(cars);
  } catch (error) {
    console.error('Error fetching cars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cars' },
      { status: 500 }
    );
  }
} 