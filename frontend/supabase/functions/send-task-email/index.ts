import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskEmailRequest {
  task_id: string;
  event: 'task_assigned' | 'task_status_changed' | 'reminder_due_soon';
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task_id, event, message }: TaskEmailRequest = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get task details with related data
    const { data: task, error: taskError } = await supabase
      .from('onboarding_tasks')
      .select(`
        *,
        onboarding_journeys!inner(
          candidate_id,
          candidates!inner(
            full_name,
            email,
            official_email
          )
        ),
        assignee_profile:profiles!assignee(
          full_name,
          email
        )
      `)
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      throw new Error(`Task not found: ${taskError?.message}`);
    }

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('Resend API key not configured, email notifications are disabled');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email notifications are disabled' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check for duplicate notifications within 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('task_id', task_id)
      .eq('event_type', event)
      .gte('last_sent', twoHoursAgo);

    if (recentNotifications && recentNotifications.length > 0) {
      console.log(`Skipping duplicate notification for task ${task_id}, event ${event}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notification skipped due to throttling' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Dynamically import Resend
    const { Resend } = await import('npm:resend@2.0.0');
    const resend = new Resend(resendApiKey);

    // Determine recipients
    const recipients: string[] = [];
    
    // Add assignee email if exists
    if (task.assignee_profile?.email) {
      recipients.push(task.assignee_profile.email);
    }
    
    // Add candidate's official email if exists
    const candidate = task.onboarding_journeys.candidates;
    if (candidate.official_email) {
      recipients.push(candidate.official_email);
    } else if (candidate.email) {
      recipients.push(candidate.email);
    }

    if (recipients.length === 0) {
      console.log('No recipients found for task notification');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No recipients found' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create email content based on event type
    let subject: string;
    let htmlContent: string;

    switch (event) {
      case 'task_assigned':
        subject = `New Task Assigned: ${task.name}`;
        htmlContent = `
          <h2>Task Assignment Notification</h2>
          <p><strong>Task:</strong> ${task.name}</p>
          <p><strong>Block:</strong> ${task.block}</p>
          <p><strong>Description:</strong> ${task.description || 'No description provided'}</p>
          <p><strong>Due Date:</strong> ${task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date set'}</p>
          <p><strong>Candidate:</strong> ${candidate.full_name}</p>
          ${message ? `<p><strong>Additional Message:</strong> ${message}</p>` : ''}
          <p>Please log in to the system to view and update this task.</p>
        `;
        break;
        
      case 'task_status_changed':
        subject = `Task Status Updated: ${task.name}`;
        htmlContent = `
          <h2>Task Status Update</h2>
          <p><strong>Task:</strong> ${task.name}</p>
          <p><strong>New Status:</strong> ${task.status}</p>
          <p><strong>Block:</strong> ${task.block}</p>
          <p><strong>Candidate:</strong> ${candidate.full_name}</p>
          ${message ? `<p><strong>Update Notes:</strong> ${message}</p>` : ''}
          <p>Please log in to the system to view the latest updates.</p>
        `;
        break;
        
      case 'reminder_due_soon':
        subject = `Task Due Soon: ${task.name}`;
        htmlContent = `
          <h2>Task Due Date Reminder</h2>
          <p><strong>Task:</strong> ${task.name}</p>
          <p><strong>Due Date:</strong> ${task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date set'}</p>
          <p><strong>Current Status:</strong> ${task.status}</p>
          <p><strong>Block:</strong> ${task.block}</p>
          <p><strong>Candidate:</strong> ${candidate.full_name}</p>
          <p>This task is due soon. Please take action to complete it on time.</p>
        `;
        break;
        
      default:
        throw new Error(`Unknown event type: ${event}`);
    }

    // Send email
    const emailResult = await resend.emails.send({
      from: 'Talent Hub <noreply@company.com>',
      to: recipients,
      subject: subject,
      html: htmlContent,
    });

    // Log notification
    await supabase.from('notifications').insert({
      task_id: task_id,
      event_type: event,
      recipients: recipients
    });

    console.log('Task email sent:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: emailResult.data?.id,
        recipients: recipients.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error sending task email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);