import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamsMeetingAttendance {
  userId: string;
  displayName: string;
  role: string;
  totalAttendanceInSeconds: number;
}

interface TeamsMeetingReport {
  id: string;
  organizer: { user: { displayName: string; id: string } };
  participants: TeamsMeetingAttendance[];
  startDateTime: string;
  endDateTime: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting automatic interview status update...');

    // Optional: filter by candidate if provided by caller
    let candidateId: string | undefined;
    try {
      const body = await req.json();
      candidateId = body?.candidateId;
    } catch (_) {
      // no body provided
    }

    console.log(`Checking all scheduled interviews${candidateId ? ` for candidate ${candidateId}` : ''}`);

    let query = supabase
      .from('ats_interviews')
      .select(`
        id,
        teams_meeting_id,
        meeting_link,
        scheduled_start,
        scheduled_end,
        status,
        interviewer_id,
        candidate_id,
        interviewer:profiles!ats_interviews_interviewer_id_fkey(full_name, email),
        candidate:ats_candidates!ats_interviews_candidate_id_fkey(full_name, email)
      `)
      .eq('status', 'scheduled');

    if (candidateId) {
      // Narrow to a single candidate when provided
      // @ts-ignore - chained query builder
      query = query.eq('candidate_id', candidateId);
    }

    const { data: interviews, error: interviewError } = await query;

    if (interviewError) {
      console.error('Error fetching interviews:', interviewError);
      throw interviewError;
    }

    const now = new Date();

    // Process all scheduled interviews to check for cancellations
    // Also process interviews that have ended (grace period 5 minutes for completed status)
    const cutoffForCompleted = new Date(Date.now() - 5 * 60 * 1000);
    
    const toProcess = (interviews ?? []).filter((i: any) => {
      try {
        const scheduledEnd = new Date(i.scheduled_end);
        // Process if: 1) Interview has ended (to mark as completed), or 2) Interview is scheduled (to check for cancellations)
        return i.scheduled_end && (scheduledEnd <= cutoffForCompleted || scheduledEnd > now);
      } catch {
        return false;
      }
    });

    console.log(`Found ${interviews?.length || 0} scheduled interviews; ${toProcess.length} ready to check (includes future interviews for cancellation detection)`);
    
    if (toProcess.length > 0) {
      console.log('Interview details:', toProcess.map((i: any) => ({
        id: i.id,
        scheduled_end: i.scheduled_end,
        status: i.status,
        has_teams_meeting: !!i.teams_meeting_id,
        teams_meeting_id: i.teams_meeting_id
      })));
    }

