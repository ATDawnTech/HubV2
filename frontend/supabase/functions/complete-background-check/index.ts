import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Complete background check function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response("Missing completion token", { status: 400 });
    }

    if (req.method === 'GET') {
      // Show completion form
      const { data: completion, error } = await supabase
        .from('external_completions')
        .select('*, candidates(full_name)')
        .eq('completion_token', token)
        .eq('step_name', 'background_check')
        .single();

      if (error || !completion) {
        return new Response("Invalid or expired completion token", { status: 404 });
      }

      if (completion.completed) {
        return new Response(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
              <h2 style="color: #28a745;">Background Check Already Completed</h2>
              <p>The background check for <strong>${completion.candidates?.full_name}</strong> has already been marked as completed.</p>
              <p style="color: #666;">Completed on: ${new Date(completion.completed_at).toLocaleString()}</p>
              ${completion.comments ? `<p><strong>Comments:</strong> ${completion.comments}</p>` : ''}
            </body>
          </html>
        `, {
          headers: { "Content-Type": "text/html", ...corsHeaders }
        });
      }

      // Show completion form
      return new Response(`
        <html>
          <head>
            <title>Complete Background Check</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .form-group { margin-bottom: 20px; }
              label { display: block; margin-bottom: 5px; font-weight: bold; }
              textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px; }
              button { background: #28a745; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
              button:hover { background: #218838; }
              .candidate-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <h2>Complete Background Check</h2>
            <div class="candidate-info">
              <h3>Candidate: ${completion.candidates?.full_name}</h3>
              <p>Please confirm that the background check has been completed for this candidate.</p>
            </div>
            
            <form method="POST" action="?token=${token}">
              <div class="form-group">
                <label for="comments">Comments (Optional):</label>
                <textarea id="comments" name="comments" placeholder="Add any relevant comments about the background check process..."></textarea>
              </div>
              
              <button type="submit">Mark Background Check Complete</button>
            </form>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html", ...corsHeaders }
      });
    }

    if (req.method === 'POST') {
      // Process completion
      const formData = await req.formData();
      const comments = formData.get('comments')?.toString() || '';

      // Get completion record
      const { data: completion, error: fetchError } = await supabase
        .from('external_completions')
        .select('candidate_id')
        .eq('completion_token', token)
        .eq('step_name', 'background_check')
        .eq('completed', false)
        .single();

      if (fetchError || !completion) {
        return new Response("Invalid or expired completion token", { status: 404 });
      }

      // Update workflow step using the database function
      const { error: updateError } = await supabase.rpc('update_workflow_step', {
        p_candidate_id: completion.candidate_id,
        p_step_name: 'background_check',
        p_status: 'completed',
        p_comments: comments || 'Background check completed via email link',
        p_completed_by: 'External completion'
      });

      if (updateError) {
        console.error("Error updating workflow step:", updateError);
        throw updateError;
      }

      // Mark external completion as completed
      const { error: completeError } = await supabase
        .from('external_completions')
        .update({
          completed: true,
          comments: comments,
          completed_at: new Date().toISOString()
        })
        .eq('completion_token', token);

      if (completeError) {
        console.error("Error marking completion:", completeError);
        throw completeError;
      }

      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #28a745;">Background Check Completed Successfully!</h2>
            <p>Thank you for confirming the completion of the background check.</p>
            ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
            <p style="color: #666;">The candidate's workflow has been updated automatically.</p>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html", ...corsHeaders }
      });
    }

    return new Response("Method not allowed", { status: 405 });

  } catch (error: any) {
    console.error("Error in complete-background-check function:", error);
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