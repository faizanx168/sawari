'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Star, StarHalf } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import React from 'react';

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
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('about');
  const [showAddReview, setShowAddReview] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      console.log('Fetching user profile for ID:', resolvedParams.id);
      const response = await fetch(`/api/users/${resolvedParams.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch user profile');
      }
      
      const data = await response.json();
      console.log('User profile data:', data);
      setUser(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
    
    if (status === 'loading') {
      return; // Wait for session to load
    }
    
    fetchUserProfile();
  }, [fetchUserProfile, status, session]);

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner fullScreen text="Loading profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchUserProfile}>Try Again</Button>
          </CardContent>
        </Card>
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
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.image} alt={user.name} />
            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>Member since {new Date(user.createdAt).toLocaleDateString()}</CardDescription>
            <div className="flex items-center mt-2">
              {stars}
              <span className="ml-2 text-sm text-gray-600">
                ({user.reviewsReceived.length} reviews)
              </span>
            </div>
          </div>
          {session?.user?.email !== user.email && (
            <Button
              className="ml-auto"
              onClick={() => setShowAddReview(true)}
            >
              Write a Review
            </Button>
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
                  <p>Phone: {user.phoneNumber}</p>
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
            fetchUserProfile();
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