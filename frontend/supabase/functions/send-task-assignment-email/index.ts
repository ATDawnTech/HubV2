import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "npm:resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { TaskAssignmentEmail } from './_templates/task-assignment.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskAssignmentRequest {
  taskId: string;
  assigneeUserId: string;
  taskName: string;
  candidateName: string;
  dueDate: string;
  taskDescription?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, email notifications disabled');
      return new Response(
        JSON.stringify({ message: 'Email notifications are disabled' }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const {
      taskId,
      assigneeUserId,
      taskName,
      candidateName,
      dueDate,
      taskDescription
    }: TaskAssignmentRequest = await req.json();

    console.log('Processing task assignment email for:', {
      taskId,
      assigneeUserId,
      taskName,
      candidateName
    });

    // Get assignee details
    const { data: assigneeData, error: assigneeError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', assigneeUserId)
      .single();

    if (assigneeError || !assigneeData) {
      console.error('Error fetching assignee details:', assigneeError);
      return new Response(
        JSON.stringify({ error: 'Assignee not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Render the email template
    const emailHtml = await renderAsync(
      React.createElement(TaskAssignmentEmail, {
        assigneeName: assigneeData.full_name || assigneeData.email,
        taskName,
        candidateName,
        dueDate,
        taskDescription,
        siteUrl: 'https://bb02ccb2-e158-46e4-96e4-6bfe42092a0a.sandbox.lovable.dev'
      })
    );

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Onboarding System <notifications@atdawntech.com>',
      to: [assigneeData.email],
      subject: `New Task Assignment: ${taskName} - ${candidateName}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('Task assignment email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailData?.id,
        sentTo: assigneeData.email
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-task-assignment-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);