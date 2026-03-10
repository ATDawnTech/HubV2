import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { DataTable, EditTaskScheduleDialog } from '@/components';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import FileUpload from '@/components/ui/FileUpload';
import StartOnboardingDialog from '@/components/Onboarding/StartOnboardingDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import {
  MoreVertical,
  AlertTriangle,
  PlayCircle,
  Ban,
  CheckCircle2,
  Eye,
  Calendar as CalendarIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'detail' | 'activity'>('detail');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isStartOnboardingOpen, setIsStartOnboardingOpen] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [selectedTaskForSchedule, setSelectedTaskForSchedule] = useState<any>(null);

  const { data: candidate, isLoading: isLoadingCandidate } = useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select(
          `
          *,
          hiring_manager_profile:profiles!candidates_hiring_manager_fkey(full_name),
          survey:hiring_surveys(role_title, hiring_manager_name, hiring_manager_email)
        `
        )
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const {
    data: journey,
    isLoading: isLoadingJourney,
    refetch: refetchJourney,
  } = useQuery({
    queryKey: ['journey', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_journeys')
        .select(
          `
          *,
          onboarding_templates (
            name
          )
        `
        )
        .eq('candidate_id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const effectiveStatus = journey?.status?.replace('_', ' ') || 'not started';

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['onboarding-tasks', journey?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select(
          `
          *,
          task_assignees(
            profiles:assignee_id(full_name, email)
          ),
          owner_group:owner_groups(name)
        `
        )
        .eq('journey_id', journey?.id)
        .order('due_at');
      if (error) throw error;
      return data || [];
    },
    enabled: !!journey?.id,
  });

  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['candidate-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_activities')
        .select(
          `
          *,
          user:profiles!candidate_activities_actor_id_fkey(full_name, email)
        `
        )
        .eq('candidate_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const updateResumeMutation = useMutation({
    mutationFn: async ({
      file,
      removeExisting,
    }: {
      file: File | null;
      removeExisting: boolean;
    }) => {
      let newResumeUrl = candidate?.resume_url || '';

      if (removeExisting && !file) {
        newResumeUrl = '';
      }

      if (file) {
        try {
          const urlData = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-s3-presigned-url`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                bucket: import.meta.env.VITE_DOCUMENTS_S3_BUCKET,
                operation: 'put',
                fileNames: [file.name],
                expires_in: 3600,
              }),
            }
          );

          const { urls, error: uploadErr } = await urlData.json();
          if (uploadErr || !urls || urls.length === 0) {
            throw new Error(uploadErr || 'Failed to get presigned URL');
          }

          const { url, newFileName } = urls[0];
          const body = new FormData();
          body.append('file', file);
          const uploadResponse = await fetch(url, {
            method: 'PUT',
            body: body,
            headers: {
              'Content-Type': file.type,
              'Access-Control-Allow-Origin': '*',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload to S3');
          }

          newResumeUrl = newFileName;
        } catch (err: any) {
          console.error('File upload failed:', err);
          throw err;
        }
      }

      const { error } = await supabase
        .from('candidates')
        .update({ resume_url: newResumeUrl })
        .eq('id', id);

      if (error) throw error;

      return newResumeUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      setResumeFile(null);
      toast({
        title: 'Success',
        description: 'Resume updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update resume: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      // If journey doesn't exist, we can't update its status
      if (!journey) throw new Error('No active onboarding journey found');

      const { error } = await supabase
        .from('onboarding_journeys')
        .update({ status: newStatus.replace(' ', '_') })
        .eq('id', journey.id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['journey', id] });
      toast({
        title: 'Status Updated',
        description: `Candidate status updated to ${newStatus}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleDownload = async () => {
    if (!candidate?.resume_url) return;
    try {
      const urlData = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-s3-presigned-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            bucket: import.meta.env.VITE_DOCUMENTS_S3_BUCKET,
            operation: 'get',
            fileNames: [candidate.resume_url],
            expires_in: 3600,
          }),
        }
      );

      const { urls, error: downloadErr } = await urlData.json();
      if (downloadErr || !urls || urls.length === 0) {
        throw new Error(downloadErr || 'Failed to get presigned URL');
      }

      const { url } = urls[0];
      window.open(url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Error',
        description: 'Failed to generate download link.',
        variant: 'destructive',
      });
    }
  };

  useBreadcrumbs([
    { label: 'Candidates', href: '/onboarding/candidates' },
    { label: candidate ? `${candidate.first_name} ${candidate.last_name}` : '...', active: true },
  ]);

  const onboardingTaskColumns = [
    {
      title: 'Task Name',
      key: 'name',
      render: (_: any, record: any) => (
        <span className="font-semibold text-slate-900 dark:text-white">{record.name}</span>
      ),
    },
    {
      title: 'Due Date',
      key: 'due_at',
      render: (_: any, record: any) => {
        const isOverdue =
          record.due_at && new Date(record.due_at) < new Date() && record.status !== 'completed';
        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm',
                isOverdue ? 'text-red-500 font-medium' : 'text-slate-600 dark:text-slate-400'
              )}
            >
              {record.due_at
                ? new Intl.DateTimeFormat('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(record.due_at))
                : 'N/A'}
            </span>
            {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
          </div>
        );
      },
    },
    {
      title: 'Owner Group',
      key: 'owner_group',
      render: (_: any, record: any) => (
        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
            getOwnerGroupBadgeColor(record.owner_group?.name)
          )}
        >
          {record.owner_group?.name || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Assignee',
      key: 'assignee',
      render: (_: any, record: any) => {
        const assignees = record.task_assignees || [];
        if (assignees.length === 0) return <span className="text-slate-400 italic font-normal text-sm">N/A</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {assignees.map((ta: any, idx: number) => (
              <span key={idx} className="text-sm text-slate-600 dark:text-slate-400">
                {ta.profiles?.full_name}{idx < assignees.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => (
        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
            getTaskStatusBadgeColor(record.status)
          )}
        >
          {formatTaskStatus(record.status)}
        </span>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      render: (_: any, record: any) => (
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[250px]">
          {record.description || 'N/A'}
        </p>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: any) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="cursor-pointer gap-2 py-2.5">
                <Info className="h-4 w-4 text-slate-500" />
                <span>View Task Details</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 py-2.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTaskForSchedule(record);
                  setIsEditScheduleOpen(true);
                }}
              >
                <CalendarIcon className="h-4 w-4 text-slate-500" />
                <span>Edit Scheduled Date</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4" />
                <span>Delete Task</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (isLoadingCandidate || isLoadingJourney) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  return (
    <div className="flex flex-col min-w-0 min-h-full">
      {/* Profile Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {candidate.first_name} {candidate.last_name}
        </h1>
        <div className="flex items-center gap-3">
          {(effectiveStatus === 'not started' || effectiveStatus === 'draft') && (
            <Button
              className="bg-[#EF6831] hover:bg-[#EF6831]/90 text-white flex items-center gap-2 px-5"
              onClick={() => setIsStartOnboardingOpen(true)}
            >
              <PlayCircle className="h-4 w-4" />
              Start Onboarding
            </Button>
          )}

          {effectiveStatus === 'in progress' && (
            <>
              <Button
                className="bg-[#f97316] hover:bg-[#f97316]/90 text-white flex items-center gap-2"
                onClick={() => setShowStopConfirm(true)}
              >
                <Ban className="h-4 w-4" />
                Stop Onboarding
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 px-5"
                onClick={() => setShowCompleteConfirm(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Complete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 mb-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('detail')}
            className={cn(
              'pb-4 text-sm transition-colors',
              activeTab === 'detail'
                ? 'font-semibold text-primary border-b-2 border-primary'
                : 'font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            Candidate Detail
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'pb-4 text-sm transition-colors',
              activeTab === 'activity'
                ? 'font-semibold text-primary border-b-2 border-primary'
                : 'font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            Activity
          </button>
        </div>
      </div>

      <div className="space-y-8 pb-12">
        {activeTab === 'detail' ? (
          <>
            {/* General Information Card */}
            <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    General Information
                  </h2>
                  <span
                    className={cn(
                      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border',
                      effectiveStatus === 'in progress'
                        ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50'
                        : effectiveStatus === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    )}
                  >
                    {effectiveStatus === 'in progress' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2 animate-pulse"></span>
                    )}
                    {effectiveStatus
                      ? effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)
                      : 'Not Started'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                  <div className="space-y-8">
                    <InfoItem label="First Name" value={candidate.first_name} />
                    <InfoItem label="Last Name" value={candidate.last_name} />
                    <InfoItem label="Work Email" value={candidate.work_email} />
                    <InfoItem label="Date of Joining" value={candidate.date_of_joining} />
                    <InfoItem label="Phone Number" value={candidate.phone_number} />
                    <InfoItem label="Type of Joining" value={candidate.type_of_joining} />
                  </div>
                  <div className="space-y-8">
                    <InfoItem label="Personal Email Address" value={candidate.email} />
                    <InfoItem
                      label="Hiring Manager"
                      value={
                        candidate.hiring_manager_profile?.full_name ||
                        candidate.survey?.hiring_manager_name ||
                        'N/A'
                      }
                    />
                    <InfoItem label="Address" value={candidate.address} />
                    <div className="space-y-3">
                      <FileUpload
                        label="Upload File"
                        value={resumeFile}
                        onChange={setResumeFile}
                        existingUrl={candidate.resume_url}
                        onDownload={handleDownload}
                        onRemoveExisting={() => {
                          if (
                            window.confirm('Are you sure you want to remove the existing resume?')
                          ) {
                            updateResumeMutation.mutate({ file: null, removeExisting: true });
                          }
                        }}
                      />
                      {resumeFile && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateResumeMutation.mutate({ file: resumeFile, removeExisting: false })
                          }
                          disabled={updateResumeMutation.isPending}
                          className="bg-[#EF6831] hover:bg-[#EF6831]/90 text-white"
                        >
                          {updateResumeMutation.isPending ? 'Uploading...' : 'Save New Resume'}
                        </Button>
                      )}
                    </div>
                    <InfoItem label="Location" value={candidate.location} />
                    <InfoItem
                      label="Requisition Record"
                      value={candidate.survey?.role_title || 'N/A'}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Onboarding Tasks Section */}
            {journey && (
              <div className="mt-8 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Onboarding Tasks
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Onboarding Template:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {(journey as any).onboarding_templates?.name || 'N/A'}
                    </span>
                  </p>
                </div>

                <DataTable
                  columns={onboardingTaskColumns}
                  dataSource={tasks}
                  rowKey="id"
                  loading={isLoadingTasks}
                  pageSize={10}
                />
              </div>
            )}
          </>
        ) : (
          <ActivityTimeline activities={activities} candidateId={id!} />
        )}
      </div>

      <StartOnboardingDialog
        open={isStartOnboardingOpen}
        onOpenChange={setIsStartOnboardingOpen}
        candidate={candidate}
        onStarted={async (success = true) => {
          if (success) {
            queryClient.invalidateQueries({ queryKey: ['journey', id] });
            queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', journey?.id] });
          }
          setIsStartOnboardingOpen(false);
        }}
      />

      <ConfirmDialog
        open={showStopConfirm}
        onOpenChange={setShowStopConfirm}
        title="Stop Onboarding"
        description="Are you sure you want to stop the onboarding journey for this candidate? This action will stop all tasks."
        onConfirm={async () => {
          await updateStatusMutation.mutateAsync('cancelled');
          setShowStopConfirm(false);
        }}
        onCancel={() => setShowStopConfirm(false)}
      />

      <ConfirmDialog
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        title="Confirm Onboarding Completion"
        description="Are you sure you want to mark this onboarding as complete? Please verify that all required tasks in the onboarding checklist have been finalized by the respective owner groups."
        onConfirm={async () => {
          await updateStatusMutation.mutateAsync('completed');
          setShowCompleteConfirm(false);
        }}
        onCancel={() => setShowCompleteConfirm(false)}
        confirmText="Mark as Complete"
        confirmButtonClassName="bg-[#f97316] hover:bg-[#ea580c] text-white"
        cancelButtonVariant="ghost"
      />

      <EditTaskScheduleDialog
        open={isEditScheduleOpen}
        onOpenChange={setIsEditScheduleOpen}
        task={selectedTaskForSchedule}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', journey?.id] });
        }}
      />
    </div>
  );
}

function getOwnerGroupBadgeColor(group?: string) {
  switch (group?.toUpperCase()) {
    case 'IT':
      return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
    case 'HR':
      return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50';
    case 'OPERATIONS':
      return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700';
  }
}

function getTaskStatusBadgeColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
    case 'in progress':
    case 'in_progress':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700';
  }
}

function formatTaskStatus(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'Done';
    case 'pending':
    case 'todo':
    case 'to do':
      return 'To Do';
    case 'in_progress':
      return 'In Progress';
    case 'waiting_for_dependency':
      return 'To Do';
    default:
      return status?.charAt(0).toUpperCase() + status?.slice(1) || 'N/A';
  }
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
        {label}
      </label>
      <p className="text-sm font-medium text-slate-900 dark:text-white">
        {value || <span className="text-slate-400 italic font-normal">N/A</span>}
      </p>
    </div>
  );
}
