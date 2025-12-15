import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { peerSessionsApi, reviewsApi, studyRoomsApi, usersApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';
import { SessionStatus } from '@/types/api.types';

export interface UserStats {
  totalSessions: number;
  hoursCompleted: number;
  averageRating: number;
  completionRate: number;
}

export function useUserStats(userId?: string) {
  const { getToken, isSignedIn } = useAuth();

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

      // If no userId provided, fetch current user to get their database ID
      let targetUserId = userId;
      if (!targetUserId) {
        const currentUser = await usersApi.getCurrentUser();
        targetUserId = currentUser.user.id;
      }

      console.log('[useUserStats] Using targetUserId:', targetUserId);

      // Fetch all sessions for the user (peer sessions + study rooms)
      // Don't pass requestedBy/requestedTo filters - let backend return all user's sessions
      const [peerSessions, allStudyRooms, reviewsResponse] = await Promise.all([
        peerSessionsApi.getPeerSessions(
          undefined, // status - get all
          undefined, // requestedBy - don't filter, backend returns all for auth user
          undefined, // requestedTo - don't filter, backend returns all for auth user
          1,
          1000 // Get a large number to calculate stats
        ),
        studyRoomsApi.getStudyRooms({
          page: 1,
          limit: 1000,
        }),
        reviewsApi.getReviews({ userId: targetUserId, limit: 1000 }),
      ]);

      console.log('[useUserStats] Data fetched:', {
        targetUserId,
        peerSessionsCount: peerSessions.peerSessions.length,
        allStudyRoomsCount: allStudyRooms.studyRooms.length,
        reviewsCount: reviewsResponse.reviews?.length || 0,
      });

      // Filter study rooms where user was creator
      // Note: StudyRoomCard doesn't include participants list, so we can only filter by creator
      const userStudyRooms = allStudyRooms.studyRooms.filter(
        (room) => room.createdBy.id === targetUserId
      );
      
      console.log('[useUserStats] Filtered study rooms:', {
        before: allStudyRooms.studyRooms.length,
        after: userStudyRooms.length,
        sampleRoom: userStudyRooms[0] ? {
          id: userStudyRooms[0].id,
          createdById: userStudyRooms[0].createdBy.id,
        } : 'none',
      });

      const allPeerSessions = peerSessions.peerSessions;
      
      // Combine peer sessions and study rooms for total count
      const allSessions = [
        ...allPeerSessions,
        ...userStudyRooms,
      ];

      // Calculate completed sessions (DONE status means completed)
      const completedPeerSessions = allPeerSessions.filter(
        (session) => session.sessionStatus === SessionStatus.DONE
      );
      
      const completedStudyRooms = userStudyRooms.filter(
        (room) => room.sessionStatus === SessionStatus.DONE
      );
      
      const totalCompleted = completedPeerSessions.length + completedStudyRooms.length;

      // Calculate total hours from completed sessions
      const peerHours = completedPeerSessions.reduce((total, session) => {
        return total + (session.duration / 60);
      }, 0);
      
      const studyRoomHours = completedStudyRooms.reduce((total, room) => {
        return total + (room.duration / 60);
      }, 0);
      
      const hoursCompleted = peerHours + studyRoomHours;

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
          ? (totalCompleted / completedOrCancelledSessions.length) * 100
          : 0;

      const result = {
        totalSessions: allSessions.length, // Total count of all sessions
        hoursCompleted: Math.round(hoursCompleted * 10) / 10, // Round to 1 decimal
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        completionRate: Math.round(completionRate),
      };

      console.log('[useUserStats] Final result:', {
        allSessionsCount: allSessions.length,
        totalCompleted,
        hoursCompleted,
        averageRating,
        completionRate,
        result,
      });

      return result;
    },
    enabled: isSignedIn,
    staleTime: 30 * 1000, // 30 seconds - shorter to show updates faster
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on mount
    gcTime: 1000 * 60 * 10, // 10 minutes (previously cacheTime)
  });
}
