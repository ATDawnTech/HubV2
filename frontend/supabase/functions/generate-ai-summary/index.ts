import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId } = await req.json();
    
    if (!candidateId) {
      throw new Error('Candidate ID is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching candidate data for:', candidateId);

    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabase
      .from('ats_candidates')
      .select('*')
      .eq('id', candidateId)
      .maybeSingle();

    if (candidateError) {
      console.error('Error fetching candidate:', candidateError);
      throw new Error('Failed to fetch candidate data');
    }
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Fetch applications and requisitions
    const { data: applications, error: applicationsError } = await supabase
      .from('applications')
      .select(`
        *,
        requisition:requisitions(
          id,
          title,
          description
        )
      `)
      .eq('candidate_id', candidateId);

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError);
      console.log('Continuing without applications data');
    }

    // Fetch interview feedback
    const { data: feedbacks, error: feedbackError } = await supabase
      .from('feedback')
      .select(`
        *,
        feedback_scores(*)
      `)
      .eq('candidate_id', candidateId);

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      console.log('Continuing without feedback data');
    }

    // Prepare data for AI prompt
    const jobTitle = applications?.[0]?.requisition?.title || 'Not specified';
    const jobDescription = applications?.[0]?.requisition?.description || 'Not available';
    const mustHaves = []; // Default empty array since column doesn't exist
    const resumeAnalysis = candidate.resume_analysis || {};
    const candidateName = candidate.full_name || 'Unknown';

    // Prepare interview feedbacks text
    let interviewFeedbacksText = 'No interview feedback available.';
    if (feedbacks && feedbacks.length > 0) {
      interviewFeedbacksText = feedbacks.map(feedback => {
        const scores = feedback.feedback_scores?.map((score: any) => 
          `${score.proficiency_name}: ${score.stars}/5`
        ).join(', ') || '';
        return `Interview Feedback: ${feedback.notes || 'No notes'}. Scores: ${scores}. Recommendation: ${feedback.recommendation || 'Not specified'}.`;
      }).join('\n\n');
    }

    // Fetch custom AI prompt from database
    const { data: promptData, error: promptError } = await supabase
      .from('ai_prompts')
      .select('system_prompt, user_prompt')
      .eq('prompt_type', 'ai_summary')
      .eq('is_default', true)
      .single();

    let systemPrompt = `You are a senior technical recruiter and interviewer. Produce a concise "Overall Assessment" plus a structured "Scorecard" and a "Detailed Narrative Analysis" for a candidate. Focus ONLY on technical fit. Exclude "About the company," "Benefits/Perks," culture blurbs, and other non-technical sections.

INPUTS
- job_title: ${jobTitle}
- job_description_raw: ${jobDescription}
- resume_text: Based on AI resume analysis
- ai_resume_review: ${JSON.stringify(resumeAnalysis)}
- interview_feedbacks: ${interviewFeedbacksText}
- must_have_requirements: ${JSON.stringify(mustHaves)}

INSTRUCTIONS
1) Parse JD and keep ONLY technical requirements/responsibilities (skills, tools, platforms, architectures, frameworks, certifications, domain constraints, experience bands). Discard About/Perks/etc.
2) Normalize skills & synonyms (e.g., "AKS" ≈ "Azure Kubernetes Service"; "IaC" ≈ "Terraform/Ansible/Pulumi" when explicitly present).
3) Cross-check evidence in this order of reliability: (a) resume_text, (b) interview_feedbacks, (c) ai_resume_review. If sources conflict, prefer interview > resume > AI review and note discrepancies.
4) Identify "must-have" coverage. If any must-have is absent or only weakly implied, set MustHaveRequirementsMatch.status = "Fail".
5) Use these assessment labels: **Exceeds Expectations | Meets Expectations | Partially Meets | Does Not Meet | Not Evidenced**.
6) Be specific and evidence-based. Quote brief fragments (≤25 words) or paraphrase with clear cues (e.g., "Resume: …", "Interview: …"). No personal or protected attributes.

SCORING MODEL
- Title Alignment (20%)
- Core Skills Alignment (40%)       # recency + hands-on matter more than keywords
- Experience Depth (20%)            # years, scope, scale, complexity, ownership
- Domain/Industry (10%)             # only if domain is stated in the technical JD
- Education/Certification (5%)      # relevant technical credentials only
- Location/Availability (5%)        # only if technically constraining (timezone/onsite)
Compute a composite percentage (0–100). If must-haves fail, cap ScorePercentage at 59.

OUTPUT FORMAT (MARKDOWN ONLY; FOLLOW THIS TEMPLATE)

Synopsis for ${candidateName}:
1. **Overall Assessment**  
<~120 words: crisp narrative of technical fit vs JD. Mention strengths, gaps, and whether a deeper technical round is recommended. Focus on architectures, platforms, frameworks, tooling, and measurable impact.>

2. **Scorecard: Candidate vs. Job Qualifications**

| Qualification                                    | Assessment            | Justification (tech-only)                                                                 | Found In                  |
|---                                               |---                    |---                                                                                        |---                        |
| Title/Role Alignment                             | <label>               | <1–2 lines on scope/seniority vs role>                                                   | Resume / Interview / AI   |
| Core Cloud/Platform Skills (<top JD skills>)     | <label>               | <e.g., AKS, Terraform, Azure networking; cite concrete usage/results>                    | Resume / Interview / AI   |
| Architecture & Design (scalability/security/cost)| <label>               | <hybrid patterns, CAF/LZ, DR, zero-trust/IAM, cost trade-offs>                           | Resume / Interview / AI   |
| Migration/Repatriation/Modernization             | <label>               | <migrations led, tools, runbooks, cutover strategies>                                     | Resume / Interview / AI   |
| DevOps/IaC/CI-CD/SRE                             | <label>               | <Terraform modules, GitOps, pipelines, observability SLIs/SLOs>                          | Resume / Interview / AI   |
| Security/Compliance/DR                           | <label>               | <IAM, secrets, backup/DR drills, policies/frameworks>                                     | Resume / Interview / AI   |
| Domain/Industry Relevance                        | <label>               | <only if technically relevant to JD>                                                     | Resume / Interview / AI   |
| Communication & Stakeholder Management (tech)    | <label>               | <ability to explain trade-offs, requirements to design translation>                       | Interview                 |

> Add/remove rows to mirror the JD's **technical** requirements. Keep labels from the allowed set.

3. **Detailed Narrative Analysis**
- **Quality of Inquiry:** <brief verdict; were clarifying questions and trade-off discussions strong? Evidence.>
- **Technical Correctness:** <were designs/answers correct and aligned with best practices? Evidence.>
- **Depth of Knowledge:** <where depth was solid vs superficial; examples of scale/impact.>
- **Opportunities for Improvement:**  
  - <gap 1>  
  - <gap 2>  
  - <gap 3>  
- **Recommendation:** **No-Hire | Maybe | Hire | Strong Hire | Exceptional**  
  <1–2 lines contextualizing the choice; if "Maybe," specify the focused next-round agenda.>

4. **Must-Have Requirements Match**
- **Status:** Pass | Fail  
- **Missing/Weak:** <list any must-haves absent or weakly evidenced>

5. **Scoring Summary**
- **ScorePercentage:** <0–100>  
- **Title Alignment:** <0–100>  
- **Core Skills Alignment:** <0–100>  
- **Experience Depth:** <0–100>  
- **Domain/Industry:** <0–100>  
- **Education/Certification:** <0–100>  
- **Location/Availability:** <0–100>

CONSTRAINTS
- Be concise, technical, and neutral. Avoid fluff.
- No non-technical/company/benefits content.
- Quote snippets ≤25 words each when used.
- If data is missing, write "Not Evidenced" or "Unknown"—do not invent.`;

    let userPrompt = `Please generate a comprehensive technical assessment for this candidate.`;

    // Use custom prompt if available
    if (promptData && !promptError) {
      // Replace placeholders in the custom prompt with actual data
      systemPrompt = promptData.system_prompt
        .replace('{jobTitle}', jobTitle)
        .replace('{jobDescription}', jobDescription)
        .replace('{resumeAnalysis}', JSON.stringify(resumeAnalysis))
        .replace('{interviewFeedbacksText}', interviewFeedbacksText)
        .replace('{mustHaveRequirements}', JSON.stringify(mustHaves));
      
      userPrompt = promptData.user_prompt || userPrompt;
    } else {
      console.log('Using default prompt, custom prompt not found or error:', promptError);
    }

    console.log('Calling OpenAI API...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiSummary = data.choices[0].message.content;

    console.log('AI Summary generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      summary: aiSummary,
      candidateName 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-summary function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});