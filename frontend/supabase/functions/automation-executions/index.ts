/**
 * Automation Executions API
 *
 * POST /automation-executions
 * Body: {
 *   template_id: string,
 *   trigger_event: 'onboarding_started' | 'task_completed' | 'task_assigned' | 'journey_completed',
 *   context: object  // event-specific data passed to n8n (candidate info, task details, etc.)
 * }
 *
 * Creates automation executions by querying active automation_tasks
 * for the given template + event, calling each n8n webhook in sort_order,
 * and logging results. Skips disabled or deleted tasks per Requirement 5.
 */

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_TRIGGER_EVENTS = ['onboarding_started', 'task_completed', 'task_assigned', 'journey_completed'];

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface AutomationTaskWithWorkflow {
  id: string;
  name: string;
  trigger_event: string;
  config: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  workflows: {
    id: string;
    name: string;
    webhook_url: string;
    credentials: Record<string, unknown> | null;
    is_active: boolean;
  };
}

interface ExecutionResult {
  automation_task_id: string;
  task_name: string;
  status: 'success' | 'failed' | 'skipped';
  status_code?: number;
  error?: string;
  response_time_ms?: number;
}

async function callWebhook(
  webhookUrl: string,
  credentials: Record<string, unknown> | null,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; body: unknown; responseTimeMs: number }> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Add credential headers if provided
    if (credentials?.api_key) {
      headers['X-API-Key'] = String(credentials.api_key);
    }
    if (credentials?.bearer_token) {
      headers['Authorization'] = `Bearer ${credentials.bearer_token}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return { ok: response.ok, status: response.status, body, responseTimeMs };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    throw Object.assign(error, { responseTimeMs });
  }
}

async function logExecution(
  automationTaskId: string,
  triggerEvent: string,
  status: string,
  requestPayload: unknown,
  responsePayload: unknown,
  errorMessage: string | null,
  completedAt: string | null
): Promise<void> {
  const { error } = await supabase
    .from('automation_task_executions')
    .insert({
      automation_task_id: automationTaskId,
      trigger_event: triggerEvent,
      status,
      request_payload: requestPayload,
      response_payload: responsePayload,
      error_message: errorMessage,
      completed_at: completedAt,
    });

  if (error) {
    console.error('Failed to log execution:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Authenticate - accept both user JWT and service role calls
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: { template_id: string; trigger_event: string; context: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!body.template_id || typeof body.template_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'template_id is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.trigger_event || !VALID_TRIGGER_EVENTS.includes(body.trigger_event)) {
      return new Response(
        JSON.stringify({
          error: `trigger_event must be one of: ${VALID_TRIGGER_EVENTS.join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const context = body.context || {};

    console.log('Triggering n8n workflows:', {
      template_id: body.template_id,
      trigger_event: body.trigger_event,
    });

    // Query active automation tasks for this template + trigger event
    // Join with workflows to get webhook URLs and credentials
    const { data: tasks, error: queryError } = await supabase
      .from('automation_tasks')
      .select(`
        id,
        name,
        trigger_event,
        config,
        sort_order,
        is_active,
        workflows!inner (
          id,
          name,
          webhook_url,
          credentials,
          is_active
        )
      `)
      .eq('template_id', body.template_id)
      .eq('trigger_event', body.trigger_event)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (queryError) {
      console.error('Error querying automation tasks:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query automation tasks', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tasks || tasks.length === 0) {
      console.log('No active automation tasks found for this template + event');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active automation tasks found',
          results: [],
          total: 0,
          executed: 0,
          skipped: 0,
          failed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute each task in sort_order (sequentially to maintain order guarantee per Req 5.4)
    const results: ExecutionResult[] = [];

    for (const task of tasks as unknown as AutomationTaskWithWorkflow[]) {
      const workflow = task.workflows;

      // Skip if the parent workflow is inactive
      if (!workflow.is_active) {
        console.log(`Skipping task "${task.name}" - workflow "${workflow.name}" is inactive`);

        await logExecution(
          task.id,
          task.trigger_event,
          'skipped',
          null,
          null,
          `Workflow "${workflow.name}" is inactive`,
          new Date().toISOString()
        );

        results.push({
          automation_task_id: task.id,
          task_name: task.name,
          status: 'skipped',
          error: `Workflow "${workflow.name}" is inactive`,
        });
        continue;
      }

      // Build the payload for n8n
      const payload = {
        event: task.trigger_event,
        task_name: task.name,
        template_id: body.template_id,
        automation_task_id: task.id,
        config: task.config || {},
        context,
        timestamp: new Date().toISOString(),
      };

      try {
        console.log(`Executing task "${task.name}" via webhook: ${workflow.webhook_url}`);

        const webhookResult = await callWebhook(
          workflow.webhook_url,
          workflow.credentials,
          payload
        );

        const status = webhookResult.ok ? 'success' : 'failed';
        const errorMsg = webhookResult.ok ? null : `HTTP ${webhookResult.status}`;

        await logExecution(
          task.id,
          task.trigger_event,
          status,
          payload,
          webhookResult.body,
          errorMsg,
          new Date().toISOString()
        );

        results.push({
          automation_task_id: task.id,
          task_name: task.name,
          status,
          status_code: webhookResult.status,
          response_time_ms: webhookResult.responseTimeMs,
          ...(errorMsg ? { error: errorMsg } : {}),
        });

        console.log(`Task "${task.name}" ${status}:`, {
          status_code: webhookResult.status,
          response_time_ms: webhookResult.responseTimeMs,
        });
      } catch (error) {
        const errorMessage = error instanceof DOMException && error.name === 'AbortError'
          ? 'Webhook request timed out after 30 seconds'
          : error instanceof Error
            ? error.message
            : 'Unknown error';

        const responseTimeMs = (error as any)?.responseTimeMs;

        console.error(`Task "${task.name}" failed:`, errorMessage);

        await logExecution(
          task.id,
          task.trigger_event,
          'failed',
          payload,
          null,
          errorMessage,
          new Date().toISOString()
        );

        results.push({
          automation_task_id: task.id,
          task_name: task.name,
          status: 'failed',
          error: errorMessage,
          ...(responseTimeMs ? { response_time_ms: responseTimeMs } : {}),
        });
      }
    }

    const executed = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    console.log('Workflow trigger complete:', { total: results.length, executed, failed, skipped });

    return new Response(
      JSON.stringify({
        success: failed === 0,
        results,
        total: results.length,
        executed,
        skipped,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
