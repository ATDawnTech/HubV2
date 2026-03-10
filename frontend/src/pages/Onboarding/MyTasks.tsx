import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
};

interface Assignee {
  full_name: string;
  email: string;
}

interface MyTask {
  id: string;
  task_name: string;
  task_description: string;
  task_status: string;
  due_at: string;
  started_at: string;
  completed_at: string;
  candidate_name: string;
  candidate_email: string;
  journey_id: string;
  block: string;
  sla_hours: number;
  is_overdue: boolean;
  external_completion: boolean;
  required_attachments: any;
  assignee_name: string;
  assignee_email: string;
  owner_group_name: string;
  assignees: Assignee[];
}

export default function MyTasks() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // No filter states needed anymore
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]); // Only refetch when user changes or on explicit refresh

  // Derive stats and filtered tasks from raw fetched tasks
  const { filteredTasks, stats: taskStats } = (() => {
    // 1. First apply search filtering
    const searchFiltered = searchTerm
      ? tasks.filter(
          (t) =>
            t.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.owner_group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.task_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.assignees.some((m) => m.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : tasks;

    // 2. Calculate stats based on search results
    const currentStats = {
      total: searchFiltered.length,
      todo: searchFiltered.filter((t) => t.task_status === 'todo' && !t.is_overdue).length,
      inProgress: searchFiltered.filter((t) => t.task_status === 'in_progress').length,
      completed: searchFiltered.filter((t) => t.task_status === 'completed').length,
      overdue: searchFiltered.filter((t) => t.is_overdue).length,
    };

    // 3. Finally apply status filter for display
    const finalFiltered =
      activeStatusFilter === 'all'
        ? searchFiltered
        : activeStatusFilter === 'overdue'
          ? searchFiltered.filter((t) => t.is_overdue)
          : searchFiltered.filter((t) => t.task_status === activeStatusFilter && !t.is_overdue);

    return { filteredTasks: finalFiltered, stats: currentStats };
  })();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // 1. Get current user's owner groups
      const { data: groupData, error: groupError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id);

      if (groupError) throw groupError;
      const userGroupIds = (groupData || []).map((gm) => gm.group_id);

      if (userGroupIds.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // 2. Fetch tasks from onboarding_tasks
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select(
          `
          id,
          name,
          description,
          status,
          due_at,
          started_at,
          completed_at,
          sla_hours,
          external_completion,
          required_attachments,
          block,
          journey:onboarding_journeys!inner (
            id,
            status,
            candidate:candidates (
              id,
              first_name,
              last_name,
              email 
            )
          ),
          owner_group:owner_groups (
            id,
            name
          ),
          task_assignees (
            user:profiles (
              full_name,
              email
            )
          ),
          updated_at
        `
        )
        .in('journey.status', ['in_progress', 'completed'])
        .in('owner_group_id', userGroupIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Identify and update overdue tasks in the database
      const now = new Date();
      const overdueTasksToUpdate = (data || []).filter(
        (t) =>
          t.status !== 'completed' && t.status !== 'overdue' && t.due_at && new Date(t.due_at) < now
      );

      if (overdueTasksToUpdate.length > 0) {
        const updateIds = overdueTasksToUpdate.map((t) => t.id);
        const { error: updateError } = await supabase
          .from('onboarding_tasks')
          .update({ status: 'overdue', updated_at: now.toISOString() })
          .in('id', updateIds);

        if (!updateError) {
          data?.forEach((t) => {
            if (updateIds.includes(t.id)) {
              t.status = 'overdue';
            }
          });
        }
      }

      const transformedTasks: MyTask[] = (data || []).map((t: any) => {
        const isOverdue =
          t.status === 'overdue' ||
          (t.due_at ? new Date(t.due_at) < new Date() && t.status !== 'completed' : false);

        return {
          id: t.id,
          task_name: t.name,
          task_description: t.description || '',
          task_status: t.status,
          due_at: t.due_at ? format(new Date(t.due_at), 'dd/MM/yyyy, hh:mm a') : 'No due date',
          started_at: t.started_at,
          completed_at: t.completed_at,
          candidate_name:
            t.journey?.candidate?.first_name + ' ' + t.journey?.candidate?.last_name || 'Unknown',
          candidate_email: t.journey?.candidate?.email || '',
          journey_id: t.journey?.id || '',
          block: t.block,
          sla_hours: t.sla_hours,
          is_overdue: isOverdue,
          external_completion: t.external_completion,
          required_attachments: t.required_attachments,
          assignee_name: '',
          assignee_email: '',
          owner_group_name: t.owner_group?.name || 'Unknown Group',
          assignees: (t.task_assignees || []).map((m: any) => ({
            full_name: m.user?.full_name || 'Unknown',
            email: m.user?.email || '',
          })),
        };
      });

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const now = new Date().toISOString();
      const updates: any = {
        status: newStatus,
        updated_at: now,
      };

      if (newStatus === 'in_progress') {
        updates.started_at = now;
      } else if (newStatus === 'completed') {
        updates.completed_at = now;
      }

      const { error } = await supabase.from('onboarding_tasks').update(updates).eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Task marked as ${newStatus.replace('_', ' ')}.`,
      });

      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status.',
        variant: 'destructive',
      });
    }
  };

  const restartTask = async (taskId: string, slaHours: number) => {
    try {
      const now = new Date();
      const newDueAt = new Date(now.getTime() + (slaHours || 0) * 60 * 60 * 1000);

      const updates: any = {
        status: 'todo',
        started_at: now.toISOString(),
        completed_at: null,
        due_at: newDueAt.toISOString(),
        updated_at: now.toISOString(),
      };

      const { error } = await supabase.from('onboarding_tasks').update(updates).eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Task restarted with a fresh deadline.',
      });

      fetchTasks();
    } catch (error) {
      console.error('Error restarting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to restart task.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 uppercase">
          OVERDUE
        </span>
      );
    }
    switch (status) {
      case 'todo':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase">
            TO DO
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 uppercase">
            IN PROGRESS
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 uppercase">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
            {status}
          </span>
        );
    }
  };

  const columns = [
    {
      title: 'Task Name',
      dataIndex: 'task_name',
      key: 'task_name',
      render: (text: string) => (
        <span className="font-semibold text-slate-900 dark:text-white">{text}</span>
      ),
    },
    {
      title: 'Employee Name',
      dataIndex: 'candidate_name',
      key: 'candidate_name',
      render: (text: string) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
      ),
    },
    {
      title: 'Owner Group',
      dataIndex: 'owner_group_name',
      key: 'owner_group_name',
      render: (text: string, record: MyTask) => (
        <div className="flex flex-col gap-2 py-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
          <div className="flex -space-x-2 overflow-hidden">
            {record.assignees.slice(0, 3).map((member, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-orange-100 dark:bg-orange-900/30 text-[10px] font-bold text-primary cursor-help">
                    {getInitials(member.full_name)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{member.full_name}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {record.assignees.length > 3 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400 cursor-help">
                    +{record.assignees.length - 3}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    {record.assignees.slice(3).map((member, i) => (
                      <p key={i}>{member.full_name}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'task_description',
      key: 'task_description',
      render: (text: string) => (
        <span
          className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate block"
          title={text}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_at',
      key: 'due_at',
      render: (text: string, record: MyTask) => (
        <span
          className={cn(
            'text-sm whitespace-nowrap font-medium',
            record.is_overdue ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'
          )}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'task_status',
      key: 'task_status',
      render: (status: string, record: MyTask) => getStatusBadge(status, record.is_overdue),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: MyTask) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors ml-4 focus:outline-none"
                aria-label="More actions"
              >
                <span className="material-symbols-outlined block text-slate-400 hover:text-primary transition-colors">
                  more_vert
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(record.task_status === 'todo' ||
                (record.task_status === 'overdue' && !record.started_at)) && (
                <DropdownMenuItem
                  className="gap-3"
                  onClick={() => updateTaskStatus(record.id, 'in_progress')}
                >
                  <span className="material-symbols-outlined text-[20px]">play_circle</span>
                  Start Work
                </DropdownMenuItem>
              )}
              {record.task_status === 'in_progress' && (
                <>
                  <DropdownMenuItem
                    className="gap-3"
                    onClick={() => updateTaskStatus(record.id, 'completed')}
                  >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-3"
                    onClick={() => updateTaskStatus(record.id, 'todo')}
                  >
                    <span className="material-symbols-outlined text-[20px]">assignment_return</span>
                    Move to Backlog
                  </DropdownMenuItem>
                </>
              )}
              {record.is_overdue && (
                <DropdownMenuItem
                  className="gap-3"
                  onClick={() => restartTask(record.id, record.sla_hours)}
                >
                  <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                  Start Again
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Tasks</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Manage your onboarding tasks and assignments
            </p>
          </div>
          <div className="flex-1 max-w-2xl relative">
            <div className="relative flex items-center group">
              <span className="absolute left-3 material-symbols-outlined text-slate-400">
                search
              </span>
              <input
                className="w-full pl-10 pr-12 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:ring-primary focus:border-primary focus:outline-none"
                placeholder="Search tasks, candidates, or teams..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div
            onClick={() => setActiveStatusFilter('all')}
            className={cn(
              'bg-white dark:bg-slate-900 p-5 rounded-xl border flex items-start justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.02]',
              activeStatusFilter === 'all'
                ? 'border-slate-500 ring-1 ring-slate-500'
                : 'border-slate-200 dark:border-slate-800'
            )}
          >
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tasks</p>
              <p className="text-2xl font-bold mt-1">{taskStats.total}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined">assignment</span>
            </div>
          </div>
          <div
            onClick={() => setActiveStatusFilter('todo')}
            className={cn(
              'bg-white dark:bg-slate-900 p-5 rounded-xl border flex items-start justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.02]',
              activeStatusFilter === 'todo'
                ? 'border-amber-500 ring-1 ring-amber-500'
                : 'border-slate-200 dark:border-slate-800'
            )}
          >
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">To Do</p>
              <p className="text-2xl font-bold mt-1">{taskStats.todo}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <div
            onClick={() => setActiveStatusFilter('in_progress')}
            className={cn(
              'bg-white dark:bg-slate-900 p-5 rounded-xl border flex items-start justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.02]',
              activeStatusFilter === 'in_progress'
                ? 'border-indigo-500 ring-1 ring-indigo-500'
                : 'border-slate-200 dark:border-slate-800'
            )}
          >
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">In Progress</p>
              <p className="text-2xl font-bold mt-1">{taskStats.inProgress}</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined">rotate_right</span>
            </div>
          </div>
          <div
            onClick={() => setActiveStatusFilter('completed')}
            className={cn(
              'bg-white dark:bg-slate-900 p-5 rounded-xl border flex items-start justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.02]',
              activeStatusFilter === 'completed'
                ? 'border-emerald-500 ring-1 ring-emerald-500'
                : 'border-slate-200 dark:border-slate-800'
            )}
          >
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Completed</p>
              <p className="text-2xl font-bold mt-1">{taskStats.completed}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
          <div
            onClick={() => setActiveStatusFilter('overdue')}
            className={cn(
              'bg-white dark:bg-slate-900 p-5 rounded-xl border flex items-start justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.02]',
              activeStatusFilter === 'overdue'
                ? 'border-red-500 ring-1 ring-red-500'
                : 'border-slate-200 dark:border-slate-800'
            )}
          >
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overdue</p>
              <p
                className={cn(
                  'text-2xl font-bold mt-1',
                  taskStats.overdue > 0 ? 'text-red-600' : ''
                )}
              >
                {taskStats.overdue}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined">error_outline</span>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          loading={loading}
          className="mb-8"
        />
      </div>
    </TooltipProvider>
  );
}
