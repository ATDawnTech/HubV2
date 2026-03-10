import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BackgroundCheckRequest {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  dateOfJoining: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Background check email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { candidateId, candidateName, candidateEmail, candidatePhone, dateOfJoining }: BackgroundCheckRequest = await req.json();
    
    console.log("Processing background check for candidate:", candidateName);

    // Get background check initiators from config
    const { data: configData, error: configError } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'bg_initiators')
      .maybeSingle();

    if (configError) {
      console.error("Error fetching bg_initiators config:", configError);
      throw new Error("Failed to fetch background check initiators configuration");
    }

    if (!configData?.value) {
      console.log("No background check initiators configured, updating workflow status only");
      
      // Update workflow step using the database function
      const { error: updateError } = await supabase.rpc('update_workflow_step', {
        p_candidate_id: candidateId,
        p_step_name: 'background_check',
        p_status: 'in_progress',
        p_comments: 'Background check initiated (no email initiators configured yet)'
      });

      if (updateError) {
        console.error("Error updating workflow step:", updateError);
        throw updateError;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Background check initiated. Please configure background check initiators in settings."
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const bgInitiators = configData.value.split(',').map((email: string) => email.trim());
    console.log("Background check initiators:", bgInitiators);

    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, updating workflow status only");
      
      // Update workflow step using the database function
      const { error: updateError } = await supabase.rpc('update_workflow_step', {
        p_candidate_id: candidateId,
        p_step_name: 'background_check',
        p_status: 'in_progress',
        p_comments: `Background check initiated. Configured to notify: ${bgInitiators.join(', ')} (email functionality pending API key)`
      });

      if (updateError) {
        console.error("Error updating workflow step:", updateError);
        throw updateError;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Background check initiated. Please configure RESEND_API_KEY to enable email notifications.",
        bgInitiators: bgInitiators
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Import Resend dynamically only when needed
    const { Resend } = await import("npm:resend@2.0.0");
    const resend = new Resend(resendApiKey);

    // Create completion token for external completions
    const completionToken = crypto.randomUUID();
    
    // Insert external completion record
    const { error: externalError } = await supabase
      .from('external_completions')
      .insert({
        candidate_id: candidateId,
        step_name: 'background_check',
        completion_token: completionToken,
        email_sent_to: bgInitiators.join(', ')
      });

    if (externalError) {
      console.error("Error creating external completion record:", externalError);
      throw externalError;
    }

    const completionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/complete-background-check?token=${completionToken}`;

    // Send email to all background check initiators
    const emailPromises = bgInitiators.map(async (email: string) => {
      return await resend.emails.send({
        from: "ADT Hub <ADT@atdawntech.com>",
        to: [email],
        subject: `Background Check Required - ${candidateName}`,
        html: `
          <h2>Background Check Required</h2>
          <p>A new candidate requires background check initiation:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Candidate Details:</h3>
            <p><strong>Name:</strong> ${candidateName}</p>
            <p><strong>Email:</strong> ${candidateEmail}</p>
            <p><strong>Phone:</strong> ${candidatePhone}</p>
            <p><strong>Date of Joining:</strong> ${new Date(dateOfJoining).toLocaleDateString()}</p>
          </div>
          
          <p>Please initiate the background check process for this candidate.</p>
          
          <div style="margin: 30px 0;">
            <a href="${completionUrl}" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Mark Background Check Complete
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Click the button above when the background check has been completed. 
            You can also add comments about the completion.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">
            This is an automated notification from Talent Hub. 
            Date of joining: ${new Date(dateOfJoining).toLocaleDateString()}
          </p>
        `,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Check for any failed emails
    const failedEmails = emailResults.filter(result => result.status === 'rejected');
    if (failedEmails.length > 0) {
      console.error("Some emails failed to send:", failedEmails);
    }

    const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
    console.log(`Successfully sent ${successfulEmails} background check emails`);

    // Update candidate workflow step using the database function
    const { error: updateError } = await supabase.rpc('update_workflow_step', {
      p_candidate_id: candidateId,
      p_step_name: 'background_check',
      p_status: 'in_progress',
      p_comments: `Background check emails sent to: ${bgInitiators.join(', ')}`
    });

    if (updateError) {
      console.error("Error updating workflow step:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Background check emails sent to ${successfulEmails} recipients`,
      emailsSent: successfulEmails,
      totalRecipients: bgInitiators.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-background-check-email function:", error);
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