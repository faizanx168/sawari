export interface Notification {
  id: string;
  type: 'booking' | 'system';
  message: string;
  read: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
} 