import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceRequest {
  interviewId: string;
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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function getTeamsMeetingAttendance(meetingId: string, accessToken: string) {
  try {
    // Get meeting attendance report from Microsoft Graph API
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/attendanceReports`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log('Failed to get attendance report:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.value?.[0]; // Get the latest attendance report
  } catch (error) {
    console.error('Error getting Teams meeting attendance:', error);
    return null;
  }
}

async function getGraphAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
  const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');

  if (!clientId || !clientSecret || !tenantId) {
    console.error('Missing Microsoft Graph credentials');
    return null;
  }

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Graph access token:', error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get the user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const requestData: AttendanceRequest = await req.json();
    
    console.log('Processing interview attendance:', requestData);

    // Get interview details
    const { data: interview, error: interviewError } = await supabase
      .from('ats_interviews')
      .select(`
        *,
        candidate:ats_candidates!ats_interviews_candidate_id_fkey(id, full_name, email),
        interviewer:profiles!ats_interviews_interviewer_id_fkey(full_name, email)
      `)
      .eq('id', requestData.interviewId)
      .single();

    if (interviewError || !interview) {
      return new Response(
        JSON.stringify({ error: 'Interview not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    let attendanceData = null;
    let actualAttendeeCount = 0;

    // If there's a Teams meeting, try to get actual attendance data
    if (interview.teams_meeting_id) {
      const accessToken = await getGraphAccessToken();
      if (accessToken) {
        attendanceData = await getTeamsMeetingAttendance(interview.teams_meeting_id, accessToken);
        
        if (attendanceData?.attendanceRecords) {
          actualAttendeeCount = attendanceData.attendanceRecords.length;
          
          // Auto-determine status based on attendance if not provided
          if (!requestData.status) {
            const candidateAttended = attendanceData.attendanceRecords.some(
              (record: any) => record.emailAddress === interview.candidate.email
            );
            const interviewerAttended = attendanceData.attendanceRecords.some(
              (record: any) => record.emailAddress === interview.interviewer.email
            );

            if (candidateAttended && interviewerAttended) {
              requestData.status = 'completed';
            } else if (!candidateAttended && interviewerAttended) {
              requestData.status = 'no_show_candidate';
            } else if (candidateAttended && !interviewerAttended) {
              requestData.status = 'no_show_interviewer';
            } else {
              requestData.status = 'no_show_both';
            }
          }
        }
      }
    }

    // Update interview status
    const { error: updateError } = await supabase
      .from('ats_interviews')
      .update({
        status: requestData.status,
        notes: interview.notes ? 
          `${interview.notes}\n\nAttendance Update: ${requestData.notes || 'Updated via Teams integration'}` : 
          `Attendance Update: ${requestData.notes || 'Updated via Teams integration'}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestData.interviewId);

    if (updateError) {
      throw updateError;
    }

    // Create detailed activity description based on status
    let activityDescription = '';
    let activityType = '';

    switch (requestData.status) {
      case 'completed':
        activityType = 'interview_completed';
        activityDescription = `Interview completed: ${interview.interview_type} interview with ${interview.interviewer.full_name}`;
        if (actualAttendeeCount > 0) {
          activityDescription += ` (${actualAttendeeCount} attendees participated)`;
        }
        break;
      case 'no_show_candidate':
        activityType = 'interview_no_show';
        activityDescription = `Interview no-show: Candidate did not attend ${interview.interview_type} interview with ${interview.interviewer.full_name}`;
        break;
      case 'no_show_interviewer':
        activityType = 'interview_no_show';
        activityDescription = `Interview no-show: Interviewer ${interview.interviewer.full_name} did not attend ${interview.interview_type} interview`;
        break;
      case 'no_show_both':
        activityType = 'interview_no_show';
        activityDescription = `Interview no-show: Neither candidate nor interviewer attended the ${interview.interview_type} interview`;
        break;
      case 'cancelled':
        activityType = 'interview_cancelled';
        activityDescription = `Interview cancelled: ${interview.interview_type} interview with ${interview.interviewer.full_name} was cancelled`;
        break;
    }

    // Log detailed activity
    const metadata = {
      interview_id: requestData.interviewId,
      interview_type: interview.interview_type,
      interviewer_id: interview.interviewer_id,
      interviewer_name: interview.interviewer.full_name,
      interviewer_email: interview.interviewer.email,
      scheduled_start: interview.scheduled_start,
      scheduled_end: interview.scheduled_end,
      actual_start_time: requestData.actualStartTime,
      actual_end_time: requestData.actualEndTime,
      status: requestData.status,
      teams_meeting_id: interview.teams_meeting_id,
      had_meeting_link: !!interview.meeting_link,
      actual_attendee_count: actualAttendeeCount,
      attendance_data: attendanceData ? {
        total_participants: attendanceData.totalParticipantCount || 0,
        attendance_records: attendanceData.attendanceRecords?.map((record: any) => ({
          email: record.emailAddress,
          name: record.identity?.displayName,
          join_time: record.joinDateTime,
          leave_time: record.leaveDateTime,
          duration_seconds: record.durationInSeconds
        })) || []
      } : null,
      attendee_list: requestData.attendeeList,
      notes: requestData.notes,
      updated_by_teams_integration: true
    };

    await supabase.rpc('log_candidate_activity', {
      p_candidate_id: interview.candidate_id,
      p_activity_type: activityType,
      p_activity_description: activityDescription,
      p_metadata: metadata
    });

    console.log('Interview attendance updated successfully');

    return new Response(JSON.stringify({ 
      success: true,
      interview_status: requestData.status,
      attendee_count: actualAttendeeCount,
      attendance_detected: !!attendanceData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in update-interview-attendance function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);