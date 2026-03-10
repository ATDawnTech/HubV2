import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Manual interview status check triggered...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let candidateId: string | undefined;
    try {
      const body = await req.json();
      candidateId = body?.candidateId;
    } catch (_) {}

    // Call the auto-update function directly
    const { data, error } = await supabase.functions.invoke('auto-update-interview-status', {
      body: { candidateId }
    });

    if (error) {
      console.error('Error calling auto-update function:', error);
      throw error;
    }

    console.log('Manual interview status check completed:', data);

    return new Response(
      JSON.stringify({ 
        message: 'Manual interview status check completed successfully',
        result: data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in manual interview status check:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to run manual interview status check'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});