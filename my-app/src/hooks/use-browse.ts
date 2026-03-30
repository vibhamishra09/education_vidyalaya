import { useQuery } from '@tanstack/react-query';
import { browseApi } from '@/lib/api/browse.api';
import { BrowseFilters, BrowsePeer, StudyRoomCard } from '@/types/api.types';

// Query Keys
export const browseKeys = {
  all: ['browse'] as const,
  list: (filters: BrowseFilters) => [...browseKeys.all, filters] as const,
  recommendations: () => [...browseKeys.all, 'recommendations'] as const,
};

// Get browse data
export function useBrowse(filters: BrowseFilters) {
  return useQuery({
    queryKey: browseKeys.list(filters),
    queryFn: () => browseApi.getBrowseData(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Response type for recommendations hook
interface RecommendationsHookResponse {
  peers: BrowsePeer[];
  studyRooms: StudyRoomCard[];
  basedOnSkills: string[];
}

// Get personalized recommendations from the backend
export function useBrowseRecommendations(
  wantSkills: string[],
  options?: { enabled?: boolean }
) {
  return useQuery<RecommendationsHookResponse>({
    queryKey: browseKeys.recommendations(),
    queryFn: async () => {
      const response = await browseApi.getRecommendations(8);
      
      // Transform the response to match the expected format
      return {
        peers: response.peers.map((peer) => ({
          id: peer.id,
          name: peer.name,
          avatar: peer.avatar,
          bio: peer.bio,
          skills: peer.skills,
          rating: peer.rating,
          reviewCount: peer.reviewCount,
          totalSessions: peer.totalSessions,
          socialLinks: peer.socialLinks,
        })) as BrowsePeer[],
        studyRooms: response.studyRooms.map((room) => ({
          id: room.id,
          title: room.title,
          description: room.description,
          imageUrl: room.imageUrl,
          sessionStatus: room.sessionStatus,
          date: room.date,
          duration: room.duration,
          maxParticipants: room.maxParticipants,
          joiningFee: room.joiningFee,
          participantCount: room.participantCount,
          createdBy: room.createdBy,
          skills: room.skills,
          seriesId: room.seriesId,
          timezone: room.timezone,
          hostAvgRating: room.hostAvgRating,
          hostReviewCount: room.hostReviewCount,
          hostTotalSessions: room.hostTotalSessions,
        })) as StudyRoomCard[],
        basedOnSkills: response.basedOnSkills,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: wantSkills.length > 0 && (options?.enabled !== false),
  });
}
