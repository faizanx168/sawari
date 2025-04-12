'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Ride } from '@/app/types/ride';
import { SearchFilters, PriceRange, RidePreferences, RecentSearch, SortOption, SortConfig } from '@/app/types/search';
import { Label as UILabel } from '@/app/components/ui/label';
import { toast } from 'sonner';
import AddressInput from '../components/AddressInput';
import { defaultPreferences } from '../utils/preferences';
import { calculateDistanceSync } from '../utils/distance';
import RideMap from '../components/RideMap';
import { RideCardSkeleton } from '@/app/components/RideCardSkeleton';
import { Calendar, Users, Navigation } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMaps';

interface RideWithDistance extends Ride {
  distance?: {
    pickup: number;
    dropoff: number | null;
  };
}

interface DistanceMatrixResponse {
  rows: {
    elements: {
      distance: { text: string };
      duration: { text: string };
    }[];
  }[];
}

interface QuickTimeFilter {
  label: string;
  getDate: () => Date;
}

const quickTimeFilters: QuickTimeFilter[] = [
  { 
    label: 'Today', 
    getDate: () => new Date() 
  },
  { 
    label: 'Tomorrow', 
    getDate: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
  },
  { 
    label: 'This Week', 
    getDate: () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
  }
];

function FindRidesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'price',
    order: 'asc'
  });
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 1000 });
  const [preferences, setPreferences] = useState<RidePreferences>(defaultPreferences);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    fromLocation: null,
    toLocation: null,
    departureDate: searchParams.get('date') ? new Date(searchParams.get('date')!) : null,
    departureTime: searchParams.get('time') || '',
    seats: parseInt(searchParams.get('seats') || '1'),
    maxDistance: 50,
    priceRange: {
      min: 0,
      max: 1000
    },
    preferences: {
      smoking: false,
      music: false,
      pets: false,
      luggage: false
    },
    radius: 50
  });
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');
  const [estimatedDistance, setEstimatedDistance] = useState<string>('');
  const [selectedRideIds, setSelectedRideIds] = useState<string[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (err) {
        console.error('Error loading recent searches:', err);
      }
    }
  }, []);

  // Load preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('ridePreferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed);
        // Apply saved preferences to search filters
        setSearchFilters(prev => ({
          ...prev,
          seats: parsed.defaultSeats,
          maxDistance: parsed.maxDistance
        }));
      } catch (err) {
        console.error('Error loading preferences:', err);
      }
    }
  }, []);

  // Save search after successful fetch
  const saveSearch = () => {
    if (!searchFilters.from && !searchFilters.to) return;
    
    const newSearch: RecentSearch = {
      id: crypto.randomUUID(),
      from: searchFilters.from,
      to: searchFilters.to,
      departureDate: searchFilters.departureDate || new Date(),
      timestamp: new Date()
    };
    
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.from !== newSearch.from || s.to !== newSearch.to);
      return [newSearch, ...filtered].slice(0, 5);
    });
    
    localStorage.setItem('recentSearches', JSON.stringify([newSearch]));
  };

  const applyRecentSearch = (search: RecentSearch) => {
    setSearchFilters(prev => ({
      ...prev,
      from: search.from,
      to: search.to,
      fromLocation: null,
      toLocation: null
    }));
    setShowRecentSearches(false);
  };

  const applyQuickTimeFilter = (filter: QuickTimeFilter) => {
    const date = filter.getDate();
    setSearchFilters(prev => ({
      ...prev,
      departureDate: date
    }));
  };

  const handleSearch = async () => {
    if (!searchFilters.fromLocation && !searchFilters.toLocation) {
      setError('Please select valid locations');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format the date properly for the API
      const formattedDate = searchFilters.departureDate 
        ? searchFilters.departureDate.toISOString().split('T')[0] 
        : null;

      const response = await fetch('/api/rides/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: searchFilters.from,
          to: searchFilters.to,
          fromLat: searchFilters.fromLocation?.latitude,
          fromLng: searchFilters.fromLocation?.longitude,
          toLat: searchFilters.toLocation?.latitude,
          toLng: searchFilters.toLocation?.longitude,
          departureDate: formattedDate,
          seats: searchFilters.seats,
          maxDistance: searchFilters.maxDistance,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch rides');
      }

      const data = await response.json();
      setRides(data);
      saveSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to search rides');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortOption) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleBookRide = (rideId: string) => {
    router.push(`/book-ride/${rideId}`);
  };

  useEffect(() => {
    if (searchFilters.fromLocation && searchFilters.toLocation) {
      const calculateDistance = async () => {
        try {
          await loadGoogleMaps();
          
          const service = new window.google.maps.DistanceMatrixService();
          service.getDistanceMatrix(
            {
              origins: [{ 
                lat: searchFilters.fromLocation?.latitude || 0, 
                lng: searchFilters.fromLocation?.longitude || 0 
              }],
              destinations: [{ 
                lat: searchFilters.toLocation?.latitude || 0, 
                lng: searchFilters.toLocation?.longitude || 0 
              }],
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (response: DistanceMatrixResponse | null, status: string) => {
              if (status === 'OK' && response?.rows?.[0]?.elements?.[0]) {
                const element = response.rows[0].elements[0];
                const duration = element.duration?.text;
                const distance = element.distance?.text;
                if (duration && distance) {
                  setEstimatedDuration(duration);
                  setEstimatedDistance(distance);
                }
              }
            }
          );
        } catch (error) {
          console.error('Error calculating distance:', error);
        }
      };
      
      calculateDistance();
    }
  }, [searchFilters.fromLocation, searchFilters.toLocation]);

  // Save preferences
  const savePreferences = (newPreferences: RidePreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem('ridePreferences', JSON.stringify(newPreferences));
    // Apply to current search
    setSearchFilters(prev => ({
      ...prev,
      seats: newPreferences.defaultSeats || prev.seats,
      maxDistance: newPreferences.maxDistance || prev.maxDistance
    }));
  };

  const toggleRideSelection = (rideId: string) => {
    setSelectedRideIds(prev => 
      prev.includes(rideId) 
        ? prev.filter(id => id !== rideId)
        : [...prev, rideId]
    );
  };

  const compareRides = () => {
    if (selectedRideIds.length < 2) {
      setError('Please select at least 2 rides to compare');
      return;
    }
    if (selectedRideIds.length > 4) {
      setError('You can compare up to 4 rides at a time');
      return;
    }
    router.push(`/compare-rides?rides=${selectedRideIds.join(',')}`);
  };

  // Filter rides based on search criteria
  const filteredRides = rides.filter((ride: Ride) => {
    // Check if user's pickup location is within ride's pickup radius
    const isWithinPickupRadius = searchFilters.fromLocation && ride.pickupLocation ? 
      calculateDistanceSync(
        searchFilters.fromLocation.latitude,
        searchFilters.fromLocation.longitude,
        ride.pickupLocation.latitude,
        ride.pickupLocation.longitude
      ) * 0.621371 <= (ride.pickupRadius ?? searchFilters.maxDistance ?? 50) : true;
    
    // Check if user's dropoff location is within ride's dropoff radius
    const isWithinDropoffRadius = searchFilters.toLocation && ride.dropoffLocation ? 
      calculateDistanceSync(
        searchFilters.toLocation.latitude,
        searchFilters.toLocation.longitude,
        ride.dropoffLocation.latitude,
        ride.dropoffLocation.longitude
      ) * 0.621371 <= (ride.dropoffRadius ?? searchFilters.maxDistance ?? 50) : true;
    
    // Check if the search date matches the ride's date
    const matchesDate = !searchFilters.departureDate || (
      new Date(ride.date).toDateString() === searchFilters.departureDate.toDateString()
    );
    
    // Check if price is within range
    const matchesPrice = (!priceRange.min || ride.pricePerSeat >= priceRange.min) &&
      (!priceRange.max || ride.pricePerSeat <= priceRange.max);
    
    return matchesDate && matchesPrice && isWithinPickupRadius && isWithinDropoffRadius;
  }).sort((a: Ride, b: Ride) => {
    if (sortConfig.key === 'distance') {
      const aDist = (a as RideWithDistance).distance?.pickup || 0;
      const bDist = (b as RideWithDistance).distance?.pickup || 0;
      return sortConfig.order === 'asc' ? aDist - bDist : bDist - aDist;
    }
    
    if (sortConfig.key === 'price') {
      return sortConfig.order === 'asc' 
        ? a.pricePerSeat - b.pricePerSeat 
        : b.pricePerSeat - a.pricePerSeat;
    }
    
    if (sortConfig.key === 'time') {
      const aTime = new Date(a.departureTime).getTime();
      const bTime = new Date(b.departureTime).getTime();
      return sortConfig.order === 'asc' ? aTime - bTime : bTime - aTime;
    }
    
    return 0;
  });

  // Add type annotations to state update functions
  const handleSearchFiltersUpdate = (prev: SearchFilters, value: string) => ({
    ...prev,
    seats: Math.max(1, parseInt(value) || 1)
  });

  const handleRecentSearchesUpdate = useCallback((prev: RecentSearch[]) => {
    const newSearch: RecentSearch = {
      id: crypto.randomUUID(),
      from: searchFilters.from,
      to: searchFilters.to,
      departureDate: searchFilters.departureDate || new Date(),
      timestamp: new Date()
    };
    return [newSearch, ...prev.filter(s => 
      s.from !== newSearch.from || s.to !== newSearch.to
    )].slice(0, 5);
  }, [searchFilters.from, searchFilters.to, searchFilters.departureDate]);

  // Update state setters to use the typed handlers
  const updateSearchFilters = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilters(prev => handleSearchFiltersUpdate(prev, e.target.value));
  };

  const updateRecentSearches = useCallback(() => {
    setRecentSearches(handleRecentSearchesUpdate);
  }, [handleRecentSearchesUpdate]);

  // Use the update functions in the component
  useEffect(() => {
    if (searchFilters.fromLocation && searchFilters.toLocation) {
      updateRecentSearches();
    }
  }, [searchFilters.fromLocation, searchFilters.toLocation, updateRecentSearches]);

  // Calculate distances for rides
  useEffect(() => {
    const calculateDistances = async () => {
      if (!searchFilters.fromLocation || !searchFilters.toLocation || filteredRides.length === 0) {
        return;
      }

      try {
        await loadGoogleMaps();
        
        const service = new window.google.maps.DistanceMatrixService();
        const origins = [searchFilters.fromLocation];
        const destinations = filteredRides.map(ride => ride.pickupLocation);

        const response = await service.getDistanceMatrix({
          origins,
          destinations,
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
        });

        if (response && response.rows && response.rows.length > 0 && response.rows[0].elements && response.rows[0].elements.length > 0) {
          const element = response.rows[0].elements[0];
          const duration = element.duration?.text;
          const distance = element.distance?.text;
          if (duration && distance) {
            setEstimatedDuration(duration);
            setEstimatedDistance(distance);
          }
        }
      } catch (err) {
        console.error('Error calculating distances:', err);
      }
    };

    calculateDistances();
  }, [searchFilters.fromLocation, searchFilters.toLocation, filteredRides]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Find Rides</h1>
        
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <AddressInput
                  value={searchFilters.from}
                  onChange={(address, location) => {
                    setSearchFilters(prev => ({
                      ...prev,
                      from: address,
                      fromLocation: location
                    }));
                  }}
                  placeholder="From"
                  onFocus={() => setShowRecentSearches(true)}
                />
              </div>
              <div className="relative">
                <AddressInput
                  value={searchFilters.to}
                  onChange={(address, location) => {
                    setSearchFilters(prev => ({
                      ...prev,
                      to: address,
                      toLocation: location
                    }));
                  }}
                  placeholder="To"
                  onFocus={() => setShowRecentSearches(true)}
                />
                {showRecentSearches && recentSearches.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
                    <ul className="py-1">
                      {recentSearches.map((search, index) => (
                        <li
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => applyRecentSearch(search)}
                        >
                          <div className="font-medium">{search.to}</div>
                          <div className="text-gray-500 text-xs">
                            {new Date(search.timestamp).toLocaleDateString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Seats and Distance */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <input
                    type="number"
                    min="1"
                    value={searchFilters.seats}
                    onChange={updateSearchFilters}
                    className="w-20 px-3 py-2 border rounded-md"
                  />
                  <span className="text-gray-600">seats</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    savePreferences({
                      ...preferences,
                      defaultSeats: searchFilters.seats
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Save as default
                </button>
              </div>
              
              {/* Distance Radius */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <Navigation className="h-5 w-5 text-gray-500" />
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={searchFilters.maxDistance || 50}
                    onChange={(e) => setSearchFilters(prev => ({ 
                      ...prev, 
                      maxDistance: Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 1))
                    }))}
                    className="w-20 px-3 py-2 border rounded-md"
                  />
                  <span className="text-gray-600">miles radius</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    savePreferences({
                      ...preferences,
                      maxDistance: searchFilters.maxDistance
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Save as default
                </button>
              </div>
              
              {/* Date and Time */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <input
                    type="date"
                    value={searchFilters.departureDate ? searchFilters.departureDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value;
                      setSearchFilters(prev => ({
                        ...prev,
                        departureDate: dateValue ? new Date(dateValue) : null
                      }));
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="p-2 border rounded w-full sm:w-auto"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <input
                    type="time"
                    value={searchFilters.departureTime}
                    onChange={(e) => setSearchFilters(prev => ({
                      ...prev,
                      departureTime: e.target.value
                    }))}
                    className="p-2 border rounded w-full sm:w-auto"
                  />
                </div>
              </div>
              
              {/* Quick Time Filters */}
              <div className="flex flex-wrap gap-2">
                {quickTimeFilters.map((filter) => (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={() => applyQuickTimeFilter(filter)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      searchFilters.departureDate?.toDateString() === filter.getDate().toDateString()
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              
              {/* Price Range */}
              <div className="space-y-2">
                <UILabel className="block text-sm font-medium text-gray-700">
                  Price Range
                </UILabel>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="0"
                    max={priceRange.max}
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({
                      ...prev,
                      min: Math.max(0, parseInt(e.target.value) || 0)
                    }))}
                    className="w-24 px-3 py-2 border rounded-md"
                    placeholder="Min"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    min={priceRange.min}
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({
                      ...prev, 
                      max: Math.max(priceRange.min, parseInt(e.target.value) || 1000)
                    }))}
                    className="w-24 px-3 py-2 border rounded-md"
                    placeholder="Max"
                  />
                </div>
              </div>
              
              {/* Estimated Duration and Distance */}
              <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{estimatedDuration}</span>
                </div>
                <div className="flex items-center">
                  <Navigation className="h-4 w-4 mr-1" />
                  <span>{estimatedDistance}</span>
                </div>
              </div>
              
              {/* Search Button */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Find Available Rides
                </button>
              </div>
            </div>
          </form>
        </div>
        
        {/* Map and Results Section - Responsive Layout */}
        <div className="flex flex-col lg:flex-row h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]">
          {/* Map Section */}
          <div className="w-full lg:w-2/3 h-[300px] lg:h-full relative mb-4 lg:mb-0">
            <RideMap
              rides={rides}
              fromLocation={searchFilters.fromLocation}
              toLocation={searchFilters.toLocation}
              selectedRideId={selectedRideId}
              selectedRoute={null}
              onRideSelect={setSelectedRideId}
              maxDistance={searchFilters.maxDistance || 50}
            />
          </div>

          {/* Results Section */}
          <div className="w-full lg:w-1/3 bg-white border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-lg font-semibold mb-2 sm:mb-0">
                  {filteredRides.length} {filteredRides.length === 1 ? 'Ride' : 'Rides'} Found
                </h2>
                <div className="flex items-center space-x-2">
                  <select
                    value={sortConfig.key}
                    onChange={(e) => handleSort(e.target.value as SortOption)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="time">Departure Time</option>
                    <option value="price">Price</option>
                    <option value="distance">Distance</option>
                  </select>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSortConfig(prev => ({
                        ...prev,
                        order: prev.order === 'asc' ? 'desc' : 'asc'
                      }));
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {sortConfig.order === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
              {selectedRideIds.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">
                    {selectedRideIds.length} ride{selectedRideIds.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={compareRides}
                    disabled={selectedRideIds.length < 2 || selectedRideIds.length > 4}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      selectedRideIds.length >= 2 && selectedRideIds.length <= 4
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Compare Rides
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-y-auto h-[calc(100vh-24rem)] lg:h-[calc(100vh-16rem)]">
              {loading ? (
                <div className="space-y-4 p-4">
                  {[1, 2, 3].map((i) => (
                    <RideCardSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 text-red-600">{error}</div>
              ) : filteredRides.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">
                  No rides found. Try adjusting your search criteria.
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {filteredRides.map((ride) => (
                    <div
                      key={ride.id}
                      className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-colors ${
                        selectedRideId === ride.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedRideId(ride.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedRideIds.includes(ride.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleRideSelection(ride.id);
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <h3 className="text-lg font-medium">
                              {ride.pickupLocation.address} → {ride.dropoffLocation.address}
                            </h3>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>
                                {new Date(ride.date).toLocaleDateString()} at {ride.departureTime}
                              </span>
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
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookRide(ride.id);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FindRides() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FindRidesContent />
    </Suspense>
  );
} 