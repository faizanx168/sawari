import React from 'react';
import { Calendar, Users, Navigation } from 'lucide-react';
import { Ride } from '@/app/types/ride';
import { Button } from '@/app/components/ui/button';

interface RideCardProps {
  ride: Ride;
  onSelect?: (rideId: string) => void;
  onBook?: (rideId: string) => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
  onCheckboxChange?: (rideId: string) => void;
  isChecked?: boolean;
}

export function RideCard({
  ride,
  onSelect,
  onBook,
  isSelected = false,
  showCheckbox = false,
  onCheckboxChange,
  isChecked = false,
}: RideCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-colors ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
      }`}
      onClick={() => onSelect?.(ride.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {showCheckbox && (
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onCheckboxChange?.(ride.id);
                }}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </div>
          )}
          <h3 className="text-lg font-medium">
            {ride.pickupLocation.address} → {ride.dropoffLocation.address}
          </h3>
          <div className="mt-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{new Date(ride.departureTime).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center mt-1">
              <Users className="h-4 w-4 mr-2" />
              <span>{ride.seatsAvailable} seats available</span>
            </div>
            <div className="flex items-center mt-1">
              <span className="font-medium">${ride.pricePerSeat}</span>
              <span className="text-gray-500 ml-1">per seat</span>
            </div>
            {ride.pickupRadius && (
              <div className="flex items-center mt-1">
                <Navigation className="h-4 w-4 mr-2" />
                <span>Pickup radius: {ride.pickupRadius} miles</span>
              </div>
            )}
            {ride.dropoffRadius && (
              <div className="flex items-center mt-1">
                <Navigation className="h-4 w-4 mr-2" />
                <span>Dropoff radius: {ride.dropoffRadius} miles</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {onBook && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onBook(ride.id);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Book Now
          </Button>
        </div>
      )}
    </div>
  );
} 