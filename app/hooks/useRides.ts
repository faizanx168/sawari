import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Ride {
  id: string;
  date: string;
  departureTime: string;
  returnTime: string | null;
  pricePerSeat: number;
  seatsAvailable: number;
  status: string;
  isRecurring: boolean;
  recurringDays: string[];
  pickupLocation: {
    address: string;
  };
  dropoffLocation: {
    address: string;
  };
  driver: {
    name: string;
    email: string;
  };
}

async function fetchRides(): Promise<Ride[]> {
  const response = await fetch('/api/rides/my-rides');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch rides');
  }
  return response.json();
}

async function deleteRide(id: string): Promise<void> {
  const response = await fetch(`/api/rides/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete ride');
  }
}

async function updateRideStatus(id: string, status: string): Promise<void> {
  const response = await fetch(`/api/rides/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update ride status');
  }
}

export function useRides() {
  const queryClient = useQueryClient();

  const { data: rides = [], isLoading, error } = useQuery({
    queryKey: ['rides'],
    queryFn: fetchRides,
    staleTime: 30000, // 30 seconds
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRide,
    onSuccess: (_, id) => {
      queryClient.setQueryData(['rides'], (old: Ride[] | undefined) => {
        if (!old) return [];
        return old.filter(ride => ride.id !== id);
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateRideStatus(id, status),
    onSuccess: (_, { id, status }) => {
      queryClient.setQueryData(['rides'], (old: Ride[] | undefined) => {
        if (!old) return [];
        return old.map(ride => ride.id === id ? { ...ride, status } : ride);
      });
    },
  });

  return {
    rides,
    isLoading,
    error,
    deleteRide: deleteMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
  };
} 