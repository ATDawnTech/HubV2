import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAuthz } from '@/hooks/useAuthz';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heading2 } from '@/components/Heading2';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Settings,
  Users,
  Building2,
  DollarSign,
  Truck,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AddTaskButton } from '@/components/AddTaskButton';
import DefaultSettings from '@/components/Onboarding/Templates/DefaultSettings';
import AutomationTasks from '@/components/Onboarding/Templates/AutomationTasks';

interface OnboardingTemplate {
  id: string;
  name: string;
  version: number;
  is_active: boolean;
  settings: any;
  location: string | null;
  created_at: string;
}

interface TaskTemplate {
  id?: string;
  template_id?: string;
  block: string;
  name: string;
  description: string;
  owner_group_id: string;
  sla_hours: number;
  external_completion: boolean;
  required_attachments: string[] | any;
  order_index: number;
  depends_on?: string[]; // Array of task IDs
}

interface TaskDependency {
  id: string;
  task_template_id: string;
  depends_on_task_template_id: string;
}

interface OwnerGroup {
  id: string;
  name: string;
  description: string;
}

const BLOCKS = [
  { value: 'HR', label: 'HR', icon: Users },
  { value: 'IT', label: 'IT', icon: Settings },
  { value: 'Facilities', label: 'Facilities', icon: Building2 },
  { value: 'Finance', label: 'Finance', icon: DollarSign },
  { value: 'Vendor', label: 'Vendor', icon: Truck },
];

