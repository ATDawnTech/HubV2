import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, AlertCircle, CheckCircle, Play, Pause, SkipForward, ExternalLink, UserPlus } from "lucide-react";

interface Task {
  id: string;
  block: string;
  name: string;
  description: string;
  status: string;
  due_at: string;
  started_at: string;
  completed_at: string;
  sla_hours: number;
  external_completion: boolean;
  required_attachments: string[] | any;
  assignee: {
    full_name: string;
    email: string;
  } | null;
  owner_group: {
    name: string;
  } | null;
}

interface OnboardingTaskCardProps {
  task: Task;
  onUpdate: () => void;
}

export function OnboardingTaskCard({ task, onUpdate }: OnboardingTaskCardProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(task.status);
  const [comment, setComment] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [groupMembers, setGroupMembers] = useState<Array<{user_id: string, full_name: string, email: string}>>([]);

  useEffect(() => {
    if (isAssignDialogOpen) {
      loadGroupMembers();
    }
  }, [isAssignDialogOpen]);

  const loadGroupMembers = async () => {
    try {
      // Get all active users for now - in a real system you'd filter by the task's owner group
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;

      setGroupMembers(data || []);
    } catch (error) {
      console.error("Error loading group members:", error);
    }
  };

  const handleAssignTask = async () => {
    if (!selectedAssignee) return;

    setAssigning(true);
    try {
      // Use the 5-parameter version by always passing p_candidate_email (can be null)
      const { error } = await supabase.rpc("update_task_status", {
        p_task_id: task.id,
        p_status: task.status, // Keep current status
        p_comment: null, // No comment for assignment
        p_assignee: selectedAssignee,
        p_candidate_email: null // Always pass this parameter for function disambiguation
      });

      if (error) throw error;

      // Send email notification
      const assignee = groupMembers.find(m => m.user_id === selectedAssignee);
      if (assignee) {
        try {
          // Get candidate name from journey data
          const { data: journeyData, error: journeyError } = await supabase
            .from('onboarding_tasks')
            .select(`
              journey_id,
              onboarding_journeys!inner(
                candidate:candidates!inner(full_name)
              )
            `)
            .eq('id', task.id)
            .single();

          const candidateName = journeyData?.onboarding_journeys?.candidate?.full_name || 'Unknown Candidate';

          await supabase.functions.invoke('send-task-assignment-email', {
            body: {
              taskId: task.id,
              assigneeUserId: selectedAssignee,
              taskName: task.name,
              candidateName: candidateName,
              dueDate: task.due_at
            }
          });
        } catch (emailError) {
          console.error("Email notification failed:", emailError);
          // Don't fail the assignment if email fails
        }
      }

      toast({
        title: "Success",
        description: `Task assigned to ${assignee?.full_name}`,
      });

      setIsAssignDialogOpen(false);
      setSelectedAssignee("");
      onUpdate();
    } catch (error) {
      console.error("Error assigning task:", error);
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const isOverdue = task.status !== 'completed' && task.status !== 'skipped' && task.status !== 'waiting_for_dependency' && new Date(task.due_at) < new Date();
  const dueDate = new Date(task.due_at);
  const isNearDue = !isOverdue && task.status !== 'completed' && task.status !== 'skipped' && task.status !== 'waiting_for_dependency' && 
    (dueDate.getTime() - Date.now()) < (24 * 60 * 60 * 1000); // Due within 24 hours

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'blocked':
        return <Pause className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-gray-500" />;
      case 'waiting_for_dependency':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-800';
      case 'waiting_for_dependency':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getBlockColor = () => {
    switch (task.block) {
      case 'HR':
        return 'bg-blue-500';
      case 'IT':
        return 'bg-green-500';
      case 'Facilities':
        return 'bg-purple-500';
      case 'Finance':
        return 'bg-yellow-500';
      case 'Vendor':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleStatusUpdate = async () => {
    if (newStatus === task.status && !comment.trim() && (!task.name.includes("Create User Accounts") || !candidateEmail.trim())) {
      setIsDialogOpen(false);
      return;
    }

    // Validate email for Create User Accounts task
    if (task.name.includes("Create User Accounts") && newStatus === 'completed' && !candidateEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter the candidate's email address to complete this task.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const oldStatus = task.status;
      
      const { error } = await supabase.rpc("update_task_status", {
        p_task_id: task.id,
        p_status: newStatus,
        p_comment: comment.trim() || null,
        p_candidate_email: candidateEmail.trim() || null
      });

      if (error) throw error;

      // Get candidate and user details for notification
      const { data: journeyData, error: journeyError } = await supabase
        .from('onboarding_tasks')
        .select(`
          journey_id,
          onboarding_journeys!inner(
            candidate:candidates!inner(full_name, email)
          )
        `)
        .eq('id', task.id)
        .single();

      const candidateName = journeyData?.onboarding_journeys?.candidate?.full_name || 'Unknown Candidate';
      const existingCandidateEmail = journeyData?.onboarding_journeys?.candidate?.email;

      // Get current user details
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user?.id)
        .single();

      // Send status change notification
      try {
        await supabase.functions.invoke('send-task-status-notification', {
          body: {
            taskId: task.id,
            taskName: task.name,
            oldStatus: oldStatus,
            newStatus: newStatus,
            comment: comment.trim() || undefined,
            candidateName: candidateName,
            candidateEmail: candidateEmail.trim() || existingCandidateEmail,
            updatedByName: userProfile?.full_name || 'Unknown User',
            updatedByEmail: userProfile?.email || user?.email || 'unknown@example.com'
          }
        });
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
        // Don't fail the status update if email fails
      }

      toast({
        title: "Success",
        description: `Task status updated to ${newStatus.replace('_', ' ')}`,
      });

      setIsDialogOpen(false);
      setComment("");
      setCandidateEmail("");
      onUpdate();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const generateExternalLink = async () => {
    try {
      // Get candidate email from journey data
      const { data: journeyData, error: journeyError } = await supabase
        .from('onboarding_tasks')
        .select(`
          journey_id,
          onboarding_journeys!inner(
            candidate:candidates!inner(email, full_name)
          )
        `)
        .eq('id', task.id)
        .single();

      if (journeyError) throw journeyError;

      const candidateEmail = journeyData?.onboarding_journeys?.candidate?.email;
      const candidateName = journeyData?.onboarding_journeys?.candidate?.full_name;

      if (!candidateEmail) {
        toast({
          title: "Error",
          description: "Unable to find candidate email address",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-task-external-link', {
        body: { 
          task_id: task.id,
          task_name: task.name,
          candidate_email: candidateEmail,
          candidate_name: candidateName
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "External completion link sent successfully",
      });
    } catch (error) {
      console.error("Error generating external link:", error);
      toast({
        title: "Error",
        description: "Failed to generate external completion link",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`${
      isOverdue ? 'border-red-500 bg-red-50' : 
      isNearDue ? 'border-yellow-500 bg-yellow-50' : 
      task.status === 'waiting_for_dependency' ? 'border-orange-500 bg-orange-50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getBlockColor()}`} />
              {task.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {task.block}
              </Badge>
              <Badge className={`text-xs ${getStatusColor()}`}>
                {getStatusIcon()}
                {task.status === 'waiting_for_dependency' ? 'WAITING FOR DEPENDENCY' : task.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          {isOverdue && <AlertCircle className="h-5 w-5 text-red-500" />}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}

        {task.status === 'waiting_for_dependency' && (
          <div className="bg-orange-100 border border-orange-200 rounded-md p-3">
            <p className="text-sm text-orange-800 font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Waiting for "Create User Accounts" to complete
            </p>
            <p className="text-xs text-orange-700 mt-1">
              This task cannot start until the Create User Accounts task is completed first.
            </p>
          </div>
        )}
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Due:</span>
            <span className={isOverdue ? 'text-red-600 font-medium' : isNearDue ? 'text-yellow-600 font-medium' : ''}>
              {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {task.assignee && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assigned to:</span>
              <span>{task.assignee.full_name}</span>
            </div>
          )}
          
          {task.owner_group && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Team:</span>
              <span>{task.owner_group.name}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {task.status !== 'waiting_for_dependency' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Task Status</DialogTitle>
                  <DialogDescription>
                    Update the status of "{task.name}" and add optional comments
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="skipped">Skipped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {task.name.includes("Create User Accounts") && newStatus === 'completed' && (
                    <div>
                      <label className="text-sm font-medium">Candidate Email Address *</label>
                      <Input
                        type="email"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        placeholder="Enter the email address created for the candidate"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This email will be used for all future task notifications for this candidate.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium">Comments (Optional)</label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add any comments about this update..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleStatusUpdate} disabled={updating}>
                      {updating ? "Updating..." : "Update"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {task.status !== 'waiting_for_dependency' && (
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Assign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Task</DialogTitle>
                  <DialogDescription>
                    Assign "{task.name}" to a team member. They will receive an email notification.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Assign to</label>
                    <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.full_name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleAssignTask} disabled={assigning || !selectedAssignee}>
                      {assigning ? "Assigning..." : "Assign Task"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {task.status !== 'waiting_for_dependency' && task.external_completion && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateExternalLink}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Send Link
            </Button>
          )}

          {task.status === 'waiting_for_dependency' && (
            <div className="w-full text-center text-sm text-muted-foreground py-2">
              Task actions will be available once dependency is completed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}