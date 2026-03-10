import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Candidate } from '@/pages/Candidates';
import { useMutation } from '@tanstack/react-query';
import { triggerN8nWebhook } from '@/services/n8nAPI';
import { NAME_TO_WORKFLOW, WORKFLOW_MAPPING } from './Templates/AutomationTasks';

interface Template {
  id: string;
  name: string;
  location: string | null;
  start_type: 'immediate' | 'scheduled';
  start_days_before?: number;
  settings: {
    settings: {
      startWhen: string;
    };
    automationTasks: {
      enable: boolean;
      workflow: keyof typeof WORKFLOW_MAPPING;
    }[];
  };
  version: number;
}

interface StartOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate;
  onStarted: () => void;
}

const StartOnboardingDialog: React.FC<StartOnboardingDialogProps> = ({
  open,
  onOpenChange,
  candidate,
  onStarted,
}) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>();
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const n8nMutation = useMutation({
    mutationFn: triggerN8nWebhook,
    onError: (error) => {
      console.error('N8n automation error:', error);
      toast({
        title: 'Automation Error',
        description: 'Failed to trigger onboarding automation.',
        variant: 'destructive',
      });
    },
  });
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelectedTemplate(undefined);
    // Fetch all templates and filter in JS to avoid .or() 400 error
    (async () => {
      const { data, error } = await supabase.from('onboarding_templates').select('*').order('name');
      if (error) {
        setTemplates([]);
        setError('Failed to load templates');
      } else {
        const filtered = (data || []).filter(
          (tpl) => tpl.location === candidate.location || tpl.location == null
        );
        setTemplates(filtered);
      }
      setLoading(false);
    })();
  }, [open, candidate.location]);

  // Helper: Validate candidate profile for onboarding
  function validateCandidateProfile(template: Template | undefined) {
    if (!candidate.date_of_joining) return null;
    if (!template) return null;
    // If scheduled, joining date must be at least start_days_before days in the future
    if (template.start_type === 'scheduled' && template.start_days_before) {
      const joiningDate = new Date(candidate.date_of_joining);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Scheduled onboarding must be started at least start_days_before joining date
      const minStartDate = new Date(joiningDate);
      minStartDate.setDate(joiningDate.getDate() - template.start_days_before);
      if (today > minStartDate) {
        return (
          'Correct the Joining Date: Scheduled onboarding must be started at least ' +
          template.start_days_before +
          ' days before the joining date.'
        );
      }
    }
    return null;
  }

  const handleConfirm = async () => {
    if (!selectedTemplate) {
      setError('Please select an onboarding template');
      return;
    }
    setError(null);
    setRetrying(false);
    // Validation: joining date logic
    const validationError = validateCandidateProfile(selectedTemplate);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      onOpenChange(false);
      const { data: journeyData, error: journeyError } = await supabase
        .from('onboarding_journeys')
        .insert({
          candidate_id: candidate.id,
          template_id: selectedTemplate.id,
          template_version: selectedTemplate.version,
          status: 'in_progress',
        })
        .select()
        .single();

      if (journeyError || !journeyData)
        throw journeyError || new Error('Failed to create onboarding journey');

      const { data: templateTasks, error: templateError } = await supabase
        .from('onboarding_task_templates')
        .select('*')
        .eq('template_id', selectedTemplate.id);

      if (templateError) throw templateError;

      const automationTasks = selectedTemplate.settings?.automationTasks || [];
      const enabledAutomationTasks = automationTasks.filter((at: any) => at.enable);

      if ((templateTasks && templateTasks.length > 0) || enabledAutomationTasks.length > 0) {
        // Prepare tasks for batch insert
        const tasksToInsert = (templateTasks || []).map((task) => {
          const dueDate = new Date();
          dueDate.setHours(dueDate.getHours() + (task.sla_hours || 0));
          return {
            journey_id: journeyData.id,
            name: task.name,
            block: task.block,
            owner_group_id: task.owner_group_id,
            due_at: dueDate.toISOString(),
            description: task.description,
            status: 'todo',
          };
        });

        // Add enabled automation tasks
        enabledAutomationTasks.forEach((at: any) => {
          tasksToInsert.push({
            journey_id: journeyData.id,
            name:
              WORKFLOW_MAPPING[at.workflow as keyof typeof WORKFLOW_MAPPING] || 'Automation Task',
            block: 'IT',
            owner_group_id: null,
            due_at: new Date().toISOString(),
            description: `Automated task: ${WORKFLOW_MAPPING[at.workflow as keyof typeof WORKFLOW_MAPPING] || 'n8n workflow'}`,
            status: selectedTemplate.settings?.settings?.startWhen === 'now' ? 'completed' : 'todo',
          });
        });

        const { data: insertedTasks, error: tasksError } = await supabase
          .from('onboarding_tasks')
          .insert(tasksToInsert)
          .select('id, owner_group_id');

        if (tasksError) throw tasksError;

        if (insertedTasks && insertedTasks.length > 0) {
          // Get all unique group IDs
          const groupIds = Array.from(
            new Set((insertedTasks as any[]).map((t) => t.owner_group_id))
          ).filter(Boolean) as string[];

          const { data: allMembers, error: membersError } = await supabase
            .from('group_members')
            .select('group_id, user_id')
            .in('group_id', groupIds);

          if (membersError) throw membersError;

          if (allMembers && allMembers.length > 0) {
            // Prepare assignees for batch insert
            const assigneesToInsert = [];
            for (const task of insertedTasks as any[]) {
              const taskMembers = allMembers.filter((m) => m.group_id === task.owner_group_id);
              for (const member of taskMembers) {
                assigneesToInsert.push({
                  task_id: task.id,
                  assignee_id: member.user_id,
                });
              }
            }

            if (assigneesToInsert.length > 0) {
              const { error: assigneesError } = await supabase
                .from('task_assignees')
                .insert(assigneesToInsert);
              if (assigneesError) throw assigneesError;
            }
          }
        }
      }
      if (selectedTemplate.settings?.settings?.startWhen === 'now') {
        for (const task of selectedTemplate.settings.automationTasks) {
          if (task.enable) {
            switch (task.workflow) {
              case NAME_TO_WORKFLOW.SEND_WELCOME_EMAIL:
                n8nMutation.mutate({
                  firstName: candidate.first_name,
                  lastName: candidate.last_name,
                  email: candidate.email,
                  jobTitle: candidate.survey?.role_title || '',
                  startDate: candidate.date_of_joining || '',
                  managerName: candidate.hiring_manager_profile?.full_name || '',
                });
                break;
            }
          }
        }
      }
      toast({
        title: 'Success',
        description: 'Onboarding started successfully',
      });
      onStarted();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to start onboarding',
        variant: 'destructive',
      });
    }
  };

  console.log('selectedTemplate', selectedTemplate);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Onboarding</DialogTitle>
        </DialogHeader>
        <div className="mb-1">
          <label className="block font-medium mb-2">
            Available Onboarding Template(s) for {candidate.location || 'All Locations'}
          </label>
          <Select
            value={selectedTemplate as unknown as string}
            onValueChange={(value) => setSelectedTemplate(value as unknown as Template)}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? 'Loading...' : 'Select a template'} />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 && !loading ? (
                <div className="px-4 py-2 text-muted-foreground text-sm">
                  No templates available for this location
                </div>
              ) : (
                templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl as unknown as string}>
                    {tpl.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </div>
        {/* Tooltip moved closer to the action buttons */}
        <div className="mb-1 text-xs text-muted-foreground flex items-center justify-start">
          <span
            style={{
              cursor: 'help',
            }}
            title="Templates are filtered based on the candidate's primary work location."
          >
            <span
              className="material-symbols-outlined align-middle text-base mr-1"
              style={{ verticalAlign: 'middle' }}
            >
              info
            </span>
            Templates are filtered based on the candidate's primary work location.
          </span>
        </div>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !templates.length}>
            Confirm
          </Button>
          {retrying && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setRetrying(false);
                handleConfirm();
              }}
              className="ml-2"
            >
              Retry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartOnboardingDialog;
