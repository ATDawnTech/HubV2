import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Clock, ArrowLeft, Play, AlertCircle } from "lucide-react";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface Question {
  id: string;
  type: 'mcq_single' | 'mcq_multiple' | 'short_text';
  section: string;
  prompt: string;
  choices?: string[];
  answer_key?: number[];
  sample_answer?: string;
  keywords?: string[];
  weight: number;
}

export default function TestPreview() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data: template, error, isLoading } = useQuery({
    queryKey: ['test-template-preview', templateId],
    queryFn: async () => {
      if (!templateId) throw new Error('No template ID provided');
      
      const { data, error } = await supabase
        .from('test_templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!templateId
  });

  const handleStartTest = () => {
    if (!template?.config_json) return;
    
    const config = template.config_json as any;
    const durationMinutes = config.duration_minutes || 45;
    setTimeLeft(durationMinutes * 60); // Convert to seconds
    setIsStarted(true);
    
    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmitTest = () => {
    toast.success("Test preview completed!");
    navigate('/ats/settings?tab=tests');
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading test preview...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Template Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The test template could not be found or you don't have permission to preview it.
            </p>
            <Button onClick={() => navigate('/ats/settings?tab=tests')} variant="outline" className="w-full">
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = template.config_json as any;
  const questions: Question[] = config.question_bank || [];

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Preview Mode</Badge>
            </div>
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>
              Test template preview for administrators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Test Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Duration:</strong> {config.duration_minutes || 45} minutes</p>
                <p><strong>Questions:</strong> {questions.length}</p>
                <p><strong>Sections:</strong> {config.sections?.map((s: any) => s.name).join(', ') || 'None'}</p>
                <p><strong>Shuffling:</strong> {config.shuffling ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h3 className="font-medium mb-2 text-amber-800">Preview Mode</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• This is a preview for testing purposes only</li>
                <li>• No data will be saved or recorded</li>
                <li>• Anti-cheat measures are disabled</li>
                <li>• Timer will function normally</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/ats/settings?tab=tests')} 
                variant="outline" 
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleStartTest} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-warning flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              No Questions Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This test template doesn't have any questions configured.
            </p>
            <Button onClick={() => navigate('/ats/settings?tab=tests')} className="w-full">
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with timer and progress */}
        <div className="flex justify-between items-center mb-6 p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-4">
            <Badge variant="outline">Preview Mode</Badge>
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {timeLeft !== null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className={`font-mono ${timeLeft < 300 ? 'text-destructive' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSubmitTest}
            >
              End Preview
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-6">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{currentQuestion.section}</Badge>
              <Badge variant="outline">Weight: {currentQuestion.weight}</Badge>
            </div>
            <CardTitle className="text-lg">{currentQuestion.prompt}</CardTitle>
          </CardHeader>
          <CardContent>
            {currentQuestion.type === 'mcq_single' && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.choices?.map((choice, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`choice-${index}`} />
                    <Label htmlFor={`choice-${index}`} className="flex-1">{choice}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.type === 'mcq_multiple' && (
              <div className="space-y-2">
                {currentQuestion.choices?.map((choice, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`choice-${index}`}
                      checked={(answers[currentQuestion.id] || []).includes(index)}
                      onCheckedChange={(checked) => {
                        const currentAnswers = answers[currentQuestion.id] || [];
                        const newAnswers = checked
                          ? [...currentAnswers, index]
                          : currentAnswers.filter((a: number) => a !== index);
                        handleAnswerChange(currentQuestion.id, newAnswers);
                      }}
                    />
                    <Label htmlFor={`choice-${index}`} className="flex-1">{choice}</Label>
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.type === 'short_text' && (
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter your answer here..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  rows={4}
                />
                {currentQuestion.sample_answer && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Sample Answer (Preview Only):</p>
                    <p className="text-sm">{currentQuestion.sample_answer}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          {isLastQuestion ? (
            <Button onClick={handleSubmitTest}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Finish Preview
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              Next Question
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}