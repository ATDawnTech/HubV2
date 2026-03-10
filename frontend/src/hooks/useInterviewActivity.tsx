import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AttendanceData {
  status: 'completed' | 'no_show_candidate' | 'no_show_interviewer' | 'no_show_both' | 'cancelled';
  notes?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  attendeeList?: Array<{
    email: string;
    name: string;
    joinedAt?: string;
    leftAt?: string;
    duration?: number;
  }>;
}

export const useInterviewActivity = () => {
  const queryClient = useQueryClient();

  const logInterviewActivity = useMutation({
    mutationFn: async ({ 
      candidateId, 
      activityType, 
      description, 
      metadata 
    }: {
      candidateId: string;
      activityType: 'interview_scheduled' | 'interview_cancelled' | 'interview_rescheduled' | 'interview_completed' | 'interview_no_show';
      description: string;
      metadata?: any;
    }) => {
      const { error } = await supabase.rpc('log_candidate_activity', {
        p_candidate_id: candidateId,
        p_activity_type: activityType,
        p_activity_description: description,
        p_metadata: metadata || {}
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidate-activities', variables.candidateId] });
    },
    onError: (error) => {
      console.error('Failed to log interview activity:', error);
      toast({
        title: "Error",
        description: "Failed to log activity. Please try again.",
        variant: "destructive"
      });
    }
  });

  const cancelInterview = useMutation({
    mutationFn: async ({ 
      interviewId, 
      candidateId, 
      reason 
    }: {
      interviewId: string;
      candidateId: string;
      reason?: string;
    }) => {
      // Get interview details first
      const { data: interview, error: fetchError } = await supabase
        .from('ats_interviews')
        .select(`
          *,
          interviewer:profiles!ats_interviews_interviewer_id_fkey(full_name, email)
        `)
        .eq('id', interviewId)
        .single();

      if (fetchError) throw fetchError;

      // Update interview status
      const { error: updateError } = await supabase
        .from('ats_interviews')
        .update({ 
          status: 'cancelled',
          notes: interview.notes ? `${interview.notes}\n\nCancelled: ${reason || 'No reason provided'}` : `Cancelled: ${reason || 'No reason provided'}`
        })
        .eq('id', interviewId);

      if (updateError) throw updateError;

      // Log activity
      const scheduledDate = new Date(interview.scheduled_start).toLocaleDateString();
      const scheduledTime = new Date(interview.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      const description = `Interview cancelled: ${interview.interview_type} interview with ${interview.interviewer?.full_name} scheduled for ${scheduledDate} at ${scheduledTime}${reason ? ` (Reason: ${reason})` : ''}`;

      await supabase.rpc('log_candidate_activity', {
        p_candidate_id: candidateId,
        p_activity_type: 'interview_cancelled',
        p_activity_description: description,
        p_metadata: {
          interview_id: interviewId,
          interview_type: interview.interview_type,
          interviewer_id: interview.interviewer_id,
          interviewer_name: interview.interviewer?.full_name,
          interviewer_email: interview.interviewer?.email,
          original_scheduled_start: interview.scheduled_start,
          original_scheduled_end: interview.scheduled_end,
          cancellation_reason: reason,
          had_meeting_link: !!interview.meeting_link
        }
      });

      return interview;
    },
    onSuccess: (interview) => {
      toast({
        title: "Interview Cancelled",
        description: `Interview with ${interview.interviewer?.full_name} has been cancelled.`
      });
      queryClient.invalidateQueries({ queryKey: ['ats-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities'] });
    },
    onError: (error) => {
      console.error('Failed to cancel interview:', error);
      toast({
        title: "Error",
        description: "Failed to cancel interview. Please try again.",
        variant: "destructive"
      });
    }
  });

  const rescheduleInterview = useMutation({
    mutationFn: async ({ 
      interviewId, 
      candidateId,
      newStartTime, 
      newEndTime,
      reason 
    }: {
      interviewId: string;
      candidateId: string;
      newStartTime: string;
      newEndTime: string;
      reason?: string;
    }) => {
      // Get current interview details
      const { data: interview, error: fetchError } = await supabase
        .from('ats_interviews')
        .select(`
          *,
          interviewer:profiles!ats_interviews_interviewer_id_fkey(full_name, email)
        `)
        .eq('id', interviewId)
        .single();

      if (fetchError) throw fetchError;

      // Update interview with new time
      const { error: updateError } = await supabase
        .from('ats_interviews')
        .update({ 
          scheduled_start: newStartTime,
          scheduled_end: newEndTime,
          status: 'rescheduled',
          notes: interview.notes ? `${interview.notes}\n\nRescheduled: ${reason || 'No reason provided'}` : `Rescheduled: ${reason || 'No reason provided'}`
        })
        .eq('id', interviewId);

      if (updateError) throw updateError;

      // Log activity
      const oldDate = new Date(interview.scheduled_start).toLocaleDateString();
      const oldTime = new Date(interview.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      const newDate = new Date(newStartTime).toLocaleDateString();
      const newTime = new Date(newStartTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      
      const description = `Interview rescheduled: ${interview.interview_type} interview with ${interview.interviewer?.full_name} moved from ${oldDate} at ${oldTime} to ${newDate} at ${newTime}${reason ? ` (Reason: ${reason})` : ''}`;

      await supabase.rpc('log_candidate_activity', {
        p_candidate_id: candidateId,
        p_activity_type: 'interview_rescheduled',
        p_activity_description: description,
        p_metadata: {
          interview_id: interviewId,
          interview_type: interview.interview_type,
          interviewer_id: interview.interviewer_id,
          interviewer_name: interview.interviewer?.full_name,
          interviewer_email: interview.interviewer?.email,
          old_scheduled_start: interview.scheduled_start,
          old_scheduled_end: interview.scheduled_end,
          new_scheduled_start: newStartTime,
          new_scheduled_end: newEndTime,
          reschedule_reason: reason,
          has_meeting_link: !!interview.meeting_link
        }
      });

      return interview;
    },
    onSuccess: (interview) => {
      toast({
        title: "Interview Rescheduled",
        description: `Interview with ${interview.interviewer?.full_name} has been rescheduled.`
      });
      queryClient.invalidateQueries({ queryKey: ['ats-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities'] });
    },
    onError: (error) => {
      console.error('Failed to reschedule interview:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule interview. Please try again.",
        variant: "destructive"
      });
    }
  });

  const completeInterview = useMutation({
    mutationFn: async ({ 
      interviewId, 
      candidateId,
      feedback
    }: {
      interviewId: string;
      candidateId: string;
      feedback?: string;
    }) => {
      // Get interview details
      const { data: interview, error: fetchError } = await supabase
        .from('ats_interviews')
        .select(`
          *,
          interviewer:profiles!ats_interviews_interviewer_id_fkey(full_name, email)
        `)
        .eq('id', interviewId)
        .single();

      if (fetchError) throw fetchError;

      // Update interview status
      const { error: updateError } = await supabase
        .from('ats_interviews')
        .update({ 
          status: 'completed',
          notes: feedback ? (interview.notes ? `${interview.notes}\n\nCompleted: ${feedback}` : `Completed: ${feedback}`) : interview.notes
        })
        .eq('id', interviewId);

      if (updateError) throw updateError;

      // Log activity
      const scheduledDate = new Date(interview.scheduled_start).toLocaleDateString();
      const description = `Interview completed: ${interview.interview_type} interview with ${interview.interviewer?.full_name} on ${scheduledDate}${feedback ? ` (Feedback: ${feedback.slice(0, 100)}${feedback.length > 100 ? '...' : ''})` : ''}`;

      await supabase.rpc('log_candidate_activity', {
        p_candidate_id: candidateId,
        p_activity_type: 'interview_completed',
        p_activity_description: description,
        p_metadata: {
          interview_id: interviewId,
          interview_type: interview.interview_type,
          interviewer_id: interview.interviewer_id,
          interviewer_name: interview.interviewer?.full_name,
          interviewer_email: interview.interviewer?.email,
          scheduled_start: interview.scheduled_start,
          scheduled_end: interview.scheduled_end,
          completion_feedback: feedback,
          had_meeting_link: !!interview.meeting_link
        }
      });

      return interview;
    },
    onSuccess: (interview) => {
      toast({
        title: "Interview Completed",
        description: `Interview with ${interview.interviewer?.full_name} marked as completed.`
      });
      queryClient.invalidateQueries({ queryKey: ['ats-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities'] });
    },
    onError: (error) => {
      console.error('Failed to complete interview:', error);
      toast({
        title: "Error",
        description: "Failed to complete interview. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateAttendance = useMutation({
    mutationFn: async ({ 
      interviewId, 
      candidateId,
      attendanceData
    }: {
      interviewId: string;
      candidateId: string;
      attendanceData: AttendanceData;
    }) => {
      const { data, error } = await supabase.functions.invoke('update-interview-attendance', {
        body: {
          interviewId,
          ...attendanceData
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const statusMessages = {
        completed: 'Interview marked as completed',
        no_show_candidate: 'Interview marked as candidate no-show',
        no_show_interviewer: 'Interview marked as interviewer no-show', 
        no_show_both: 'Interview marked as no-show (both parties)',
        cancelled: 'Interview marked as cancelled'
      };

      toast({
        title: "Attendance Updated",
        description: statusMessages[variables.attendanceData.status] + 
          (data.attendance_detected ? ' (Teams attendance detected)' : '')
      });
      queryClient.invalidateQueries({ queryKey: ['ats-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities'] });
    },
    onError: (error) => {
      console.error('Failed to update attendance:', error);
      toast({
        title: "Error",
        description: "Failed to update interview attendance. Please try again.",
        variant: "destructive"
      });
    }
  });

  return {
    logInterviewActivity,
    cancelInterview,
    rescheduleInterview,
    completeInterview,
    updateAttendance
  };
};