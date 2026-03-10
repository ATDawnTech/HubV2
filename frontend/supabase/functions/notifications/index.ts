import { createClient } from '@supabase/supabase-js';
import { validateNotificationEvent } from '../_shared/notifications/validation.ts';
import { TemplateEngine } from '../_shared/notifications/template-engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per module

// In-memory rate limiting store (for MVP)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(moduleId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `rate_limit:${moduleId}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

function corsResponse(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Handle POST - Create notification (Direct Send)
 */
async function handleCreate(req: Request) {
  let event;
  try {
    event = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate notification event schema
  const validation = validateNotificationEvent(event);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check rate limiting
  const rateLimit = checkRateLimit(event.module_id);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded.',
        retry_after: rateLimit.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter)
        }
      }
    );
  }

  try {
    const templateEngine = new TemplateEngine();

    // Render template
    const renderedEmail = await templateEngine.render(
      event.template_id,
      event.variables
    );

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Notification System <notifications@atdawntech.com>',
        to: [event.recipient_email],
        subject: renderedEmail.subject,
        html: renderedEmail.html_body,
        text: renderedEmail.text_body
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email send failed:', emailResponse.status, errorText);
      throw new Error(`Resend API refused: ${emailResponse.statusText}`);
    }

    console.log('Email sent successfully to', event.recipient_email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        recipient: event.recipient_email
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  console.log('Request to:', url.pathname);

  // Allow flexible path handling for POST /v1/notifications or similar
  // We only support creating notifications now.

  try {
    // 1. Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse(new Response(
        JSON.stringify({ error: 'Authentication required.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return corsResponse(new Response(
        JSON.stringify({
          error: 'Invalid or expired JWT token.',
          details: authError?.message
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 2. Route Handling
    if (req.method === 'POST') {
      const response = await handleCreate(req);
      return corsResponse(response);
    }

    return corsResponse(new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST to trigger notification.' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('Unexpected error:', error);
    return corsResponse(new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
