import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ConfirmDialog, NewEmployeeDialog, DataTable } from '@/components';
import StartOnboardingDialog from '@/components/Onboarding/StartOnboardingDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  work_email: string;
  phone_number: string;
  address: string;
  location: string;
  hiring_manager?: string;
  email: string;
  date_of_joining?: string;
  type_of_joining?: string;
  survey_id: string;
  created_at: string;
  survey?: {
    role_title: string;
    hiring_manager_name: string;
    hiring_manager_email?: string;
  };
  hiring_manager_profile?: {
    full_name: string | null;
  };
  onboarding_journeys?: {
    id: string;
    status: string;
  } | {
    id: string;
    status: string;
  }[];
  resume_url?: string;
  status?: string;
  journey_id?: string;
}

const Candidates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useBreadcrumbs([{ label: 'Candidates', active: true }]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isOpenConfirmDelete, setIsOpenConfirmDelete] = useState(false);
  const [isOpenNewEmployeeDialog, setIsOpenNewEmployeeDialog] = useState(false);
  const [isStartOnboardingOpen, setIsStartOnboardingOpen] = useState(false);
  const [candidateToStart, setCandidateToStart] = useState<Candidate | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [candidateToComplete, setCandidateToComplete] = useState<Candidate | null>(null);

  const columns = [
    {
      title: 'Full Name',
      key: 'full_name',
      render: (_, record: Candidate) => (
        <span className="font-medium text-slate-900 dark:text-white text-[16px]">
          {record.first_name} {record.last_name}
        </span>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Personal Email Address ',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Date of Joining',
      dataIndex: 'date_of_joining',
      key: 'date_of_joining',
    },
    {
      title: 'Type of Joining',
      dataIndex: 'type_of_joining',
      key: 'type_of_joining',
    },
    {
      title: 'Hiring Manager',
      dataIndex: ['hiring_manager_profile', 'full_name'],
      key: 'hiring_manager',
    },
    {
      title: 'Requisition Records',
      dataIndex: ['survey', 'role_title'],
      key: 'requisition_record',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: Candidate) => {
        const rawStatus = (record.status || 'not started').toLowerCase();
        const displayStatus = rawStatus.replace('_', ' ');
        return (
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
              rawStatus === 'in_progress'
                ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50'
                : rawStatus === 'completed'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            )}
          >
            {rawStatus === 'in_progress' && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5 animate-pulse"></span>
            )}
            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Candidate) => {
        const status = (record.status || '').toLowerCase();
        const showStart = status === 'not started';
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 hover:bg-muted rounded transition-colors ml-4"
                  aria-label="More actions"
                >
                  <span className="material-symbols-outlined block text-slate-400 hover:text-primary transition-colors">
                    more_vert
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showStart && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setCandidateToStart(record);
                      setIsStartOnboardingOpen(true);
                    }}
                  >
                    Start Onboarding
                  </DropdownMenuItem>
                )}
                {status === 'in_progress' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setCandidateToComplete(record);
                      setShowCompleteConfirm(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Mark as Complete</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCandidate(record);
                    setIsOpenNewEmployeeDialog(true);
                  }}
                >
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/onboarding/candidates/${record.id}`);
                  }}
                >
                  View detail
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCandidate(record);
                    setIsOpenConfirmDelete(true);
                  }}
                  className="text-red-600"
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
  console.log('candidates', candidates);
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load candidates with survey details and onboarding journey status
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select(
          `
          *,
          onboarding_journeys(id, status),
          hiring_manager_profile:profiles!candidates_hiring_manager_fkey(
            full_name
          ),
          survey:hiring_surveys(
            role_title,
            hiring_manager_name,
            hiring_manager_email
          )
        `
        )
        .order('created_at', { ascending: false });

      if (candidatesError || !candidatesData) {
        setCandidates([]);
      } else {
        const mappedData = (candidatesData as any[]).map((c) => {
          const journeyData = Array.isArray(c.onboarding_journeys)
            ? c.onboarding_journeys
            : (c.onboarding_journeys ? [c.onboarding_journeys] : []);

          return {
            ...c,
            status: journeyData[0]?.status || 'not started',
            journey_id: journeyData[0]?.id,
          };
        });
        setCandidates(mappedData);
      }
    } catch (error) {
      setCandidates([]);
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extracted delete logic for clarity and best practice
  const onDelete = async () => {
    if (selectedCandidate) {
      const { error } = await supabase.from('candidates').delete().eq('id', selectedCandidate.id);
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete candidate.',
          variant: 'destructive',
        });
      } else {
        setIsOpenConfirmDelete(false);
        toast({
          title: 'Success!',
          description: 'Candidate deleted successfully.',
        });
        loadData();
      }
    }
  };

  const handleCompleteOnboarding = async () => {
    if (candidateToComplete && candidateToComplete.journey_id) {
      const { error } = await supabase
        .from('onboarding_journeys')
        .update({ status: 'completed' })
        .eq('id', candidateToComplete.journey_id);

      if (error) {
        toast({
          title: 'Error',
          description: `Failed to update status: ${error.message}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Status Updated',
          description: 'Candidate onboarding marked as complete.',
        });
        loadData();
      }
    } else {
      toast({
        title: 'Error',
        description: 'Journey ID not found for this candidate.',
        variant: 'destructive',
      });
    }
    setShowCompleteConfirm(false);
    setCandidateToComplete(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              Candidates
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Manage candidate onboarding process and tracking
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setIsOpenNewEmployeeDialog(true);
            setSelectedCandidate(null);
          }}
          className="bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Add
        </Button>
      </div>
      <DataTable
        columns={columns}
        dataSource={candidates}
        rowKey="id"
        loading={loading}
        rowClassName="cursor-pointer"
        onRow={(record) => ({
          onClick: () => navigate(`/onboarding/candidates/${record.id}`),
        })}
      />

      {/* Start Onboarding Dialog */}
      {candidateToStart && (
        <StartOnboardingDialog
          open={isStartOnboardingOpen}
          onOpenChange={(open) => {
            setIsStartOnboardingOpen(open);
            if (!open) setCandidateToStart(null);
          }}
          candidate={candidateToStart}
          onStarted={async (success = true) => {
            // Only update status if onboarding was successful
            if (success && candidateToStart) {
              // Refresh list to see the journey status
              loadData();
              toast({ title: 'Onboarding started successfully' });
            }
            setIsStartOnboardingOpen(false);
            setCandidateToStart(null);
          }}
        />
      )}

      <ConfirmDialog
        title="Delete Candidate"
        description={
          <>
            Are you sure you want to delete? <br /> This action cannot be undone and will remove all
            associated workflow data.
          </>
        }
        onConfirm={onDelete}
        onCancel={() => setIsOpenConfirmDelete(false)}
        open={isOpenConfirmDelete}
        onOpenChange={setIsOpenConfirmDelete}
      />
      <ConfirmDialog
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        title="Mark as Complete"
        description="Are you sure you want to mark this onboarding journey as complete? Please make sure that all the tasks are completed."
        onConfirm={handleCompleteOnboarding}
        onCancel={() => {
          setShowCompleteConfirm(false);
          setCandidateToComplete(null);
        }}
      />
      <NewEmployeeDialog
        refetch={loadData}
        open={isOpenNewEmployeeDialog}
        onOpenChange={setIsOpenNewEmployeeDialog}
        data={selectedCandidate}
      />
    </div>
  );
};

export default Candidates;
