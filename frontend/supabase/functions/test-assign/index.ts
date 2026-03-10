import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'npm:resend@4.0.0';
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { TestInviteEmail } from './_templates/test-invite.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check ATS role permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('ats_role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.ats_role || !['ADMIN', 'TA_ADMIN'].includes(profile.ats_role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { candidate_id, template_id, application_id } = await req.json();

    // Get candidate details
    const { data: candidate } = await supabase
      .from('ats_candidates')
      .select('full_name, email')
      .eq('id', candidate_id)
      .single();

    if (!candidate) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get template details
    const { data: template } = await supabase
      .from('test_templates')
      .select('name, config_json')
      .eq('id', template_id)
      .single();

    if (!template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate invite token
    const { data: tokenData, error: tokenError } = await supabase.rpc('generate_test_invite_token');
    if (tokenError || !tokenData) {
      console.error('Token generation error:', tokenError);
      throw new Error('Failed to generate invite token');
    }
    const inviteToken = tokenData;

    // Safely parse template config
    const templateConfig = typeof template.config_json === 'string'
      ? (() => { try { return JSON.parse(template.config_json); } catch { return {}; } })()
      : (template.config_json || {});

    // Calculate expiry date
    const expiryHours = Number(templateConfig.expiry_hours) || 120;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Create test assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('test_assignments')
      .insert({
        candidate_id,
        application_id,
        template_id,
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Assignment creation error:', assignmentError);
      return new Response(JSON.stringify({ error: 'Failed to create assignment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email
    const resend = new Resend(resendApiKey);
    // Get the site URL from environment or fallback to the Lovable app domain (frontend)
    const rawSiteUrl = Deno.env.get('SITE_URL') || 'https://wfxpuzgtqbmobfyakcrg.lovable.app';
    const siteUrl = rawSiteUrl.replace(/\/+$/, '');
    const testLink = `${siteUrl}/test/${encodeURIComponent(inviteToken)}`;

    // Use email template from config or default
    const emailConfig = (templateConfig as any).email || {};
    const subject = emailConfig.invite_subject?.replace('{{template_name}}', template.name) || 
                   `Your AT Dawn test: ${template.name}`;

    const html = await renderAsync(
      React.createElement(TestInviteEmail, {
        candidateName: candidate.full_name,
        testName: template.name,
        testLink,
        expiryDate: expiresAt.toLocaleDateString(),
        duration: Number((templateConfig as any).duration_minutes) || 45
      })
    );

    const { error: emailError } = await resend.emails.send({
      from: 'AT Dawn Technologies <tests@atdawntech.com>',
      to: [candidate.email],
      subject,
      html,
    });

    if (emailError) {
      console.error('Email error:', emailError);
      // Don't fail the assignment if email fails, just log it
    }

    // Update assignment with sent timestamp
    await supabase
      .from('test_assignments')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('id', assignment.id);

    return new Response(JSON.stringify({ 
      success: true, 
      assignment_id: assignment.id,
      test_link: testLink 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test assignment error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});