import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface ActivityItem {
  id: string;
  activity_type: string;
  activity_description: string;
  created_at: string;
  metadata?: any;
  user?: {
    full_name: string;
    email: string;
  };
  seen_by?: string[];
}

export const useActivitySeen = (candidateId: string, activities: ActivityItem[] = []) => {
  const queryClient = useQueryClient();

  // Check if user has seen activities
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Mark activities as seen
  const markActivitiesAsSeenMutation = useMutation({
    mutationFn: async (activityIds?: string[]) => {
      const { error } = await supabase.rpc('mark_activities_as_seen', {
        p_candidate_id: candidateId,
        p_activity_ids: activityIds || null
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate activities query to refresh data
      queryClient.invalidateQueries({ queryKey: ['candidate-activities'] });
    }
  });

  // Mark all current activities as seen when user views the timeline
  useEffect(() => {
    if (activities.length > 0 && currentUser?.id) {
      const unseenActivities = activities.filter(activity => 
        !activity.seen_by?.includes(currentUser.id)
      );
      
      if (unseenActivities.length > 0) {
        // Debounce the marking to avoid excessive calls
        const timer = setTimeout(() => {
          markActivitiesAsSeenMutation.mutate(unseenActivities.map(a => a.id));
        }, 2000); // Wait 2 seconds before marking as seen

        return () => clearTimeout(timer);
      }
    }
  }, [activities, currentUser?.id]);

  // Check if activity is seen by current user
  const isActivitySeen = (activity: ActivityItem) => {
    return currentUser?.id ? activity.seen_by?.includes(currentUser.id) || false : true;
  };

  // Get count of unseen activities
  const unseenCount = activities.filter(activity => !isActivitySeen(activity)).length;

  return {
    isActivitySeen,
    unseenCount,
    markActivitiesAsSeen: markActivitiesAsSeenMutation.mutate,
    isMarkingAsSeen: markActivitiesAsSeenMutation.isPending
  };
};