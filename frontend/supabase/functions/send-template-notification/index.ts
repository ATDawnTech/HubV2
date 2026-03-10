import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateNotificationRequest {
  templateName: string;
  changedBy: string;
  changeType: 'created' | 'updated';
  changes: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateName, changedBy, changeType, changes }: TemplateNotificationRequest = await req.json();
    
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

    // Dynamically import Resend
    const { Resend } = await import('npm:resend@2.0.0');
    const resend = new Resend(resendApiKey);

    // Admin email (you can make this configurable)
    const adminEmail = 'admin@company.com'; // TODO: Make this configurable

    const subject = `Onboarding Template ${changeType === 'created' ? 'Created' : 'Updated'}: ${templateName}`;
    
    const htmlContent = `
      <h2>Onboarding Template ${changeType === 'created' ? 'Created' : 'Updated'}</h2>
      
      <p><strong>Template:</strong> ${templateName}</p>
      <p><strong>Changed by:</strong> ${changedBy}</p>
      <p><strong>Action:</strong> Template ${changeType}</p>
      
      <h3>Changes Made:</h3>
      <div style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
        <pre style="white-space: pre-wrap; margin: 0;">${changes}</pre>
      </div>
      
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from the onboarding system.
      </p>
    `;

    const emailResult = await resend.emails.send({
      from: 'Onboarding System <noreply@company.com>',
      to: [adminEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log('Template notification sent:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        emailId: emailResult.data?.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error sending template notification:', error);
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