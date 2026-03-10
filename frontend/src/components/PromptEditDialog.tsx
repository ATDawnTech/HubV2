import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PromptEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AIPrompt {
  id: string;
  title: string;
  system_prompt: string;
  user_prompt: string;
  is_default: boolean;
}

export const PromptEditDialog: React.FC<PromptEditDialogProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');

  // Fetch current prompt
  const { data: currentPrompt, isLoading } = useQuery({
    queryKey: ['ai-prompt', 'ai_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('prompt_type', 'ai_summary')
        .eq('is_default', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data as AIPrompt | null;
    },
    enabled: open,
  });

  // Update form when prompt data loads
  useEffect(() => {
    if (currentPrompt) {
      setTitle(currentPrompt.title);
      setSystemPrompt(currentPrompt.system_prompt);
      setUserPrompt(currentPrompt.user_prompt);
    } else {
      // Default values if no custom prompt exists
      setTitle('AI Summary Prompt');
      setSystemPrompt(`You are a senior technical recruiter and interviewer. Produce a concise "Overall Assessment" plus a structured "Scorecard" and a "Detailed Narrative Analysis" for a candidate. Focus ONLY on technical fit. Exclude "About the company," "Benefits/Perks," culture blurbs, and other non-technical sections.

INPUTS
- job_title: {jobTitle}
- job_description_raw: {jobDescription}
- resume_text: Based on AI resume analysis
- ai_resume_review: {resumeAnalysis}
- interview_feedbacks: {interviewFeedbacksText}
- must_have_requirements: {mustHaveRequirements}

STRUCTURE

**Overall Assessment**
2-4 bullet summary focusing on: (1) strongest technical skills, (2) potential gaps, (3) interview performance, (4) recommendation.

**Scorecard** | Qualification | Assessment | Justification | Found In |
|---|---|---|---|
| **Technical Skills/Languages** | Strong/Good/Weak | <Reason> | Resume/Interview |
| **Relevant Experience** | Strong/Good/Weak | <Reason> | Resume/Interview |
| **Problem-Solving/Algorithms** | Strong/Good/Weak | <Reason> | Resume/Interview |
| **Communication/Collaboration** | Strong/Good/Weak | <Reason> | Resume/Interview |
| **Domain Knowledge** | Strong/Good/Weak | <Reason> | Resume/Interview |

**Detailed Narrative Analysis**

*Technical Competencies*
- **Programming Languages/Frameworks:** <Assessment with evidence>
- **System Design/Architecture:** <Assessment with evidence>
- **Problem-Solving:** <Assessment with evidence>
- **Experience Depth:** <Assessment with evidence>

*Interview Performance* (if available)
- **Technical Responses:** <Quality assessment>
- **Communication:** <Clarity and explanation ability>
- **Cultural/Team Fit:** <Assessment based on interactions>

*Concerns/Gaps*
- **Technical Gaps:** <List any skill mismatches>
- **Experience Gaps:** <Note missing experience areas>
- **Other Considerations:** <Any other relevant factors>

*Final Scores* (0-100 scale)
- **Overall Technical Fit:** <0–100>
- **Programming/Technical Skills:** <0–100>
- **Problem-Solving Ability:** <0–100>
- **Communication Skills:** <0–100>
- **Relevant Experience:** <0–100>
- **Domain Knowledge:** <0–100>
- **Cultural Fit:** <0–100>
- **Education/Certification:** <0–100>  
- **Location/Availability:** <0–100>

CONSTRAINTS
- Be concise, technical, and neutral. Avoid fluff.
- No non-technical/company/benefits content.
- Quote snippets ≤25 words each when used.
- If data is missing, write "Not Evidenced" or "Unknown"—do not invent.`);
      setUserPrompt('Please generate a comprehensive technical assessment for this candidate.');
    }
  }, [currentPrompt]);

  // Save prompt mutation
  const savePrompt = useMutation({
    mutationFn: async () => {
      if (currentPrompt) {
        // Update existing prompt
        const { error } = await supabase
          .from('ai_prompts')
          .update({
            title,
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
          })
          .eq('id', currentPrompt.id);
        
        if (error) throw error;
      } else {
        // Create new prompt and set as default
        const { error } = await supabase
          .from('ai_prompts')
          .insert({
            prompt_type: 'ai_summary',
            title,
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            is_default: true,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Prompt Updated",
        description: "AI summary prompt has been saved successfully. Future summaries will use this prompt.",
      });
      queryClient.invalidateQueries({ queryKey: ['ai-prompt', 'ai_summary'] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving prompt:', error);
      toast({
        title: "Error saving prompt",
        description: "There was an error saving the prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!systemPrompt.trim()) {
      toast({
        title: "System prompt required",
        description: "Please enter a system prompt.",
        variant: "destructive",
      });
      return;
    }
    savePrompt.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update AI Summary Prompt</DialogTitle>
          <DialogDescription>
            Customize the prompt used for generating AI summaries. You can use placeholders like {'{jobTitle}'}, {'{jobDescription}'}, {'{resumeAnalysis}'}, {'{interviewFeedbacksText}'}, and {'{mustHaveRequirements}'} which will be replaced with actual data.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Prompt Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="AI Summary Prompt"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={20}
                placeholder="Enter the system prompt that defines how the AI should analyze candidates..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This prompt defines how the AI analyzes candidates. Use placeholders for dynamic data.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userPrompt">User Prompt</Label>
              <Textarea
                id="userPrompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={3}
                placeholder="Please generate a comprehensive technical assessment for this candidate."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This is the specific request sent to the AI for each summary generation.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={savePrompt.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={savePrompt.isPending}
              >
                {savePrompt.isPending ? 'Saving...' : 'Save Prompt'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};