import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  commentId: string;
  candidateId: string;
  authorName: string;
  candidateName: string;
  comment: string;
  mentions: string[];
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

async function getGraphAccessToken(): Promise<string | null> {
  const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    console.warn('Missing Microsoft Graph credentials');
    return null;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to get Graph access token:', errorText);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (err) {
    console.error('Error getting Graph access token:', err);
    return null;
  }
}

async function postToATSTestingGroup(accessToken: string, messageHtml: string) {
  try {
    // Find the group/team by display name
    const groupsRes = await fetch(`https://graph.microsoft.com/v1.0/groups?$filter=displayName eq 'ATSTesting'`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!groupsRes.ok) {
      console.error('Failed to lookup ATSTesting group:', await groupsRes.text());
      return false;
    }
    const groups = await groupsRes.json();
    const group = groups.value?.[0];
    if (!group) {
      console.warn('ATSTesting group not found');
      return false;
    }

    const teamId = group.id;
    // Get channels
    const channelsRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!channelsRes.ok) {
      console.error('Failed to list channels:', await channelsRes.text());
      return false;
    }
    const channels = await channelsRes.json();
    const channel = channels.value?.find((c: any) => c.displayName === 'General') || channels.value?.[0];
    if (!channel) {
      console.warn('No channel found in ATSTesting team');
      return false;
    }

    // Post message
    const postRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channel.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: { contentType: 'html', content: messageHtml }
      })
    });

    if (!postRes.ok) {
      console.error('Failed to post message to Teams:', await postRes.text());
      return false;
    }

    console.log('Posted comment to ATSTesting group in Teams');
    return true;
  } catch (err) {
    console.error('Error posting to Teams:', err);
    return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: NotificationRequest = await req.json();
    const { commentId, candidateId, authorName, candidateName, comment, mentions } = body;

    console.log('Processing comment notification:', { commentId, candidateId, mentions });

    // Get mentioned users' details
    if (mentions.length > 0) {
      const { data: mentionedUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', mentions);

      if (usersError) {
        console.error('Error fetching mentioned users:', usersError);
        throw usersError;
      }

      // Send email notifications to mentioned users
      for (const user of mentionedUsers) {
        try {
          await resend.emails.send({
            from: "ADT Hub <adthub@atdawntech.com>",
            to: [user.email],
            subject: `You were mentioned in a comment on ${candidateName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">You were mentioned in a comment</h2>
                <p>Hi ${user.full_name},</p>
                <p><strong>${authorName}</strong> mentioned you in a comment on candidate <strong>${candidateName}</strong>:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                  <p style="margin: 0; font-style: italic;">"${comment}"</p>
                </div>
                <p>
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/candidates/${candidateId}" 
                     style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    View Candidate
                  </a>
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                  This is an automated notification from ADT Hub ATS.
                </p>
              </div>
            `,
          });

          console.log(`Email sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
        }
      }
    }

    // Post to ATSTesting group (Teams) and log activity
    try {
      const accessToken = await getGraphAccessToken();
      if (accessToken) {
        const messageHtml = `
          <div>
            <p><strong>${authorName}</strong> commented on <strong>${candidateName}</strong>:</p>
            <blockquote style="border-left:4px solid #6264A7;padding-left:12px;color:#444;">${comment}</blockquote>
            <p><em>Mentions: ${mentions.length}</em></p>
          </div>`;
        await postToATSTestingGroup(accessToken, messageHtml);
      } else {
        console.warn('Skipping Teams posting due to missing Graph token');
      }

      // Also log as candidate activity
      await supabase
        .from('candidate_activities')
        .insert({
          candidate_id: candidateId,
          activity_type: 'comment_shared',
          activity_description: `Comment shared with ATSTesting group by ${authorName}`,
          metadata: {
            comment_id: commentId,
            group: 'ATSTesting',
            mentions: mentions.length
          }
        });

      console.log('Activity logged and Teams post attempted');
    } catch (activityError) {
      console.error('Error posting to Teams or logging activity:', activityError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications sent successfully' }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error('Error in send-comment-notifications:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});