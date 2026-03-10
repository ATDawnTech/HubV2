import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DropResult } from '@hello-pangea/dnd';
import { KanbanBoard, Stage, Candidate } from '@/components/kanban/KanbanBoard';
import { FiltersSidebar } from '@/components/kanban/FiltersSidebar';
import { CandidateDrawer } from '@/components/kanban/CandidateDrawer';
import { toast } from 'sonner';

interface FilterState {
  search: string;
  stages: string[];
  sources: string[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

const DEFAULT_STAGES: Stage[] = [
  { id: 'sourced', name: 'Sourced', order: 1 },
  { id: 'screen', name: 'Screen', order: 2 },
  { id: 'tech1', name: 'Tech 1', order: 3 },
  { id: 'tech2', name: 'Tech 2', order: 4 },
  { id: 'offer', name: 'Offer', order: 5 },
  { id: 'hired', name: 'Hired', order: 6, isTerminal: true },
  { id: 'rejected', name: 'Rejected', order: 7, isTerminal: true },
];

export const AtsCandidates = () => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    stages: [],
    sources: [],
    dateRange: {},
  });
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const queryClient = useQueryClient();

  // Load pipeline stages from config
  const { data: stages = DEFAULT_STAGES } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'pipeline_stages')
        .single();

      if (error || !data) {
        // Seed default stages if not found
        await supabase.from('config').upsert({
          key: 'pipeline_stages',
          value: JSON.stringify(DEFAULT_STAGES),
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });
        return DEFAULT_STAGES;
      }

      return JSON.parse(data.value) as Stage[];
    },
  });

  // Load candidates
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['ats-candidates', filters],
    queryFn: async () => {
      let query = supabase.from('ats_candidates').select(`
          *,
          applications(
            id,
            stage,
            status,
            requisition:requisitions(title)
          )
        `);

      // Apply filters
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        );
      }

      if (filters.stages.length > 0) {
        query = query.in('current_step', filters.stages);
      }

      if (filters.sources.length > 0) {
        query = query.in('source', filters.sources);
      }

      if (filters.dateRange.from) {
        query = query.gte('created_at', filters.dateRange.from.toISOString());
      }

      if (filters.dateRange.to) {
        query = query.lte('created_at', filters.dateRange.to.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as Candidate[];
    },
  });

  // Get unique sources for filtering
  const { data: sources = [] } = useQuery({
    queryKey: ['candidate-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ats_candidates')
        .select('source')
        .not('source', 'is', null);

      if (error) throw error;
      return [...new Set(data.map((item) => item.source).filter(Boolean))];
    },
  });

  // Move candidate between stages
  const moveCandidateMutation = useMutation({
    mutationFn: async ({
      candidateId,
      fromStage,
      toStage,
    }: {
      candidateId: string;
      fromStage: string;
      toStage: string;
    }) => {
      const { data, error } = await supabase.rpc('move_candidate_stage', {
        p_candidate_id: candidateId,
        p_from_stage: fromStage,
        p_to_stage: toStage,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities'] });
      toast.success('Candidate moved successfully');
    },
    onError: (error) => {
      console.error('Error moving candidate:', error);
      toast.error('Failed to move candidate');
    },
  });

  // Group candidates by stage
  const cardsByStage = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};

    // Initialize all stages with empty arrays
    stages.forEach((stage) => {
      grouped[stage.id] = [];
    });

    // Group candidates by current_step
    candidates.forEach((candidate) => {
      const stageId = candidate.current_step || 'sourced';
      if (grouped[stageId]) {
        grouped[stageId].push(candidate);
      } else {
        // If candidate has unknown stage, put in sourced
        grouped['sourced'] = grouped['sourced'] || [];
        grouped['sourced'].push(candidate);
      }
    });

    return grouped;
  }, [candidates, stages]);

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index)
      return;

    const candidateId = draggableId;
    const fromStage = source.droppableId;
    const toStage = destination.droppableId;

    // Optimistic update
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate) {
      queryClient.setQueryData(['ats-candidates', filters], (old: Candidate[] | undefined) => {
        if (!old) return [];
        return old.map((c) => (c.id === candidateId ? { ...c, current_step: toStage } : c));
      });
    }

    moveCandidateMutation.mutate({ candidateId, fromStage, toStage });
  };

  const handleCandidateClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (candidateId: string, newStageId: string) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate && candidate.current_step !== newStageId) {
      moveCandidateMutation.mutate({
        candidateId,
        fromStage: candidate.current_step || 'sourced',
        toStage: newStageId,
      });
    }
  };

  const handleAddStage = () => {
    // TODO: Implement add stage functionality
    toast.info('Add stage functionality coming soon');
  };

  const handleManageStages = () => {
    // TODO: Implement stage management modal
    toast.info('Stage management coming soon');
  };

  // Set up real-time subscriptions
  useEffect(() => {
    const candidatesChannel = supabase
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ats_candidates',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ats-candidates'] });
        }
      )
      .subscribe();

    const workflowChannel = supabase
      .channel('workflow-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_updates',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['candidate-activities'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(candidatesChannel);
      supabase.removeChannel(workflowChannel);
    };
  }, [queryClient]);

  return (
    <div className="py-8 px-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground">Manage candidate pipeline with drag-and-drop</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FiltersSidebar
            filters={filters}
            onFiltersChange={setFilters}
            stages={stages}
            sources={sources}
            totalCandidates={candidates.length}
            filteredCount={candidates.length}
          />
        </CardContent>
      </Card>

      <KanbanBoard
        stages={stages}
        cardsByStage={cardsByStage}
        onDragEnd={handleDragEnd}
        onAddStage={handleAddStage}
        onManageStages={handleManageStages}
        onCandidateClick={handleCandidateClick}
        isLoading={isLoading}
      />

      <CandidateDrawer
        candidate={selectedCandidate}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        stages={stages}
        onStageChange={handleStageChange}
      />
    </div>
  );
};
