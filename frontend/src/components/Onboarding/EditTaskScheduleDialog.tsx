import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { cn } from '@/lib/utils';

interface EditTaskScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onUpdated: () => void;
}

const schema = yup.object().shape({
  due_at: yup.string().required('Scheduled date is required'),
});

const EditTaskScheduleDialog: React.FC<EditTaskScheduleDialogProps> = ({
  open,
  onOpenChange,
  task,
  onUpdated,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      due_at: '',
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = methods;

  useEffect(() => {
    if (open) {
      reset({
        due_at: task?.due_at ? format(new Date(task.due_at), 'yyyy-MM-dd') : '',
      });
    }
  }, [open, task, reset]);

  const onSubmit = async (values: { due_at: string }) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('onboarding_tasks')
        .update({ due_at: values.due_at })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Scheduled date updated successfully.',
      });
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Update schedule error:', err);
      toast({
        title: 'Error',
        description: 'Failed to update scheduled date. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentDueDateFormatted = task?.due_at
    ? format(new Date(task.due_at), 'dd MMM yyyy')
    : 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-lg">
        <DialogHeader className="px-6 py-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-bold text-slate-900">
            Edit Scheduled Date
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>Current Due Date</Label>
                <Input
                  value={currentDueDateFormatted}
                  readOnly
                  className="bg-slate-50 border-slate-200 text-slate-600 focus-visible:ring-0 cursor-default"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  New Scheduled Date <span className="text-orange-500">*</span>
                </Label>
                <Input
                  type="date"
                  {...register('due_at')}
                  className={cn(
                    'border-slate-200 focus-visible:ring-primary shadow-sm',
                    errors.due_at && 'border-red-500'
                  )}
                />
                {errors.due_at && (
                  <p className="text-xs text-red-500 mt-1">{errors.due_at.message}</p>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-slate-500 hover:text-slate-700 hover:bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !isDirty}
                className="bg-[#EF6831] hover:bg-[#EF6831]/90 text-white px-6 shadow-sm font-semibold transition-colors"
              >
                {isUpdating ? 'Updating...' : 'Update Date'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskScheduleDialog;
