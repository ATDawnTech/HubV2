/**
 * Preferences API v1
 * 
 * RESTful API for user notification preferences (user-scoped)
 * 
 * GET /v1/preferences - Get authenticated user's preferences
 * PUT /v1/preferences - Update authenticated user's preference
 * 
 * User ID is extracted from JWT token for security.
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

import { createClient } from '@supabase/supabase-js';
import { ModuleId } from '../_shared/notifications/types.ts';
import { isValidModuleId } from '../_shared/notifications/validation.ts';

/**
 * Extract JWT token from Authorization header
 */
function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Initialize default preferences for a user
 */
async function initializeDefaultPreferences(supabase: any, userId: string) {
  const modules = Object.values(ModuleId);
  const defaultPreferences = modules.map(moduleId => ({
    user_id: userId,
    module_id: moduleId,
    enabled: true
  }));

  const { error } = await supabase
    .from('notification_preferences')
    .insert(defaultPreferences);

  if (error) {
    console.error('Error initializing default preferences:', error);
    throw new Error(`Failed to initialize preferences: ${error.message}`);
  }

  return defaultPreferences;
}

/**
 * Validate preference update request
 */
function validatePreferenceUpdate(body: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!body.module_id || typeof body.module_id !== 'string') {
    errors.push('module_id is required and must be a string');
  } else if (!isValidModuleId(body.module_id)) {
    errors.push('module_id must be one of: onboarding, ats, asset_management');
  }

  if (body.enabled === undefined || typeof body.enabled !== 'boolean') {
    errors.push('enabled is required and must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Handle GET request - retrieve all preferences
 */
async function handleGet(supabase: any, userId: string) {
  // Get user preferences
  const { data: preferences, error: prefError } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId);

  if (prefError) {
    console.error('Error fetching preferences:', prefError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch preferences.',
        details: prefError.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // If no preferences exist, initialize defaults
  if (!preferences || preferences.length === 0) {
    console.log(`No preferences found for user ${userId}, initializing defaults`);
    const defaultPrefs = await initializeDefaultPreferences(supabase, userId);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        preferences: defaultPrefs,
        message: 'Default preferences initialized'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Return existing preferences
  return new Response(
    JSON.stringify({ 
      success: true,
      preferences: preferences
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle PUT request - update preference
 */
async function handleUpdate(supabase: any, userId: string, body: any) {
  // Validate request
  const validation = validatePreferenceUpdate(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Validation failed',
        errors: validation.errors 
      }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Check if preference exists
  const { data: existing, error: checkError } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('module_id', body.module_id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing preference:', checkError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to check existing preference.',
        details: checkError.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  let result;
  if (existing) {
    // Update existing preference
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({ 
        enabled: body.enabled,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('module_id', body.module_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating preference:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update preference.',
          details: error.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    result = data;
  } else {
    // Create new preference
    const { data, error } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        module_id: body.module_id,
        enabled: body.enabled
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating preference:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create preference.',
          details: error.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    result = data;
  }

  // Return success response
  return new Response(
    JSON.stringify({ 
      success: true,
      preference: result,
      message: 'Preference updated successfully'
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

Deno.serve(async (req) => {
  // Only allow GET and PUT requests
  if (!['GET', 'PUT'].includes(req.method)) {
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed. Use GET or PUT.' 
      }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization');
    const token = extractToken(authHeader);

    if (!token) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required. Provide a valid JWT token in Authorization header.' 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the token and get user
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired JWT token.' 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Use authenticated user's ID (secure, user-scoped)
    const userId = user.id;

    // Handle GET request
    if (req.method === 'GET') {
      return await handleGet(supabase, userId);
    }

    // Handle PUT request
    if (req.method === 'PUT') {
      // Parse request body
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid JSON in request body.' 
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return await handleUpdate(supabase, userId, body);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
