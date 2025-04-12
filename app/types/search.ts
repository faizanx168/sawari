import { Location } from './location';

export interface PriceRange {
  min: number;
  max: number;
}

export interface RidePreferences {
  smoking: boolean;
  music: boolean;
  pets: boolean;
  luggage: boolean;
  defaultSeats?: number;
  maxDistance?: number;
  preferredTimes?: string[];
}

export interface RecentSearch {
  id: string;
  from: string;
  to: string;
  departureDate: Date;
  timestamp: Date;
}

export interface SearchFilters {
  from: string;
  to: string;
  fromLocation: Location | null;
  toLocation: Location | null;
  departureDate: Date | null;
  departureTime: string;
  seats: number;
  priceRange: PriceRange;
  preferences: RidePreferences;
  radius: number;
  maxDistance: number;
}

export type SortOption = 'price' | 'distance' | 'time';

export interface SortConfig {
  key: SortOption;
  order: 'asc' | 'desc';
} 