export default function OnboardingTemplates() {
  // Editable template name state and handler
  const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
  const [editedTemplateName, setEditedTemplateName] = useState('');

  const handleTemplateNameSave = async () => {
    if (!selectedTemplate) return;
    const { error } = await supabase
      .from('onboarding_templates')
      .update({ name: editedTemplateName.trim() })
      .eq('id', selectedTemplate.id);
    if (!error) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedTemplate.id ? { ...t, name: editedTemplateName.trim() } : t
        )
      );
      setSelectedTemplate((prev) => (prev ? { ...prev, name: editedTemplateName.trim() } : prev));
      toast({ title: 'Template name updated' });
    } else {
      toast({ title: 'Failed to update name', variant: 'destructive' });
    }
  };
  const { user } = useAuth();
  const { isAdmin, loading: authLoading } = useAuthz();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [ownerGroups, setOwnerGroups] = useState<OwnerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // State for expanded/collapsed blocks
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  // Toggle block expand/collapse
  const toggleBlock = (blockValue: string) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockValue]: !prev[blockValue],
    }));
  };

  // Check admin access
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: "You don't have permission to access this page",
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [authLoading, isAdmin, navigate, toast]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('onboarding_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Load owner groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('owner_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;
      setOwnerGroups(groupsData || []);

      // Select first template if available
      if (templatesData && templatesData.length > 0) {
        const first = templatesData[0];
        setSelectedTemplate(first);
        loadTaskTemplates(first.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTaskTemplates = async (templateId: string) => {
    try {
      console.log('Loading task templates for template:', templateId);

      // Load task templates
      const { data: tasksData, error: tasksError } = await supabase
        .from('onboarding_task_templates')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');

      if (tasksError) throw tasksError;

      console.log('Raw task data from DB:', tasksData);

      // Load dependencies
      const { data: depsData, error: depsError } = await supabase
        .from('onboarding_task_template_dependencies')
        .select('task_template_id, depends_on_task_template_id')
        .in(
          'task_template_id',
          (tasksData || []).map((t) => t.id)
        );

      if (depsError) throw depsError;

      // Create a map of dependencies for each task
      const dependencyMap: Record<string, string[]> = {};
      (depsData || []).forEach((dep) => {
        if (!dependencyMap[dep.task_template_id]) {
          dependencyMap[dep.task_template_id] = [];
        }
        dependencyMap[dep.task_template_id].push(dep.depends_on_task_template_id);
      });

      // Transform data to match TaskTemplate interface with multiple dependencies
      const transformedData = (tasksData || []).map((task) => ({
        ...task,
        depends_on: dependencyMap[task.id] || [],
      }));

      console.log('Transformed task data:', transformedData);
      setTaskTemplates(transformedData);
    } catch (error) {
      console.error('Error loading task templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task templates',
        variant: 'destructive',
      });
    }
  };

  const handleTemplateSelect = (template: OnboardingTemplate) => {
    setSelectedTemplate(template);
    loadTaskTemplates(template.id);
  };

  const createTemplate = async () => {
    if (!newTemplate.name.trim()) return;

    try {
      // Ensure user profile exists first
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Check if profile exists, create if it doesn't
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            email: user.email || 'unknown@example.com',
            full_name: user.user_metadata?.full_name || 'Unknown User',
          })
          .select('full_name, email')
          .single();

        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
          throw new Error('Failed to create user profile');
        }
        profile = newProfile;
      }

      const { data, error } = await supabase
        .from('onboarding_templates')
        .insert({
          name: newTemplate.name,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates((prev) => [data, ...prev]);
      setSelectedTemplate(data);
      setTaskTemplates([]);
      setNewTemplate({ name: '', description: '' });
      setIsCreateDialogOpen(false);

      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (templateId: string, templateName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // First delete all task templates associated with this template
      await supabase.from('onboarding_task_templates').delete().eq('template_id', templateId);

      // Then delete the template itself
      const { error } = await supabase.from('onboarding_templates').delete().eq('id', templateId);

      if (error) throw error;

      // Remove from local state
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));

      // Reset selected template if it was the one being deleted
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setTaskTemplates([]);
      }

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const addTaskTemplate = (blockValue: string) => {
    const newTask: TaskTemplate = {
      block: blockValue,
      name: 'New Task',
      description: '',
      owner_group_id:
        ownerGroups.find((g) => g.name.includes(blockValue))?.id || ownerGroups[0]?.id || '',
      sla_hours: 72,
      external_completion: false,
      required_attachments: [],
      order_index: taskTemplates.length,
      depends_on: [],
    };
    setTaskTemplates((prev) => [...prev, newTask]);
  };

  const updateTaskTemplate = (index: number, updates: Partial<TaskTemplate>) => {
    setTaskTemplates((prev) =>
      prev.map((task, i) => (i === index ? { ...task, ...updates } : task))
    );
  };

  const removeTaskTemplate = (index: number) => {
    setTaskTemplates((prev) => prev.filter((_, i) => i !== index));
  };

  const saveTaskTemplates = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      // Ensure we have default settings if they're missing
      const settingsToSave = {
        ...(selectedTemplate.settings || {}),
        settings: {
          ...(selectedTemplate.settings?.settings || {}),
          startWhen: selectedTemplate.settings?.settings?.startWhen || 'now',
        },
        automationTasks: selectedTemplate.settings?.automationTasks || [],
      };

      // Update the template's settings and location
      const { error: templateUpdateError } = await supabase
        .from('onboarding_templates')
        .update({
          settings: settingsToSave,
          location: selectedTemplate.location,
        })
        .eq('id', selectedTemplate.id);

      if (templateUpdateError) throw templateUpdateError;

      // Update local templates list and selected template
      const updatedTemplate = {
        ...selectedTemplate,
        settings: settingsToSave,
      };

      setTemplates((prev) => prev.map((t) => (t.id === selectedTemplate.id ? updatedTemplate : t)));
      setSelectedTemplate(updatedTemplate);

      // If no tasks, we're done (just updated settings)
      if (taskTemplates.length === 0) {
        toast({
          title: 'Template settings saved',
          duration: 1000,
        });
        setIsSaving(false);
        return;
      }

      // Backup existing task templates in case we need to rollback
      const { data: backupTasks } = await supabase
        .from('onboarding_task_templates')
        .select('*')
        .eq('template_id', selectedTemplate.id)
        .order('order_index');

      // Delete existing task templates and their dependencies
      await supabase
        .from('onboarding_task_templates')
        .delete()
        .eq('template_id', selectedTemplate.id);

      // Insert new task templates (without dependencies first)
      const tasksToInsert = taskTemplates.map((task, index) => ({
        template_id: selectedTemplate.id,
        block: task.block,
        name: task.name,
        description: task.description,
        owner_group_id: task.owner_group_id,
        sla_hours: task.sla_hours,
        external_completion: task.external_completion,
        required_attachments: task.required_attachments,
        order_index: index,
      }));

      const { data: insertedTasks, error: insertError } = await supabase
        .from('onboarding_task_templates')
        .insert(tasksToInsert)
        .select();

      if (insertError) {
        // Rollback to previous state if insert fails
        if (backupTasks && backupTasks.length > 0) {
          await supabase.from('onboarding_task_templates').insert(backupTasks);
        }
        throw insertError;
      }

      // Build helper maps to translate old refs (ids or names) to newly inserted IDs
      const insertedByName = new Map<string, string>();
      insertedTasks?.forEach((t) => insertedByName.set(t.name, t.id));

      const originalNameByIdOrName = new Map<string, string>();
      taskTemplates.forEach((t) => {
        if (t.id) originalNameByIdOrName.set(t.id, t.name);
        if (t.name) originalNameByIdOrName.set(t.name, t.name);
      });

      // Insert dependencies using the new junction table
      const dependenciesToInsert: {
        task_template_id: string;
        depends_on_task_template_id: string;
      }[] = [];

      taskTemplates.forEach((task, index) => {
        const taskId = insertedTasks?.[index]?.id;
        if (!taskId) return;

        const seen = new Set<string>();
        (task.depends_on || []).forEach((depVal) => {
          const depName = originalNameByIdOrName.get(depVal) || String(depVal);
          const depNewId = insertedByName.get(depName);
          if (depNewId && depNewId !== taskId && !seen.has(depNewId)) {
            dependenciesToInsert.push({
              task_template_id: taskId,
              depends_on_task_template_id: depNewId,
            });
            seen.add(depNewId);
          }
        });
      });

      if (dependenciesToInsert.length > 0) {
        const { error: depsError } = await supabase
          .from('onboarding_task_template_dependencies')
          .insert(dependenciesToInsert);

        if (depsError) {
          console.error('Error inserting dependencies:', depsError);
          // Continue even if dependencies fail - the tasks are still saved
        }
      }

      // Refresh tasks from DB to ensure view is in sync
      await loadTaskTemplates(selectedTemplate.id);

      toast({
        title: 'Success',
        description: 'Task templates saved successfully',
        duration: 1000,
      });
    } catch (error) {
      console.error('Error saving task templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to save task templates',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything if user is not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                Onboarding Templates
              </h1>
              <p className="text-muted-foreground">
                Create and manage onboarding journey templates
              </p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a new onboarding template to standardize your process
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., New Tech Employee Onboarding Template"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createTemplate} disabled={!newTemplate.name.trim()}>
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-0.5 lg:grid-cols-4 bg-muted min-h-screen">
          {/* Templates List */}
          <div className="lg:col-span-1 p-4">
            <div className="mb-4 flex flex-col gap-1">
              <Button
                className="w-full max-w-[240px] mt-6"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
              <Heading2>Templates</Heading2>
            </div>
            <div className="space-y-2 mt-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`w-full max-w-[240px] min-h-[150px] text-left p-3 rounded-lg border-2 transition-colors bg-white relative flex flex-col ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <div
                    className="cursor-pointer flex-1"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="font-bold text-medium text-black">{template.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                      v{template.version} •
                      {template.is_active ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-gray-500 font-medium">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="absolute left-0 right-0 bottom-0 pb-4 flex justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id, template.name);
                      }}
                      className="w-11/12 max-w-[160px] flex items-center gap-1 bg-red-100 border border-red-500 text-red-500 hover:bg-red-200 hover:border-red-800 font-bold rounded-lg"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No templates yet</p>
              )}
            </div>
          </div>

          {/* Task Templates Editor */}
          <div className="lg:col-span-3 space-y-6 relative pb-20">
            {selectedTemplate ? (
              <>
                <Card className="mt-8 mr-4">
                  <CardHeader>
                    <div className="flex items-center gap-2 w-full">
                      {isEditingTemplateName ? (
                        <Input
                          className="text-2xl font-semibold h-10 w-[420px] max-w-full px-2 py-1"
                          value={editedTemplateName}
                          autoFocus
                          onChange={(e) => setEditedTemplateName(e.target.value)}
                          onBlur={async () => {
                            setIsEditingTemplateName(false);
                            if (
                              editedTemplateName.trim() &&
                              editedTemplateName !== selectedTemplate.name
                            ) {
                              await handleTemplateNameSave();
                            }
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              setIsEditingTemplateName(false);
                              if (
                                editedTemplateName.trim() &&
                                editedTemplateName !== selectedTemplate.name
                              ) {
                                await handleTemplateNameSave();
                              }
                            } else if (e.key === 'Escape') {
                              setIsEditingTemplateName(false);
                              setEditedTemplateName(selectedTemplate.name);
                            }
                          }}
                        />
                      ) : (
                        <>
                          <CardTitle className="flex items-center gap-2">
                            {selectedTemplate.name}
                          </CardTitle>
                          <button
                            type="button"
                            className="ml-2 p-1 rounded hover:bg-muted"
                            aria-label="Edit template name"
                            onClick={() => {
                              setIsEditingTemplateName(true);
                              setEditedTemplateName(selectedTemplate.name);
                            }}
                          >
                            <Pencil className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </>
                      )}
                    </div>
                    <CardDescription>Configure tasks for this onboarding template</CardDescription>
                  </CardHeader>
                  {/* Removed Save Changes button from here */}
                </Card>
                <DefaultSettings
                  value={{
                    startWhen: selectedTemplate.settings?.settings?.startWhen || 'now',
                    location: selectedTemplate.location || '',
                  }}
                  onChange={(val) => {
                    setSelectedTemplate({
                      ...selectedTemplate,
                      settings: {
                        ...selectedTemplate.settings,
                        settings: {
                          ...selectedTemplate.settings?.settings,
                          startWhen: val.startWhen,
                        },
                      },
                      location: val.location || null,
                    });
                  }}
                />
                <AutomationTasks
                  value={selectedTemplate.settings?.automationTasks || []}
                  onChange={(tasks) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      settings: { ...selectedTemplate.settings, automationTasks: tasks },
                    })
                  }
                />

                {/* Task Templates by Block */}
                {BLOCKS.map((block) => {
                  const BlockIcon = block.icon;
                  const blockTasks = taskTemplates.filter((task) => task.block === block.value);
                  const isExpanded = expandedBlocks[block.value] ?? false;
                  return (
                    <Card key={block.value} className="mr-4">
                      <CardHeader
                        className="flex flex-row items-center justify-between cursor-pointer border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4"
                        onClick={() => toggleBlock(block.value)}
                      >
                        <div className="flex items-center gap-2">
                          <BlockIcon className="h-5 w-5" />
                          <h3 className="font-bold text-lg">{block.label} Tasks</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          {isExpanded && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <AddTaskButton onClick={() => addTaskTemplate(block.value)} />
                            </div>
                          )}
                          <div className="flex flex-col items-end">
                            <button type="button">
                              {isExpanded ? <ChevronDown /> : <ChevronRight />}
                            </button>
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="space-y-4">
                          {blockTasks.map((task, taskIndex) => {
                            const globalIndex = taskTemplates.findIndex((t) => t === task);
                            return (
                              <div key={globalIndex} className="border rounded-lg p-4 space-y-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <Label>Task Name</Label>
                                    <Input
                                      value={task.name}
                                      onChange={(e) =>
                                        updateTaskTemplate(globalIndex, { name: e.target.value })
                                      }
                                      placeholder="Task name"
                                    />
                                  </div>
                                  <div>
                                    <Label>SLA (Hours)</Label>
                                    <Input
                                      type="number"
                                      value={task.sla_hours}
                                      onChange={(e) =>
                                        updateTaskTemplate(globalIndex, {
                                          sla_hours: parseInt(e.target.value) || 72,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <Label>Owner Group</Label>
                                    <Select
                                      value={task.owner_group_id}
                                      onValueChange={(value) =>
                                        updateTaskTemplate(globalIndex, { owner_group_id: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select owner group" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ownerGroups.map((group) => (
                                          <SelectItem key={group.id} value={group.id}>
                                            {group.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Block</Label>
                                    <Select
                                      value={task.block}
                                      onValueChange={(value) =>
                                        updateTaskTemplate(globalIndex, { block: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select block" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {BLOCKS.map((block) => (
                                          <SelectItem key={block.value} value={block.value}>
                                            {block.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <Textarea
                                    value={task.description}
                                    onChange={(e) =>
                                      updateTaskTemplate(globalIndex, {
                                        description: e.target.value,
                                      })
                                    }
                                    placeholder="Task description"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <Label>Dependencies</Label>
                                  <div className="space-y-2">
                                    {/* Show selected dependencies as badges */}
                                    {task.depends_on && task.depends_on.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {task.depends_on.map((depTaskVal, depIndex) => {
                                          // Resolve the dependency name by ID or fallback to name
                                          const depTask = taskTemplates.find(
                                            (t) => t.id === depTaskVal || t.name === depTaskVal
                                          );
                                          const depTaskName = depTask?.name || String(depTaskVal);
                                          return (
                                            <Badge
                                              key={depIndex}
                                              variant="secondary"
                                              className="flex items-center gap-1"
                                            >
                                              {depTaskName}
                                              <X
                                                className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                onClick={() => {
                                                  const newDeps =
                                                    task.depends_on?.filter(
                                                      (_, i) => i !== depIndex
                                                    ) || [];
                                                  updateTaskTemplate(globalIndex, {
                                                    depends_on: newDeps,
                                                  });
                                                }}
                                              />
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {/* Dropdown to add new dependencies */}
                                    <div className="relative">
                                      <Select
                                        value=""
                                        onValueChange={(value) => {
                                          if (value && value !== 'none') {
                                            const currentDeps = task.depends_on || [];
                                            if (!currentDeps.includes(value)) {
                                              updateTaskTemplate(globalIndex, {
                                                depends_on: [...currentDeps, value],
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Add dependency task" />
                                        </SelectTrigger>
                                        <SelectContent
                                          position="popper"
                                          side="top"
                                          align="start"
                                          className="bg-background border border-border shadow-xl z-[99999] max-h-[300px] overflow-y-auto min-w-[300px]"
                                          sideOffset={4}
                                        >
                                          <SelectItem value="none" className="hover:bg-muted">
                                            <span className="text-muted-foreground">
                                              No Dependencies
                                            </span>
                                          </SelectItem>
                                          {taskTemplates
                                            .filter((t) => {
                                              if (t.id && t.id === task.id) return false;
                                              if (t.name === task.name && !t.id) return false;

                                              const taskId = t.id || t.name;
                                              if (!taskId || taskId.trim() === '') return false;
                                              return !task.depends_on?.includes(taskId);
                                            })
                                            .map((dependencyTask, idx) => {
                                              const taskValue =
                                                dependencyTask.id || dependencyTask.name;
                                              return (
                                                <SelectItem
                                                  key={`dep-${dependencyTask.name}-${idx}-${globalIndex}`}
                                                  value={taskValue}
                                                  className="hover:bg-muted cursor-pointer"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                                    <span className="font-medium">
                                                      {dependencyTask.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                      ({dependencyTask.block})
                                                    </span>
                                                  </div>
                                                </SelectItem>
                                              );
                                            })}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Select multiple tasks that must complete before this task can
                                      start.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 mt-4">
                                  <Checkbox
                                    id={`external-${globalIndex}`}
                                    checked={task.external_completion}
                                    onCheckedChange={(checked) =>
                                      updateTaskTemplate(globalIndex, {
                                        external_completion: checked as boolean,
                                      })
                                    }
                                  />
                                  <Label htmlFor={`external-${globalIndex}`}>
                                    External Completion Required
                                  </Label>
                                </div>
                                <div className="flex justify-end mt-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeTaskTemplate(globalIndex)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          {blockTasks.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              No {block.label.toLowerCase()} tasks configured
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">Select a template to configure its tasks</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {/* Fixed Save Changes button at the bottom of the viewport */}
      {selectedTemplate && (
        <div className="fixed bottom-0 left-0 w-full z-50 bg-background border-t border-border flex justify-end px-8 py-4">
          <Button onClick={saveTaskTemplates} disabled={isSaving}>
            {isSaving && (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2 inline-block align-middle"></span>
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div> // end of main page container
  );
}
