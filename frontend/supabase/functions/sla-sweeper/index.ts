import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting SLA sweeper job...");

    // Find overdue tasks
    const { data: overdueTasks, error } = await supabase
      .from("onboarding_tasks")
      .select(`
        id,
        name,
        due_at,
        status,
        journey_id,
        owner_group:owner_groups(name),
        journey:onboarding_journeys(
          candidate:candidates(full_name, email)
        )
      `)
      .in("status", ["pending", "in_progress"])
      .lt("due_at", new Date().toISOString());

    if (error) {
      throw error;
    }

    console.log(`Found ${overdueTasks?.length || 0} overdue tasks`);

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(JSON.stringify({ message: "No overdue tasks found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process each overdue task
    for (const task of overdueTasks) {
      try {
        // Log SLA breach event
        await supabase
          .from("task_sla_events")
          .insert({
            task_id: task.id,
            event: "breached",
            meta: {
              due_at: task.due_at,
              breached_at: new Date().toISOString(),
              task_name: task.name,
              candidate_name: task.journey?.candidate?.full_name,
            },
          });

        // Send escalation email if owner group exists and has notification email
        if (task.owner_group?.name) {
          const candidateName = task.journey?.candidate?.full_name || "Unknown";
          const hoursOverdue = Math.floor(
            (Date.now() - new Date(task.due_at).getTime()) / (1000 * 60 * 60)
          );

          await resend.emails.send({
            from: "ATD Talent Hub <alerts@atdawntech.com>",
            to: ["hr@atdawntech.com"], // In production, this should come from group settings
            subject: `⚠️ SLA Breach Alert: ${task.name}`,
            html: `
              <h1>SLA Breach Alert</h1>
              <p><strong>Task:</strong> ${task.name}</p>
              <p><strong>Candidate:</strong> ${candidateName}</p>
              <p><strong>Team:</strong> ${task.owner_group.name}</p>
              <p><strong>Due Date:</strong> ${new Date(task.due_at).toLocaleString()}</p>
              <p><strong>Hours Overdue:</strong> ${hoursOverdue}</p>
              <p><strong>Status:</strong> ${task.status}</p>
              
              <p>This task requires immediate attention to avoid further delays in the onboarding process.</p>
              
              <a href="${Deno.env.get("SUPABASE_URL")}/onboarding/${task.journey_id}" 
                 style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Task Details
              </a>
              
              <p><em>This is an automated alert from ATD Talent Hub.</em></p>
            `,
          });

          console.log(`Sent SLA breach alert for task ${task.id}`);
        }
      } catch (taskError) {
        console.error(`Error processing task ${task.id}:`, taskError);
      }
    }

    console.log("SLA sweeper job completed successfully");

    return new Response(
      JSON.stringify({
        message: "SLA sweeper completed",
        processed_tasks: overdueTasks.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in SLA sweeper:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);