import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WorkflowNotificationRequest {
  candidateId: string;
  stepName: string;
  status: string;
  comments?: string;
  updatedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Workflow notification function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { candidateId, stepName, status, comments, updatedBy }: WorkflowNotificationRequest = await req.json();
    
    console.log("Processing workflow notification:", { candidateId, stepName, status, updatedBy });

    // Get candidate details
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError) {
      console.error("Error fetching candidate:", candidateError);
      throw candidateError;
    }

    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notification");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Workflow updated. Email notifications require RESEND_API_KEY configuration."
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Import Resend dynamically
    const { Resend } = await import("npm:resend@2.0.0");
    const resend = new Resend(resendApiKey);

    let emailRecipients: string[] = [];
    let emailSubject = "";
    let emailContent = "";

    if (status === 'initiated') {
      // Notify configured step initiators that step has been initiated
      const { data: configData, error: configError } = await supabase
        .from('config')
        .select('value')
        .eq('key', `${stepName}_initiators`)
        .maybeSingle();

      if (configError) {
        console.error("Error fetching step initiators config:", configError);
      } else if (configData?.value) {
        emailRecipients = configData.value.split(',').map((email: string) => email.trim());
        emailSubject = `${stepName.replace('_', ' ').toUpperCase()} Initiated - ${candidate.full_name}`;
        emailContent = `
          <h2>${stepName.replace('_', ' ').toUpperCase()} Initiated</h2>
          <p>The ${stepName.replace('_', ' ')} step has been initiated for:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Candidate Details:</h3>
            <p><strong>Name:</strong> ${candidate.full_name}</p>
            <p><strong>Email:</strong> ${candidate.email}</p>
            <p><strong>Phone:</strong> ${candidate.phone_number}</p>
            <p><strong>Date of Joining:</strong> ${new Date(candidate.date_of_joining).toLocaleDateString()}</p>
            <p><strong>Initiated by:</strong> ${updatedBy}</p>
            ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
          </div>
          
          <p>The step is now in progress. You will be notified when it's completed.</p>
        `;
      }
    } else if (['completed', 'not_required', 'failed'].includes(status)) {
      // Notify all relevant parties about completion
      const { data: authorizations, error: authError } = await supabase
        .from('workflow_authorizations')
        .select('authorized_email')
        .eq('candidate_id', candidateId)
        .eq('step_name', stepName);

      if (authError) {
        console.error("Error fetching authorizations:", authError);
      } else if (authorizations && authorizations.length > 0) {
        emailRecipients = authorizations.map(auth => auth.authorized_email);
        
        const statusDisplay = status.replace('_', ' ').toUpperCase();
        emailSubject = `${stepName.replace('_', ' ').toUpperCase()} ${statusDisplay} - ${candidate.full_name}`;
        emailContent = `
          <h2>${stepName.replace('_', ' ').toUpperCase()} ${statusDisplay}</h2>
          <p>The ${stepName.replace('_', ' ')} step has been marked as <strong>${statusDisplay}</strong> for:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Candidate Details:</h3>
            <p><strong>Name:</strong> ${candidate.full_name}</p>
            <p><strong>Email:</strong> ${candidate.email}</p>
            <p><strong>Phone:</strong> ${candidate.phone_number}</p>
            <p><strong>Date of Joining:</strong> ${new Date(candidate.date_of_joining).toLocaleDateString()}</p>
            <p><strong>Updated by:</strong> ${updatedBy}</p>
            ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
          </div>
          
          <p>The workflow step has been completed. Please check the system for any follow-up actions.</p>
        `;
      }
    }

    // Send emails if we have recipients
    if (emailRecipients.length > 0) {
      const emailPromises = emailRecipients.map(async (email: string) => {
        return await resend.emails.send({
          from: "ADT Hub <ADThub@atdawntech.com>",
          to: [email],
          subject: emailSubject,
          html: emailContent,
        });
      });

      const emailResults = await Promise.allSettled(emailPromises);
      
      const failedEmails = emailResults.filter(result => result.status === 'rejected');
      if (failedEmails.length > 0) {
        console.error("Some emails failed to send:", failedEmails);
      }

      const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
      console.log(`Successfully sent ${successfulEmails} workflow notification emails`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Workflow notification emails sent to ${successfulEmails} recipients`,
        emailsSent: successfulEmails,
        totalRecipients: emailRecipients.length
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } else {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Workflow updated. No email recipients configured for this step."
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

  } catch (error: any) {
    console.error("Error in workflow notification function:", error);
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