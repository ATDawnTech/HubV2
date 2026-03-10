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

interface ConfirmDialogProps extends DialogProps {
  title: string;
  description: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
}

export default function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
  open,
  ...props
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} {...props}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-2">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
