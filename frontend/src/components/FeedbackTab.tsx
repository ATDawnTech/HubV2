import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  X, 
  Save, 
  Send, 
  Edit3, 
  MessageSquare,
  Calendar,
  User,
  TrendingUp
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAtsAccess } from '@/hooks/useAtsAccess';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FeedbackTabProps {
  candidateId: string;
}

interface Proficiency {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface FeedbackEntry {
  id: string;
  candidate_id: string;
  author_id: string;
  overall_percent: number | null;
  recommendation: string | null;
  notes: string | null;
  status: 'draft' | 'submitted';
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    email: string;
  };
  scores: FeedbackScore[];
}

interface FeedbackScore {
  id: string;
  feedback_id: string;
  proficiency_name: string;
  stars: number;
  max_stars: number;
}

interface NewFeedback {
  scores: Record<string, number>;
  recommendation: string;
  notes: string;
  status: 'draft' | 'submitted';
}

const recommendationOptions = [
  { value: 'no_hire', label: 'No-Hire', color: 'bg-red-500' },
  { value: 'maybe', label: 'Maybe', color: 'bg-yellow-500' },
  { value: 'hire', label: 'Hire', color: 'bg-green-500' },
  { value: 'strong_hire', label: 'Strong Hire', color: 'bg-blue-500' },
  { value: 'exceptional', label: 'Exceptional', color: 'bg-purple-500' }
];

