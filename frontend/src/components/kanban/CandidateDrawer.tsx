import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar, 
  ExternalLink,
  FileText,
  Star,
  MessageSquare,
  Activity,
  User,
  Download,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FeedbackTab } from '@/components/FeedbackTab';
import { CandidateTestsSection } from '@/components/ats/CandidateTestsSection';
import { InterviewManagement } from '@/components/InterviewManagement';
import type { Candidate, Stage } from './KanbanBoard';

interface CandidateDrawerProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  onStageChange: (candidateId: string, newStageId: string) => void;
}

interface ActivityLog {
  id: string;
  from_step: string | null;
  to_step: string | null;
  note: string | null;
  created_at: string;
  updated_by: string | null;
  actor_id: string | null;
  step_name: string;
  old_status: string | null;
  new_status: string | null;
  comments: string | null;
  actor?: {
    full_name: string;
    email: string;
  };
}

interface Application {
  id: string;
  stage: string;
  status: string;
  created_at: string;
  requisition: {
    id: string;
    title: string;
    dept: string;
    location: string;
    status: string;
    description?: string;
    hiring_manager?: {
      full_name: string;
      email: string;
    };
  };
}

interface Interview {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  interview_type: string;
  meeting_link?: string;
  notes?: string;
  interviewer?: {
    full_name: string;
    email: string;
  };
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  visible_to_roles: string[];
  user?: {
    full_name: string;
    email: string;
  };
}

