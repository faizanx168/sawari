'use client';

import { useState, useEffect, use, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Star, StarHalf, Camera, Phone } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import React from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface Review {
  id: string;
  rating: number;
  comment: string;  
  createdAt: string;
  reviewer?: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  image: string;
  phoneNumber: string;
  createdAt: string;
  reviewsReceived: Review[];
  reviewsGiven: Review[];
}

export default function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('about');
  const [showAddReview, setShowAddReview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canReview, setCanReview] = useState(false);

  const { data: userData, error: queryError, isLoading, refetch } = useQuery({
    queryKey: ['user', resolvedParams.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${resolvedParams.id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user');
      }
      return response.json();
    },
    enabled: !!resolvedParams.id,
  });

  // Check if users have ridden together
  const { data: rideData } = useQuery({
    queryKey: ['userRides', resolvedParams.id],
    queryFn: async () => {
      if (!session?.user?.id || !resolvedParams.id) return null;
      
      const response = await fetch(`/api/rides/check-connection?userId=${resolvedParams.id}`);
      if (!response.ok) return null;
      
      return response.json();
    },
    enabled: !!session?.user?.id && !!resolvedParams.id && session.user.id !== resolvedParams.id,
  });

  useEffect(() => {
    if (rideData) {
      setCanReview(rideData.haveRiddenTogether);
    }
  }, [rideData]);

  useEffect(() => {
    if (userData) {
      setUser(userData);
      setPhoneNumber(userData.phoneNumber || '');
    }
  }, [userData]);

  const averageRating = useMemo(() => {
    if (!user?.reviewsReceived) return 0;
    if (user.reviewsReceived.length === 0) return 0;
    const sum = user.reviewsReceived.reduce((acc, review) => acc + review.rating, 0);
    return sum / user.reviewsReceived.length;
  }, [user?.reviewsReceived]);

  const stars = useMemo(() => {
    const stars = [];
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="fill-yellow-400 text-yellow-400" />);
    }

    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="text-gray-300" />);
    }

    return stars;
  }, [averageRating]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload image');

      const data = await response.json();
      
      // Update user profile with new image URL
      const updateResponse = await fetch(`/api/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: data.url }),
      });

      if (!updateResponse.ok) throw new Error('Failed to update profile');

      const updatedUser = await updateResponse.json();
      setUser(updatedUser);
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhoneNumberUpdate = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      if (!response.ok) throw new Error('Failed to update phone number');

      const updatedUser = await response.json();
      setUser(updatedUser);
      setIsEditing(false);
      toast.success('Phone number updated successfully');
    } catch (error) {
      console.error('Error updating phone number:', error);
      toast.error('Failed to update phone number');
    }
  };

  if (queryError) {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
              <p className="text-gray-600 mb-4">
                {queryError instanceof Error ? queryError.message : 'You cannot view this profile'}
              </p>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner fullScreen text="Loading profile..." />
      </div>
    );
  }

  if (!user) {
    return <div className="container mx-auto px-4 py-8">User not found</div>;
  }

  return (
    <>
        <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            {session?.user?.id === user.id && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  disabled={isUploading}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>Member since {new Date(user.createdAt).toLocaleDateString()}</CardDescription>
            <div className="flex items-center mt-2">
              {stars}
              <span className="ml-2 text-sm text-gray-600">
                ({user?.reviewsReceived?.length || 0} reviews)
              </span>
            </div>
          </div>
          {session?.user?.email !== user.email && (
            <>
              {canReview ? (
                <Button
                  className="ml-auto"
                  onClick={() => setShowAddReview(true)}
                >
                  Write a Review
                </Button>
              ) : (
                <div className="ml-auto text-sm text-gray-500">
                  You can only review users you have ridden with
                </div>
              )}
            </>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="given">Reviews Given</TabsTrigger>
            </TabsList>
            <TabsContent value="about">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Contact Information</h3>
                  <p>Email: {user.email}</p>
                  {session?.user?.id === user.id ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="border rounded px-2 py-1"
                              placeholder="Enter phone number"
                            />
                            <Button
                              onClick={handlePhoneNumberUpdate}
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditing(false);
                                setPhoneNumber(user?.phoneNumber || '');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{user.phoneNumber || 'No phone number'}</span>
                            <Button
                              variant="outline"
                              onClick={() => setIsEditing(true)}
                            >
                              Edit
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p>Phone: {user.phoneNumber || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="reviews">
              <div className="space-y-4">
                {user.reviewsReceived.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="given">
              <div className="space-y-4">
                {user.reviewsGiven.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showAddReview && (
        <AddReviewModal
          userId={user.id}
          onClose={() => setShowAddReview(false)}
          onSuccess={() => {
            setShowAddReview(false);
            refetch();
          }}
        />
      )}
    </div>
    </>
  );
}

const ReviewCard = React.memo(function ReviewCard({ review }: { review: Review }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage 
              src={review.reviewer?.image || ''} 
              alt={review.reviewer?.name || 'Anonymous'} 
            />
            <AvatarFallback>
              {review.reviewer?.name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">
              {review.reviewer?.name || 'Anonymous'}
            </CardTitle>
            <CardDescription>
              {new Date(review.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex ml-auto">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p>{review.comment}</p>
      </CardContent>
    </Card>
  );
});

const AddReviewModal = React.memo(function AddReviewModal({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedId: userId,
          rating,
          comment,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit review');
      onSuccess();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Write a Review</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={value <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block mb-2">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || rating === 0}>
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}); 