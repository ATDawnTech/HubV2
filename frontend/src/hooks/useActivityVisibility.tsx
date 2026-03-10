import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActivityVisibility = (candidateId: string) => {
  const [unseenActivityIds, setUnseenActivityIds] = useState<string[]>([]);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    const fetchUnseenActivities = async () => {
      if (!candidateId) return;

      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: activities } = await supabase
        .from('candidate_activities')
        .select('id, seen_by')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (activities) {
        const unseenIds = activities
          .filter(activity => !activity.seen_by?.includes(currentUser.user!.id))
          .map(activity => activity.id);
        
        setUnseenActivityIds(unseenIds);
      }
    };

    fetchUnseenActivities();
  }, [candidateId]);

  const markActivitiesAsSeen = async (activityIds?: string[]) => {
    if (!candidateId || isMarking) return;
    
    setIsMarking(true);
    try {
      const { error } = await supabase.rpc('mark_activities_as_seen', {
        p_candidate_id: candidateId,
        p_activity_ids: activityIds || null
      });

      if (!error) {
        if (activityIds) {
          setUnseenActivityIds(prev => prev.filter(id => !activityIds.includes(id)));
        } else {
          setUnseenActivityIds([]);
        }
      }
    } catch (error) {
      console.error('Error marking activities as seen:', error);
    } finally {
      setIsMarking(false);
    }
  };

  const markAllAsSeen = () => markActivitiesAsSeen();

  const isActivityUnseen = (activityId: string) => {
    return unseenActivityIds.includes(activityId);
  };

  return {
    unseenActivityIds,
    isActivityUnseen,
    markActivitiesAsSeen,
    markAllAsSeen,
    isMarking
  };
};