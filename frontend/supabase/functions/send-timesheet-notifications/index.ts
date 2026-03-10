import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'due_reminder' | 'submission_notice' | 'decision_notice';
  employee_email?: string;
  manager_email?: string;
  week_start?: string;
  project_name?: string;
  status?: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, employee_email, manager_email, week_start, project_name, status, reason }: NotificationRequest = await req.json();

    let emailSubject = '';
    let emailContent = '';
    let recipient = '';

    switch (type) {
      case 'due_reminder':
        recipient = employee_email!;
        emailSubject = 'Timesheet Due Reminder';
        emailContent = `
          <h2>Timesheet Due Reminder</h2>
          <p>Hello,</p>
          <p>This is a reminder that your timesheet for the week of ${week_start} is due.</p>
          <p>Please submit your timesheet as soon as possible.</p>
          <p>Best regards,<br>At Dawn Technologies</p>
        `;
        break;

      case 'submission_notice':
        recipient = manager_email!;
        emailSubject = 'Timesheet Submitted for Approval';
        emailContent = `
          <h2>Timesheet Submission</h2>
          <p>Hello,</p>
          <p>A timesheet has been submitted for approval:</p>
          <ul>
            <li><strong>Employee:</strong> ${employee_email}</li>
            <li><strong>Project:</strong> ${project_name}</li>
            <li><strong>Week:</strong> ${week_start}</li>
          </ul>
          <p>Please review and approve the timesheet in the system.</p>
          <p>Best regards,<br>At Dawn Technologies</p>
        `;
        break;

      case 'decision_notice':
        recipient = employee_email!;
        emailSubject = `Timesheet ${status === 'approved' ? 'Approved' : 'Rejected'}`;
        emailContent = `
          <h2>Timesheet ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
          <p>Hello,</p>
          <p>Your timesheet for the week of ${week_start} has been ${status}.</p>
          ${status === 'rejected' && reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Best regards,<br>At Dawn Technologies</p>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "At Dawn Technologies <noreply@atdawntech.com>",
      to: [recipient],
      subject: emailSubject,
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);