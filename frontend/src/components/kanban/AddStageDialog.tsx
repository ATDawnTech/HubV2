import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { type Stage } from './KanbanBoard';

interface AddStageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentStages: Stage[];
}

export const AddStageDialog: React.FC<AddStageDialogProps> = ({
  isOpen,
  onClose,
  currentStages
}) => {
  const [stageName, setStageName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addStageMutation = useMutation({
    mutationFn: async (newStageName: string) => {
      const newStage: Stage = {
        id: newStageName.toLowerCase().replace(/\s+/g, '_'),
        name: newStageName,
        order: Math.max(...currentStages.map(s => s.order)) + 1
      };

      const updatedStages = [...currentStages, newStage];

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
        description: "Stage added successfully"
      });
      setStageName('');
      onClose();
    },
    onError: (error) => {
      console.error('Error adding stage:', error);
      toast({
        title: "Error",
        description: "Failed to add stage",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stageName.trim()) {
      // Check if stage already exists
      const stageExists = currentStages.some(
        stage => stage.name.toLowerCase() === stageName.toLowerCase()
      );
      
      if (stageExists) {
        toast({
          title: "Error",
          description: "A stage with this name already exists",
          variant: "destructive"
        });
        return;
      }

      addStageMutation.mutate(stageName.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Stage
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stageName">Stage Name</Label>
            <Input
              id="stageName"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="Enter stage name..."
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!stageName.trim() || addStageMutation.isPending}
            >
              {addStageMutation.isPending ? 'Adding...' : 'Add Stage'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};