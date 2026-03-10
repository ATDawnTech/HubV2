import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface TestTemplate {
  id: string;
  name: string;
  config_json: any;
  created_at: string;
  updated_at: string;
}

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

export const TestTemplatesManagement = () => {
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [templateForm, setTemplateForm] = useState({
    name: '',
    duration_minutes: 45,
    sections: [{ name: 'General', weight: 1.0 }],
    question_bank: [] as Question[],
    shuffling: true,
    expiry_hours: 120,
    anti_cheat: {
      snapshot_interval_seconds: [20, 45],
      min_webcam_uptime_pct: 90,
      max_tab_switches: 3,
      gaze_allowed_offscreen_seconds: 8,
      face_count: { allow_multiple: false, tolerance: 0 },
      plagiarism_similarity_threshold: 0.8
    },
    email: {
      invite_subject: 'Your AT Dawn test: {{template_name}}',
      invite_body: 'Hi {{candidate_first}}, complete your test here: {{test_link}} by {{expiry}}.',
      reminder_subject: 'Reminder: your AT Dawn test awaits',
      reminder_body: 'Hi {{candidate_first}}, friendly reminder: {{test_link}}.'
    }
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('test_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch test templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    try {
      const templateData = {
        name: templateForm.name,
        config_json: {
          duration_minutes: templateForm.duration_minutes,
          sections: templateForm.sections,
          question_bank: templateForm.question_bank,
          shuffling: templateForm.shuffling,
          expiry_hours: templateForm.expiry_hours,
          anti_cheat: templateForm.anti_cheat,
          email: templateForm.email
        } as any
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('test_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Template updated successfully' });
      } else {
        const { error } = await supabase
          .from('test_templates')
          .insert({ ...templateData, created_by: (await supabase.auth.getUser()).data.user?.id } as any);

        if (error) throw error;
        toast({ title: 'Success', description: 'Template created successfully' });
      }

      setIsCreating(false);
      setEditingTemplate(null);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('test_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Template deleted successfully' });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      duration_minutes: 45,
      sections: [{ name: 'General', weight: 1.0 }],
      question_bank: [],
      shuffling: true,
      expiry_hours: 120,
      anti_cheat: {
        snapshot_interval_seconds: [20, 45],
        min_webcam_uptime_pct: 90,
        max_tab_switches: 3,
        gaze_allowed_offscreen_seconds: 8,
        face_count: { allow_multiple: false, tolerance: 0 },
        plagiarism_similarity_threshold: 0.8
      },
      email: {
        invite_subject: 'Your AT Dawn test: {{template_name}}',
        invite_body: 'Hi {{candidate_first}}, complete your test here: {{test_link}} by {{expiry}}.',
        reminder_subject: 'Reminder: your AT Dawn test awaits',
        reminder_body: 'Hi {{candidate_first}}, friendly reminder: {{test_link}}.'
      }
    });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: 'mcq_single',
      section: templateForm.sections[0]?.name || 'General',
      prompt: '',
      choices: ['', '', '', ''],
      answer_key: [],
      weight: 1
    };
    setTemplateForm(prev => ({
      ...prev,
      question_bank: [...prev.question_bank, newQuestion]
    }));
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setTemplateForm(prev => ({
      ...prev,
      question_bank: prev.question_bank.map((q, i) => 
        i === index ? { ...q, ...updates } : q
      )
    }));
  };

  const removeQuestion = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      question_bank: prev.question_bank.filter((_, i) => i !== index)
    }));
  };

  const previewTemplate = (template: TestTemplate) => {
    // Navigate to preview mode with template ID
    navigate(`/test/preview/${template.id}`);
  };

  if (loading) {
    return <div>Loading test templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Test Templates</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">
                      {template.config_json.duration_minutes || 45} min
                    </Badge>
                    <Badge variant="outline">
                      {template.config_json.question_bank?.length || 0} questions
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewTemplate(template)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(template);
                      setTemplateForm({
                        name: template.name,
                        ...template.config_json
                      });
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Sections: {template.config_json.sections?.map((s: any) => s.name).join(', ') || 'None'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isCreating || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setEditingTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Azure Architect - Fundamentals"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={templateForm.duration_minutes}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Questions</Label>
              <div className="space-y-4">
                {templateForm.question_bank.map((question, index) => (
                  <Card key={question.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          <Select
                            value={question.type}
                            onValueChange={(value) => updateQuestion(index, { type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mcq_single">Single Choice</SelectItem>
                              <SelectItem value="mcq_multiple">Multiple Choice</SelectItem>
                              <SelectItem value="short_text">Short Answer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={question.section}
                            onValueChange={(value) => updateQuestion(index, { section: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {templateForm.sections.map((section) => (
                                <SelectItem key={section.name} value={section.name}>
                                  {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Weight"
                            value={question.weight}
                            onChange={(e) => updateQuestion(index, { weight: parseInt(e.target.value) })}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Textarea
                        placeholder="Question prompt"
                        value={question.prompt}
                        onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
                        className="mb-4"
                      />

                      {(question.type === 'mcq_single' || question.type === 'mcq_multiple') && (
                        <div className="space-y-2">
                          {question.choices?.map((choice, choiceIndex) => (
                            <div key={choiceIndex} className="flex items-center gap-2">
                              <Input
                                placeholder={`Choice ${choiceIndex + 1}`}
                                value={choice}
                                onChange={(e) => {
                                  const newChoices = [...(question.choices || [])];
                                  newChoices[choiceIndex] = e.target.value;
                                  updateQuestion(index, { choices: newChoices });
                                }}
                              />
                              <input
                                type={question.type === 'mcq_single' ? 'radio' : 'checkbox'}
                                name={`correct_${index}`}
                                checked={question.answer_key?.includes(choiceIndex)}
                                onChange={(e) => {
                                  let newAnswerKey = [...(question.answer_key || [])];
                                  if (question.type === 'mcq_single') {
                                    newAnswerKey = e.target.checked ? [choiceIndex] : [];
                                  } else {
                                    if (e.target.checked) {
                                      newAnswerKey.push(choiceIndex);
                                    } else {
                                      newAnswerKey = newAnswerKey.filter(k => k !== choiceIndex);
                                    }
                                  }
                                  updateQuestion(index, { answer_key: newAnswerKey });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'short_text' && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Sample answer"
                            value={question.sample_answer || ''}
                            onChange={(e) => updateQuestion(index, { sample_answer: e.target.value })}
                          />
                          <Input
                            placeholder="Keywords (comma-separated)"
                            value={question.keywords?.join(', ') || ''}
                            onChange={(e) => updateQuestion(index, { keywords: e.target.value.split(',').map(k => k.trim()) })}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveTemplate}>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};