import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Network,
} from 'lucide-react';
import { OnboardingTaskCard } from '@/components/OnboardingTaskCard';
import { TaskGraph } from '@/components/TaskGraph';

interface Journey {
  id: string;
  status: string;
  doj: string;
  geo: string;
  location: string;
  created_at: string;
  candidate: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    date_of_joining: string;
  };
  template: {
    id: string;
    name: string;
    version: number;
  };
}

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

const BLOCKS = [
  { value: 'HR', label: 'HR', color: 'bg-blue-500' },
  { value: 'IT', label: 'IT', color: 'bg-green-500' },
  { value: 'Facilities', label: 'Facilities', color: 'bg-purple-500' },
  { value: 'Finance', label: 'Finance', color: 'bg-yellow-500' },
  { value: 'Vendor', label: 'Vendor', color: 'bg-orange-500' },
];

export default function OnboardingWorkspace() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<
    Array<{ task_id: string; depends_on_task_id: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('view') === 'flowchart' ? 'flowchart' : 'swimlanes') as
    | 'swimlanes'
    | 'flowchart';
  const [tabValue, setTabValue] = useState<'swimlanes' | 'flowchart'>(initialTab);

  useEffect(() => {
    if (candidateId && user) {
      loadJourneyData();
    }
  }, [candidateId, user]);

  const loadJourneyData = async () => {
    try {
      // Load journey details
      const { data: journeyData, error: journeyError } = await supabase
        .from('onboarding_journeys')
        .select(
          `
          *,
          candidate:candidates(id, first_name, last_name, email, phone_number, date_of_joining),
          template:onboarding_templates(id, name, version)
        `
        )
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (journeyError) throw journeyError;

      if (!journeyData) {
        console.log('No onboarding journey found for candidate:', candidateId);
        setJourney(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      setJourney(journeyData);

      // Load tasks for this journey
      const { data: tasksData, error: tasksError } = await supabase
        .from('onboarding_tasks')
        .select(
          `
          *,
          assignee:profiles(full_name, email),
          owner_group:owner_groups(name)
        `
        )
        .eq('journey_id', journeyData.id)
        .order('block', { ascending: true })
        .order('due_at', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Load task dependencies from the actual onboarding tasks table
      if (tasksData && tasksData.length > 0) {
        let taskDependencies: Array<{ task_id: string; depends_on_task_id: string }> = [];

        // Primary: dependencies based on a depends_on field in tasks (if present)
        tasksData.forEach((task: any) => {
          if (task.depends_on) {
            taskDependencies.push({
              task_id: task.id,
              depends_on_task_id: task.depends_on,
            });
          }
        });

        // Fallback: derive dependencies from the template if none found on tasks
        if (taskDependencies.length === 0 && journeyData?.template?.id) {
          const { data: tplTasks } = await supabase
            .from('onboarding_task_templates')
            .select('id, name, block')
            .eq('template_id', journeyData.template.id);

          const templateTaskIds = (tplTasks || []).map((t) => t.id);
          if (templateTaskIds.length > 0) {
            const { data: tplDeps } = await supabase
              .from('onboarding_task_template_dependencies')
              .select('task_template_id, depends_on_task_template_id')
              .in('task_template_id', templateTaskIds);

            const tplById = new Map((tplTasks || []).map((t) => [t.id, t]));
            const actualByKey = new Map<string, any>();
            (tasksData || []).forEach((t: any) => {
              actualByKey.set(`${t.name}|${t.block}`, t);
            });

            (tplDeps || []).forEach((dep) => {
              const srcTpl: any = tplById.get(dep.task_template_id);
              const dstTpl: any = tplById.get(dep.depends_on_task_template_id);
              if (!srcTpl || !dstTpl) return;
              const srcActual = actualByKey.get(`${srcTpl.name}|${srcTpl.block}`);
              const dstActual = actualByKey.get(`${dstTpl.name}|${dstTpl.block}`);
              if (srcActual && dstActual) {
                taskDependencies.push({ task_id: srcActual.id, depends_on_task_id: dstActual.id });
              }
            });
          }
        }

        console.log('Final dependencies for TaskGraph:', taskDependencies);
        setDependencies(taskDependencies);
      }
    } catch (error) {
      console.error('Error loading journey data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load onboarding journey',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = () => {
    // Reload data after task update
    loadJourneyData();
  };

  const getJourneyProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter((task) => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getOverdueTasks = () => {
    return tasks.filter(
      (task) =>
        task.status !== 'completed' &&
        task.status !== 'skipped' &&
        new Date(task.due_at) < new Date()
    ).length;
  };

  const getDaysToJoining = () => {
    if (!journey?.candidate?.date_of_joining) return null;
    const doj = new Date(journey.candidate.date_of_joining);
    const today = new Date();
    const diffTime = doj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Journey Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The onboarding journey you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/candidates')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const daysToJoining = getDaysToJoining();
  const overdueTasks = getOverdueTasks();
  const progress = getJourneyProgress();

  return (
    <div className="min-h-screen bg-background">
      <div className="py-8 px-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/candidates')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Onboarding Journey</h1>
            <p className="text-muted-foreground">
              {journey.candidate.first_name} {journey.candidate.last_name} • {journey.template.name}
            </p>
          </div>
        </div>

        {/* Journey Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Journey Overview</span>
              <Badge variant={journey.status === 'completed' ? 'default' : 'secondary'}>
                {journey.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {tasks.filter((t) => t.status === 'completed').length} of {tasks.length} tasks
                  completed
                </p>
              </div>

              {/* Days to Joining */}
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Days to Joining</p>
                  <p className="text-lg font-bold">
                    {daysToJoining !== null
                      ? daysToJoining > 0
                        ? `${daysToJoining} days`
                        : daysToJoining === 0
                          ? 'Today!'
                          : `${Math.abs(daysToJoining)} days ago`
                      : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Overdue Tasks */}
              <div className="flex items-center gap-3">
                <AlertCircle
                  className={`h-8 w-8 ${overdueTasks > 0 ? 'text-red-500' : 'text-green-500'}`}
                />
                <div>
                  <p className="text-sm font-medium">SLA Breaches</p>
                  <p className="text-lg font-bold">{overdueTasks}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-lg font-bold">{journey.location || 'Not set'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Views */}
        <Tabs
          value={tabValue}
          onValueChange={(v) => {
            setTabValue(v as 'swimlanes' | 'flowchart');
            setSearchParams((prev) => {
              const sp = new URLSearchParams(prev);
              sp.set('view', v);
              return sp;
            });
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="swimlanes">Swimlanes View</TabsTrigger>
            <TabsTrigger value="flowchart" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Flowchart View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="swimlanes" className="space-y-6 mt-6">
            {/* Swimlanes by Block */}
            {BLOCKS.map((block) => {
              const blockTasks = tasks.filter((task) => task.block === block.value);

              if (blockTasks.length === 0) return null;

              return (
                <Card key={block.value}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${block.color}`} />
                      {block.label} Tasks
                      <Badge variant="outline">
                        {blockTasks.filter((t) => t.status === 'completed').length} /{' '}
                        {blockTasks.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>Tasks assigned to the {block.label} team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {blockTasks.map((task) => (
                        <OnboardingTaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {tasks.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No tasks found for this journey.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="flowchart" className="mt-6">
            {tasks.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Task Dependencies Flowchart
                  </CardTitle>
                  <CardDescription>
                    Visual representation of task flow and dependencies. Tasks are organized by
                    block and show their relationships.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TaskGraph
                    tasks={tasks.map((task) => ({
                      id: task.id,
                      title: task.name,
                      status: task.status as 'pending' | 'in_progress' | 'completed' | 'blocked',
                      block: task.block,
                      assignee: task.assignee?.full_name,
                      due_date: task.due_at,
                    }))}
                    dependencies={dependencies}
                    onTaskClick={(taskId) => {
                      console.log('Task clicked:', taskId);
                      // You can add task detail modal here if needed
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No tasks found for this journey.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
