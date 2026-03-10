import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  MessageSquare, 
  User, 
  FileText, 
  Video,
  UserPlus,
  Edit,
  Upload,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  Eye
} from 'lucide-react';
import { useActivityVisibility } from '@/hooks/useActivityVisibility';

interface ActivityItem {
  id: string;
  activity_type: string;
  activity_description: string;
  created_at: string;
  metadata?: any;
  user?: {
    full_name: string;
    email: string;
  };
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  candidateId: string;
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'comment_added':
      return MessageSquare;
    case 'profile_updated':
      return Edit;
    case 'resume_updated':
      return Upload;
    case 'feedback_submitted':
    case 'feedback_saved_draft':
    case 'feedback_updated':
    case 'feedback_resubmitted':
      return Star;
    case 'interview_scheduled':
      return Calendar;
    case 'interview_cancelled':
      return XCircle;
    case 'interview_rescheduled':
      return Clock;
    case 'interview_completed':
      return CheckCircle;
    case 'application_created':
      return UserPlus;
    case 'application_deleted':
      return XCircle;
    case 'test_assigned':
    case 'test_started':
    case 'test_completed':
      return FileText;
    default:
      return User;
  }
};

const getActivityColor = (activityType: string) => {
  switch (activityType) {
    case 'comment_added':
      return 'text-blue-600 bg-blue-100';
    case 'profile_updated':
      return 'text-orange-600 bg-orange-100';
    case 'resume_updated':
      return 'text-green-600 bg-green-100';
    case 'feedback_submitted':
    case 'feedback_updated':
    case 'feedback_resubmitted':
      return 'text-purple-600 bg-purple-100';
    case 'feedback_saved_draft':
      return 'text-gray-600 bg-gray-100';
    case 'interview_scheduled':
      return 'text-blue-600 bg-blue-100';
    case 'interview_cancelled':
      return 'text-red-600 bg-red-100';
    case 'interview_rescheduled':
      return 'text-yellow-600 bg-yellow-100';
    case 'interview_completed':
      return 'text-green-600 bg-green-100';
    case 'application_created':
      return 'text-emerald-600 bg-emerald-100';
    case 'application_deleted':
      return 'text-red-600 bg-red-100';
    case 'test_assigned':
    case 'test_started':
    case 'test_completed':
      return 'text-indigo-600 bg-indigo-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const formatActivityType = (activityType: string) => {
  return activityType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities, candidateId }) => {
  const { isActivityUnseen, markActivitiesAsSeen, markAllAsSeen, unseenActivityIds } = useActivityVisibility(candidateId);

  // Mark activities as seen when component mounts with activities
  useEffect(() => {
    if (activities.length > 0 && unseenActivityIds.length > 0) {
      const timer = setTimeout(() => {
        markActivitiesAsSeen(activities.map(a => a.id));
      }, 2000); // Mark as seen after 2 seconds of viewing
      
      return () => clearTimeout(timer);
    }
  }, [activities, unseenActivityIds.length, markActivitiesAsSeen]);

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-16">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No activity yet</h3>
          <p className="text-gray-600">Activity will appear here as actions are taken on this candidate.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
        
        <div className="space-y-6">
          {activities.map((activity, index) => {
            const ActivityIcon = getActivityIcon(activity.activity_type);
            const colorClass = getActivityColor(activity.activity_type);
            const isLast = index === activities.length - 1;
            const isUnseen = isActivityUnseen(activity.id);
            
            return (
              <div key={activity.id} className="relative flex items-start space-x-4">
                {/* Timeline dot with icon */}
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 border-background ${colorClass} ${isUnseen ? 'ring-2 ring-primary ring-opacity-50' : ''}`}>
                  <ActivityIcon className="w-5 h-5" />
                  {isUnseen && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse border-2 border-background"></div>
                  )}
                </div>
                
                {/* Activity content */}
                <div className="flex-1 min-w-0 pb-6">
                  <Card className={`animate-fade-in ${isUnseen ? 'ring-1 ring-primary/30 shadow-lg' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {formatActivityType(activity.activity_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.created_at).toLocaleDateString()} at{' '}
                              {new Date(activity.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium text-foreground mb-1">
                            {activity.activity_description}
                          </p>
                          
                          {activity.user && (
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>by {activity.user.full_name}</span>
                            </div>
                          )}
                          
                          {/* Show metadata for certain activity types */}
                          {activity.metadata && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {activity.activity_type === 'profile_updated' && activity.metadata.changes && (
                                <div className="space-y-1">
                                  <span className="font-medium">Changes made:</span>
                                  {activity.metadata.changes.map((change: any, idx: number) => (
                                    <div key={idx} className="pl-2">
                                      <span className="font-medium">{change.field}:</span>{' '}
                                      <span className="line-through text-red-600">{change.old_value || 'empty'}</span>
                                      {' → '}
                                      <span className="text-green-600">{change.new_value || 'empty'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {activity.activity_type.startsWith('interview_') && activity.metadata.interviewer_name && (
                                <div className="space-y-1">
                                  <div><span className="font-medium">Interviewer:</span> {activity.metadata.interviewer_name}</div>
                                  {activity.metadata.interview_type && (
                                    <div><span className="font-medium">Type:</span> {activity.metadata.interview_type}</div>
                                  )}
                                  {activity.metadata.scheduled_start && (
                                    <div>
                                      <span className="font-medium">Scheduled:</span>{' '}
                                      {new Date(activity.metadata.scheduled_start).toLocaleDateString()} at{' '}
                                      {new Date(activity.metadata.scheduled_start).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  )}
                                  {activity.metadata.has_teams_meeting && (
                                    <div className="flex items-center space-x-1">
                                      <Video className="w-3 h-3" />
                                      <span>Teams meeting included</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {activity.activity_type.startsWith('feedback_') && activity.metadata.overall_percent && (
                                <div>
                                  <span className="font-medium">Overall Rating:</span> {activity.metadata.overall_percent}%
                                </div>
                              )}
                              
                              {(activity.activity_type === 'application_created' || activity.activity_type === 'application_deleted') && activity.metadata.requisition_title && (
                                <div>
                                  <span className="font-medium">Position:</span> {activity.metadata.requisition_title}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};