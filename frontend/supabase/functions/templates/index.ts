/**
 * Templates API v1
 * 
 * RESTful API for email template management
 * 
 * GET /v1/templates - List all templates (with filters)
 * GET /v1/templates/:id - Get specific template
 * POST /v1/templates - Create new template (admin only)
 * PUT /v1/templates/:id - Update template (creates new version, admin only)
 * DELETE /v1/templates/:id - Soft delete template (admin only)
 * POST /v1/templates/:id/preview - Preview template with sample data
 * GET /v1/templates/:id/versions - Get template version history
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { createClient } from '@supabase/supabase-js';
import { TemplateEngine } from '../_shared/notifications/template-engine.ts';
import { isValidModuleId } from '../_shared/notifications/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Extract template ID from URL path
 */
function extractTemplateId(url: string): string | null {
  // URL format: /v1/templates/:id or /v1/templates/:id/preview or /v1/templates/:id/versions
  // Relaxed regex to handle local paths that might lack /v1/
  const match = url.match(/templates\/([^/?]+)/);
  return match ? match[1] : null;
}

/**
 * Check if URL is for preview endpoint
 */
function isPreviewEndpoint(url: string): boolean {
  return url.includes('/preview');
}

/**
 * Check if URL is for versions endpoint
 */
function isVersionsEndpoint(url: string): boolean {
  return url.includes('/versions');
}

/**
 * Check if user is admin by querying the profiles table
 * 
 * This checks the `role` column in the profiles table, which uses the `user_role` enum.
 * Valid roles: 'admin', 'staff', 'hr', 'finance'
 */
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  console.log('Checking admin status for user_id:', userId);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile for admin check:', error);
    return false;
  }

  const isUserAdmin = profile?.role === 'admin';
  console.log('Admin check result:', { userId, role: profile?.role, isAdmin: isUserAdmin });

  return isUserAdmin;
}

/**
 * Validate template creation/update request
 */
