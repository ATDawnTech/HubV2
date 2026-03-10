import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { StageColumn } from './StageColumn';

export interface Stage {
  id: string;
  name: string;
  order: number;
  isTerminal?: boolean;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  source?: string;
  current_company?: string;
  current_title?: string;
  resume_url?: string;
  created_at: string;
  current_step?: string;
}

interface KanbanBoardProps {
  stages: Stage[];
  cardsByStage: Record<string, Candidate[]>;
  onDragEnd: (result: DropResult) => void;
  onAddStage: () => void;
  onManageStages: () => void;
  onCandidateClick: (candidate: Candidate) => void;
  isLoading?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  cardsByStage,
  onDragEnd,
  onAddStage,
  onManageStages,
  onCandidateClick,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Candidate Pipeline</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAddStage}>
            <Plus className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
          <Button variant="outline" size="sm" onClick={onManageStages}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Stages
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
          {stages
            .sort((a, b) => a.order - b.order)
            .map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                candidates={cardsByStage[stage.id] || []}
                onCandidateClick={onCandidateClick}
              />
            ))}
        </div>
      </DragDropContext>
    </div>
  );
};