export type RecurringPattern = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Ride {
  id: string;
  date: string; // The date of the ride in YYYY-MM-DD format
  departureTime: string; // The departure time in HH:MM format
  returnTime?: string; // Optional return time for round trips
  pricePerSeat: number;
  seatsAvailable: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  recurringDays: string[];
  startDate?: string;
  endDate?: string;
  pickupRadius?: number; // Radius in miles for pickup location
  dropoffRadius?: number; // Radius in miles for dropoff location
  driver: {
    id: string;
    name: string | null;
    image: string | null;
  };
  car: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
  };
  pickupLocation: {
    id: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  dropoffLocation: {
    id: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  distance?: {
    pickup: number; // Distance in miles from user's pickup to ride's pickup
    dropoff: number | null; // Distance in miles from user's dropoff to ride's dropoff
  };
} 