export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  candidate,
  isOpen,
  onClose,
  stages,
  onStageChange
}) => {
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<string[]>(['ADMIN', 'TA_ADMIN']);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch activity logs from both workflow_updates and candidate_activities
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['candidate-activities', candidate?.id],
    queryFn: async () => {
      if (!candidate?.id) return [];
      
      // Get workflow updates with user profile
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflow_updates')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false });

      if (workflowError) {
        console.error('Error fetching workflow updates:', workflowError);
      }

      // Get candidate activities with user profile
      const { data: candidateActivities, error: activitiesError } = await supabase
        .from('candidate_activities')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false });

      if (activitiesError) {
        console.error('Error fetching candidate activities:', activitiesError);
      }

      // Get all unique actor IDs
      const allActorIds = [
        ...(workflowData || []).map(item => item.actor_id).filter(Boolean),
        ...(candidateActivities || []).map(item => item.actor_id).filter(Boolean)
      ];
      const uniqueActorIds = [...new Set(allActorIds)];

      // Fetch profiles for all actors
      let profilesMap: Record<string, any> = {};
      if (uniqueActorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', uniqueActorIds);

        if (!profilesError) {
          profilesMap = Object.fromEntries(
            (profiles || []).map(p => [p.user_id, p])
          );
        }
      }

      // Combine and sort all activities with profile data
      const allActivities = [
        ...(workflowData || []).map(item => ({ 
          ...item, 
          source: 'workflow',
          actor: profilesMap[item.actor_id] || null
        })),
        ...(candidateActivities || []).map(item => ({ 
          ...item, 
          source: 'activity',
          actor: profilesMap[item.actor_id] || null
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return allActivities as any[];
    },
    enabled: !!candidate?.id && isOpen
  });

  // Fetch applications
  const { data: applications = [], isLoading: isLoadingApplications } = useQuery({
    queryKey: ['candidate-applications', candidate?.id],
    queryFn: async () => {
      if (!candidate?.id) return [];
      
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          requisition:requisitions(
            id, title, dept, location, status, description,
            hiring_manager:profiles!requisitions_hiring_manager_id_fkey(full_name, email)
          )
        `)
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
    enabled: !!candidate?.id && isOpen
  });

  // Fetch interviews
  const { data: interviews = [], isLoading: isLoadingInterviews } = useQuery({
    queryKey: ['candidate-interviews', candidate?.id],
    queryFn: async () => {
      if (!candidate?.id) return [];
      
      const { data, error } = await supabase
        .from('ats_interviews')
        .select(`
          *,
          interviewer:profiles(full_name, email)
        `)
        .eq('candidate_id', candidate.id)
        .order('scheduled_start', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!candidate?.id && isOpen
  });

  // Fetch comments
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['candidate-comments', candidate?.id],
    queryFn: async () => {
      if (!candidate?.id) return [];
      
      const { data, error } = await supabase
        .from('candidate_comments')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = Array.from(new Set((data || []).map((d: any) => d.user_id).filter(Boolean)));
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      }

      return (data || []).map((c: any) => ({ ...c, user: profileMap[c.user_id] })) as any[];
    },
    enabled: !!candidate?.id && isOpen
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ comment, visibility }: { comment: string; visibility: string[] }) => {
      if (!candidate?.id) throw new Error('No candidate selected');
      
      const { error } = await supabase
        .from('candidate_comments')
        .insert({
          candidate_id: candidate.id,
          user_id: user?.id,
          comment: comment.trim(),
          visible_to_roles: visibility
        });

      if (error) throw error;

      // Also log this as an activity
      await supabase.rpc('log_candidate_activity', {
        p_candidate_id: candidate.id,
        p_activity_type: 'comment_added',
        p_activity_description: `Added a comment: "${comment.trim().substring(0, 50)}${comment.trim().length > 50 ? '...' : ''}"`,
        p_metadata: { 
          comment_preview: comment.trim().substring(0, 100),
          visibility: visibility 
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-comments', candidate?.id] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities', candidate?.id] });
      setNewComment('');
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  });

  React.useEffect(() => {
    if (candidate?.current_step) {
      setSelectedStage(candidate.current_step);
    }
  }, [candidate]);

  // Realtime updates for comments and activities
  React.useEffect(() => {
    if (!candidate?.id || !isOpen) return;

    const wfChannel = supabase
      .channel(`cand-activity-${candidate.id}-wf`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_updates', filter: `candidate_id=eq.${candidate.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setHasNewActivity(true);
          queryClient.invalidateQueries({ queryKey: ['candidate-activities', candidate.id] });
        }
      )
      .subscribe();

    const actChannel = supabase
      .channel(`cand-activity-${candidate.id}-act`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidate_activities', filter: `candidate_id=eq.${candidate.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setHasNewActivity(true);
          queryClient.invalidateQueries({ queryKey: ['candidate-activities', candidate.id] });
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`cand-comments-${candidate.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidate_comments', filter: `candidate_id=eq.${candidate.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setHasNewActivity(true);
          queryClient.invalidateQueries({ queryKey: ['candidate-comments', candidate.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(wfChannel);
      supabase.removeChannel(actChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [candidate?.id, isOpen, queryClient]);

  // Clear indicator and mark seen when viewing Activity
  React.useEffect(() => {
    if (activeTab === 'activity' && candidate?.id) {
      setHasNewActivity(false);
      (async () => {
        await supabase.rpc('mark_activities_as_seen', { p_candidate_id: candidate.id });
      })().catch(() => {});
    }
  }, [activeTab, candidate?.id]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStageChange = (newStageId: string) => {
    if (candidate && newStageId !== candidate.current_step) {
      setSelectedStage(newStageId);
      onStageChange(candidate.id, newStageId);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate({
        comment: newComment,
        visibility: commentVisibility
      });
    }
  };

  if (!candidate) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(candidate.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{candidate.full_name}</SheetTitle>
              <p className="text-muted-foreground">{candidate.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="stage-select" className="text-sm font-medium">
              Current Stage:
            </Label>
            <Select value={selectedStage} onValueChange={handleStageChange}>
              <SelectTrigger id="stage-select" className="w-48">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">
              Applications ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <Star className="w-4 h-4 mr-1" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="activity" className="relative">
              Activity
              {hasNewActivity && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary animate-pulse" aria-label="New activity" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span>{candidate.email}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span>{candidate.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Position */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Current Position
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {candidate.current_title && (
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <p>{candidate.current_title}</p>
                    </div>
                  )}
                  {candidate.current_company && (
                    <div>
                      <Label className="text-sm font-medium">Company</Label>
                      <p>{candidate.current_company}</p>
                    </div>
                  )}
                  {candidate.source && (
                    <div>
                      <Label className="text-sm font-medium">Source</Label>
                      <Badge variant="outline">{candidate.source}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Application Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>Applied on {formatRelativeTime(candidate.created_at)}</span>
                </div>
                {candidate.resume_url && (
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <a 
                      href={candidate.resume_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      View Resume
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6 mt-6">
            {isLoadingApplications ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No applications found
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h3 className="font-semibold">{application.requisition.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{application.requisition.dept}</span>
                            <span>{application.requisition.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{application.stage}</Badge>
                            <Badge 
                              variant={application.status === 'active' ? 'default' : 'secondary'}
                            >
                              {application.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          Applied {formatRelativeTime(application.created_at)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <FeedbackTab candidateId={candidate.id} />
          </TabsContent>

          <TabsContent value="interviews" className="mt-6">
            <InterviewManagement 
              interviews={interviews as any}
              candidateId={candidate.id}
              onInterviewUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['candidate-interviews', candidate.id] });
                queryClient.invalidateQueries({ queryKey: ['candidate-activities', candidate.id] });
              }}
            />
          </TabsContent>

          <TabsContent value="comments" className="space-y-6 mt-6">
            {/* Add Comment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add Comment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddComment} className="space-y-4">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Visible to:</Label>
                      <Select
                        value={commentVisibility.join(',')}
                        onValueChange={(value) => setCommentVisibility(value.split(','))}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN,TA_ADMIN">Admins Only</SelectItem>
                          <SelectItem value="ADMIN,TA_ADMIN,HIRING_MANAGER">Admins & Hiring Managers</SelectItem>
                          <SelectItem value="ADMIN,TA_ADMIN,HIRING_MANAGER,INTERVIEWER">All ATS Users</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                    >
                      {addCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No comments yet
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(comment.user?.full_name || (comment.user_id === user?.id ? 'You' : 'User'))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {comment.user?.full_name || (comment.user_id === user?.id ? 'You' : 'User')}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {comment.visible_to_roles.join(', ')}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm">{comment.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tests" className="mt-6">
            <CandidateTestsSection candidateId={candidate.id} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6 mt-6">
            {isLoadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity recorded yet
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border"></div>
                
                <div className="space-y-6">
                  {activities.map((activity, index) => (
                    <div key={activity.id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full border-2 border-background ${
                          activity.activity_type === 'comment_added' ? 'bg-blue-500' :
                          activity.step_name === 'stage_change' ? 'bg-green-500' :
                          activity.activity_type === 'interview_scheduled' ? 'bg-purple-500' :
                          activity.activity_type === 'feedback_added' ? 'bg-yellow-500' :
                          'bg-primary'
                        }`}></div>
                      </div>
                      
                      {/* Activity content */}
                      <div className="flex-1 min-w-0">
                        <Card className="border-l-2 border-l-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {activity.source === 'workflow' ? (
                                    activity.step_name === 'stage_change' ? (
                                      <span className="flex items-center gap-2">
                                        <span>Stage Changed</span>
                                        <div className="flex items-center gap-1">
                                          <Badge variant="outline" className="text-xs">{activity.from_step || activity.old_status}</Badge>
                                          <span>→</span>
                                          <Badge variant="outline" className="text-xs">{activity.to_step || activity.new_status}</Badge>
                                        </div>
                                      </span>
                                    ) : (
                                      <span>{activity.step_name || 'Workflow Update'}</span>
                                    )
                                  ) : (
                                    <span className="capitalize">
                                      {activity.activity_type?.replace('_', ' ') || 'Activity'}
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.activity_description || activity.note || activity.comments || 'No description'}
                                </p>
                                
                                {activity.metadata?.comment_preview && (
                                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs italic">
                                    "{activity.metadata.comment_preview}"
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                                  <span className="font-medium">
                                    {activity.actor?.full_name || activity.updated_by || 'System'}
                                  </span>
                                  <span>•</span>
                                  <span>{formatDateTime(activity.created_at)}</span>
                                  {activity.metadata?.visibility && (
                                    <>
                                      <span>•</span>
                                      <span>Visible to: {Array.isArray(activity.metadata.visibility) ? activity.metadata.visibility.join(', ') : activity.metadata.visibility}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};