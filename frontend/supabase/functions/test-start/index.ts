import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { token } = await req.json();

    // Validate token and get assignment
    const { data: assignment } = await supabase
      .from('test_assignments')
      .select(`
        *,
        test_templates (
          name,
          config_json
        ),
        ats_candidates (
          full_name,
          email
        )
      `)
      .eq('invite_token', token)
      .gte('expires_at', new Date().toISOString())
      .in('status', ['assigned', 'started'])
      .single();

    if (!assignment) {
      return new Response(JSON.stringify({ error: 'Invalid or expired test link' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if test is already started
    const { data: existingSession } = await supabase
      .from('test_sessions')
      .select('id, started_at, ended_at')
      .eq('assignment_id', assignment.id)
      .single();

    if (existingSession && existingSession.ended_at) {
      return new Response(JSON.stringify({ error: 'Test already completed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Start or resume session
    let sessionId = existingSession?.id;
    
    if (!existingSession) {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('test_sessions')
        .insert({
          assignment_id: assignment.id,
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return new Response(JSON.stringify({ error: 'Failed to start test session' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      sessionId = newSession.id;

      // Update assignment status
      await supabase
        .from('test_assignments')
        .update({ status: 'started' })
        .eq('id', assignment.id);
    }

    // Return test data
    const testData = {
      session_id: sessionId,
      assignment_id: assignment.id,
      candidate_name: assignment.ats_candidates.full_name,
      test_name: assignment.test_templates.name,
      config: assignment.test_templates.config_json,
      duration_minutes: assignment.test_templates.config_json.duration_minutes || 45,
      questions: assignment.test_templates.config_json.question_bank || [],
      started_at: existingSession?.started_at || new Date().toISOString(),
      expires_at: assignment.expires_at
    };

    return new Response(JSON.stringify({ success: true, test: testData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test start error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});