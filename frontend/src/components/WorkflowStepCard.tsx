import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Clock, AlertCircle, XCircle, Upload, FileText } from 'lucide-react';

interface WorkflowStepCardProps {
  candidate: any;
  stepName: string;
  stepDisplayName: string;
  onRefresh: () => void;
  currentUser: any;
}

export const WorkflowStepCard = ({ 
  candidate, 
  stepName, 
  stepDisplayName, 
  onRefresh, 
  currentUser 
}: WorkflowStepCardProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [comments, setComments] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const getStepStatus = () => {
    const statusField = `${stepName}_status`;
    return candidate[statusField] || 'pending';
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'initiated':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'admin_notified':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'not_required':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'initiated':
        return 'bg-blue-100 text-blue-800';
      case 'admin_notified':
        return 'bg-orange-100 text-orange-800';
      case 'not_required':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canModifyStep = async () => {
    const status = getStepStatus();
    
    // For now, allow any authenticated user to modify
    // In a full implementation, check workflow_authorizations table
    return status === 'admin_notified' || status === 'initiated';
  };

  const uploadScreenshot = async (file: File): Promise<string> => {
    const fileName = `${candidate.id}/${stepName}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('workflow-screenshots')
      .upload(fileName, file);

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('workflow-screenshots')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    
    const canModify = await canModifyStep();
    if (!canModify) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to modify this workflow step.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      let screenshotUrl = '';
      
      // Upload screenshot if provided (mandatory for completion statuses)
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
      } else if (['completed', 'not_required', 'failed'].includes(newStatus)) {
        toast({
          title: "Screenshot Required",
          description: "Screenshot upload is mandatory for completion.",
          variant: "destructive",
        });
        return;
      }

      // Update workflow step using the standard function for now
      const { error } = await supabase.rpc('update_workflow_step', {
        p_candidate_id: candidate.id,
        p_step_name: stepName,
        p_status: newStatus,
        p_comments: comments
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Workflow step updated to ${newStatus}.`,
      });

      setShowDialog(false);
      setComments('');
      setScreenshot(null);
      setNewStatus('');
      onRefresh();
    } catch (error: any) {
      console.error('Error updating workflow step:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow step.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const status = getStepStatus();
  const comments_field = `${stepName}_comments`;
  const stepComments = candidate[comments_field];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStepIcon(status)}
          <div>
            <h3 className="font-medium">{stepDisplayName}</h3>
            <Badge className={getStatusColor(status)}>
              {status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Update Status
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update {stepDisplayName}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {status === 'admin_notified' && (
                      <SelectItem value="initiated">Initiated</SelectItem>
                    )}
                    {status === 'initiated' && (
                      <>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="not_required">Not Required</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Comments</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add comments about this step..."
                  rows={3}
                />
              </div>

              {['completed', 'not_required', 'failed'].includes(newStatus) && (
                <div className="space-y-2">
                  <Label>Screenshot Upload *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Screenshot is mandatory for completion
                  </p>
                </div>
              )}

              <Button 
                onClick={handleStatusUpdate} 
                className="w-full"
                disabled={isUpdating || !newStatus}
              >
                {isUpdating ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {stepComments && (
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Comments</span>
          </div>
          <p className="text-sm text-muted-foreground">{stepComments}</p>
        </div>
      )}
    </Card>
  );
};