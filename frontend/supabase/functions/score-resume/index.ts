import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function extractJson(text: string): any {
  console.log('ExtractJson input length:', text.length);
  console.log('ExtractJson input preview:', text.substring(0, 500));
  
  try { 
    const parsed = JSON.parse(text);
    console.log('Direct JSON parse successful');
    return parsed;
  } catch (directError) {
    console.log('Direct parse failed:', directError.message);
  }
  
  // Try to find the first JSON object in the text
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  console.log('JSON braces found at:', firstBrace, lastBrace);
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    console.log('Extracted candidate JSON preview:', candidate.substring(0, 200));
    try { 
      const parsed = JSON.parse(candidate);
      console.log('Extracted JSON parse successful');
      return parsed;
    } catch (extractError) {
      console.log('Extracted parse failed:', extractError.message);
    }
  }
  
  console.error('All JSON parsing attempts failed for text:', text);
  throw new Error('Model did not return valid JSON');
}

// Simple keyword extraction
function extractKeywords(text: string): string[] {
  const stop = new Set(['the','and','for','with','from','that','this','have','has','are','was','were','will','shall','into','your','you','our','their','about','over','under','into','than','then','but','not','all','any','can','able','years','experience','responsibilities','requirements','skills','role','job','developer','engineer']);
  const words = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+.#\-\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stop.has(w));
  // Deduplicate while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) { if (!seen.has(w)) { seen.add(w); out.push(w); } }
  return out.slice(0, 500);
}

