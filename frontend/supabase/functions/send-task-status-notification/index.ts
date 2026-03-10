import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskStatusNotificationRequest {
  taskId: string;
  taskName: string;
  oldStatus: string;
  newStatus: string;
  comment?: string;
  candidateName: string;
  candidateEmail?: string;
  updatedByName: string;
  updatedByEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email notification');
      return new Response(
        JSON.stringify({ message: "Email notifications disabled - RESEND_API_KEY not configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      taskId, 
      taskName, 
      oldStatus, 
      newStatus, 
      comment, 
      candidateName, 
      candidateEmail, 
      updatedByName, 
      updatedByEmail 
    }: TaskStatusNotificationRequest = await req.json();

    // Dynamically import Resend
    const { Resend } = await import("npm:resend@2.0.0");
    const resend = new Resend(resendApiKey);

    // Get the base URL for the my tasks link
    const baseUrl = req.headers.get('origin') || 'https://your-app.com';
    const myTasksUrl = `${baseUrl}/tasks`;

    // Format status names for display
    const formatStatus = (status: string) => status.replace('_', ' ').toUpperCase();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
          Task Status Update
        </h2>
        
        <p>Hello,</p>
        
        <p>A task status has been updated in the onboarding system:</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #4f46e5;">${taskName}</h3>
          <p style="margin: 5px 0;"><strong>Candidate:</strong> ${candidateName}</p>
          <p style="margin: 5px 0;">
            <strong>Status changed:</strong> 
            <span style="background-color: #fef3c7; padding: 2px 6px; border-radius: 4px;">${formatStatus(oldStatus)}</span>
            →
            <span style="background-color: ${newStatus === 'completed' ? '#d1fae5' : newStatus === 'in_progress' ? '#dbeafe' : '#fef3c7'}; padding: 2px 6px; border-radius: 4px;">${formatStatus(newStatus)}</span>
          </p>
          <p style="margin: 5px 0;"><strong>Updated by:</strong> ${updatedByName} (${updatedByEmail})</p>
          ${comment ? `<p style="margin: 5px 0;"><strong>Comment:</strong> ${comment}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${myTasksUrl}" 
             style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Tasks
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This notification was sent to the person who updated the task and the candidate (if email is available).
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated notification from the Onboarding System.
        </p>
      </div>
    `;

    // Prepare recipient list
    const recipients = [updatedByEmail];
    if (candidateEmail && candidateEmail.trim()) {
      recipients.push(candidateEmail);
    }

    console.log(`Sending task status notification to: ${recipients.join(', ')}`);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Onboarding System <onboarding@resend.dev>",
      to: recipients,
      subject: `Task Status Update: ${taskName} - ${formatStatus(newStatus)}`,
      html: emailHtml,
    });

    console.log("Task status notification sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent: true,
        emailId: emailResponse.data?.id,
        recipients: recipients
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-task-status-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);