    if (toProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No interviews ready to update' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get Microsoft Graph API access token
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Microsoft credentials not configured');
    }

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('Failed to get Microsoft Graph access token');
    }

    const updates = [];

    // Process each interview
    for (const interview of toProcess) {
      try {
        console.log(`Processing interview ${interview.id} scheduled for ${interview.scheduled_end}`);
        console.log(`Teams meeting ID: ${interview.teams_meeting_id || 'Not available'}`);

        // If no Teams meeting ID, try to verify existence via JoinWebUrl or organizer calendar; otherwise decide cancel/complete
        if (!interview.teams_meeting_id) {
          const scheduledStart = new Date(interview.scheduled_start);
          const scheduledEnd = new Date(interview.scheduled_end);
          const cutoffForCompleted = new Date(Date.now() - 5 * 60 * 1000);
          const organizerEmail = interview.interviewer?.email || '';

          let recoveredMeetingId: string | null = null;
          let meetingExists = false;

          // Attempt to resolve meeting by joinWebUrl if we have it
          if (organizerEmail && interview.meeting_link) {
            try {
              const filter = `$filter=joinWebUrl eq '${String(interview.meeting_link).replace(/'/g, "''")}'`;
              const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings?${filter}`;
              const r = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              });
              if (r.ok) {
                const j = await r.json();
                if (Array.isArray(j.value) && j.value.length > 0) {
                  meetingExists = true;
                  recoveredMeetingId = j.value[0]?.id ?? null;
                  console.log(`Recovered Teams meeting via joinWebUrl for interview ${interview.id}: ${recoveredMeetingId}`);
                  if (recoveredMeetingId) {
                    await supabase
                      .from('ats_interviews')
                      .update({ teams_meeting_id: recoveredMeetingId, updated_at: new Date().toISOString() })
                      .eq('id', interview.id);
                  }
                }
              } else {
                const errTxt = await r.text();
                console.log(`joinWebUrl lookup failed (${r.status}) for interview ${interview.id}: ${errTxt}`);
              }
            } catch (e) {
              console.log('Error during joinWebUrl lookup:', e);
            }
          }

          // If still unknown, probe organizer calendar for event in the time window
          if (!meetingExists && organizerEmail) {
            try {
              const startWindow = new Date(scheduledStart.getTime() - 30 * 60 * 1000).toISOString();
              const endWindow = new Date(scheduledEnd.getTime() + 30 * 60 * 1000).toISOString();
              const calUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/calendar/calendarView?startDateTime=${encodeURIComponent(startWindow)}&endDateTime=${encodeURIComponent(endWindow)}`;
              const calResp = await fetch(calUrl, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'outlook.timezone="UTC"',
                },
              });
              if (calResp.ok) {
                const calData = await calResp.json();
                const items = Array.isArray(calData.value) ? calData.value : [];
                // Consider only online meetings, and if we know the join link, match it
                const relevant = items.filter((it: any) => {
                  const isOnline = it.isOnlineMeeting === true || !!it.onlineMeeting;
                  const joinUrl = it.onlineMeeting?.joinUrl || it.onlineMeetingUrl || it.webLink;
                  return isOnline && (!interview.meeting_link || (joinUrl && joinUrl === interview.meeting_link));
                });
                meetingExists = relevant.length > 0;
                console.log(`Calendar probe for interview ${interview.id}: ${items.length} item(s), relevant ${relevant.length}`);
              } else {
                console.log(`Calendar probe failed (${calResp.status}) for interview ${interview.id}`);
              }
            } catch (e) {
              console.log('Error during calendar probe:', e);
            }
          }

          // Decide status
          if (scheduledEnd <= cutoffForCompleted) {
            console.log(`No Teams meeting ID for interview ${interview.id}, marking as completed (interview ended)`);
            await updateInterviewStatus(supabase, interview.id, 'completed', 'Auto-completed: No Teams meeting data available, interview time has passed');
            await supabase.from('candidate_activities').insert({
              candidate_id: interview.candidate_id,
              actor_id: null,
              activity_type: 'interview_completed',
              activity_description: 'Interview automatically completed: No Teams meeting data available',
              metadata: {
                interview_id: interview.id,
                auto_updated: true,
                reason: 'no_teams_meeting_id'
              }
            });
            updates.push({ interviewId: interview.id, status: 'completed', reason: 'no_teams_meeting_id' });
            continue;
          }

          if (!meetingExists) {
            console.log(`No Teams meeting found for interview ${interview.id} (no ID + not found via Graph) -> marking as cancelled`);
            await updateInterviewStatus(supabase, interview.id, 'cancelled', 'Auto-cancelled: Teams meeting not found (no ID)');
            await supabase.from('candidate_activities').insert({
              candidate_id: interview.candidate_id,
              actor_id: null,
              activity_type: 'interview_cancelled',
              activity_description: 'Interview automatically cancelled: Teams meeting not found',
              metadata: { interview_id: interview.id, auto_updated: true, reason: 'no_meeting_found' }
            });
            updates.push({ interviewId: interview.id, status: 'cancelled', reason: 'no_meeting_found' });
            continue;
          }

          if (recoveredMeetingId) {
            interview.teams_meeting_id = recoveredMeetingId;
          } else {
            console.log(`Meeting appears to exist for interview ${interview.id} but no ID resolved yet; keeping scheduled`);
            continue;
          }
        }

        // Get meeting attendance report from Microsoft Graph
        console.log(`Attempting to get Teams meeting data for ${interview.teams_meeting_id}`);
        
        const organizerEmail = interview.interviewer?.email || '';
        
        const meetingResponse = await fetch(
          `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings/${interview.teams_meeting_id}/attendanceReports`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`Teams API response status: ${meetingResponse.status}`);

        if (!meetingResponse.ok) {
          const errorText = await meetingResponse.text();
          console.log(`Teams API error for meeting ${interview.teams_meeting_id}: ${meetingResponse.status} - ${errorText}`);

          // Attempt to recover a valid meeting ID via joinWebUrl, if available
          let recoveredId: string | null = null;
          if (organizerEmail && interview.meeting_link) {
            try {
              const filter = `$filter=joinWebUrl eq '${String(interview.meeting_link).replace(/'/g, "''")}'`;
              const lookupUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings?${filter}`;
              const lookupResp = await fetch(lookupUrl, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              });
              if (lookupResp.ok) {
                const j = await lookupResp.json();
                if (Array.isArray(j.value) && j.value.length > 0) {
                  recoveredId = j.value[0]?.id ?? null;
                  console.log(`Recovered Teams meeting via joinWebUrl for interview ${interview.id}: ${recoveredId}`);
                  if (recoveredId) {
                    await supabase
                      .from('ats_interviews')
                      .update({ teams_meeting_id: recoveredId, updated_at: new Date().toISOString() })
                      .eq('id', interview.id);
                  }
                }
              }
            } catch (e) {
              console.log('Error recovering meeting via joinWebUrl:', e);
            }
          }

          if (recoveredId) {
            // Retry with recovered ID
            const retryResp = await fetch(
              `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings/${recoveredId}/attendanceReports`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (retryResp.ok) {
              const attendanceData = await retryResp.json();
              if (!attendanceData.value || attendanceData.value.length === 0) {
                console.log(`No attendance reports found for meeting ${recoveredId}; marking as cancelled`);
                await updateInterviewStatus(supabase, interview.id, 'cancelled', 'Auto-updated: Teams meeting appears cancelled (no attendance reports)');
                await supabase.from('candidate_activities').insert({
                  candidate_id: interview.candidate_id,
                  actor_id: null,
                  activity_type: 'interview_cancelled',
                  activity_description: 'Interview automatically cancelled: No Teams attendance reports found',
                  metadata: { interview_id: interview.id, auto_updated: true, reason: 'no_attendance_reports' }
                });
                updates.push({ interviewId: interview.id, status: 'cancelled', reason: 'no_attendance_reports' });
                continue;
              }
              const latestReport = attendanceData.value[0];
              const detailResponse = await fetch(
                `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings/${recoveredId}/attendanceReports/${latestReport.id}/attendanceRecords`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (!detailResponse.ok) {
                console.log(`Failed to get detailed attendance for recovered meeting ${recoveredId}`);
                continue;
              }
              const attendanceDetails = await detailResponse.json();
              const participants = attendanceDetails.value || [];
              const candidateAttended = participants.some((p: any) => 
                p.emailAddress?.toLowerCase().includes(interview.candidate?.email?.toLowerCase()) ||
                p.identity?.displayName?.toLowerCase().includes(interview.candidate?.full_name?.toLowerCase())
              );
              const interviewerAttended = participants.some((p: any) => 
                p.emailAddress?.toLowerCase().includes(interview.interviewer?.email?.toLowerCase()) ||
                p.identity?.displayName?.toLowerCase().includes(interview.interviewer?.full_name?.toLowerCase())
              );
              let newStatus = (!candidateAttended || !interviewerAttended) ? 'cancelled' : 'completed';
              let notes = (!candidateAttended && !interviewerAttended) ? 'Auto-updated: Both parties no-show'
                         : (!candidateAttended) ? 'Auto-updated: Candidate no-show'
                         : (!interviewerAttended) ? 'Auto-updated: Interviewer no-show'
                         : 'Auto-updated: Interview completed successfully';

              await updateInterviewStatus(supabase, interview.id, newStatus, notes);
              await supabase.from('candidate_activities').insert({
                candidate_id: interview.candidate_id,
                actor_id: null,
                activity_type: `interview_${newStatus}`,
                activity_description: `Interview automatically ${newStatus}: ${notes}`,
                metadata: {
                  interview_id: interview.id,
                  attendance_analysis: {
                    candidate_attended: candidateAttended,
                    interviewer_attended: interviewerAttended,
                    total_participants: participants.length
                  },
                  auto_updated: true
                }
              });
              updates.push({ interviewId: interview.id, status: newStatus, candidateAttended, interviewerAttended, totalParticipants: participants.length });
              console.log(`Updated interview ${interview.id} to status: ${newStatus} (recovered meeting)`);
              continue;
            }

            // If retry also fails, treat as cancelled
            if (retryResp.status === 404 || retryResp.status === 410) {
              console.log(`Recovered meeting ${recoveredId} not found; marking as cancelled`);
              await updateInterviewStatus(supabase, interview.id, 'cancelled', 'Auto-updated: Teams meeting cancelled or not found (recovered)');
              await supabase.from('candidate_activities').insert({
                candidate_id: interview.candidate_id,
                actor_id: null,
                activity_type: 'interview_cancelled',
                activity_description: 'Interview automatically cancelled: Teams meeting not found after recovery',
                metadata: { interview_id: interview.id, auto_updated: true, reason: 'recovered_meeting_not_found' }
              });
              updates.push({ interviewId: interview.id, status: 'cancelled', reason: 'recovered_meeting_not_found' });
              continue;
            }
          }

          // If meeting not found or gone, likely cancelled in Teams
          if (meetingResponse.status === 404 || meetingResponse.status === 410) {
            console.log(`Marking interview ${interview.id} as cancelled (Teams meeting cancelled or not found)`);
            await updateInterviewStatus(supabase, interview.id, 'cancelled', 'Auto-updated: Teams meeting cancelled or not found');
            await supabase.from('candidate_activities').insert({
              candidate_id: interview.candidate_id,
              actor_id: null,
              activity_type: 'interview_cancelled',
              activity_description: 'Interview automatically cancelled: Teams meeting cancelled or not found',
              metadata: { interview_id: interview.id, auto_updated: true, reason: 'teams_meeting_cancelled' }
            });
            updates.push({ interviewId: interview.id, status: 'cancelled', reason: 'teams_meeting_cancelled' });
            continue;
          }

          // Otherwise, if meeting has ended, mark as completed
          const cutoffForCompleted = new Date(Date.now() - 5 * 60 * 1000);
          if (new Date(interview.scheduled_end) <= cutoffForCompleted) {
            console.log(`Marking interview ${interview.id} as completed due to API unavailability (interview ended)`);
            await updateInterviewStatus(supabase, interview.id, 'completed', `Auto-completed: Meeting ended, Teams API unavailable (${meetingResponse.status})`);
            await supabase.from('candidate_activities').insert({
              candidate_id: interview.candidate_id,
              actor_id: null,
              activity_type: 'interview_completed',
              activity_description: 'Interview automatically completed: Teams API unavailable',
              metadata: { interview_id: interview.id, auto_updated: true, reason: 'teams_api_unavailable' }
            });
            updates.push({ interviewId: interview.id, status: 'completed', reason: 'Teams API unavailable' });
          } else {
            console.log(`Teams API unavailable for interview ${interview.id}, but interview not yet ended - skipping`);
          }
          continue;
        }

        const attendanceData = await meetingResponse.json();
        
        if (!attendanceData.value || attendanceData.value.length === 0) {
          console.log(`No attendance reports found for meeting ${interview.teams_meeting_id}; marking as cancelled`);
          await updateInterviewStatus(supabase, interview.id, 'cancelled', 'Auto-updated: Teams meeting appears cancelled (no attendance reports)');
          await supabase.from('candidate_activities').insert({
            candidate_id: interview.candidate_id,
            actor_id: null,
            activity_type: 'interview_cancelled',
            activity_description: 'Interview automatically cancelled: No Teams attendance reports found',
            metadata: { interview_id: interview.id, auto_updated: true, reason: 'no_attendance_reports' }
          });
          updates.push({ interviewId: interview.id, status: 'cancelled', reason: 'no_attendance_reports' });
          continue;
        }

        // Get the latest attendance report
        const latestReport = attendanceData.value[0];
        
        // Get detailed attendance for this report
        const detailResponse = await fetch(
          `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings/${interview.teams_meeting_id}/attendanceReports/${latestReport.id}/attendanceRecords`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!detailResponse.ok) {
          console.log(`Failed to get detailed attendance for meeting ${interview.teams_meeting_id}`);
          continue;
        }

        const attendanceDetails = await detailResponse.json();
        const participants = attendanceDetails.value || [];

        console.log(`Found ${participants.length} participants in meeting ${interview.teams_meeting_id}`);

        // Analyze attendance
        const candidateAttended = participants.some((p: any) => 
          p.emailAddress?.toLowerCase().includes(interview.candidate?.email?.toLowerCase()) ||
          p.identity?.displayName?.toLowerCase().includes(interview.candidate?.full_name?.toLowerCase())
        );

        const interviewerAttended = participants.some((p: any) => 
          p.emailAddress?.toLowerCase().includes(interview.interviewer?.email?.toLowerCase()) ||
          p.identity?.displayName?.toLowerCase().includes(interview.interviewer?.full_name?.toLowerCase())
        );

        // Determine status based on attendance
        let newStatus = 'completed';
        let notes = '';

        if (!candidateAttended && !interviewerAttended) {
          newStatus = 'cancelled';
          notes = 'Auto-updated: Both parties no-show';
        } else if (!candidateAttended) {
          newStatus = 'cancelled';
          notes = 'Auto-updated: Candidate no-show';
        } else if (!interviewerAttended) {
          newStatus = 'cancelled';
          notes = 'Auto-updated: Interviewer no-show';
        } else {
          newStatus = 'completed';
          notes = 'Auto-updated: Interview completed successfully';
        }

        // Update interview status
        await updateInterviewStatus(supabase, interview.id, newStatus, notes);

        // Log activity
        await supabase.from('candidate_activities').insert({
          candidate_id: interview.candidate_id,
          actor_id: null, // System update
          activity_type: `interview_${newStatus}`,
          activity_description: `Interview automatically ${newStatus}: ${notes}`,
          metadata: {
            interview_id: interview.id,
            attendance_analysis: {
              candidate_attended: candidateAttended,
              interviewer_attended: interviewerAttended,
              total_participants: participants.length
            },
            auto_updated: true
          }
        });

        updates.push({ 
          interviewId: interview.id, 
          status: newStatus, 
          candidateAttended, 
          interviewerAttended,
          totalParticipants: participants.length
        });

        console.log(`Updated interview ${interview.id} to status: ${newStatus}`);

      } catch (error) {
        console.error(`Error processing interview ${interview.id}:`, error);
        // Continue with other interviews even if one fails
      }
    }

    console.log(`Successfully processed ${updates.length} interview updates`);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${interviews.length} interviews, updated ${updates.length}`,
        updates 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in auto-update-interview-status:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to auto-update interview statuses'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function updateInterviewStatus(
  supabase: any,
  interviewId: string,
  status: string,
  notes: string
) {
  const { error } = await supabase
    .from('ats_interviews')
    .update({ 
      status,
      notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', interviewId);

  if (error) {
    console.error(`Error updating interview ${interviewId}:`, error);
    throw error;
  }
}