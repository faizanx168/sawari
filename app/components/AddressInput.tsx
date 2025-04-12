/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { loadGoogleMapsScript } from '../utils/googleMaps';

interface AddressInputProps {
  value: string;
  onChange: (address: string, location: { latitude: number; longitude: number; address: string } | null) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  onFocus?: () => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function AddressInput({
  value,
  onChange,
  placeholder = 'Enter address',
  required = false,
  error,
  onFocus,
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const initAutocomplete = async () => {
      if (!inputRef.current) return;
      
      try {
        await loadGoogleMapsScript();
        
        // Check if places library is available
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          console.error('Google Maps Places library not available');
          return;
        }
        
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
        });
        
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            const location = {
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
              address: place.formatted_address,
            };
            setInputValue(place.formatted_address);
            onChange(place.formatted_address, location);
          }
        });
      } catch (error) {
        console.error('Error initializing Google Maps Autocomplete:', error);
      }
    };
    
    initAutocomplete();
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsLoading(true);
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      <input
        ref={inputRef}
        type="text"
        required={required}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={onFocus}
        className={`pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        }`}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 