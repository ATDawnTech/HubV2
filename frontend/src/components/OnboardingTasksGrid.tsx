import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Users, 
  Settings, 
  Building2, 
  DollarSign, 
  Truck,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

interface OnboardingTask {
  id: string;
  journey_id: string;
  block: string;
  name: string;
  description: string;
  status: string;
  due_at: string;
  started_at?: string;
  completed_at?: string;
  sla_hours: number;
  external_completion: boolean;
  assignee?: string;
  owner_group?: {
    name: string;
  };
}

interface OnboardingTasksGridProps {
  candidateId: string;
  candidateName: string;
}

const BLOCK_ICONS = {
  HR: Users,
  IT: Settings,
  Facilities: Building2,
  Finance: DollarSign,
  Vendor: Truck,
};

export const OnboardingTasksGrid = ({ candidateId, candidateName }: OnboardingTasksGridProps) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<OnboardingTask | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [comments, setComments] = useState('');
  const [newStatus, setNewStatus] = useState('');
  

  useEffect(() => {
    loadOnboardingTasks();
  }, [candidateId]);

  const loadOnboardingTasks = async () => {
    try {
      // First get the onboarding journey for this candidate
      const { data: journeyData, error: journeyError } = await supabase
        .from('onboarding_journeys')
        .select('id')
        .eq('candidate_id', candidateId)
        .maybeSingle();

      if (journeyError) throw journeyError;
      
      if (!journeyData) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Then get the tasks for this journey
      const { data: tasksData, error: tasksError } = await supabase
        .from('onboarding_tasks')
        .select(`
          *,
          owner_group:owner_groups(name)
        `)
        .eq('journey_id', journeyData.id)
        .order('due_at');

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading onboarding tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load onboarding tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'on_hold':
        return <PauseCircle className="h-4 w-4 text-orange-600" />;
      case 'skipped':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || !newStatus) return;

    setIsUpdating(true);
    try {
      console.log('Updating task via RPC:', { id: selectedTask.id, newStatus, hasComments: !!comments });
      const { error } = await supabase.rpc('update_task_status', {
        p_task_id: selectedTask.id,
        p_status: newStatus,
        p_comment: comments || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task status updated successfully",
      });

      setComments('');
      setNewStatus('');
      setSelectedTask(null);
      loadOnboardingTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const groupTasksByBlock = () => {
    const grouped: { [key: string]: OnboardingTask[] } = {};
    tasks.forEach(task => {
      if (!grouped[task.block]) {
        grouped[task.block] = [];
      }
      grouped[task.block].push(task);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-48"></div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No onboarding tasks found for this candidate.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks will appear once an onboarding journey is launched.
        </p>
      </div>
    );
  }

  const groupedTasks = groupTasksByBlock();

  return (
    <div className="space-y-6">
      <h4 className="font-medium text-sm text-muted-foreground">Onboarding Tasks</h4>
      
      {Object.entries(groupedTasks).map(([block, blockTasks]) => {
        const BlockIcon = BLOCK_ICONS[block as keyof typeof BLOCK_ICONS] || Settings;
        
        return (
          <div key={block} className="space-y-3">
            <div className="flex items-center gap-2">
              <BlockIcon className="h-4 w-4 text-muted-foreground" />
              <h5 className="font-medium text-sm">{block} Tasks</h5>
            </div>
            
            <div className="grid md:grid-cols-2 gap-3">
              {blockTasks.map((task) => (
                <div key={task.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(task.status)}
                        <h6 className="font-medium text-sm">{task.name}</h6>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {task.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {task.owner_group && (
                        <Badge variant="outline" className="text-xs">
                          {task.owner_group.name}
                        </Badge>
                      )}
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs cursor-pointer hover:bg-muted"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Opening task update dialog for:', task.name);
                            setSelectedTask(task);
                            setNewStatus(task.status);
                            setComments('');
                          }}
                        >
                          Update
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Task: {task.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Status</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                                <SelectItem value="skipped">Skipped</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Comments</Label>
                            <Textarea
                              value={comments}
                              onChange={(e) => setComments(e.target.value)}
                              placeholder="Add any comments about this update..."
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateTask} disabled={isUpdating}>
                              {isUpdating ? "Updating..." : "Update Task"}
                            </Button>
                            <DialogClose asChild>
                              <Button variant="outline">
                                Cancel
                              </Button>
                            </DialogClose>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {task.due_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Due: {format(new Date(task.due_at), 'PPp')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};