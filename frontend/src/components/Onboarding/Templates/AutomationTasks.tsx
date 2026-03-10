import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface AutomationTask {
  enable: boolean;
  workflow: number;
}

interface AutomationTasksProps {
  value?: AutomationTask[];
  onChange?: (tasks: AutomationTask[]) => void;
}

export const WORKFLOW_MAPPING: Record<number, string> = {
  1: 'Create work email address',
  2: 'Send welcome email',
};

export const NAME_TO_WORKFLOW: Record<string, number> = {
  CREATE_WORK_EMAIL_ADDRESS: 1,
  SEND_WELCOME_EMAIL: 2,
};

export default function AutomationTasks({ value = [], onChange }: AutomationTasksProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Use internal state if not controlled, but generally we want it controlled
  const tasks = value;

  const addTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTasks = [...tasks, { enable: true, workflow: 1 }];
    onChange?.(newTasks);
    if (!isExpanded) setIsExpanded(true);
  };

  const removeTask = (index: number) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    onChange?.(newTasks);
  };

  const updateTask = (index: number, updates: Partial<AutomationTask>) => {
    const newTasks = tasks.map((task, i) => (i === index ? { ...task, ...updates } : task));
    onChange?.(newTasks);
  };

  return (
    <Card className="mr-4 mt-6">
      <CardHeader
        className="flex flex-row items-center justify-between border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500">bolt</span>
          <h3 className="font-bold text-lg">Automation Tasks</h3>
        </div>
        <div className="flex items-center gap-3">
          {isExpanded && (
            <Button
              variant="outline"
              size="sm"
              onClick={addTask}
              className="bg-white dark:bg-slate-900 border-border-light dark:border-border-dark hover:bg-slate-50 font-medium h-9"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
          <div className="flex flex-col items-end">
            <button type="button">{isExpanded ? <ChevronDown /> : <ChevronRight />}</button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 relative group"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    CONNECT TO N8N
                  </label>
                  <Switch
                    checked={task.enable}
                    onChange={(checked) => updateTask(index, { enable: checked })}
                    size="small"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select
                      value={String(task.workflow)}
                      onValueChange={(val) => updateTask(index, { workflow: parseInt(val) })}
                    >
                      <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-border-light dark:border-border-dark h-11">
                        <SelectValue placeholder="Select an automation action" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(WORKFLOW_MAPPING).map(([id, name]) => (
                          <SelectItem key={id} value={id}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => removeTask(index)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    aria-label="Remove task"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
              <p className="text-sm text-slate-400">No automation tasks added yet.</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
