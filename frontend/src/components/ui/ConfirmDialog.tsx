import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogProps } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps extends DialogProps {
  title: string;
  description: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClassName?: string;
  cancelButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

export default function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
  open,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClassName,
  cancelButtonVariant = 'outline',
  className,
  ...props
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} {...props}>
      <DialogContent className={cn("p-0 overflow-hidden", className || "sm:max-w-md")}>
        <DialogHeader className="pt-6 px-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">{title}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <DialogDescription className="text-[15px] text-slate-500 leading-relaxed font-normal">
            {description}
          </DialogDescription>
        </div>

        <DialogFooter className="px-6 py-4 bg-[#fcfcfc] border-t border-slate-100 sm:justify-end gap-2">
          <DialogClose asChild>
            <Button variant={cancelButtonVariant} onClick={onCancel} className="text-slate-600 font-medium hover:bg-slate-200/50">
              {cancelText}
            </Button>
          </DialogClose>
          <Button onClick={onConfirm} className={confirmButtonClassName}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
