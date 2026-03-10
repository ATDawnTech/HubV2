import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Settings, Trash2, GripVertical, Edit2, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { type Stage } from './KanbanBoard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ManageStagesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentStages: Stage[];
}

export const ManageStagesDialog: React.FC<ManageStagesDialogProps> = ({
  isOpen,
  onClose,
  currentStages
}) => {
  const [stages, setStages] = useState<Stage[]>(currentStages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset local state when dialog opens with new data
  React.useEffect(() => {
    setStages(currentStages);
  }, [currentStages]);

  const updateStagesMutation = useMutation({
    mutationFn: async (updatedStages: Stage[]) => {
      const { error } = await supabase
        .from('config')
        .upsert({
          key: 'pipeline_stages',
          value: JSON.stringify(updatedStages),
          user_id: (await supabase.auth.getUser()).data.user?.id
        }, { onConflict: 'user_id,key' });

      if (error) throw error;
      return updatedStages;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      toast({
        title: "Success",
        description: "Stages updated successfully"
      });
    },
    onError: (error) => {
      console.error('Error updating stages:', error);
      toast({
        title: "Error",
        description: "Failed to update stages",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    // Reorder stages by their position in the array
    const reorderedStages = stages.map((stage, index) => ({
      ...stage,
      order: index + 1
    }));
    
    updateStagesMutation.mutate(reorderedStages);
    onClose();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newStages = [...stages];
    const [draggedStage] = newStages.splice(draggedIndex, 1);
    newStages.splice(dropIndex, 0, draggedStage);
    
    setStages(newStages);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const startEdit = (stage: Stage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
  };

  const saveEdit = () => {
    if (editName.trim() && editingId) {
      const updatedStages = stages.map(stage =>
        stage.id === editingId ? { ...stage, name: editName.trim() } : stage
      );
      setStages(updatedStages);
      setEditingId(null);
      setEditName('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const confirmDelete = (stageId: string) => {
    const filteredStages = stages.filter(stage => stage.id !== stageId);
    setStages(filteredStages);
    setDeleteStageId(null);
  };

  const canDeleteStage = (stage: Stage) => {
    // Prevent deleting terminal stages or if it's the only stage
    return stages.length > 1 && !stage.isTerminal;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Pipeline Stages
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drag and drop to reorder stages. Click to edit names. Delete stages that are no longer needed.
            </p>
            
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg bg-background transition-all ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div 
                    className="cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2">
                    {editingId === stage.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <Button size="sm" variant="ghost" onClick={saveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium flex-1">{stage.name}</span>
                        {stage.isTerminal && (
                          <Badge variant="secondary" className="text-xs">
                            Terminal
                          </Badge>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEdit(stage)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Order: {index + 1}
                    </span>
                    
                    {canDeleteStage(stage) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteStageId(stage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateStagesMutation.isPending}
            >
              {updateStagesMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteStageId} onOpenChange={() => setDeleteStageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this stage? This action cannot be undone.
              Any candidates currently in this stage will need to be moved manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStageId && confirmDelete(deleteStageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};