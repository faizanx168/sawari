/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import Image from 'next/image';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useQuery } from '@tanstack/react-query';
  
interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  images: { id: string; url: string }[];
}

export default function MyCars() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isDeletingCar, setIsDeletingCar] = useState<string | null>(null);
  const [carToDelete, setCarToDelete] = useState<string | null>(null);
  const [newCar, setNewCar] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    seats: '',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Placeholder image for when car images fail to load
  const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 600'%3E%3Crect fill='%23f3f4f6' width='800' height='600'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ECar Image%3C/text%3E%3C/svg%3E";

  // Use React Query for fetching cars
  const { data: cars = [], isLoading, refetch: refetchCars } = useQuery({
    queryKey: ['cars'],
    queryFn: async () => {
      const response = await fetch('/api/cars');
      if (!response.ok) throw new Error('Failed to fetch cars');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validate file types
      const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
      if (invalidFiles.length > 0) {
        toast.error('Please select only image files');
        return;
      }

      // Validate file sizes (5MB limit)
      const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast.error('Image files must be less than 5MB');
        return;
      }

      setSelectedImages(files);
    }
  };

  const uploadImages = async (carId: string) => {
    if (selectedImages.length === 0) {
      console.log('No images selected for upload');
      return;
    }

    console.log('Starting image upload process for car:', carId);
    console.log('Number of images to upload:', selectedImages.length);

    const uploadPromises = selectedImages.map(async (file) => {
      console.log('Processing file:', file.name);
      const formData = new FormData();
      formData.append('file', file);

      try {
        console.log('Uploading to server...');
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Upload failed:', errorData);
          throw new Error(errorData.error?.message || 'Failed to upload image');
        }

        const data = await response.json();
        console.log('Upload successful:', data.secure_url);

        console.log('Saving image URL to database...');
        const dbResponse = await fetch(`/api/cars/${carId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: data.secure_url, carId: carId }),
        });

        if (!dbResponse.ok) {
          const errorData = await dbResponse.json();
          console.error('Database save failed:', errorData);
          throw new Error(errorData.error || 'Failed to save image URL to database');
        }
        console.log('Image URL saved to database successfully');
      } catch (error) {
        console.error('Error in upload process:', error);
        throw error;
      }
    });

    try {
      await Promise.all(uploadPromises);
      console.log('All images uploaded successfully');
      toast.success('Images uploaded successfully');
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload one or more images');
      throw new Error('Failed to upload one or more images');
    }
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      // ... existing code ...
      setSelectedImages([]);
      refetchCars();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add car');
      console.error('Error adding car:', error);
    }
  };

  const handleDeleteImage = async (carId: string, imageId: string) => {
    try {
      const response = await fetch(`/api/cars/${carId}/images?imageId=${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete image');
      toast.success('Image deleted successfully');
      refetchCars();
    } catch (error) {
      toast.error('Failed to delete image');
      console.error('Error deleting image:', error);
    }
  };

  const handleDeleteCar = async (carId: string) => {
    try {
      setIsDeletingCar(carId);
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete car');
      }

      toast.success('Car deleted successfully');
      refetchCars();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete car');
      console.error('Error deleting car:', error);
    } finally {
      setIsDeletingCar(null);
    }
  };

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Cars</h1>
        <Button onClick={() => setIsAddingCar(true)}>Add New Car</Button>
      </div>

      {isAddingCar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Car</h2>
            <form onSubmit={handleAddCar} className="space-y-4">
              <div>
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={newCar.make}
                  onChange={(e) => setNewCar({ ...newCar, make: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={newCar.model}
                  onChange={(e) => setNewCar({ ...newCar, model: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={newCar.year}
                  onChange={(e) => setNewCar({ ...newCar, year: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={newCar.color}
                  onChange={(e) => setNewCar({ ...newCar, color: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input
                  id="licensePlate"
                  value={newCar.licensePlate}
                  onChange={(e) => setNewCar({ ...newCar, licensePlate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="seats">Number of Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  value={newCar.seats}
                  onChange={(e) => setNewCar({ ...newCar, seats: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="images">Car Images</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingCar(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Car'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cars.map((car: Car) => (
          <div key={car.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="aspect-video relative mb-4">
              {car.images && car.images.length > 0 && car.images[0] ? (
                <Image
                  src={car.images[0].url}
                  alt={`${car.make} ${car.model}`}
                  fill
                  className="object-cover w-full h-full rounded-md"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                  <span className="text-gray-500">No image available</span>
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold">
              {car.year} {car.make} {car.model}
            </h3>
            <p className="text-gray-600">Color: {car.color}</p>
            <p className="text-gray-600">License Plate: {car.licensePlate}</p>
            <p className="text-gray-600">Seats: {car.seats}</p>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {car.images?.map((image: { id: string; url: string }) => (
                  <div key={image.id} className="relative w-24 h-24">
                    <Image
                      src={image.url}
                      alt="Car"
                      fill
                      className="object-cover rounded-md"
                      onError={(e) => {
                        console.error('Error loading image:', e);
                        // Fallback to a placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = placeholderImage;
                      }}
                    />
                    <button
                      onClick={() => handleDeleteImage(car.id, image.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={() => setCarToDelete(car.id)}
                disabled={isDeletingCar === car.id}
              >
                {isDeletingCar === car.id ? 'Deleting...' : 'Delete Car'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog for Car Deletion */}
      <ConfirmationDialog
        isOpen={!!carToDelete}
        onClose={() => setCarToDelete(null)}
        onConfirm={() => carToDelete && handleDeleteCar(carToDelete)}
        title="Delete Car"
        message="Are you sure you want to delete this car? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
    </>
  );
} 