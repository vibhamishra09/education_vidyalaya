import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { peerSessionsApi, reviewsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { SessionStatus } from '@/types/api.types';

export interface UserStats {
  totalSessions: number;
  hoursCompleted: number;
  averageRating: number;
  completionRate: number;
}

export function useUserStats(userId?: string) {
  const { getToken, isSignedIn, userId: clerkUserId } = useAuth();

  return useQuery({
    queryKey: ['userStats', userId || 'me'],
    queryFn: async () => {
      if (!isSignedIn) {
        return {
          totalSessions: 0,
          hoursCompleted: 0,
          averageRating: 0,
          completionRate: 0,
        };
      }

      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      // Use provided userId or current user's Clerk ID
      const targetUserId = userId || clerkUserId;

      if (!targetUserId) {
        throw new Error('User ID not available');
      }

      // Fetch all sessions for the current user (both as requester and requestee)
      const [asTutor, asStudent, reviewsResponse] = await Promise.all([
        peerSessionsApi.getPeerSessions(
          undefined, // status - get all
          undefined, // requestedBy
          targetUserId, // requestedTo - sessions where user is the tutor
          1,
          1000 // Get a large number to calculate stats
        ),
        peerSessionsApi.getPeerSessions(
          undefined, // status - get all
          targetUserId, // requestedBy - sessions where user is the student
          undefined, // requestedTo
          1,
          1000
        ),
        reviewsApi.getReviews({ userId: targetUserId, limit: 1000 }),
      ]);

      const allSessions = [...asTutor.peerSessions, ...asStudent.peerSessions];

      // Calculate completed sessions (DONE status means completed)
      const completedSessions = allSessions.filter(
        (session) => session.sessionStatus === SessionStatus.DONE
      );

      // Calculate total hours from completed sessions
      const hoursCompleted = completedSessions.reduce((total, session) => {
        // Use duration field directly (in minutes)
        return total + (session.duration / 60);
      }, 0);

      // Calculate average rating from reviews
      const reviews = reviewsResponse.reviews || [];
      const averageRating =
        reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : 0;

      // Calculate completion rate: completed / (completed + cancelled)
      const completedOrCancelledSessions = allSessions.filter(
        (session) =>
          session.sessionStatus === SessionStatus.DONE ||
          session.sessionStatus === SessionStatus.CANCELLED
      );
      const completionRate =
        completedOrCancelledSessions.length > 0
          ? (completedSessions.length / completedOrCancelledSessions.length) * 100
          : 0;

      return {
        totalSessions: completedSessions.length,
        hoursCompleted: Math.round(hoursCompleted * 10) / 10, // Round to 1 decimal
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        completionRate: Math.round(completionRate),
      };
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (previously cacheTime)
  });
}