function heuristicAnalysis(resume: string, jobTitle: string, jobDesc: string) {
  const resumeL = (resume || '').toLowerCase();
  const jobTitleL = (jobTitle || '').toLowerCase();
  const jdKeywords = extractKeywords(jobDesc);
  const resumeKeywords = extractKeywords(resume);
  const resumeSet = new Set(resumeKeywords);
  const matched = jdKeywords.filter(k => resumeSet.has(k));
  const matchRatio = jdKeywords.length ? (matched.length / jdKeywords.length) : 0;

  // Title alignment
  const titleTokens = extractKeywords(jobTitle);
  const titleHits = titleTokens.filter(t => resumeSet.has(t));
  const titleAlignment = Math.min(100, Math.round((titleHits.length / Math.max(1, titleTokens.length)) * 100));

  // Core skills
  const coreSkills = Math.min(100, Math.round(matchRatio * 100));

  // Experience depth proxy: count of years mentioned and seniority words
  const yearsMatches = resumeL.match(/\b(\d{1,2})\s*(\+|\b)\s*(years?|yrs?)\b/g) || [];
  const seniorityHits = (resumeL.match(/lead|senior|principal|architect|manager/g) || []).length;
  const experienceDepth = Math.min(100, yearsMatches.length * 10 + seniorityHits * 10);

  // Domain proxy from JD keywords appearing like fintech, retail, ai, data, cloud
  const domainHits = (resumeL.match(/fintech|banking|retail|ecommerce|healthcare|telecom|adtech|cloud|data|ai|ml|genai|llm/g) || []).length;
  const domainFit = Math.min(100, domainHits * 15);

  // Education cert proxy
  const eduHits = (resumeL.match(/b\.?tech|m\.?tech|ms\b|phd|bachelor|master|aws\s+cert|azure\s+cert|gcp\s+cert|pmp|csm|cka|ckad/g) || []).length;
  const eduCert = Math.min(100, eduHits * 20);

  // Location availability proxy
  const locationFit = (resumeL.includes('remote') || resumeL.includes('india') || resumeL.includes('hyderabad') || resumeL.includes('bangalore')) ? 70 : 40;

  // Keywords & structures proxy
  const methodsHits = (resumeL.match(/iac|terraform|ansible|cicd|ci\/cd|docker|kubernetes|k8s|microservices|rest|graphql|fastapi|django|flask|langchain|langgraph/g) || []).length;
  const keywordsStructures = Math.min(100, Math.round((methodsHits / 10) * 100));

  const weights = { title: 0.20, skills: 0.35, exp: 0.20, domain: 0.10, edu: 0.05, loc: 0.05, kw: 0.05 };
  let overall = Math.round(
    titleAlignment * weights.title +
    coreSkills * weights.skills +
    experienceDepth * weights.exp +
    domainFit * weights.domain +
    eduCert * weights.edu +
    locationFit * weights.loc +
    keywordsStructures * weights.kw
  );

  const mustHavesMissing: string[] = [];
  if (matchRatio < 0.2) mustHavesMissing.push('Insufficient skill overlap');
  if (titleAlignment < 20) mustHavesMissing.push('Title alignment too weak');
  let decision: 'Yes' | 'Maybe' | 'No' = 'Maybe';
  if (mustHavesMissing.length) {
    overall = Math.min(overall, 59);
    decision = 'No';
  } else if (overall >= 75) decision = 'Yes';
  else if (overall < 60) decision = 'No';

  const analysis = {
    overall_score: overall,
    decision,
    reason_summary: mustHavesMissing.length ? 'Heuristic: gaps against JD must-haves. See factors.' : 'Heuristic: resume shows partial-to-strong alignment with JD. See factors.',
    factors: [
      { name: 'title_alignment', score: titleAlignment, evidence: titleHits.slice(0,3), analysis: `Matched ${titleHits.length}/${titleTokens.length} title tokens.` },
      { name: 'core_skills', score: coreSkills, matched_skills: matched.slice(0, 20), missing_skills: jdKeywords.filter(k => !resumeSet.has(k)).slice(0, 20), evidence: matched.slice(0,5), analysis: `Skill overlap ${(matchRatio*100).toFixed(0)}%.` },
      { name: 'experience_depth', score: experienceDepth, years_relevant: yearsMatches.length ? Math.max(...(resumeL.match(/\b\d{1,2}\b/g)?.map(n=>Number(n)) || [0])) : undefined, impact_examples: [], evidence: [], analysis: 'Proxy based on years and seniority mentions.' },
      { name: 'domain_industry', score: domainFit, domains_matched: ['heuristic'], evidence: [], analysis: 'Proxy based on domain keyword mentions.' },
      { name: 'education_cert', score: eduCert, relevant: [], evidence: [], analysis: 'Proxy based on degree/cert keywords.' },
      { name: 'location_availability', score: locationFit, notes: 'Heuristic location/remote fit', evidence: [], analysis: 'Proxy from location keywords.' },
      { name: 'keywords_structures', score: keywordsStructures, keywords_hit: [], evidence: [], analysis: 'Proxy from tooling/methodology keywords.' },
    ],
    must_haves: { status: mustHavesMissing.length ? 'fail' : 'pass', missing: mustHavesMissing, analysis: 'Heuristic must-have evaluation.' },
    risk_flags: [],
    summary_analysis: 'Heuristic summary based on keyword overlap, title alignment, and experience proxies.',
    key_strengths: matched.slice(0,5),
    key_weaknesses: jdKeywords.filter(k => !resumeSet.has(k)).slice(0,5),
    metadata: { resume_parsed_ok: !!resume, resume_language: 'en', parser_notes: 'Heuristic used due to JSON parse failure' }
  };
  return analysis;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) throw new Error('Missing OPENAI_API_KEY secret');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase service credentials');

    const { candidateId, resumeText, jobTitle, jobDescription } = await req.json();

    // Validate required params (allow empty resumeText and handle with fallback)
    if (!candidateId || !jobTitle || !jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: candidateId, jobTitle, jobDescription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Try to get the actual resume content from the candidate if resumeText is placeholder/empty
    let actualResumeText = resumeText;
    
    if (!resumeText || resumeText.trim().length < 50 || 
        resumeText.includes('Resume uploaded - analyze from file') ||
        resumeText.includes('Recalculate on demand') ||
        resumeText.includes('Resume parsing failed')) {
      
      console.log('Getting resume content from database for candidate:', candidateId);
      
      // Fetch candidate data to get the actual resume text
      const { data: candidateData, error: candidateError } = await supabase
        .from('ats_candidates')
        .select('resume_text, resume_url')
        .eq('id', candidateId)
        .single();
        
      if (candidateError) {
        console.error('Error fetching candidate data:', candidateError);
      } else if (candidateData?.resume_text && candidateData.resume_text.trim().length > 50) {
        actualResumeText = candidateData.resume_text;
        console.log('Found resume text in database, length:', actualResumeText.length);
      } else {
        console.log('No valid resume text found in database');
      }
    }

    // Normalize resume text with safe fallback when empty
    const safeResume: string = (typeof actualResumeText === 'string' ? actualResumeText : '')?.trim();
    
    console.log('Resume text length:', safeResume.length);
    console.log('Resume text preview:', safeResume.substring(0, 200));
    
    if (!safeResume || safeResume.length < 50) {
      console.warn('Resume text is too short or empty, using fallback message');
      // Use a more descriptive fallback that won't confuse the AI
    }

    // Always include timestamp to force recalculation on every resume upload
    const requestHash = await sha256Hex(`${jobTitle}|${jobDescription}|${safeResume}|${Date.now()}`);
    const { data: existingCandidate, error: fetchErr } = await supabase
      .from('ats_candidates')
      .select('resume_analysis, last_scored_at')
      .eq('id', candidateId)
      .single();

    if (fetchErr) {
      console.error('Error fetching candidate for idempotency:', fetchErr);
    }

    // Skip idempotency check for fresh scoring - always recalculate
    console.log('Scoring resume for candidate (fresh calculation):', candidateId);

    // Concise structured prompt focusing only on technical requirements
    const systemPrompt = `You are a technical recruiter evaluating resume-job fit. Return ONLY valid JSON.

SCORING WEIGHTS: Title 20%, Skills 40%, Experience 20%, Domain 10%, Education 5%, Location 5%

REQUIRED JSON OUTPUT:
{
  "ScorePercentage": 0,
  "Summary": "≤40 words on fit/gaps",
  "Recommendation": "Strong Yes|Yes|Maybe|No",
  "TitleAlignment": {"score": 0, "evidence": ["roles"]},
  "CoreSkillsAlignment": {"score": 0, "matched_skills": ["..."], "missing_skills": ["..."], "evidence": ["..."]},
  "ExperienceDepth": {"score": 0, "years_relevant": 0, "impact_examples": ["..."]},
  "DomainIndustry": {"score": 0, "domains_matched": ["..."], "notes": "brief"},
  "EducationCertification": {"score": 0, "relevant": ["..."], "notes": "brief"},
  "LocationAvailability": {"score": 0, "notes": "brief"},
  "OverallSummary": "≤80 words tech-focused narrative",
  "MustHaveRequirementsMatch": {"status": "Pass|Fail", "missing": ["..."]}
}

RULES:
- Extract must-haves from JD tech requirements only
- If any must-have missing: set status "Fail", cap ScorePercentage ≤59
- Use evidence from resume, don't guess
- Return ONLY the JSON object, no other text`;

    // Enhanced filtering to remove non-technical sections from job description
    const filteredJobDescription = jobDescription
      // Remove about company sections (more comprehensive)
      .replace(/(?:^|\n)\s*(?:about\s+(?:the\s+)?company|company\s+overview|about\s+us|who\s+we\s+are|our\s+company|company\s+description|company\s+background|about\s+our\s+organization)[\s\S]*?(?=(?:\n\s*(?:[A-Z][^:\n]*:|$))|$)/gi, '')
      // Remove benefits and compensation sections
      .replace(/(?:^|\n)\s*(?:benefits?|perks?|what\s+we\s+offer|compensation|package|salary|why\s+join\s+us|why\s+work\s+with\s+us|what\s+you\s+get|employee\s+benefits|total\s+compensation)[\s\S]*?(?=(?:\n\s*(?:[A-Z][^:\n]*:|$))|$)/gi, '')
      // Remove culture and environment sections
      .replace(/(?:^|\n)\s*(?:culture|work\s+environment|team\s+dynamics|company\s+culture|our\s+culture|values|mission|vision|working\s+style)[\s\S]*?(?=(?:\n\s*(?:[A-Z][^:\n]*:|$))|$)/gi, '')
      // Remove non-technical fluff and marketing content
      .replace(/(?:^|\n)\s*(?:equal\s+opportunity|diversity|inclusion|we\s+are\s+committed|we\s+believe|join\s+our|be\s+part\s+of|eeo|equal\s+employment)[\s\S]*?(?=(?:\n\s*(?:[A-Z][^:\n]*:|$))|$)/gi, '')
      // Focus only on requirements, responsibilities, qualifications, skills
      .split(/\n+/)
      .filter(line => {
        const lowerLine = line.toLowerCase().trim();
        // Skip obvious non-technical lines
        if (lowerLine.includes('about the company') || 
            lowerLine.includes('company overview') ||
            lowerLine.includes('about us') ||
            lowerLine.includes('why join') ||
            lowerLine.includes('benefits') ||
            lowerLine.includes('perks') ||
            lowerLine.includes('culture') ||
            lowerLine.includes('values') ||
            lowerLine.includes('mission')) {
          return false;
        }
        
        // Keep lines that contain technical requirements
        return lowerLine.includes('requirement') || 
               lowerLine.includes('qualification') || 
               lowerLine.includes('skill') || 
               lowerLine.includes('experience') || 
               lowerLine.includes('knowledge') || 
               lowerLine.includes('responsibilit') || 
               lowerLine.includes('must have') || 
               lowerLine.includes('should have') || 
               lowerLine.includes('you will') || 
               lowerLine.includes('you\'ll') ||
               lowerLine.includes('preferred') ||
               lowerLine.includes('required') ||
               // Keep technical terms
               /\b(javascript|typescript|react|node|python|java|sql|aws|azure|docker|kubernetes|git|api|database|microservices|agile|scrum|ci\/cd|devops|ml|ai|data|analytics|frontend|backend|fullstack|cloud|security|testing|automation|framework|library|programming|development|engineering|architecture|design|implementation)\b/i.test(lowerLine) ||
               // Keep bullet points and numbered lists that might contain requirements
               /^\s*[-•*]\s/.test(line) || /^\s*\d+[\.\)]\s/.test(line);
      })
      .join('\n')
      .trim();
      
    console.log('Original JD length:', jobDescription.length);
    console.log('Filtered JD length:', filteredJobDescription.length);
    console.log('Filtered JD preview:', filteredJobDescription.substring(0, 300));

    const finalUserContent = `JOB: ${jobTitle}\n\nREQUIREMENTS:\n${(filteredJobDescription || jobDescription).substring(0, 1500)}\n\nRESUME:\n${(safeResume || 'No resume available').substring(0, 2000)}\n\nReturn JSON only.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Switch to GPT-4.1 which doesn't use reasoning tokens
        messages: [
          { role: 'system', content: 'You are a technical recruiter scoring resume-job fit. Return ONLY valid JSON with exact format: {"ScorePercentage":85,"Summary":"brief fit","Recommendation":"Yes","TitleAlignment":{"score":85,"evidence":[]},"CoreSkillsAlignment":{"score":75,"matched_skills":[],"missing_skills":[],"evidence":[]},"ExperienceDepth":{"score":80,"years_relevant":5,"impact_examples":[]},"DomainIndustry":{"score":70,"domains_matched":[],"notes":""},"EducationCertification":{"score":60,"relevant":[],"notes":""},"LocationAvailability":{"score":50,"notes":""},"OverallSummary":"technical assessment","MustHaveRequirementsMatch":{"status":"Pass","missing":[]}}' },
          { role: 'user', content: finalUserContent }
        ],
        max_tokens: 1500, // Use max_tokens for GPT-4.1
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze resume with OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response data:', JSON.stringify(openAIData, null, 2));
    const message = openAIData.choices?.[0]?.message;
    console.log('Message content type:', typeof message?.content);
    console.log('Message content preview:', message?.content?.substring(0, 200));

    let analysis: any | null = null;
    try {
      if (message?.parsed) {
        console.log('Using parsed response');
        analysis = message.parsed;
      } else if (typeof message?.content === 'string' && message.content.trim()) {
        console.log('Attempting to parse content as JSON');
        // Add more robust JSON extraction
        let content = message.content.trim();
        
        // Remove any markdown code blocks
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try direct parse first
        try {
          analysis = JSON.parse(content);
          console.log('Successfully parsed JSON directly');
        } catch (directParseError) {
          console.log('Direct parse failed, trying extractJson');
          analysis = extractJson(content);
        }
      } else {
        console.error('Message content is empty or not a string:', typeof message?.content, 'Length:', message?.content?.length);
        console.log('OpenAI finish reason:', openAIData.choices?.[0]?.finish_reason);
        
        // Handle case where OpenAI hits token limit or returns empty content
        if (openAIData.choices?.[0]?.finish_reason === 'length') {
          console.warn('OpenAI hit token limit, using fallback analysis');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw content that failed to parse:', message?.content);
    }

    if (!analysis) {
      console.warn('OpenAI JSON missing or unparsable, using heuristic fallback');
      analysis = heuristicAnalysis(safeResume, jobTitle, jobDescription);
    }

    // Transform the analysis to match frontend expectations
    const transformedAnalysis = {
      overall_score: analysis.ScorePercentage || analysis.overall_score || 0,
      decision: analysis.Recommendation || analysis.decision || 'No',
      reason_summary: analysis.Summary || analysis.reason_summary || 'Analysis completed',
      factors: [
        {
          name: 'title_alignment',
          score: analysis.TitleAlignment?.score || 0,
          evidence: analysis.TitleAlignment?.evidence || [],
          analysis: 'Title alignment analysis'
        },
        {
          name: 'core_skills',
          score: analysis.CoreSkillsAlignment?.score || 0,
          matched_skills: analysis.CoreSkillsAlignment?.matched_skills || [],
          missing_skills: analysis.CoreSkillsAlignment?.missing_skills || [],
          evidence: analysis.CoreSkillsAlignment?.evidence || [],
          analysis: 'Core skills analysis'
        },
        {
          name: 'experience_depth',
          score: analysis.ExperienceDepth?.score || 0,
          years_relevant: analysis.ExperienceDepth?.years_relevant || 0,
          impact_examples: analysis.ExperienceDepth?.impact_examples || [],
          evidence: [],
          analysis: 'Experience depth analysis'
        },
        {
          name: 'domain_industry',
          score: analysis.DomainIndustry?.score || 0,
          domains_matched: analysis.DomainIndustry?.domains_matched || [],
          evidence: [],
          analysis: analysis.DomainIndustry?.notes || 'Domain industry analysis'
        },
        {
          name: 'education_cert',
          score: analysis.EducationCertification?.score || 0,
          relevant: analysis.EducationCertification?.relevant || [],
          evidence: [],
          analysis: analysis.EducationCertification?.notes || 'Education certification analysis'
        },
        {
          name: 'location_availability',
          score: analysis.LocationAvailability?.score || 0,
          evidence: [],
          analysis: analysis.LocationAvailability?.notes || 'Location availability analysis'
        }
      ],
      must_haves: {
        status: analysis.MustHaveRequirementsMatch?.status?.toLowerCase() === 'pass' ? 'pass' : 'fail',
        missing: analysis.MustHaveRequirementsMatch?.missing || [],
        analysis: 'Must-have requirements analysis'
      },
      risk_flags: [],
      summary_analysis: analysis.OverallSummary || 'Analysis completed',
      key_strengths: analysis.CoreSkillsAlignment?.matched_skills?.slice(0, 5) || [],
      key_weaknesses: analysis.CoreSkillsAlignment?.missing_skills?.slice(0, 5) || [],
      metadata: {
        ...(analysis.metadata || {}),
        request_hash: requestHash,
      }
    };

    // Use the transformed analysis
    analysis = transformedAnalysis;

    const numericScore = Number(analysis.overall_score || 0);

    // Update candidate with scoring data
    const { error: updateError } = await supabase
      .from('ats_candidates')
      .update({
        resume_score: Number.isFinite(numericScore) ? numericScore : 0,
        resume_analysis: analysis,
        last_scored_at: new Date().toISOString()
      })
      .eq('id', candidateId);

    if (updateError) {
      console.error('Error updating candidate score:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save score to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully scored resume. Score:', numericScore);

    return new Response(
      JSON.stringify({ success: true, score: numericScore, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in score-resume function:', error);
    return new Response(
      JSON.stringify({ error: error.message ?? 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
