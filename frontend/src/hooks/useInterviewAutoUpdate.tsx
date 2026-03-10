import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useInterviewAutoUpdate = (candidateId?: string) => {
  useEffect(() => {
    if (!candidateId) return;

    // Set up an interval to trigger auto-updates every 5 minutes
    const interval = setInterval(async () => {
      try {
        console.log('Triggering automatic interview status check...');
        
        // Call the edge function to check and update interview statuses
        const { data, error } = await supabase.functions.invoke('schedule-interview-auto-update', {
          body: { candidateId }
        });

        if (error) {
          console.error('Error triggering auto-update:', error);
        } else {
          console.log('Auto-update completed:', data);
        }
      } catch (error) {
        console.error('Error in auto-update interval:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also trigger on component mount
    const triggerInitialCheck = async () => {
      try {
        await supabase.functions.invoke('schedule-interview-auto-update', {
          body: { candidateId }
        });
      } catch (error) {
        console.error('Error in initial auto-update check:', error);
      }
    };

    triggerInitialCheck();

    return () => {
      clearInterval(interval);
    };
  }, [candidateId]);
};