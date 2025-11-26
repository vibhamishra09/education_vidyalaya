import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { usersApi, reviewsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { User, ReviewCard } from '@/types/api.types';

interface ProfileData {
  user: User | null;
  reviews: ReviewCard[];
  avgRating: number;
}

export function useProfileData() {
  const { isSignedIn, isLoaded, getToken, userId: clerkUserId } = useAuth();

  return useQuery<ProfileData>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      if (!isSignedIn || !clerkUserId) {
        throw new Error('User not signed in');
      }

      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      // Fetch user data first to get the database user ID
      const userData = await usersApi.getCurrentUser();

      // Then fetch reviews using the Clerk user ID (which the backend will convert to database ID)
      const reviewsResponse = await reviewsApi.getReviews({
        userId: clerkUserId,
        limit: 1000 // Get all reviews for stats
      });

      const reviews = reviewsResponse.reviews || [];
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          : 0;

      return {
        user: userData.user,
        reviews,
        avgRating,
      };
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