export const FeedbackTab: React.FC<FeedbackTabProps> = ({ candidateId }) => {
  const { user } = useAuth();
  const { hasAtsRole, isAdmin, isTaAdmin } = useAtsAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newProficiency, setNewProficiency] = useState('');
  const [isCreatingFeedback, setIsCreatingFeedback] = useState(false);
  const [isCreatingOnBehalf, setIsCreatingOnBehalf] = useState(false);
  const [selectedInterviewer, setSelectedInterviewer] = useState<string>('');
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<NewFeedback>({
    scores: {},
    recommendation: '',
    notes: '',
    status: 'draft'
  });

  // Fetch proficiencies
  const { data: proficiencies = [], isLoading: loadingProficiencies } = useQuery({
    queryKey: ['candidate-proficiencies', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_proficiencies')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Proficiency[];
    }
  });

  // Fetch interviewers for dropdown
  const { data: interviewers = [] } = useQuery({
    queryKey: ['interviewers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('ats_role', ['INTERVIEWER', 'ADMIN', 'TA_ADMIN', 'HIRING_MANAGER'])
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin || isTaAdmin
  });

  // Fetch feedback entries
  const { data: feedbackEntries = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['candidate-feedback', candidateId],
    queryFn: async () => {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select(`
          *,
          feedback_scores (*)
        `)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      
      if (feedbackError) throw feedbackError;

      // Get author profiles
      const authorIds = [...new Set(feedbackData.map(f => f.author_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', authorIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      return feedbackData.map(feedback => ({
        ...feedback,
        author: profileMap.get(feedback.author_id),
        scores: feedback.feedback_scores || []
      })) as FeedbackEntry[];
    }
  });

  // Seed default proficiencies on mount
  useEffect(() => {
    const seedProficiencies = async () => {
      if (proficiencies.length === 0 && !loadingProficiencies) {
        try {
          await supabase.rpc('seed_default_proficiencies', {
            p_candidate_id: candidateId
          });
          queryClient.invalidateQueries({ queryKey: ['candidate-proficiencies', candidateId] });
        } catch (error) {
          console.error('Error seeding proficiencies:', error);
        }
      }
    };

    seedProficiencies();
  }, [candidateId, proficiencies.length, loadingProficiencies, queryClient]);

  // Add proficiency mutation
  const addProficiencyMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('candidate_proficiencies')
        .insert({
          candidate_id: candidateId,
          name: name.trim(),
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-proficiencies', candidateId] });
      setNewProficiency('');
      toast({ title: 'Proficiency added successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding proficiency',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Save feedback mutation
  const saveFeedbackMutation = useMutation({
    mutationFn: async ({ id, feedback, onBehalfOf }: { id?: string; feedback: NewFeedback; onBehalfOf?: string }) => {
      let feedbackId = id;
      const isUpdating = !!id;
      const authorId = onBehalfOf || user?.id;

      // Create or update feedback entry
      if (feedbackId) {
        const { error } = await supabase
          .from('feedback')
          .update({
            recommendation: feedback.recommendation || null,
            notes: feedback.notes || null,
            status: feedback.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', feedbackId);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('feedback')
          .insert({
            candidate_id: candidateId,
            author_id: authorId,
            recommendation: feedback.recommendation || null,
            notes: feedback.notes || null,
            status: feedback.status
          })
          .select()
          .single();
        
        if (error) throw error;
        feedbackId = data.id;
      }

      // Delete existing scores for this feedback
      await supabase
        .from('feedback_scores')
        .delete()
        .eq('feedback_id', feedbackId);

      // Insert new scores
      if (Object.keys(feedback.scores).length > 0) {
        const scores = Object.entries(feedback.scores).map(([proficiencyName, stars]) => ({
          feedback_id: feedbackId,
          proficiency_name: proficiencyName,
          stars
        }));

        const { error: scoresError } = await supabase
          .from('feedback_scores')
          .insert(scores);
        
        if (scoresError) throw scoresError;
      }

      // Calculate overall percentage
      if (Object.keys(feedback.scores).length > 0) {
        await supabase.rpc('calculate_feedback_overall_percent', {
          p_feedback_id: feedbackId
        });
      }

      // Log activity
      try {
        const activityType = feedback.status === 'submitted'
          ? (isUpdating ? 'feedback_resubmitted' : 'feedback_submitted')
          : (isUpdating ? 'feedback_updated' : 'feedback_saved_draft');
        await supabase.rpc('log_candidate_activity', {
          p_candidate_id: candidateId,
          p_activity_type: activityType,
          p_activity_description: `Feedback ${feedback.status === 'submitted' ? 'submitted' : 'saved as draft'}`,
          p_metadata: { feedback_id: feedbackId, recommendation: feedback.recommendation, scores: feedback.scores }
        });
      } catch (error) {
        console.warn('Failed to log feedback activity:', error);
      }

      return feedbackId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-feedback', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate-comments', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities', candidateId] });
      setIsCreatingFeedback(false);
      setIsCreatingOnBehalf(false);
      setSelectedInterviewer('');
      setEditingFeedbackId(null);
      setCurrentFeedback({
        scores: {},
        recommendation: '',
        notes: '',
        status: 'draft'
      });
      toast({ 
        title: 'Feedback saved successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving feedback',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleAddProficiency = () => {
    if (newProficiency.trim()) {
      addProficiencyMutation.mutate(newProficiency.trim());
    }
  };

  const handleScoreChange = (proficiencyName: string, score: number) => {
    const numeric = Number(score);
    const clamped = isNaN(numeric) ? 0 : Math.max(0.5, Math.min(5, numeric));
    console.debug('[FeedbackTab] score change', { proficiencyName, score, clamped });
    setCurrentFeedback(prev => ({
      ...prev,
      scores: { ...prev.scores, [proficiencyName]: clamped }
    }));
  };

  const calculateOverallPercent = (scores: Record<string, number>) => {
    const validScores = Object.values(scores).filter(v => v >= 0.5);
    if (validScores.length === 0) return 0;
    const average = validScores.reduce((sum, v) => sum + v, 0) / validScores.length;
    return Math.round((average / 5) * 100);
  };

  const startCreatingFeedback = () => {
    setIsCreatingFeedback(true);
    setIsCreatingOnBehalf(false);
    setSelectedInterviewer('');
    setEditingFeedbackId(null);
    setCurrentFeedback({
      scores: {},
      recommendation: '',
      notes: '',
      status: 'draft'
    });
  };

  const startCreatingOnBehalf = () => {
    setIsCreatingOnBehalf(true);
    setIsCreatingFeedback(false);
    setSelectedInterviewer('');
    setEditingFeedbackId(null);
    setCurrentFeedback({
      scores: {},
      recommendation: '',
      notes: '',
      status: 'draft'
    });
  };

  const startEditingFeedback = (feedback: FeedbackEntry) => {
    setEditingFeedbackId(feedback.id);
    setIsCreatingFeedback(false);
    setIsCreatingOnBehalf(false);
    setSelectedInterviewer('');
    const scores: Record<string, number> = {};
    feedback.scores.forEach(score => {
      scores[score.proficiency_name] = score.stars;
    });
    setCurrentFeedback({
      scores,
      recommendation: feedback.recommendation || '',
      notes: feedback.notes || '',
      status: feedback.status
    });
  };

  const handleSave = (status: 'draft' | 'submitted') => {
    const feedbackToSave = { ...currentFeedback, status };
    saveFeedbackMutation.mutate({
      id: editingFeedbackId || undefined,
      feedback: feedbackToSave,
      onBehalfOf: isCreatingOnBehalf ? selectedInterviewer : undefined
    });
  };

  const canCreateFeedback = hasAtsRole('ADMIN') || hasAtsRole('TA_ADMIN') || hasAtsRole('HIRING_MANAGER') || hasAtsRole('INTERVIEWER');
  const canEditAll = isAdmin || isTaAdmin;

  const currentOverallPercent = calculateOverallPercent(currentFeedback.scores);
  const isFormVisible = isCreatingFeedback || isCreatingOnBehalf || editingFeedbackId;

  // Calculate aggregates for authorized users
  const aggregateData = feedbackEntries.length > 0 ? {
    averagePercent: Math.round(
      feedbackEntries
        .filter(f => f.overall_percent !== null && f.status === 'submitted')
        .reduce((sum, f) => sum + (f.overall_percent || 0), 0) / 
      Math.max(1, feedbackEntries.filter(f => f.overall_percent !== null && f.status === 'submitted').length)
    ),
    recommendationCounts: feedbackEntries
      .filter(f => f.recommendation && f.status === 'submitted')
      .reduce((acc, f) => {
        acc[f.recommendation!] = (acc[f.recommendation!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
  } : null;

  if (loadingProficiencies || loadingFeedback) {
    return <div className="flex items-center justify-center p-8">Loading feedback...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Aggregate Summary for authorized users */}
      {(isAdmin || isTaAdmin || hasAtsRole('HIRING_MANAGER')) && aggregateData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Feedback Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Average Score</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Progress value={aggregateData.averagePercent} className="flex-1" />
                  <span className="text-2xl font-bold">{aggregateData.averagePercent}%</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Recommendations</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {recommendationOptions.map(option => {
                    const count = aggregateData.recommendationCounts[option.value] || 0;
                    return count > 0 ? (
                      <Badge key={option.value} variant="secondary" className="text-xs">
                        {option.label}: {count}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Feedback Form */}
      {canCreateFeedback && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {editingFeedbackId ? 'Edit Feedback' : isCreatingOnBehalf ? 'Add Feedback on Behalf of Interviewer' : 'Candidate Feedback'}
              </CardTitle>
              {!isFormVisible && (
                <div className="flex gap-2">
                  <Button onClick={startCreatingFeedback}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Feedback
                  </Button>
                  {(isAdmin || isTaAdmin) && (
                    <Button variant="outline" onClick={startCreatingOnBehalf}>
                      <User className="w-4 h-4 mr-2" />
                      Add Feedback on Behalf of Interviewer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          {isFormVisible && (
            <CardContent className="space-y-6">
              {/* Interviewer Selection for On-Behalf Mode */}
              {isCreatingOnBehalf && (
                <div>
                  <Label className="text-base font-semibold">Select Interviewer</Label>
                  <Select
                    value={selectedInterviewer}
                    onValueChange={setSelectedInterviewer}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select interviewer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {interviewers.map((interviewer) => (
                        <SelectItem key={interviewer.user_id} value={interviewer.user_id}>
                          <div className="flex flex-col">
                            <span>{interviewer.full_name}</span>
                            <span className="text-xs text-muted-foreground">{interviewer.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Proficiencies Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base font-semibold">Proficiencies</Label>
                  {(isAdmin || isTaAdmin || hasAtsRole('HIRING_MANAGER')) && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add proficiency..."
                        value={newProficiency}
                        onChange={(e) => setNewProficiency(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddProficiency()}
                        className="w-40"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleAddProficiency}
                        disabled={!newProficiency.trim() || addProficiencyMutation.isPending}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {proficiencies.map((proficiency) => (
                    <div key={proficiency.id} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">{proficiency.name}</span>
                      <div className="flex items-center gap-3">
                        <StarRating
                          value={currentFeedback.scores[proficiency.name] || 0}
                          onChange={(value) => handleScoreChange(proficiency.name, value)}
                          showValue
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Score */}
              {Object.keys(currentFeedback.scores).length > 0 && (
                <div>
                  <Label className="text-base font-semibold">Overall Score</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={currentOverallPercent} className="flex-1" />
                    <span className="text-2xl font-bold">{currentOverallPercent}%</span>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div>
                <Label className="text-base font-semibold">Recommendation</Label>
                <Select
                  value={currentFeedback.recommendation}
                  onValueChange={(value) => setCurrentFeedback(prev => ({ ...prev, recommendation: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select recommendation..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recommendationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${option.color}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-base font-semibold">Notes</Label>
                <Textarea
                  placeholder="Additional comments or observations..."
                  value={currentFeedback.notes}
                  onChange={(e) => setCurrentFeedback(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => handleSave('draft')}
                  disabled={saveFeedbackMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button 
                  onClick={() => handleSave('submitted')}
                  disabled={
                    saveFeedbackMutation.isPending || 
                    Object.keys(currentFeedback.scores).length === 0 ||
                    (isCreatingOnBehalf && !selectedInterviewer)
                  }
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setIsCreatingFeedback(false);
                    setIsCreatingOnBehalf(false);
                    setSelectedInterviewer('');
                    setEditingFeedbackId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Existing Feedback Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No feedback submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {feedbackEntries.map((feedback) => {
                const canEdit = canEditAll || feedback.author_id === user?.id;
                const recommendationOption = recommendationOptions.find(opt => opt.value === feedback.recommendation);
                
                return (
                  <div key={feedback.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{feedback.author?.full_name || 'Unknown'}</span>
                        </div>
                        <Badge variant={feedback.status === 'submitted' ? 'default' : 'secondary'}>
                          {feedback.status}
                        </Badge>
                        {feedback.overall_percent !== null && (
                          <Badge variant="outline">
                            {feedback.overall_percent}%
                          </Badge>
                        )}
                        {recommendationOption && (
                          <Badge className="text-white" style={{ backgroundColor: recommendationOption.color.replace('bg-', '#') }}>
                            {recommendationOption.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </div>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingFeedback(feedback)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {feedback.scores.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {feedback.scores.map((score) => (
                          <div key={score.id} className="flex justify-between items-center">
                            <span className="text-sm">{score.proficiency_name}</span>
                            <StarRating
                              value={score.stars}
                              onChange={() => {}}
                              readOnly
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {feedback.notes && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {feedback.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
