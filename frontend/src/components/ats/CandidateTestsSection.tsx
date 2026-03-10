import { useState, useEffect } from 'react';
import { Clock, Send, Download, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAtsAccess } from '@/hooks/useAtsAccess';

interface TestAssignment {
  id: string;
  status: string;
  invite_sent_at: string | null;
  expires_at: string;
  created_at: string;
  test_templates: {
    name: string;
    config_json: any;
  };
  test_sessions?: {
    id: string;
    started_at: string;
    ended_at: string | null;
    webcam_uptime_pct: number | null;
    tab_switches: number | null;
    flags_json: any;
    test_scores?: {
      overall_pct: number;
      section_scores_json: any;
      auto_score_breakdown_json: any;
      scored_at: string;
    } | null;
  }[];
}

interface TestTemplate {
  id: string;
  name: string;
  config_json: any;
}

interface CandidateTestsSectionProps {
  candidateId: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'assigned': return 'bg-blue-100 text-blue-800';
    case 'started': return 'bg-yellow-100 text-yellow-800';
    case 'submitted': return 'bg-green-100 text-green-800';
    case 'scored': return 'bg-purple-100 text-purple-800';
    case 'expired': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const CandidateTestsSection = ({ candidateId }: CandidateTestsSectionProps) => {
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [assigningTest, setAssigningTest] = useState(false);
  const { isAdmin, isTaAdmin } = useAtsAccess();
  const { toast } = useToast();

  const canManageTests = isAdmin || isTaAdmin;

  useEffect(() => {
    fetchAssignments();
    if (canManageTests) {
      fetchTemplates();
    }
  }, [candidateId, canManageTests]);

  const fetchAssignments = async () => {
    console.log('fetchAssignments called for candidateId:', candidateId);
    try {
      const { data, error } = await supabase
        .from('test_assignments')
        .select(`
          *,
          test_templates (
            name,
            config_json
          ),
          test_sessions (
            id,
            started_at,
            ended_at,
            webcam_uptime_pct,
            tab_switches,
            flags_json,
            test_scores (
              overall_pct,
              section_scores_json,
              auto_score_breakdown_json,
              scored_at
            )
          )
        `)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      console.log('Test assignments query result:', { data, error });
      
      if (error) throw error;
      setAssignments((data as any) || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch test assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('test_templates')
        .select('id, name, config_json')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const assignTest = async () => {
    if (!selectedTemplate) return;

    setAssigningTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-assign', {
        body: {
          candidate_id: candidateId,
          template_id: selectedTemplate,
          application_id: null // Will be handled by the edge function
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test assigned and invitation sent successfully',
      });
      
      setSelectedTemplate('');
      fetchAssignments();
    } catch (error) {
      console.error('Error assigning test:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign test',
        variant: 'destructive',
      });
    } finally {
      setAssigningTest(false);
    }
  };

  const sendFollowUp = async (assignmentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('test-followup', {
        body: { assignment_id: assignmentId }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Follow-up reminder sent successfully',
      });
    } catch (error) {
      console.error('Error sending follow-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to send follow-up reminder',
        variant: 'destructive',
      });
    }
  };

  const downloadResults = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('test-results-pdf', {
        body: { assignment_id: assignmentId }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test-results-${assignmentId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading results:', error);
      toast({
        title: 'Error',
        description: 'Failed to download results',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <span className="ml-2">Loading test assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canManageTests && (
        <Card>
          <CardHeader>
            <CardTitle>Assign New Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a test template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({
                          (() => {
                            try {
                              const config = typeof template.config_json === 'string' 
                                ? JSON.parse(template.config_json)
                                : template.config_json;
                              return (config as any)?.duration_minutes || 45;
                            } catch {
                              return 45;
                            }
                          })()
                        } min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={assignTest} 
                disabled={!selectedTemplate || assigningTest}
              >
                <Send className="w-4 h-4 mr-2" />
                {assigningTest ? 'Assigning...' : 'Assign Test'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No tests assigned yet</p>
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => {
            const session = assignment.test_sessions?.[0];
            const score = session?.test_scores;
            const isExpired = new Date(assignment.expires_at) < new Date();
            const needsFollowUp = assignment.status === 'assigned' && 
              assignment.invite_sent_at && 
              new Date(Date.now() - 48 * 60 * 60 * 1000) > new Date(assignment.invite_sent_at);

            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {assignment.test_templates.name}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge className={getStatusColor(isExpired ? 'expired' : assignment.status)}>
                          {isExpired ? 'Expired' : assignment.status.replace('_', ' ')}
                        </Badge>
                        {assignment.test_templates.config_json.duration_minutes && (
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            {assignment.test_templates.config_json.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {needsFollowUp && canManageTests && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendFollowUp(assignment.id)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Follow-up
                        </Button>
                      )}
                      {score && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResults(assignment.id)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={fetchAssignments}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Assigned:</span>{' '}
                        {new Date(assignment.created_at).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expires:</span>{' '}
                        {new Date(assignment.expires_at).toLocaleDateString()}
                      </div>
                      {session?.started_at && (
                        <div>
                          <span className="text-muted-foreground">Started:</span>{' '}
                          {new Date(session.started_at).toLocaleDateString()}
                        </div>
                      )}
                      {session?.ended_at && (
                        <div>
                          <span className="text-muted-foreground">Completed:</span>{' '}
                          {new Date(session.ended_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {score && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium">Overall Score: {score.overall_pct.toFixed(1)}%</span>
                          </div>
                          <Progress value={score.overall_pct} className="flex-1" />
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Test Results - {assignment.test_templates.name}</DialogTitle>
                            </DialogHeader>
                            <Tabs defaultValue="scores" className="w-full">
                              <TabsList>
                                <TabsTrigger value="scores">Scores</TabsTrigger>
                                <TabsTrigger value="proctoring">Proctoring</TabsTrigger>
                                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="scores" className="space-y-4">
                                <div className="grid gap-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Overall Performance</h4>
                                    <div className="flex items-center gap-4">
                                      <span className="text-2xl font-bold">{score.overall_pct.toFixed(1)}%</span>
                                      <Progress value={score.overall_pct} className="flex-1" />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium mb-2">Section Breakdown</h4>
                                    <div className="space-y-2">
                                      {Object.entries(score.section_scores_json || {}).map(([section, data]: [string, any]) => (
                                        <div key={section} className="flex items-center gap-4">
                                          <span className="w-32 text-sm">{section}</span>
                                          <span className="w-16 text-sm">{data.percentage?.toFixed(1)}%</span>
                                          <Progress value={data.percentage} className="flex-1" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="proctoring" className="space-y-4">
                                {session && (
                                  <div className="grid gap-4">
                                    <div className="grid grid-cols-3 gap-4">
                                      <Card>
                                        <CardContent className="pt-4">
                                          <div className="text-center">
                                            <div className="text-2xl font-bold">{session.webcam_uptime_pct?.toFixed(1) || 0}%</div>
                                            <div className="text-sm text-muted-foreground">Webcam Uptime</div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                      <Card>
                                        <CardContent className="pt-4">
                                          <div className="text-center">
                                            <div className="text-2xl font-bold">{session.tab_switches || 0}</div>
                                            <div className="text-sm text-muted-foreground">Tab Switches</div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                      <Card>
                                        <CardContent className="pt-4">
                                          <div className="text-center">
                                            <div className="text-2xl font-bold">
                                              {Object.keys(session.flags_json || {}).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Flags Raised</div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>

                                    {Object.keys(session.flags_json || {}).length > 0 && (
                                      <div>
                                        <h4 className="font-medium mb-2 flex items-center gap-2">
                                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                          Proctoring Flags
                                        </h4>
                                        <div className="space-y-2">
                                          {Object.entries(session.flags_json || {}).map(([flag, value]: [string, any]) => (
                                            <div key={flag} className="flex items-center gap-2">
                                              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                                {flag.replace('_', ' ')}
                                              </Badge>
                                              {typeof value === 'boolean' ? (
                                                value ? 'Detected' : 'Not detected'
                                              ) : (
                                                String(value)
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="timeline" className="space-y-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                    <span className="text-sm">
                                      Test assigned - {new Date(assignment.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {assignment.invite_sent_at && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                                      <span className="text-sm">
                                        Invitation sent - {new Date(assignment.invite_sent_at).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {session?.started_at && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                                      <span className="text-sm">
                                        Test started - {new Date(session.started_at).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {session?.ended_at && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-purple-600 rounded-full" />
                                      <span className="text-sm">
                                        Test completed - {new Date(session.ended_at).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {score?.scored_at && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                                      <span className="text-sm">
                                        Results available - {new Date(score.scored_at).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};