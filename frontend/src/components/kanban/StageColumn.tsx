import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CandidateCard } from './CandidateCard';
import { Stage, Candidate } from './KanbanBoard';

interface StageColumnProps {
  stage: Stage;
  candidates: Candidate[];
  onCandidateClick: (candidate: Candidate) => void;
}

export const StageColumn: React.FC<StageColumnProps> = ({
  stage,
  candidates,
  onCandidateClick
}) => {
  return (
    <div className="min-w-[300px] max-w-[300px]">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {candidates.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Droppable droppableId={stage.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[500px] space-y-2 transition-colors rounded-lg p-2 ${
                  snapshot.isDraggingOver ? 'bg-muted/50' : ''
                }`}
              >
                {candidates.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No candidates in this stage
                  </div>
                ) : (
                  candidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      index={index}
                      onClick={() => onCandidateClick(candidate)}
                    />
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  );
};