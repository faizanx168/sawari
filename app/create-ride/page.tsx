'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AddressInput from '../components/AddressInput';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { RecurringPattern } from '../types/ride';
import { hasTimeConflict } from '../utils/time';
import { Ride } from '../types/ride';
import LoadingSpinner from '../components/LoadingSpinner';
import LoadingPage from '../components/LoadingPage';

interface Location {
  lat: number;
  lng: number;
}

interface GoogleLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
}

export default function CreateRide() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [seatsAvailable, setSeatsAvailable] = useState('');
  const [pickupRadius, setPickupRadius] = useState(1);
  const [dropoffRadius, setDropoffRadius] = useState(1);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern>('WEEKLY');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      console.log('User is authenticated, fetching cars');
      fetchCars();
    } else {
      console.log('User is not authenticated');
    }
  }, [session]);

  const fetchCars = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching cars...');
      const response = await fetch('/api/cars');
      console.log('Cars API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching cars:', errorData);
        throw new Error('Failed to fetch cars');
      }
      
      const data = await response.json();
      console.log('Cars fetched successfully:', data);
      setCars(data);
    } catch (error) {
      toast.error('Failed to load cars');
      console.error('Error fetching cars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = (address: string, location: GoogleLocation | null, type: 'pickup' | 'dropoff') => {
    if (!location) return;

    const newLocation: Location = {
      lat: location.latitude,
      lng: location.longitude,
    };

    if (type === 'pickup') {
      setPickupAddress(address);
      setPickupLocation(newLocation);
    } else {
      setDropoffAddress(address);
      setDropoffLocation(newLocation);
    }
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const checkForConflicts = async () => {
    try {
      // Fetch existing rides for the driver
      const response = await fetch(`/api/rides?driverId=${session?.user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch existing rides');
      
      const existingRides: Ride[] = await response.json();
      
      const newRideSlot = {
        startTime: departureTime,
        endTime: returnTime || '23:59',
        recurringPattern: recurringPattern || 'DAILY',
        recurringDays: selectedDays,
        startDate,
        endDate: endDate || undefined,
      };
      
      const existingSlots = existingRides.map((ride: Ride) => ({
        startTime: ride.departureTime,
        endTime: ride.returnTime || '23:59',
        recurringPattern: ride.recurringPattern || 'DAILY',
        recurringDays: ride.recurringDays,
        startDate: ride.date,
        endDate: ride.endDate,
      }));
      
      return hasTimeConflict(newRideSlot, existingSlots);
    } catch (error) {
      console.error('Error checking for conflicts:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      toast.error('You must be logged in to create a ride');
      return;
    }
    
    if (!selectedCar) {
      toast.error('Please select a car');
      return;
    }

    if (!pickupLocation || !dropoffLocation) {
      toast.error('Please select valid pickup and dropoff locations');
      return;
    }

    if (!departureTime || !pricePerSeat || !seatsAvailable) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (recurringPattern === 'WEEKLY' && selectedDays.length === 0) {
      toast.error('Please select at least one day of the week');
      return;
    }

    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Check for time conflicts
      const hasConflict = await checkForConflicts();
      if (hasConflict) {
        toast.error('This ride conflicts with an existing ride in your schedule');
        setIsSubmitting(false);
        return;
      }

      // Format the data according to the schema
      const rideData = {
        driverId: session.user.id,
        carId: selectedCar.id,
        pickupLocation: {
          latitude: pickupLocation.lat,
          longitude: pickupLocation.lng,
          address: pickupAddress
        },
        dropoffLocation: {
          latitude: dropoffLocation.lat,
          longitude: dropoffLocation.lng,
          address: dropoffAddress
        },
        departureTime,
        returnTime: returnTime || undefined,
        pricePerSeat: parseFloat(pricePerSeat),
        seatsAvailable: parseInt(seatsAvailable),
        pickupRadius,
        dropoffRadius,
        recurringPattern,
        recurringDays: selectedDays,
        startDate,
        endDate: endDate || undefined
      };

      console.log('Submitting ride data:', rideData);

      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rideData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to create ride');
      }

      const createdRide = await response.json();
      console.log('Ride created successfully:', createdRide);
      
      toast.success('Ride created successfully');
      router.push('/my-rides');
    } catch (error) {
      console.error('Error creating ride:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  if (status === 'loading') {
    return <LoadingPage text="Loading your profile" />;
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Recurring Ride</h1>
      
      {isSubmitting && <LoadingSpinner fullScreen text="Creating your ride..." />}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="car">Select Car</Label>
            <Select value={selectedCar?.id} onValueChange={(value) => setSelectedCar(cars.find(car => car.id === value) || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a car" />
              </SelectTrigger>
              <SelectContent className='bg-white text-black overflow-y-auto max-h-[300px]' >
                {cars.map((car) => (
                  <SelectItem key={car.id} value={car.id}>
                    {car.year} {car.make} {car.model} - {car.licensePlate} ({car.seats} seats)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoading && <p className="text-sm text-gray-500 mt-1">Loading cars...</p>}
            {!isLoading && cars.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                No cars available. Please add a car first.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="pickup">Pickup Location</Label>
            <AddressInput
              value={pickupAddress}
              onChange={(address, location) => handleLocationChange(address, location, 'pickup')}
              placeholder="Enter pickup location"
              required
            />
          </div>

          <div>
            <Label htmlFor="dropoff">Dropoff Location</Label>
            <AddressInput
              value={dropoffAddress}
              onChange={(address, location) => handleLocationChange(address, location, 'dropoff')}
              placeholder="Enter dropoff location"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="departureTime">Departure Time</Label>
              <Input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="returnTime">Return Time (Optional)</Label>
            <Input
              id="returnTime"
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pricePerSeat">Price per Seat ($)</Label>
              <Input
                id="pricePerSeat"
                type="number"
                min="0"
                step="0.01"
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="seatsAvailable">Available Seats</Label>
              <Input
                id="seatsAvailable"
                type="number"
                min="1"
                max="4"
                value={seatsAvailable}
                onChange={(e) => setSeatsAvailable(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickupRadius">Pickup Radius (miles)</Label>
              <Input
                id="pickupRadius"
                type="number"
                min="1"
                max="10"
                value={pickupRadius}
                onChange={(e) => setPickupRadius(parseFloat(e.target.value))}
                required
              />
            </div>

            <div>
              <Label htmlFor="dropoffRadius">Dropoff Radius (miles)</Label>
              <Input
                id="dropoffRadius"
                type="number"
                min="1"
                max="10"
                value={dropoffRadius}
                onChange={(e) => setDropoffRadius(parseFloat(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Recurring Pattern</h2>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setRecurringPattern('DAILY')}
                className={`px-4 py-2 rounded ${
                  recurringPattern === 'DAILY'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setRecurringPattern('WEEKLY')}
                className={`px-4 py-2 rounded ${
                  recurringPattern === 'WEEKLY'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {recurringPattern === 'WEEKLY' && (
            <div className="space-y-4">
              <h3 className="text-md font-medium">Select Days</h3>
              <div className="grid grid-cols-7 gap-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`p-2 rounded ${
                      selectedDays.includes(day)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="px-8 py-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" />
                <span className="ml-2">Creating...</span>
              </div>
            ) : (
              'Create Ride'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}