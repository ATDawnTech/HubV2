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

    const { session_id, responses, proctor_summary } = await req.json();

    // Get session and assignment details
    const { data: session } = await supabase
      .from('test_sessions')
      .select(`
        *,
        test_assignments (
          id,
          template_id,
          test_templates (
            config_json
          )
        )
      `)
      .eq('id', session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (session.ended_at) {
      return new Response(JSON.stringify({ error: 'Test already submitted' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // End session
    await supabase
      .from('test_sessions')
      .update({
        ended_at: new Date().toISOString(),
        webcam_uptime_pct: proctor_summary.webcam_uptime_pct || 0,
        tab_switches: proctor_summary.tab_switches || 0,
        flags_json: proctor_summary.flags || {}
      })
      .eq('id', session_id);

    // Save responses
    const responseInserts = responses.map((response: any) => ({
      session_id,
      question_id: response.question_id,
      response_json: response.answer,
      submitted_at: new Date().toISOString()
    }));

    await supabase
      .from('test_responses')
      .insert(responseInserts);

    // Update assignment status
    await supabase
      .from('test_assignments')
      .update({ status: 'submitted' })
      .eq('id', session.test_assignments.id);

    // Trigger scoring (async)
    supabase.functions.invoke('test-score', {
      body: { session_id }
    }).catch(console.error);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Test submitted successfully. Results will be available shortly.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test submission error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});