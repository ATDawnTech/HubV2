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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ScheduleInterviewRequest = await req.json();
    console.log('Schedule interview request:', requestData);

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

    // Get current user's profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to get user profile:', profileError);
    }

    const currentUserName = currentUserProfile?.full_name || currentUserProfile?.email || 'Unknown user';

    // Get Microsoft Graph access token
    const accessToken = await getGraphAccessToken();
    console.log('Graph access token retrieved:', !!accessToken);
    if (!accessToken) {
      console.warn('Microsoft Graph access token not available, continuing without Teams integration');
    }

    // Get interviewer user ID and name from email if needed
    let interviewerUserId = requestData.interviewerId;
    let interviewerName = requestData.interviewerId;
    
    // If interviewerId looks like an email, find the user ID and name
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
    } else {
      // If it's already a user ID, get the name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', requestData.interviewerId)
        .single();
      
      if (!profileError && profile) {
        interviewerName = profile.full_name || profile.email;
      }
    }

    // Get candidate name
    const { data: candidateData, error: candidateError } = await supabase
      .from('ats_candidates')
      .select('full_name')
      .eq('id', requestData.candidateId)
      .single();

    const candidateName = candidateData?.full_name || 'Unknown candidate';

    // Create Microsoft Teams calendar event with meeting
    let meetingLink = null;
    let teamsMeetingId = null;

    if (accessToken) {
      try {
        // Get interviewer email for the API call
        let interviewerEmail = requestData.interviewerId;
        if (!interviewerEmail.includes('@')) {
          // If it's a user ID, get the email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', requestData.interviewerId)
            .single();
          interviewerEmail = profile?.email || interviewerEmail;
        }

        // Create calendar event with Teams integration (this approach works reliably)
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
          meetingLink = eventData?.onlineMeeting?.joinUrl || eventData?.onlineMeeting?.joinWebUrl || null;
          teamsMeetingId = eventData?.onlineMeeting?.id || null;
          console.log('Teams calendar event created successfully:', {
            eventId: eventData.id,
            meetingLink,
            teamsMeetingId
          });
        } else {
          const eventError = await eventResponse.text();
          console.error('Failed to create Teams calendar event:', eventError);
          console.error('Response status:', eventResponse.status);
          console.error('Response headers:', Object.fromEntries(eventResponse.headers.entries()));
        }
      } catch (error) {
        console.error('Error creating Teams meeting and calendar event:', error);
      }
    }

    // Store interview in database
    const { data: interview, error } = await supabase
      .from('ats_interviews')
      .insert({
        application_id: requestData.applicationId,
        requisition_id: requestData.requisitionId,
        interviewer_id: interviewerUserId,
        candidate_id: requestData.candidateId,
        scheduled_start: requestData.startTime,
        scheduled_end: requestData.endTime,
        meeting_link: meetingLink,
        teams_meeting_id: teamsMeetingId,
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

    // Format date for better readability
    const scheduledDate = new Date(requestData.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Log candidate activity with detailed information
    // Note: We need to insert directly since the RPC function may not be setting actor_id properly
    const { error: activityError } = await supabase
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
          scheduled_by: currentUserName,
          scheduled_by_id: user.id,
          meeting_link: meetingLink,
          teams_meeting_id: teamsMeetingId,
          scheduled_start: requestData.startTime,
          scheduled_end: requestData.endTime
        }
      });

    if (activityError) {
      console.error('Failed to log candidate activity:', activityError);
    }

    console.log('Interview scheduled successfully:', interview);

    return new Response(JSON.stringify({ 
      success: true, 
      interview,
      meetingLink,
      teamsMeetingId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in schedule-teams-interview function:', error);
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