function validateTemplateRequest(body: any, isUpdate: boolean = false): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!isUpdate && (!body.template_id || typeof body.template_id !== 'string')) {
    errors.push('template_id is required and must be a string');
  }

  if (!body.name || typeof body.name !== 'string') {
    errors.push('name is required and must be a string');
  }

  if (!body.module_id || typeof body.module_id !== 'string') {
    errors.push('module_id is required and must be a string');
  } else if (!isValidModuleId(body.module_id)) {
    errors.push('module_id must be one of: onboarding, ats, asset_management');
  }

  if (!body.notification_type || typeof body.notification_type !== 'string') {
    errors.push('notification_type is required and must be a string');
  }

  if (!body.subject_template || typeof body.subject_template !== 'string') {
    errors.push('subject_template is required and must be a string');
  }

  if (!body.html_body_template || typeof body.html_body_template !== 'string') {
    errors.push('html_body_template is required and must be a string');
  }

  if (!body.text_body_template || typeof body.text_body_template !== 'string') {
    errors.push('text_body_template is required and must be a string');
  }

  if (body.variables !== undefined && (typeof body.variables !== 'object' || Array.isArray(body.variables))) {
    errors.push('variables must be an object');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Handle GET /v1/templates - List templates
 */
async function handleList(supabase: any, url: URL) {
  const moduleId = url.searchParams.get('module_id');
  const notificationType = url.searchParams.get('notification_type');
  const isActive = url.searchParams.get('is_active');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = supabase
    .from('email_templates')
    .select('id, template_id, name, description, module_id, notification_type, version, is_active, created_at, updated_at', { count: 'exact' });

  // Apply filters
  if (moduleId) {
    query = query.eq('module_id', moduleId);
  }

  if (notificationType) {
    query = query.eq('notification_type', notificationType);
  }

  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true');
  }

  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching templates:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch templates',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      templates: data || [],
      total: count || 0,
      limit,
      offset
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle GET /v1/templates/:id - Get specific template
 */
async function handleGet(supabase: any, templateId: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_id', templateId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({
          error: 'Template not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.error('Error fetching template:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch template',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle POST /v1/templates - Create template
 */
async function handleCreate(supabase: any, userId: string, body: any) {
  // Validate request
  const validation = validateTemplateRequest(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        errors: validation.errors
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Check if template_id already exists
  const { data: existing } = await supabase
    .from('email_templates')
    .select('template_id')
    .eq('template_id', body.template_id)
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'Template with this template_id already exists. Use PUT to update.'
      }),
      {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Create template
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      template_id: body.template_id,
      name: body.name,
      description: body.description || null,
      module_id: body.module_id,
      notification_type: body.notification_type,
      subject_template: body.subject_template,
      html_body_template: body.html_body_template,
      text_body_template: body.text_body_template,
      variables: body.variables || {},
      version: 1,
      is_active: true,
      created_by: userId
    })
    .select('id, template_id, version, created_at')
    .single();

  if (error) {
    console.error('Error creating template:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create template',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify(data),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle PUT /v1/templates/:id - Update template (creates new version)
 */
async function handleUpdate(supabase: any, userId: string, templateId: string, body: any) {
  // Validate request
  const validation = validateTemplateRequest(body, true);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        errors: validation.errors
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Get current active version
  const { data: current, error: fetchError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_id', templateId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return new Response(
        JSON.stringify({
          error: 'Template not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.error('Error fetching current template:', fetchError);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch current template',
        details: fetchError.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const newVersion = current.version + 1;

  // Mark current version as inactive
  const { error: deactivateError } = await supabase
    .from('email_templates')
    .update({ is_active: false })
    .eq('id', current.id);

  if (deactivateError) {
    console.error('Error deactivating old version:', deactivateError);
    return new Response(
      JSON.stringify({
        error: 'Failed to deactivate old version',
        details: deactivateError.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Create new version
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      template_id: templateId,
      name: body.name,
      description: body.description || null,
      module_id: body.module_id,
      notification_type: body.notification_type,
      subject_template: body.subject_template,
      html_body_template: body.html_body_template,
      text_body_template: body.text_body_template,
      variables: body.variables || {},
      version: newVersion,
      is_active: true,
      created_by: userId
    })
    .select('id, template_id, version, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error creating new version:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create new version',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      ...data,
      previous_version: current.version
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle DELETE /v1/templates/:id - Soft delete template
 */
async function handleDelete(supabase: any, templateId: string) {
  // Mark all versions as inactive
  const { data, error } = await supabase
    .from('email_templates')
    .update({ is_active: false })
    .eq('template_id', templateId)
    .select('id, template_id, version')
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({
          error: 'Template not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.error('Error deleting template:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete template',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      id: data.id,
      template_id: data.template_id,
      is_active: false,
      deleted_at: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle POST /v1/templates/:id/preview - Preview template
 */
async function handlePreview(supabase: any, templateId: string, body: any) {
  if (!body.variables || typeof body.variables !== 'object') {
    return new Response(
      JSON.stringify({
        error: 'variables object is required for preview'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Get active template
  const { data: template, error: fetchError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_id', templateId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return new Response(
        JSON.stringify({
          error: 'Template not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.error('Error fetching template:', fetchError);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch template',
        details: fetchError.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Render template with provided variables
  try {
    const templateEngine = new TemplateEngine();
    const rendered = await templateEngine.renderFromTemplate(
      template,
      body.variables
    );

    return new Response(
      JSON.stringify(rendered),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error rendering template:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to render template',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle GET /v1/templates/:id/versions - Get version history
 */
async function handleVersions(supabase: any, templateId: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, version, is_active, created_at, updated_at, created_by')
    .eq('template_id', templateId)
    .order('version', { ascending: false });

  if (error) {
    console.error('Error fetching versions:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch versions',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  if (!data || data.length === 0) {
    return new Response(
      JSON.stringify({
        error: 'Template not found'
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      template_id: templateId,
      versions: data
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Helper to add CORS headers to response
 */
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

// Edge Function handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Debug log for URL parsing
  console.log('Request to:', url.pathname);

  // Allow flexible path handling, removed strict /v1/ check
  // if (!url.pathname.startsWith('/v1/')) { ... }

  const templateId = extractTemplateId(url.pathname);
  const isPreview = isPreviewEndpoint(url.pathname);
  const isVersions = isVersionsEndpoint(url.pathname);

  try {
    // Get the current user from the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required. Provide a valid JWT token in Authorization header.'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify token using the global supabase client (Service Role)
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired JWT token.',
          details: authError?.message || 'User not found'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let response: Response;

    // Route handling
    if (req.method === 'GET' && !templateId) {
      response = await handleList(supabase, url);
    } else if (req.method === 'GET' && templateId && isVersions) {
      response = await handleVersions(supabase, templateId);
    } else if (req.method === 'GET' && templateId && !isPreview && !isVersions) {
      response = await handleGet(supabase, templateId);
    } else if (req.method === 'POST' && templateId && isPreview) {
      let body;
      try {
        body = await req.json();
        response = await handlePreview(supabase, templateId, body);
      } catch (e) {
        response = new Response(
          JSON.stringify({ error: 'Invalid JSON in request body.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Check admin permission for write operations
      const userIsAdmin = await isAdmin(supabase, user.id);

      if (!userIsAdmin && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
        response = new Response(
          JSON.stringify({
            error: 'Admin permission required for this operation.'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } else if (req.method === 'POST' && !templateId) {
        // Create
        let body;
        try {
          body = await req.json();
          response = await handleCreate(supabase, user.id, body);
        } catch (e) {
          response = new Response(
            JSON.stringify({ error: 'Invalid JSON in request body.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else if (req.method === 'PUT' && templateId && !isPreview && !isVersions) {
        // Update
        let body;
        try {
          body = await req.json();
          response = await handleUpdate(supabase, user.id, templateId, body);
        } catch (e) {
          response = new Response(
            JSON.stringify({ error: 'Invalid JSON in request body.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else if (req.method === 'DELETE' && templateId) {
        // Delete
        response = await handleDelete(supabase, templateId);
      } else {
        // Method not allowed
        response = new Response(
          JSON.stringify({
            error: 'Method not allowed'
          }),
          {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return corsResponse(response);

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
