import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token parameter", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Validate the completion token
    const { data: isValid } = await supabase.rpc("validate_completion_token", {
      token_to_check: token
    });

    if (!isValid) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid or Expired Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .container { text-align: center; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Invalid or Expired Link</h1>
            <p>This completion link is either invalid or has expired.</p>
            <p>Please contact the HR team for assistance.</p>
          </div>
        </body>
        </html>
        `,
        {
          status: 400,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    if (req.method === "GET") {
      // Show completion form
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Complete Task</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px; 
              background-color: #f5f5f5;
            }
            .container { 
              background: white; 
              padding: 30px; 
              border-radius: 10px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .btn { 
              background-color: #28a745; 
              color: white; 
              padding: 12px 24px; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer; 
              font-size: 16px;
              margin-top: 20px;
            }
            .btn:hover { background-color: #218838; }
            textarea { 
              width: 100%; 
              height: 100px; 
              padding: 10px; 
              border: 1px solid #ddd; 
              border-radius: 5px; 
              font-family: Arial, sans-serif;
              margin-top: 10px;
            }
            .form-group { margin-bottom: 20px; }
            label { font-weight: bold; display: block; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Complete Task</h1>
            <p>Please confirm the completion of your assigned task.</p>
            
            <form method="POST">
              <div class="form-group">
                <label for="comments">Comments (Optional):</label>
                <textarea name="comments" id="comments" placeholder="Add any comments about task completion..."></textarea>
              </div>
              
              <input type="hidden" name="token" value="${token}" />
              <button type="submit" class="btn">Mark Task as Complete</button>
            </form>
          </div>
        </body>
        </html>
        `,
        {
          status: 200,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    if (req.method === "POST") {
      // Process completion
      const formData = await req.formData();
      const comments = formData.get("comments")?.toString() || "";

      // Get the external completion record
      const { data: completion, error: fetchError } = await supabase
        .from("external_completions")
        .select("*")
        .eq("completion_token", token)
        .single();

      if (fetchError || !completion) {
        throw new Error("Completion record not found");
      }

      // Mark as completed
      const { error: updateError } = await supabase
        .from("external_completions")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          comments: comments,
        })
        .eq("completion_token", token);

      if (updateError) {
        throw updateError;
      }

      // If this is a task completion, update the task status
      if (completion.step_name.startsWith("task_")) {
        const taskId = completion.step_name.replace("task_", "");
        
        // Update task status to completed
        const { error: taskUpdateError } = await supabase.rpc("update_task_status", {
          p_task_id: taskId,
          p_status: "completed",
          p_comment: comments || "Completed via external link"
        });

        if (taskUpdateError) {
          console.error("Error updating task status:", taskUpdateError);
        }
      }

      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Task Completed</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px; 
              background-color: #f5f5f5;
            }
            .container { 
              background: white; 
              padding: 30px; 
              border-radius: 10px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              text-align: center;
            }
            .success { color: #28a745; }
            .checkmark { font-size: 48px; color: #28a745; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h1 class="success">Task Completed Successfully!</h1>
            <p>Thank you for completing your assigned task.</p>
            <p>The task has been marked as complete and the relevant teams have been notified.</p>
          </div>
        </body>
        </html>
        `,
        {
          status: 200,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  } catch (error: any) {
    console.error("Error in complete-external-task function:", error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .container { text-align: center; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">Error</h1>
          <p>An error occurred while processing your request.</p>
          <p>Please contact support for assistance.</p>
        </div>
      </body>
      </html>
      `,
      {
        status: 500,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );
  }
};

serve(handler);