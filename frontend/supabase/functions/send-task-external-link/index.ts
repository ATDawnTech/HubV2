import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskExternalLinkRequest {
  task_id: string;
  task_name: string;
  candidate_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { task_id, task_name, candidate_email }: TaskExternalLinkRequest = await req.json();

    // Generate a unique completion token
    const completionToken = crypto.randomUUID();
    
    // Create external completion record
    const { error: insertError } = await supabase
      .from("external_completions")
      .insert({
        candidate_id: task_id, // Using task_id as placeholder
        step_name: `task_${task_id}`,
        completion_token: completionToken,
        email_sent_to: candidate_email,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

    if (insertError) {
      throw insertError;
    }

    // Generate completion URL
    const completionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/complete-external-task?token=${completionToken}`;

    // Send email with completion link
    const emailResponse = await resend.emails.send({
      from: "ATD Talent Hub <onboarding@atdawntech.com>",
      to: [candidate_email],
      subject: `Action Required: Complete ${task_name}`,
      html: `
        <h1>Task Completion Required</h1>
        <p>Dear Team Member,</p>
        <p>You have been assigned to complete the following task:</p>
        <h2>${task_name}</h2>
        <p>Please click the link below to mark this task as complete:</p>
        <a href="${completionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Complete Task
        </a>
        <p>This link will expire in 7 days.</p>
        <p>If you have any questions, please contact the HR team.</p>
        <p>Best regards,<br>ATD Talent Hub</p>
      `,
    });

    console.log("External task email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      completion_url: completionUrl,
      email_response: emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-task-external-link function:", error);
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