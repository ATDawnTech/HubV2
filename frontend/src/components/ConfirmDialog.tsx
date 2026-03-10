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
import { Button } from './ui/button';

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
      <DialogContent className={className || "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="mb-2">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant={cancelButtonVariant} onClick={onCancel}>
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
