import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Notification } from '../types/notifications';

async function fetchNotifications(): Promise<Notification[]> {
  const response = await fetch('/api/notifications');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch notifications');
  }
  return response.json();
}

async function markNotificationAsRead(id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data is fresh
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (_, id) => {
      queryClient.setQueryData(['notifications'], (old: Notification[] | undefined) => {
        if (!old) return [];
        return old.map(n => n.id === id ? { ...n, read: true } : n);
      });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
  };
} 