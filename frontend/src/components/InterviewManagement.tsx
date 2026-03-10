import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Video, X, Edit, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInterviewActivity } from '@/hooks/useInterviewActivity';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Interview {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  interview_type: string;
  status: string;
  meeting_link?: string;
  notes?: string;
  interviewer: {
    full_name: string;
    email: string;
  };
}

interface InterviewManagementProps {
  interviews: Interview[];
  candidateId: string;
  onInterviewUpdate?: () => void;
}

interface ScheduleForm {
  interviewerId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  interviewType: string;
}

export const InterviewManagement: React.FC<InterviewManagementProps> = ({
  interviews,
  candidateId,
  onInterviewUpdate
}) => {
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [completionFeedback, setCompletionFeedback] = useState('');
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'reschedule' | 'complete' | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    interviewerId: '',
    startDate: '',
    startTime: '',
    endTime: '',
    interviewType: 'technical'
  });

  const { toast } = useToast();
  const { cancelInterview, rescheduleInterview, completeInterview } = useInterviewActivity();

  // Fetch available interviewers
  const { data: availableInterviewers = [] } = useQuery({
    queryKey: ['availableInterviewers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, ats_role')
        .in('ats_role', ['ADMIN', 'INTERVIEWER'])
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'no_show_candidate':
      case 'no_show_interviewer':
      case 'no_show_both':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCancel = () => {
    if (!selectedInterview) return;
    
    cancelInterview.mutate({
      interviewId: selectedInterview.id,
      candidateId,
      reason: cancelReason
    }, {
      onSuccess: () => {
        setCancelReason('');
        setSelectedInterview(null);
        setActionType(null);
        onInterviewUpdate?.();
      }
    });
  };

  const handleReschedule = () => {
    if (!selectedInterview || !rescheduleDate || !rescheduleTime) return;
    
    const newStartTime = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
    const originalDuration = new Date(selectedInterview.scheduled_end).getTime() - new Date(selectedInterview.scheduled_start).getTime();
    const newEndTime = new Date(new Date(newStartTime).getTime() + originalDuration).toISOString();

    rescheduleInterview.mutate({
      interviewId: selectedInterview.id,
      candidateId,
      newStartTime,
      newEndTime,
      reason: rescheduleReason
    }, {
      onSuccess: () => {
        setRescheduleDate('');
        setRescheduleTime('');
        setRescheduleReason('');
        setSelectedInterview(null);
        setActionType(null);
        onInterviewUpdate?.();
      }
    });
  };

  const handleComplete = () => {
    if (!selectedInterview) return;
    
    completeInterview.mutate({
      interviewId: selectedInterview.id,
      candidateId,
      feedback: completionFeedback
    }, {
      onSuccess: () => {
        setCompletionFeedback('');
        setSelectedInterview(null);
        setActionType(null);
        onInterviewUpdate?.();
      }
    });
  };

  const handleScheduleInterview = async () => {
    if (!scheduleForm.interviewerId || !scheduleForm.startDate || !scheduleForm.startTime || !scheduleForm.endTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsScheduling(true);
    
    try {
      // Get candidate data first
      const { data: candidate } = await supabase
        .from('ats_candidates')
        .select('full_name, email')
        .eq('id', candidateId)
        .single();

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Find interviewer details
      const interviewer = availableInterviewers.find(i => i.email === scheduleForm.interviewerId);
      if (!interviewer) {
        throw new Error('Interviewer not found');
      }

      // Get applications for this candidate to find requisition
      const { data: applications } = await supabase
        .from('applications')
        .select('id, requisition_id')
        .eq('candidate_id', candidateId)
        .limit(1);

      if (!applications || applications.length === 0) {
        throw new Error('No application found for candidate');
      }

      const startTime = new Date(`${scheduleForm.startDate}T${scheduleForm.startTime}`).toISOString();
      const endTime = new Date(`${scheduleForm.startDate}T${scheduleForm.endTime}`).toISOString();

      const requestData = {
        candidateId,
        interviewerId: scheduleForm.interviewerId,
        requisitionId: applications[0].requisition_id,
        applicationId: applications[0].id,
        startTime,
        endTime,
        interviewType: scheduleForm.interviewType,
        attendeeEmails: [candidate.email, interviewer.email],
        subject: `${scheduleForm.interviewType} Interview: ${candidate.full_name}`
      };

      // Call fast scheduling function (creates Teams meeting in background)
      const { data, error } = await supabase.functions.invoke('schedule-interview-fast', {
        body: requestData
      });

      if (error) throw error;

      toast({
        title: "Interview Scheduled",
        description: "Interview has been scheduled successfully. Teams meeting will be created shortly.",
      });

      // Reset form and close dialog
      setScheduleForm({
        interviewerId: '',
        startDate: '',
        startTime: '',
        endTime: '',
        interviewType: 'technical'
      });
      setIsScheduleDialogOpen(false);
      onInterviewUpdate?.();

    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule interview",
        variant: "destructive"
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const openActionDialog = (interview: Interview, action: 'cancel' | 'reschedule' | 'complete') => {
    setSelectedInterview(interview);
    setActionType(action);
  };

  const closeDialog = () => {
    setSelectedInterview(null);
    setActionType(null);
    setCancelReason('');
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleReason('');
    setCompletionFeedback('');
  };

  if (!interviews || interviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Interviews
            </div>
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <Video className="mr-2 h-4 w-4" />
                  Schedule Interview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Schedule Interview</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="interviewer">Interviewer</Label>
                    <Select value={scheduleForm.interviewerId} onValueChange={(value) => setScheduleForm({...scheduleForm, interviewerId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInterviewers.map((interviewer) => (
                          <SelectItem key={interviewer.user_id} value={interviewer.email}>
                            {interviewer.full_name} ({interviewer.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) => setScheduleForm({...scheduleForm, startDate: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="type">Interview Type</Label>
                    <Select value={scheduleForm.interviewType} onValueChange={(value) => setScheduleForm({...scheduleForm, interviewType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="behavioral">Behavioral</SelectItem>
                        <SelectItem value="cultural">Cultural Fit</SelectItem>
                        <SelectItem value="final">Final Round</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleScheduleInterview} 
                    disabled={isScheduling}
                    className="w-full"
                  >
                    {isScheduling ? 'Scheduling...' : 'Schedule Interview'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No interviews scheduled</h3>
            <p className="text-gray-600">Schedule interviews with this candidate as they progress through the pipeline.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Interviews ({interviews.length})
            </div>
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <Video className="mr-2 h-4 w-4" />
                  Schedule Interview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Schedule Interview</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="interviewer">Interviewer</Label>
                    <Select value={scheduleForm.interviewerId} onValueChange={(value) => setScheduleForm({...scheduleForm, interviewerId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInterviewers.map((interviewer) => (
                          <SelectItem key={interviewer.user_id} value={interviewer.email}>
                            {interviewer.full_name} ({interviewer.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduleForm.startDate}
                      onChange={(e) => setScheduleForm({...scheduleForm, startDate: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="type">Interview Type</Label>
                    <Select value={scheduleForm.interviewType} onValueChange={(value) => setScheduleForm({...scheduleForm, interviewType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="behavioral">Behavioral</SelectItem>
                        <SelectItem value="cultural">Cultural Fit</SelectItem>
                        <SelectItem value="final">Final Round</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleScheduleInterview} 
                    disabled={isScheduling}
                    className="w-full"
                  >
                    {isScheduling ? 'Scheduling...' : 'Schedule Interview'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interviews.map((interview) => (
            <div key={interview.id} className="border rounded-lg p-4 hover:bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(interview.status)}>
                      {interview.status}
                    </Badge>
                    <Badge variant="outline">
                      {interview.interview_type}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {new Date(interview.scheduled_start).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      {new Date(interview.scheduled_start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      {interview.interviewer.full_name}
                    </div>
                    {interview.meeting_link && (
                      <div className="flex items-center">
                        <Video className="mr-1 h-4 w-4" />
                        Teams Meeting
                      </div>
                    )}
                  </div>
                  {interview.notes && (
                    <p className="text-sm text-gray-600 mt-2">{interview.notes}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  {interview.status === 'scheduled' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openActionDialog(interview, 'complete')}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Complete
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openActionDialog(interview, 'reschedule')}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Reschedule
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openActionDialog(interview, 'cancel')}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            console.log('Triggering manual status check...');
                            await supabase.functions.invoke('manual-interview-status-check', { body: { candidateId } });
                            window.location.reload(); // Refresh to see updates
                          } catch (error) {
                            console.error('Error triggering status check:', error);
                          }
                        }}
                      >
                        🔄 Check Status
                      </Button>
                    </>
                  )}
                  {interview.meeting_link && interview.status === 'scheduled' && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => window.open(interview.meeting_link, '_blank')}
                    >
                      <Video className="mr-1 h-4 w-4" />
                      Join Meeting
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <Dialog open={!!actionType} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'cancel' && 'Cancel Interview'}
              {actionType === 'reschedule' && 'Reschedule Interview'}
              {actionType === 'complete' && 'Complete Interview'}
            </DialogTitle>
          </DialogHeader>
          
          {actionType === 'cancel' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cancelReason">Reason for cancellation</Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Optional: Explain why the interview is being cancelled"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={handleCancel}
                  disabled={cancelInterview.isPending}
                >
                  {cancelInterview.isPending ? 'Cancelling...' : 'Cancel Interview'}
                </Button>
              </div>
            </div>
          )}

          {actionType === 'reschedule' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rescheduleDate">New Date</Label>
                  <Input
                    id="rescheduleDate"
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="rescheduleTime">New Time</Label>
                  <Input
                    id="rescheduleTime"
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rescheduleReason">Reason for rescheduling</Label>
                <Textarea
                  id="rescheduleReason"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Optional: Explain why the interview is being rescheduled"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button 
                  onClick={handleReschedule}
                  disabled={rescheduleInterview.isPending || !rescheduleDate || !rescheduleTime}
                >
                  {rescheduleInterview.isPending ? 'Rescheduling...' : 'Reschedule Interview'}
                </Button>
              </div>
            </div>
          )}

          {actionType === 'complete' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="completionFeedback">Interview Feedback</Label>
                <Textarea
                  id="completionFeedback"
                  value={completionFeedback}
                  onChange={(e) => setCompletionFeedback(e.target.value)}
                  placeholder="Optional: Add any notes or feedback about the completed interview"
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button 
                  onClick={handleComplete}
                  disabled={completeInterview.isPending}
                >
                  {completeInterview.isPending ? 'Completing...' : 'Mark as Complete'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};