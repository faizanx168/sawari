/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Filter, SortAsc, SortDesc } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import ReviewForm from '../components/ReviewForm';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem, 
  SelectTrigger,  
  SelectValue,
} from "../components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';


interface Booking {
  id: string;
  status: string;
  seatsBooked: number;
  createdAt: string;
  ride: {
    id: string;
    date: string;
    departureTime: string;
    returnTime: string | null;
    driver: {
      id: string;
      name: string;
      email: string;
      phoneNumber: string;
    };
    bookings: {
      user: {
        id: string;
        name: string;
        email: string;
        phoneNumber: string;
      };
    }[];
    pickupLocation: {
      name: string;
      address: string;
    };
    dropoffLocation: {
      name: string;
      address: string;
    };
    car: {
      make: string;
      model: string;
      year: number;
      color: string;
      licensePlate: string;
    };
  };
}

type SortField = 'date' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function MyBookings() {
  const { status } = useSession();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
  });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isDeletingBooking, setIsDeletingBooking] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{
    reviewedId: string;
    rideId: string;
    reviewedName: string;
  } | null>(null);

  // Use React Query for fetching bookings
  const { data: bookings = [], isLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await fetch('/api/bookings/my-bookings');
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: status === 'authenticated', // Only fetch when authenticated
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setIsDeletingBooking(true);
      setBookingToDelete(bookingId);
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete booking');
      }
      
      toast.success('Booking deleted successfully');
      refetchBookings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete booking');
      console.error('Error deleting booking:', error);
    } finally {
      setIsDeletingBooking(false);
      setBookingToDelete(null);
    }
  };

  const handleReviewClick = (reviewedId: string, rideId: string, reviewedName: string) => {
    setSelectedBooking({ reviewedId, rideId, reviewedName });
    setShowReviewForm(true);
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setSelectedBooking(null);
    refetchBookings();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmed';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'PENDING':
        return 'Pending';
      default:
        return status;
    }
  };

  const filteredAndSortedBookings = bookings
    .filter((booking: Booking) => {
      if (filters.status !== 'all' && booking.status !== filters.status) {
        return false;
      }

      const bookingDate = new Date(booking.createdAt);
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);

      switch (filters.dateRange) {
        case 'today':
          return bookingDate.toDateString() === today.toDateString();
        case 'week':
          return bookingDate <= nextWeek;
        case 'month':
          return bookingDate <= nextMonth;
        default:
          return true;
      }
    })
    .sort((a: Booking, b: Booking) => {
      if (sortField === 'date') {
        return sortOrder === 'asc' 
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortField === 'createdAt') {
        return sortOrder === 'asc'
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt);
      }
      return 0;
    });

  if (isLoading) {
    return (
      <>
            <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  if (bookings.length === 0) {
    return (
      <>
            <div className="container mx-auto px-4 py-8">
          <Breadcrumb items={[{ label: 'My Bookings', href: '/my-bookings' }]} />
          <div className="text-center py-8">
            <p className="text-gray-500">No bookings found matching your criteria.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
        <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={[{ label: 'My Bookings', href: '/my-bookings' }]} />
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </Button>
            <Select 
              defaultValue="date"
              onValueChange={(value) => setSortField(value as SortField)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="createdAt">Created</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select 
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <Select 
                  value={filters.dateRange}
                  onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Next 7 Days</SelectItem>
                    <SelectItem value="month">Next 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        
        {filteredAndSortedBookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No bookings found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedBookings.map((booking: Booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(booking.status)}
                    <span className="font-semibold">{getStatusText(booking.status)}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(booking.createdAt).toLocaleDateString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">
                        {booking.ride.car.make} {booking.ride.car.model} ({booking.ride.car.year})
                      </h3>
                      <p className="text-sm text-gray-600">
                        Color: {booking.ride.car.color} | License: {booking.ride.car.licensePlate}
                      </p>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium mb-1">Schedule</p>
                      <p>Date: {new Date(booking.ride.date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                      <p>Departure: {booking.ride.departureTime}</p>
                      {booking.ride.returnTime && (
                        <p>Return: {booking.ride.returnTime}</p>
                      )}
                    </div>

                    <div className="text-sm">
                      <p className="font-medium mb-1">Route</p>
                      <p>From: {booking.ride.pickupLocation.name}</p>
                      <p className="text-gray-600 text-xs">{booking.ride.pickupLocation.address}</p>
                      <p className="mt-1">To: {booking.ride.dropoffLocation.name}</p>
                      <p className="text-gray-600 text-xs">{booking.ride.dropoffLocation.address}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm">
                      <p className="font-medium mb-1">Driver</p>
                      <p>{booking.ride.driver.name}</p>
                      <p className="text-gray-600">{booking.ride.driver.email}</p>
                      <p className="text-gray-600">{booking.ride.driver.phoneNumber}</p>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium mb-1">Booking Details</p>
                      <p>Seats Booked: {booking.seatsBooked}</p>
                      <p>Booked on: {new Date(booking.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                    </div>

                    <div className="pt-4 flex flex-col gap-2">
                      {booking.status === 'CONFIRMED' && (
                        <Button
                          variant="outline"
                          className="text-red-600 hover:text-red-800 w-full"
                          onClick={() => setBookingToDelete(booking.id)}
                        >
                          Cancel Booking
                        </Button>
                      )}
                      {/* {booking.status === 'COMPLETED' && ( */}
                        <>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleReviewClick(
                              booking.ride.driver.id,
                              booking.ride.id,
                              `Driver ${booking.ride.driver.name}`
                            )}
                          >
                            Review Driver
                          </Button>
                          {booking.ride.bookings.map((otherBooking: { user: { id: string; name: string } }) => (
                            <Button
                              key={otherBooking.user.id}
                              variant="outline"
                              className="w-full"
                              onClick={() => handleReviewClick(
                                otherBooking.user.id,
                                booking.ride.id,
                                `Rider ${otherBooking.user.name}`
                              )}
                            >
                              Review {otherBooking.user.name}
                            </Button>
                          ))}
                        </>
                      {/* )} */}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {bookingToDelete && (
        <ConfirmationDialog
          isOpen={!!bookingToDelete}
          onClose={() => setBookingToDelete(null)}
          onConfirm={() => handleDeleteBooking(bookingToDelete)}
          title="Cancel Booking"
          message="Are you sure you want to cancel this booking? This action cannot be undone."
          confirmText={isDeletingBooking ? "Cancelling..." : "Cancel Booking"}
          isConfirmDisabled={isDeletingBooking}
        />
      )}

      {showReviewForm && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Review {selectedBooking.reviewedName}</h3>
                <Button
                  variant="ghost"
                  className="h-auto p-1.5"
                  onClick={() => {
                    setShowReviewForm(false);
                    setSelectedBooking(null);
                  }}
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4">
                <ReviewForm
                  reviewedId={selectedBooking.reviewedId}
                  rideId={selectedBooking.rideId}
                  onSuccess={handleReviewSuccess}
                  onCancel={() => {
                    setShowReviewForm(false);
                    setSelectedBooking(null);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}     