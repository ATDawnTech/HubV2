import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, Building, MapPin } from 'lucide-react';
import { Candidate } from './KanbanBoard';

interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onClick: () => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  index,
  onClick
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Draggable draggableId={candidate.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`cursor-pointer transition-all hover:shadow-md ${
            snapshot.isDragging ? 'rotate-3 shadow-lg' : ''
          }`}
          onClick={onClick}
        >
          <CardContent className="p-3 space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(candidate.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {candidate.full_name}
                </h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{candidate.email}</span>
                </div>
              </div>
            </div>

            {candidate.phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{candidate.phone}</span>
              </div>
            )}

            {candidate.current_company && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building className="h-3 w-3" />
                <span className="truncate">{candidate.current_company}</span>
              </div>
            )}

            {candidate.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{candidate.location}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              {candidate.source && (
                <Badge variant="outline" className="text-xs">
                  {candidate.source}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(candidate.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};