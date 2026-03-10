import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleInterviewRequest {
  candidateId: string;
  interviewerId: string;
  requisitionId: string;
  applicationId: string;
  startTime: string;
  endTime: string;
  interviewType: string;
  attendeeEmails: string[];
  subject: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ScheduleInterviewRequest = await req.json();
    console.log('Fast schedule interview request:', requestData);

    // Get the current user from the JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    // Get current user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      throw new Error('Failed to authenticate user');
    }

    // Get interviewer user ID from email
    let interviewerUserId = requestData.interviewerId;
    let interviewerName = requestData.interviewerId;
    
    if (requestData.interviewerId.includes('@')) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('email', requestData.interviewerId)
        .single();
      
      if (profileError || !profile) {
        throw new Error(`Interviewer not found: ${requestData.interviewerId}`);
      }
      
      interviewerUserId = profile.user_id;
      interviewerName = profile.full_name || profile.email;
    }

    // Get candidate name
    const { data: candidateData, error: candidateError } = await supabase
      .from('ats_candidates')
      .select('full_name')
      .eq('id', requestData.candidateId)
      .single();

    const candidateName = candidateData?.full_name || 'Unknown candidate';

    // Store interview in database immediately (without Teams meeting details)
    const { data: interview, error } = await supabase
      .from('ats_interviews')
      .insert({
        application_id: requestData.applicationId,
        requisition_id: requestData.requisitionId,
        interviewer_id: interviewerUserId,
        candidate_id: requestData.candidateId,
        scheduled_start: requestData.startTime,
        scheduled_end: requestData.endTime,
        meeting_link: null, // Will be updated by background task
        teams_meeting_id: null, // Will be updated by background task
        interview_type: requestData.interviewType,
        status: 'scheduled',
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Log candidate activity immediately
    const scheduledDate = new Date(requestData.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    await supabase
      .from('candidate_activities')
      .insert({
        candidate_id: requestData.candidateId,
        actor_id: user.id,
        activity_type: 'interview_scheduled',
        activity_description: `${requestData.interviewType} interview scheduled with ${interviewerName} for ${scheduledDate}`,
        metadata: {
          interview_id: interview.id,
          interview_type: requestData.interviewType,
          interviewer_id: interviewerUserId,
          interviewer_name: interviewerName,
          candidate_name: candidateName,
          scheduled_by_id: user.id,
          scheduled_start: requestData.startTime,
          scheduled_end: requestData.endTime,
          teams_meeting_pending: true
        }
      });

    // Create Teams meeting in background (non-blocking)
    EdgeRuntime.waitUntil(
      createTeamsMeetingBackground(interview.id, requestData, interviewerUserId)
    );

    console.log('Interview scheduled successfully (Teams meeting creating in background):', interview);

    return new Response(JSON.stringify({ 
      success: true, 
      interview,
      message: 'Interview scheduled successfully. Teams meeting will be created shortly.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in schedule-interview-fast function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

// Background function to create Teams meeting
async function createTeamsMeetingBackground(
  interviewId: string, 
  requestData: ScheduleInterviewRequest, 
  interviewerUserId: string
) {
  try {
    console.log('Creating Teams meeting in background for interview:', interviewId);

    // Get Microsoft Graph access token
    const accessToken = await getGraphAccessToken();
    if (!accessToken) {
      console.warn('Microsoft Graph access token not available, skipping Teams integration');
      return;
    }

    // Get interviewer email for the API call
    let interviewerEmail = requestData.interviewerId;
    if (!interviewerEmail.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', interviewerUserId)
        .single();
      interviewerEmail = profile?.email || interviewerEmail;
    }

    // Create calendar event with Teams integration
    const eventResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(interviewerEmail)}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: requestData.subject,
        start: { dateTime: requestData.startTime, timeZone: 'UTC' },
        end: { dateTime: requestData.endTime, timeZone: 'UTC' },
        attendees: requestData.attendeeEmails.map(email => ({
          emailAddress: { address: email, name: email },
          type: 'required'
        })),
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness'
      }),
    });

    if (eventResponse.ok) {
      const eventData = await eventResponse.json();
      const meetingLink = eventData?.onlineMeeting?.joinUrl || eventData?.onlineMeeting?.joinWebUrl || null;
      const teamsMeetingId = eventData?.onlineMeeting?.id || null;

      // Update interview with Teams meeting details
      await supabase
        .from('ats_interviews')
        .update({
          meeting_link: meetingLink,
          teams_meeting_id: teamsMeetingId,
          updated_at: new Date().toISOString()
        })
        .eq('id', interviewId);

      console.log('Teams meeting created and interview updated:', {
        interviewId,
        meetingLink,
        teamsMeetingId
      });

      // Update activity to show Teams meeting is ready
      await supabase
        .from('candidate_activities')
        .insert({
          candidate_id: requestData.candidateId,
          actor_id: null,
          activity_type: 'interview_teams_meeting_created',
          activity_description: 'Teams meeting link has been created for the interview',
          metadata: {
            interview_id: interviewId,
            meeting_link: meetingLink,
            teams_meeting_id: teamsMeetingId
          }
        });

    } else {
      const eventError = await eventResponse.text();
      console.error('Failed to create Teams calendar event:', eventError);
    }

  } catch (error) {
    console.error('Error creating Teams meeting in background:', error);
  }
}

// Microsoft Graph OAuth helper function
async function getGraphAccessToken(): Promise<string | null> {
  const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    console.error('Missing Microsoft Graph credentials');
    return null;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to get access token:', errorText);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

serve(handler);