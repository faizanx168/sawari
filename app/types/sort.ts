export type SortOption = 'price' | 'distance' | 'time';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  order: SortOrder;
} 