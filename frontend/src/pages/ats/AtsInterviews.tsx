import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Video } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const AtsInterviews = () => {
  const [search, setSearch] = useState('');

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ['ats-interviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ats_interviews')
        .select(
          `
          *,
          application:applications(
            id,
            candidate:ats_candidates(full_name, email),
            requisition:requisitions(title)
          ),
          interview_assignments(
            interviewer:profiles(full_name, email)
          )
        `
        )
        .order('scheduled_start', { ascending: true });

      if (error) throw error;
      return data;
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
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="py-8 px-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interviews</h1>
          <p className="text-muted-foreground">Manage interview schedules and feedback</p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Interview
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">2 completed, 3 upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">8 technical, 15 behavioral</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Awaiting interviewer input</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2</div>
            <p className="text-xs text-muted-foreground">Based on 45 reviews</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search interviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading interviews...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview: any) => (
                <div key={interview.id} className="border rounded-lg p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">
                          {interview.application?.candidate?.full_name}
                        </h3>
                        <Badge className={getStatusColor(interview.status)}>
                          {interview.status}
                        </Badge>
                        <Badge variant="outline">{interview.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {interview.application?.requisition?.title}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {interview.scheduled_start
                            ? new Date(interview.scheduled_start).toLocaleDateString()
                            : 'Not scheduled'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {interview.scheduled_start
                            ? new Date(interview.scheduled_start).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'No time set'}
                        </div>
                        <div className="flex items-center">
                          <Users className="mr-1 h-4 w-4" />
                          {interview.interview_assignments?.length || 0} interviewer(s)
                        </div>
                        {interview.meeting_link && (
                          <div className="flex items-center">
                            <Video className="mr-1 h-4 w-4" />
                            Teams Meeting
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      {interview.status === 'scheduled' && (
                        <Button variant="outline" size="sm">
                          Join Meeting
                        </Button>
                      )}
                    </div>
                  </div>
                  {interview.interview_assignments?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm">
                        <span className="font-medium">Interviewers: </span>
                        {interview.interview_assignments.map((assignment: any, index: number) => (
                          <span key={assignment.interviewer?.email}>
                            {assignment.interviewer?.full_name}
                            {index < interview.interview_assignments.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
