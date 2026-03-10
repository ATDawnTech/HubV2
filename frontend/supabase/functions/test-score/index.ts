import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

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

    const { session_id } = await req.json();

    // Get session data with responses and template
    const { data: session } = await supabase
      .from('test_sessions')
      .select(`
        *,
        test_assignments (
          template_id,
          test_templates (
            config_json
          )
        ),
        test_responses (
          question_id,
          response_json
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

    const template = session.test_assignments.test_templates;
    const responses = session.test_responses;
    const questions = template.config_json.question_bank;
    const sections = template.config_json.sections || [];

    // Score each question
    const questionScores: any[] = [];
    let totalWeightedScore = 0;
    let totalPossibleScore = 0;

    for (const question of questions) {
      const response = responses.find(r => r.question_id === question.id);
      let score = 0;
      let maxScore = question.weight || 1;

      if (response) {
        if (question.type === 'mcq_single' || question.type === 'mcq_multiple') {
          // MCQ scoring
          const correctAnswers = question.answer_key || [];
          const userAnswers = response.response_json.selected || [];
          
          if (question.type === 'mcq_single') {
            score = userAnswers.length === 1 && correctAnswers.includes(userAnswers[0]) ? maxScore : 0;
          } else {
            // Multiple choice - partial credit
            const correctSelected = userAnswers.filter((ans: number) => correctAnswers.includes(ans)).length;
            const incorrectSelected = userAnswers.filter((ans: number) => !correctAnswers.includes(ans)).length;
            const missedCorrect = correctAnswers.filter((ans: number) => !userAnswers.includes(ans)).length;
            
            score = Math.max(0, (correctSelected - incorrectSelected - missedCorrect * 0.5) / correctAnswers.length * maxScore);
          }
        } else if (question.type === 'short_text') {
          // Text scoring using AI
          score = await scoreTextResponse(question, response.response_json.text);
        }
      }

      questionScores.push({
        question_id: question.id,
        score,
        max_score: maxScore,
        percentage: (score / maxScore) * 100
      });

      totalWeightedScore += score;
      totalPossibleScore += maxScore;
    }

    // Calculate section scores
    const sectionScores: any = {};
    for (const section of sections) {
      const sectionQuestions = questions.filter(q => q.section === section.name);
      const sectionQuestionScores = questionScores.filter(qs => 
        sectionQuestions.some(sq => sq.id === qs.question_id)
      );
      
      const sectionTotal = sectionQuestionScores.reduce((sum, qs) => sum + qs.score, 0);
      const sectionMax = sectionQuestionScores.reduce((sum, qs) => sum + qs.max_score, 0);
      
      sectionScores[section.name] = {
        score: sectionTotal,
        max_score: sectionMax,
        percentage: sectionMax > 0 ? (sectionTotal / sectionMax) * 100 : 0,
        weight: section.weight || 0
      };
    }

    // Calculate overall percentage
    const overallPercentage = totalPossibleScore > 0 ? (totalWeightedScore / totalPossibleScore) * 100 : 0;

    // Apply anti-cheat penalties
    let finalPercentage = overallPercentage;
    const antiCheatConfig = template.config_json.anti_cheat || {};
    const flags = session.flags_json || {};
    
    if (session.webcam_uptime_pct < (antiCheatConfig.min_webcam_uptime_pct || 90)) {
      finalPercentage *= 0.8; // 20% penalty
      flags.low_webcam_uptime = true;
    }
    
    if (session.tab_switches > (antiCheatConfig.max_tab_switches || 3)) {
      finalPercentage *= 0.9; // 10% penalty
      flags.excessive_tab_switches = true;
    }

    // Save scores
    await supabase
      .from('test_scores')
      .insert({
        session_id,
        overall_pct: Math.max(0, Math.min(100, finalPercentage)),
        section_scores_json: sectionScores,
        auto_score_breakdown_json: {
          question_scores: questionScores,
          total_weighted_score: totalWeightedScore,
          total_possible_score: totalPossibleScore,
          raw_percentage: overallPercentage,
          final_percentage: finalPercentage,
          penalties_applied: flags
        }
      });

    // Update assignment status
    await supabase
      .from('test_assignments')
      .update({ status: 'scored' })
      .eq('id', session.test_assignments.id);

    return new Response(JSON.stringify({ 
      success: true, 
      overall_percentage: finalPercentage,
      section_scores: sectionScores 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test scoring error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scoreTextResponse(question: any, userText: string): Promise<number> {
  if (!userText?.trim()) return 0;

  const maxScore = question.weight || 1;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert assessor. Score the user's answer to a question based on:
1. Sample answer: ${question.sample_answer || 'No sample provided'}
2. Keywords to look for: ${question.keywords?.join(', ') || 'None specified'}
3. Maximum score: ${maxScore}

Return ONLY a number between 0 and ${maxScore} representing the score. Consider:
- Accuracy of content
- Key concepts covered
- Clarity of explanation
- Completeness relative to sample answer`
          },
          {
            role: 'user',
            content: `Question: ${question.prompt}\n\nUser's Answer: ${userText}`
          }
        ],
        max_tokens: 10,
        temperature: 0.3
      }),
    });

    const data = await response.json();
    const scoreText = data.choices[0].message.content.trim();
    const score = parseFloat(scoreText);
    
    return isNaN(score) ? 0 : Math.max(0, Math.min(maxScore, score));
  } catch (error) {
    console.error('AI scoring error:', error);
    // Fallback: keyword matching
    const keywords = question.keywords || [];
    const lowerUserText = userText.toLowerCase();
    const matchedKeywords = keywords.filter((keyword: string) => 
      lowerUserText.includes(keyword.toLowerCase())
    );
    
    return keywords.length > 0 ? (matchedKeywords.length / keywords.length) * maxScore : maxScore * 0.5;
  }
}