import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Users,
  Calendar,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  Plus,
  FileText,
  MessageSquare,
  Star,
  Download,
  Upload,
  Video,
  Home,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { KanbanBoard, type Stage, type Candidate } from '@/components/kanban/KanbanBoard';
import { FiltersSidebar, type FilterState } from '@/components/kanban/FiltersSidebar';
import { CandidateDrawer } from '@/components/kanban/CandidateDrawer';
import { AddStageDialog } from '@/components/kanban/AddStageDialog';
import { ManageStagesDialog } from '@/components/kanban/ManageStagesDialog';
import { type DropResult } from '@hello-pangea/dnd';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import mammoth from 'mammoth';

// Configure PDF.js worker (hosted CDN avoids bundling issues)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Default pipeline stages for Kanban
const DEFAULT_STAGES: Stage[] = [
  { id: 'applied', name: 'Applied', order: 1 },
  { id: 'phone_screen', name: 'Phone Screen', order: 2 },
  { id: 'technical', name: 'Technical Interview', order: 3 },
  { id: 'final', name: 'Final Interview', order: 4 },
  { id: 'offer', name: 'Offer', order: 5 },
  { id: 'hired', name: 'Hired', order: 6, isTerminal: true },
  { id: 'rejected', name: 'Rejected', order: 7, isTerminal: true },
];

interface Requisition {
  id: string;
  title: string;
  dept: string;
  location: string;
  employment_type: string;
  description: string;
  status: string;
  hiring_manager_id: string;
  linkedin_job_id: string;
  linkedin_posted_at: string;
  created_at: string;
  updated_at: string;
  min_experience: number;
  max_experience: number;
  skills: string[];
  hiring_manager?: {
    full_name: string;
    email: string;
  };
}

interface Application {
  id: string;
  stage: string;
  status: string;
  created_at: string;
  candidate: {
    id: string;
    full_name: string;
    email: string;
    location: string;
    current_company: string;
    current_title: string;
    resume_url: string;
    resume_score?: number;
    resume_analysis?: any;
    last_scored_at?: string;
    created_at: string;
  };
}

interface Comment {
  id: string;
  comment: string;
  visible_to_roles: string[];
  created_at: string;
  user_id: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export const AtsRequisitionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<string[]>(['ADMIN', 'TA_ADMIN']);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    currentCompany: '',
    currentTitle: '',
    linkedinProfile: '',
    source: '',
    notes: '',
    resumeFile: null as File | null,
  });
  const [scheduleForm, setScheduleForm] = useState({
    interviewerId: 'vikram.kansal@atdawntech.com',
    startDate: '',
    startTime: '',
    endTime: '',
    interviewType: 'technical',
    candidateId: '',
  });
  const [scoringCandidates, setScoringCandidates] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');

  // Kanban state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    stages: [],
    sources: [],
    dateRange: {},
  });
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);

  // Fetch available interviewers (users with INTERVIEWER role or ADMIN role)
  const { data: availableInterviewers } = useQuery({
    queryKey: ['availableInterviewers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, ats_role')
        .in('ats_role', ['ADMIN', 'INTERVIEWER'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: requisition, isLoading: isLoadingRequisition } = useQuery({
    queryKey: ['requisition', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisitions')
        .select(
          `
          *,
          hiring_manager:profiles!hiring_manager_id(full_name, email)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        hiring_manager: Array.isArray(data.hiring_manager) ? data.hiring_manager[0] : data.hiring_manager
      } as Requisition;
    },
    enabled: !!id,
  });

  const { data: applications = [], isLoading: isLoadingApplications } = useQuery({
    queryKey: ['applications', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(
          `
          id, created_at, stage, status,
          candidate:ats_candidates(id, full_name, email, location, current_company, current_title, resume_url, resume_score, resume_analysis, last_scored_at, created_at)
        `
        )
        .eq('requisition_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((app: any) => ({
        ...app,
        candidate: Array.isArray(app.candidate) ? app.candidate[0] : app.candidate
      })) as Application[];
    },
    enabled: !!id,
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: false,
    placeholderData: [],
  });

  // Memoize sorted applications to prevent infinite re-renders
  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      if (sortBy === 'score') {
        return (b.candidate.resume_score || 0) - (a.candidate.resume_score || 0);
      } else if (sortBy === 'name') {
        return (a.candidate.full_name || '').localeCompare(b.candidate.full_name || '');
      }
      // date by candidate profile created_at desc
      return (
        new Date(b.candidate.created_at || b.created_at).getTime() -
        new Date(a.candidate.created_at || a.created_at).getTime()
      );
    });
  }, [applications, sortBy]);

  // Load pipeline stages from config for Kanban
  const { data: stages = DEFAULT_STAGES } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'pipeline_stages')
        .single();

      if (error || !data) {
        // Seed default stages if not found
        await supabase.from('config').upsert(
          {
            key: 'pipeline_stages',
            value: JSON.stringify(DEFAULT_STAGES),
            user_id: (await supabase.auth.getUser()).data.user?.id,
          },
          { onConflict: 'user_id,key' }
        );
        return DEFAULT_STAGES;
      }

      return JSON.parse(data.value) as Stage[];
    },
  });

  // Transform applications to candidates for Kanban
  const candidates: Candidate[] = useMemo(() => {
    return applications.map((app) => ({
      id: app.candidate.id,
      full_name: app.candidate.full_name,
      email: app.candidate.email,
      phone: '',
      location: app.candidate.location,
      source: '',
      current_company: app.candidate.current_company,
      current_title: app.candidate.current_title,
      resume_url: app.candidate.resume_url,
      created_at: app.candidate.created_at,
      current_step: app.stage || 'sourced',
    }));
  }, [applications]);

  // Apply filters to candidates
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    if (filters.search) {
      filtered = filtered.filter(
        (candidate) =>
          candidate.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
          candidate.email.toLowerCase().includes(filters.search.toLowerCase()) ||
          candidate.current_company?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.stages.length > 0) {
      filtered = filtered.filter((candidate) =>
        filters.stages.includes(candidate.current_step || 'sourced')
      );
    }

    if (filters.dateRange.from) {
      filtered = filtered.filter(
        (candidate) => new Date(candidate.created_at) >= filters.dateRange.from!
      );
    }

    if (filters.dateRange.to) {
      filtered = filtered.filter(
        (candidate) => new Date(candidate.created_at) <= filters.dateRange.to!
      );
    }

    return filtered;
  }, [candidates, filters]);

  // Group candidates by stage for Kanban
  const cardsByStage = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};

    // Initialize all stages with empty arrays
    stages.forEach((stage) => {
      grouped[stage.id] = [];
    });

    // Group filtered candidates by current_step
    filteredCandidates.forEach((candidate) => {
      const stageId = candidate.current_step || 'sourced';
      if (grouped[stageId]) {
        grouped[stageId].push(candidate);
      } else {
        grouped['sourced'] = grouped['sourced'] || [];
        grouped['sourced'].push(candidate);
      }
    });

    return grouped;
  }, [filteredCandidates, stages]);

  // Get unique sources for filtering
  const sources = useMemo(() => {
    return [...new Set(applications.map((app) => app.candidate.current_company).filter(Boolean))];
  }, [applications]);

  // Move candidate between stages
  const moveCandidateMutation = useMutation({
    mutationFn: async ({
      candidateId,
      fromStage,
      toStage,
    }: {
      candidateId: string;
      fromStage: string;
      toStage: string;
    }) => {
      // Update the application stage in the database
      const application = applications.find((app) => app.candidate.id === candidateId);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase
        .from('applications')
        .update({ stage: toStage })
        .eq('id', application.id);

      if (error) throw error;

      // Also update ats_candidates current_step if it exists
      await supabase.from('ats_candidates').update({ current_step: toStage }).eq('id', candidateId);

      // Log the workflow update and candidate activity
      await Promise.all([
        supabase.from('workflow_updates').insert({
          candidate_id: candidateId,
          actor_id: user?.id,
          step_name: 'stage_change',
          old_status: fromStage,
          new_status: toStage,
          updated_by: user?.email || 'Unknown',
        }),
        supabase.rpc('log_candidate_activity', {
          p_candidate_id: candidateId,
          p_activity_type: 'stage_change',
          p_activity_description: `Moved from ${fromStage} to ${toStage}`,
          p_metadata: { from_stage: fromStage, to_stage: toStage, requisition_id: id },
        }),
      ]);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      if (vars?.candidateId) {
        queryClient.invalidateQueries({ queryKey: ['candidate-activities', vars.candidateId] });
        queryClient.invalidateQueries({ queryKey: ['candidate-comments', vars.candidateId] });
      }
      toast({
        title: 'Success',
        description: 'Candidate moved successfully',
      });
    },
    onError: (error) => {
      console.error('Error moving candidate:', error);
      toast({
        title: 'Error',
        description: 'Failed to move candidate',
        variant: 'destructive',
      });
    },
  });

  const { data: interviews = [], isLoading: isLoadingInterviews } = useQuery({
    queryKey: ['requisition-interviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ats_interviews')
        .select(
          `
          id, scheduled_start, scheduled_end, status, interview_type, meeting_link, notes,
          candidate:ats_candidates(full_name, email),
          interviewer:profiles!ats_interviews_interviewer_id_fkey(full_name, email)
        `
        )
        .eq('requisition_id', id)
        .order('scheduled_start', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 300_000, // Cache for 5 minutes since interviews don't change frequently
    refetchOnWindowFocus: false,
    placeholderData: [],
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['requisition-comments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisition_comments')
        .select('id, comment, visible_to_roles, created_at, user_id')
        .eq('requisition_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = Array.from(new Set((data || []).map((d: any) => d.user_id).filter(Boolean)));
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      }

      return (data || []).map((c: any) => ({ ...c, user: profileMap[c.user_id] })) as Comment[];
    },
    enabled: !!id,
    staleTime: 120_000, // Cache for 2 minutes
    refetchOnWindowFocus: false,
  });

  const { data: requisitionActivities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['requisition-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisition_activities')
        .select('id, activity_type, activity_description, metadata, created_at, actor_id')
        .eq('requisition_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const actorIds = Array.from(
        new Set((data || []).map((d: any) => d.actor_id).filter(Boolean))
      );
      let profileMap: Record<string, any> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', actorIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      }

      return (data || []).map((a: any) => ({ ...a, user: profileMap[a.actor_id] }));
    },
    enabled: !!id,
    staleTime: 300_000, // Cache for 5 minutes since activities don't change frequently
  });

  const addComment = useMutation({
    mutationFn: async ({
      comment,
      visibleToRoles,
    }: {
      comment: string;
      visibleToRoles: string[];
    }) => {
      const { data, error } = await supabase
        .from('requisition_comments')
        .insert({
          requisition_id: id,
          user_id: user?.id,
          comment,
          visible_to_roles: visibleToRoles,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (newComment) => {
      // Add the new comment to the cache immediately for instant UI update
      queryClient.setQueryData(['requisition-comments', id], (oldComments: any[] = []) => {
        return [newComment, ...oldComments];
      });

      // Log activity in background (don't await to avoid slowing down the UI)
      try {
        await supabase.rpc('log_requisition_activity', {
          p_requisition_id: id,
          p_activity_type: 'comment_added',
          p_activity_description: `Comment added: ${newComment.comment.slice(0, 50)}${newComment.comment.length > 50 ? '...' : ''}`,
          p_metadata: { comment_id: newComment.id },
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }

      setNewComment('');
      toast({
        title: 'Comment added',
        description: 'Your comment has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding comment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const scheduleInterview = useMutation({
    mutationFn: async (interviewData: any) => {
      const { data, error } = await supabase.functions.invoke('schedule-teams-interview', {
        body: interviewData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsScheduleDialogOpen(false);
      // Refresh interviews list
      queryClient.invalidateQueries({ queryKey: ['requisition-interviews', id] });
      // Also refresh applications in case we need to update status
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      toast({
        title: 'Interview scheduled',
        description: data.meetingLink
          ? 'Interview scheduled with Teams meeting link'
          : 'Interview scheduled successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error scheduling interview',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addCandidate = useMutation({
    mutationFn: async (candidateData: any) => {
      // First check if a candidate with this email already exists
      const { data: existingCandidate, error: searchError } = await supabase
        .from('ats_candidates')
        .select('id, full_name, email')
        .eq('email', candidateData.email)
        .maybeSingle();

      if (searchError) throw searchError;

      let candidate;
      let resumeUrl = null;

      // Handle resume file upload if provided
      if (candidateData.resumeFile) {
        const fileExt = candidateData.resumeFile.name.split('.').pop();
        const fileName = `${candidateData.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, candidateData.resumeFile);

        if (uploadError) {
          console.error('Resume upload error:', uploadError);
          throw new Error('Failed to upload resume file');
        }

        // Store storage path (private bucket)
        resumeUrl = fileName;
      }

      if (existingCandidate) {
        // Check if this candidate already has an application for this requisition
        const { data: existingApplication, error: appCheckError } = await supabase
          .from('applications')
          .select('id')
          .eq('candidate_id', existingCandidate.id)
          .eq('requisition_id', id)
          .maybeSingle();

        if (appCheckError) throw appCheckError;

        if (existingApplication) {
          throw new Error(`${existingCandidate.full_name} is already applied to this position`);
        }

        // Update existing candidate with new resume if provided
        if (resumeUrl) {
          const { data: updatedCandidate, error: updateError } = await supabase
            .from('ats_candidates')
            .update({ resume_url: resumeUrl })
            .eq('id', existingCandidate.id)
            .select()
            .single();

          if (updateError) throw updateError;
          candidate = updatedCandidate;
        } else {
          candidate = existingCandidate;
        }
      } else {
        // Create new candidate if doesn't exist
        const { data: newCandidate, error: candidateError } = await supabase
          .from('ats_candidates')
          .insert({
            full_name: candidateData.fullName,
            email: candidateData.email,
            phone: candidateData.phone,
            location: candidateData.location,
            current_company: candidateData.currentCompany,
            current_title: candidateData.currentTitle,
            linkedin_profile: candidateData.linkedinProfile,
            source: candidateData.source,
            notes: candidateData.notes,
            resume_url: resumeUrl,
          })
          .select()
          .single();

        if (candidateError) throw candidateError;
        candidate = newCandidate;
      }

      // Auto-score resume if one was uploaded and we have a job description (asynchronous)
      if (resumeUrl && requisition?.description) {
        // Fire and forget - don't await to avoid blocking candidate creation
        setTimeout(async () => {
          try {
            console.log('Auto-scoring resume for candidate:', candidate.id);
            await scoreResumeForCandidate(candidate.id, resumeUrl, requisition.description);
            // Invalidate applications query to refresh the display with new scores
            queryClient.invalidateQueries({ queryKey: ['applications', id] });
          } catch (error) {
            console.error('Failed to auto-score resume:', error);
          }
        }, 100); // Small delay to ensure UI responsiveness
      }

      // Create the application
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert({
          candidate_id: candidate.id,
          requisition_id: id,
          owner_id: user?.id,
          stage: 'sourced',
          status: 'active',
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      // Log activities
      await Promise.all([
        supabase.rpc('log_requisition_activity', {
          p_requisition_id: id,
          p_activity_type: 'candidate_added',
          p_activity_description: `Candidate ${candidate.full_name} ${existingCandidate ? 'added to' : 'created and added to'} requisition`,
          p_metadata: { candidate_id: candidate.id, application_id: application.id },
        }),
        supabase.rpc('log_candidate_activity', {
          p_candidate_id: candidate.id,
          p_activity_type: 'application_created',
          p_activity_description: `Applied to ${requisition?.title || 'position'}`,
          p_metadata: { requisition_id: id, application_id: application.id },
        }),
      ]);

      return { candidate, application };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['requisition-activities', id] });
      setIsAddCandidateOpen(false);
      setCandidateForm({
        fullName: '',
        email: '',
        phone: '',
        location: '',
        currentCompany: '',
        currentTitle: '',
        linkedinProfile: '',
        source: '',
        notes: '',
        resumeFile: null,
      });
      toast({
        title: 'Candidate added',
        description: 'The candidate has been successfully added to this requisition.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding candidate',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete candidate mutation
  const deleteCandidate = useMutation({
    mutationFn: async (applicationId: string) => {
      const application = applications.find((app) => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase.from('applications').delete().eq('id', applicationId);

      if (error) throw error;

      // Log activities
      await Promise.all([
        supabase.rpc('log_requisition_activity', {
          p_requisition_id: id,
          p_activity_type: 'candidate_removed',
          p_activity_description: `Candidate ${application.candidate.full_name} removed from requisition`,
          p_metadata: { candidate_id: application.candidate.id, application_id: applicationId },
        }),
        supabase.rpc('log_candidate_activity', {
          p_candidate_id: application.candidate.id,
          p_activity_type: 'application_deleted',
          p_activity_description: `Removed from ${requisition?.title || 'position'}`,
          p_metadata: { requisition_id: id, application_id: applicationId },
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['requisition-activities', id] });
      toast({
        title: 'Candidate removed',
        description: 'The candidate has been removed from this requisition.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing candidate',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Score resume function
  const scoreResume = async (candidateId: string, resumeUrl: string) => {
    try {
      setScoringCandidates((prev) => new Set(prev).add(candidateId));

      // First, resolve resume blob (supports private buckets and path strings)
      let blob: Blob | null = null;
      try {
        if (resumeUrl.startsWith('http')) {
          const urlObj = new URL(resumeUrl);
          const pathAfterBucket = decodeURIComponent(urlObj.pathname.split('/resumes/')[1] || '');
          if (pathAfterBucket) {
            const { data: dlBlob } = await supabase.storage
              .from('resumes')
              .download(pathAfterBucket);
            if (dlBlob) blob = dlBlob as Blob;
          }
        } else {
          const { data: dlBlob } = await supabase.storage.from('resumes').download(resumeUrl);
          if (dlBlob) blob = dlBlob as Blob;
        }
      } catch (e) {
        console.warn('Storage download attempt failed', e);
      }
      if (!blob && resumeUrl.startsWith('http')) {
        try {
          const urlObj = new URL(resumeUrl);
          const pathAfterBucket = decodeURIComponent(urlObj.pathname.split('/resumes/')[1] || '');
          if (pathAfterBucket) {
            const { data: signed } = await supabase.storage
              .from('resumes')
              .createSignedUrl(pathAfterBucket, 60);
            if ((signed as any)?.signedUrl) {
              const res = await fetch((signed as any).signedUrl);
              if (res.ok) blob = await res.blob();
            }
          }
        } catch (e) {
          console.warn('Signed URL fetch failed', e);
        }
      }
      if (!blob && resumeUrl.startsWith('http')) {
        const response = await fetch(resumeUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('Failed to download resume');
        blob = await response.blob();
      }
      const file = new File([blob!], 'resume', { type: (blob as any)?.type || 'application/pdf' });

      // Extract raw text from the resume file for scoring
      let resumeText = '';
      try {
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = (textContent.items as any[])
              .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
              .join(' ');
            resumeText += pageText + '\n';
          }
        } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          resumeText = result.value;
        } else {
          throw new Error('Unsupported file type. Please upload PDF or DOCX files.');
        }
      } catch (parseError) {
        console.error('Failed to parse resume, using basic scoring');
        resumeText = 'Resume parsing failed - basic scoring only';
      }

      // Ensure non-empty resumeText
      if (!resumeText || !resumeText.trim()) {
        console.warn('Empty resume text after parsing; using fallback.');
        resumeText = 'Resume parsing failed - basic scoring only';
      }

      // Get job description from requisition
      const jobDescription = requisition?.description || 'No job description available';
      // Call the scoring edge function
      const { data, error } = await supabase.functions.invoke('score-resume', {
        body: {
          candidateId,
          resumeText,
          jobTitle: requisition?.title || 'No job title available',
          jobDescription: `Position: ${requisition?.title}\n\nDescription: ${jobDescription}\n\nSkills Required: ${requisition?.skills?.join(', ') || 'Not specified'}`,
        },
      });

      if (error) throw error;

      // Refresh the applications data to show the updated score
      queryClient.invalidateQueries({ queryKey: ['applications', id] });

      toast({
        title: 'Resume scored successfully',
        description: `Score: ${data.score}% match against job requirements`,
      });
    } catch (error) {
      console.error('Error scoring resume:', error);
      toast({
        title: 'Error scoring resume',
        description: error.message || 'Failed to score resume',
        variant: 'destructive',
      });
    } finally {
      setScoringCandidates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
  };

  // Score resume function for auto-scoring
  const scoreResumeForCandidate = async (
    candidateId: string,
    resumeUrl: string,
    jobDescription: string
  ) => {
    // First, resolve resume blob (supports private buckets and path strings)
    let blob: Blob | null = null;
    try {
      if (resumeUrl.startsWith('http')) {
        const urlObj = new URL(resumeUrl);
        const pathAfterBucket = decodeURIComponent(urlObj.pathname.split('/resumes/')[1] || '');
        if (pathAfterBucket) {
          const { data: dlBlob } = await supabase.storage.from('resumes').download(pathAfterBucket);
          if (dlBlob) blob = dlBlob as Blob;
        }
      } else {
        const { data: dlBlob } = await supabase.storage.from('resumes').download(resumeUrl);
        if (dlBlob) blob = dlBlob as Blob;
      }
    } catch (e) {
      console.warn('Storage download attempt failed', e);
    }
    if (!blob && resumeUrl.startsWith('http')) {
      try {
        const urlObj = new URL(resumeUrl);
        const pathAfterBucket = decodeURIComponent(urlObj.pathname.split('/resumes/')[1] || '');
        if (pathAfterBucket) {
          const { data: signed } = await supabase.storage
            .from('resumes')
            .createSignedUrl(pathAfterBucket, 60);
          if ((signed as any)?.signedUrl) {
            const res = await fetch((signed as any).signedUrl);
            if (res.ok) blob = await res.blob();
          }
        }
      } catch (e) {
        console.warn('Signed URL fetch failed', e);
      }
    }
    if (!blob && resumeUrl.startsWith('http')) {
      const response = await fetch(resumeUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Failed to download resume');
      blob = await response.blob();
    }
    const file = new File([blob!], 'resume', { type: (blob as any)?.type || 'application/pdf' });

    // Extract raw text from the resume file for scoring
    let resumeText = '';
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = (textContent.items as any[])
            .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
            .join(' ');
          resumeText += pageText + '\n';
        }
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        resumeText = result.value;
      } else {
        throw new Error('Unsupported file type. Please upload PDF or DOCX files.');
      }
    } catch (parseError) {
      console.error('Failed to parse resume, using basic scoring');
      resumeText = 'Resume parsing failed - basic scoring only';
    }

    // Ensure non-empty resumeText
    if (!resumeText || !resumeText.trim()) {
      console.warn('Empty resume text after parsing; using fallback.');
      resumeText = 'Resume parsing failed - basic scoring only';
    }

    const { data, error } = await supabase.functions.invoke('score-resume', {
      body: {
        candidateId,
        resumeText,
        jobTitle: requisition?.title || 'Unknown',
        jobDescription,
      },
    });

    if (error) throw error;

    // Refresh the applications data to show the updated score
    queryClient.invalidateQueries({ queryKey: ['applications', id] });

    return data;
  };

  const parseResume = async (file: File) => {
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = (textContent.items as any[])
            .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
            .join(' ');
          text += pageText + '\n';
        }
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        throw new Error('Unsupported file type. Please upload PDF or DOCX files.');
      }

      // Helper function to clean text
      const cleanText = (str: string) => str.replace(/\s+/g, ' ').trim();

      // Extract email
      const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      const email = emailMatch ? emailMatch[0] : '';

      // Improved phone number extraction - multiple patterns
      let phone = '';
      const phonePatterns = [
        /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // +1-234-567-8900 or (234) 567-8900
        /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g, // (123) 456-7890
        /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, // 123-456-7890 or 123.456.7890
        /\+\d{10,15}/g, // +1234567890
        /\b\d{10}\b/g, // 1234567890
      ];

      for (const pattern of phonePatterns) {
        const matches = text.match(pattern);
        if (matches) {
          // Filter out numbers that are likely dates, years, or IDs
          const validPhone = matches.find((match) => {
            const digits = match.replace(/\D/g, '');
            return (
              digits.length >= 10 &&
              digits.length <= 15 &&
              !match.includes('@') && // Not part of email
              !/\b(19|20)\d{2}\b/.test(match)
            ); // Not a year
          });
          if (validPhone) {
            phone = cleanText(validPhone);
            break;
          }
        }
      }

      const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);

      // Improved name extraction - simplified and more reliable
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      let extractedName = '';

      // Function to check if a string looks like a name
      const isValidName = (name: string): boolean => {
        if (!name || name.length < 2 || name.length > 50) return false;
        // Must contain only letters, spaces, hyphens, apostrophes, periods
        if (!/^[A-Za-z\s\-'\.]+$/.test(name)) return false;
        // Must have at least 2 words for full name
        const words = name.trim().split(/\s+/);
        if (words.length < 2) return false;

        // Exclude common resume keywords and geographical locations
        const blacklist =
          /\b(resume|cv|curriculum|vitae|profile|contact|about|summary|objective|skills|experience|education|work|employment|phone|email|address|references|india|maharashtra|mumbai|pune|bangalore|delhi|hyderabad|chennai|kolkata|ahmedabad|california|texas|florida|new york|london|toronto|sydney|singapore|university|college|institute|ltd|llc|inc|corp|company|technologies|solutions|software|systems)\b/i;
        if (blacklist.test(name)) return false;

        // Check if words look like proper names (start with capital letter, reasonable length)
        for (const word of words) {
          if (word.length < 2 || word.length > 20) return false;
          if (!/^[A-Z][a-z]/.test(word)) return false;
        }

        return true;
      };

      // Strategy 1: Look for names in the first few lines (most common)
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];

        // Check if entire line is a name (common in headers)
        if (isValidName(line)) {
          extractedName = line;
          break;
        }

        // Look for "Name:" pattern
        const nameMatch = line.match(/^(?:name|full\s*name)\s*[:\-]\s*(.+)$/i);
        if (nameMatch && isValidName(nameMatch[1])) {
          extractedName = nameMatch[1];
          break;
        }
      }

      // Strategy 2: Look for capitalized words pattern (Title Case names)
      if (!extractedName) {
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i];
          // Match 2-4 capitalized words
          const titleCaseMatch = line.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$/);
          if (titleCaseMatch && isValidName(titleCaseMatch[1])) {
            extractedName = titleCaseMatch[1];
            break;
          }
        }
      }

      // Strategy 3: Look for ALL CAPS names and convert to proper case
      if (!extractedName) {
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i];
          // Match 2-4 all caps words
          const capsMatch = line.match(/^([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,}){0,2})$/);
          if (capsMatch) {
            const nameCandidate = capsMatch[1]
              .toLowerCase()
              .replace(/\b\w/g, (l) => l.toUpperCase());
            if (isValidName(nameCandidate)) {
              extractedName = nameCandidate;
              break;
            }
          }
        }
      }

      // Strategy 4: Extract from email if no name found
      if (!extractedName && email) {
        const emailLocal = email.split('@')[0];
        const nameParts = emailLocal.split(/[._-]/).filter((part) => part.length > 1);
        if (nameParts.length >= 2) {
          const nameFromEmail = nameParts
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
          if (isValidName(nameFromEmail)) {
            extractedName = nameFromEmail;
          }
        }
      }

      // Strategy 6: Scan head of document for names regardless of newlines
      if (!extractedName) {
        const condensed = text.replace(/\s+/g, ' ').trim();
        const head = condensed.slice(0, 500);
        const badWords =
          /(resume|curriculum vitae|curriculum|cv|profile|summary|objective|skills|experience|education|projects|contact)/i;

        // 6a. Consecutive ALL-CAPS words (2-3 tokens)
        const capsMatches = [
          ...head.matchAll(/\b([A-Z][A-Z'’\-]{2,})(?:\s+([A-Z][A-Z'’\-]{2,})){1,2}\b/g),
        ];
        for (const m of capsMatches) {
          const cand = m[0];
          if (!badWords.test(cand) && isValidName(cand)) {
            extractedName = cand.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
            break;
          }
        }

        // 6b. Title-case 2-3 consecutive words
        if (!extractedName) {
          const m = head.match(/\b([A-Z][a-zA-Z'’\-]+(?:\s+[A-Z][a-zA-Z'’\-]+){1,2})\b/);
          if (m && isValidName(m[1])) {
            extractedName = m[1];
          }
        }

        // 6c. Words immediately before the email address
        if (!extractedName && emailMatch) {
          const idx = head.indexOf(emailMatch[0]);
          if (idx > 0) {
            const before = head.slice(Math.max(0, idx - 100), idx).trim();
            const m = before.match(/([A-Z][a-zA-Z'’\-]+(?:\s+[A-Z][a-zA-Z'’\-]+){1,2})\s*$/);
            if (m && isValidName(m[1])) {
              extractedName = m[1];
            }
          }
        }
      }

      // Extract other information
      const titleMatch = text.match(
        /\b(?:Senior|Junior|Lead|Principal)?\s*(?:Software|Data|Product|Project|DevOps|QA|Quality|Design|UX|UI|Marketing|Sales|Finance|HR|Human\s*Resources|Operations|Backend|Frontend|Full\s*Stack)\s+(?:Engineer|Developer|Manager|Specialist|Analyst|Designer|Consultant|Lead|Architect)\b/i
      );
      const companyMatch = text.match(
        /\b(?:at|@)\s+([A-Z][\w&\s-]{2,}(?:Inc\.?|LLC|Corp\.?|Ltd\.?|Company)?)\b/
      );

      const result = {
        fullName: extractedName || '',
        email: email,
        phone: phone,
        linkedinProfile: linkedinMatch
          ? linkedinMatch[0].startsWith('http')
            ? linkedinMatch[0]
            : `https://${linkedinMatch[0]}`
          : '',
        currentCompany: companyMatch ? cleanText(companyMatch[1]) : '',
        currentTitle: titleMatch ? cleanText(titleMatch[0]) : '',
        location: '',
      };

      console.log('Parsed resume data:', result);

      return result;
    } catch (error) {
      console.error('Error parsing resume:', error);
      toast({
        title: 'Resume parsing failed',
        description:
          'Could not extract information from the resume. Please fill the form manually.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const parsedData = await parseResume(file);
    if (parsedData) {
      setCandidateForm((prev) => ({
        ...prev,
        ...parsedData,
        resumeFile: file,
      }));
      toast({
        title: 'Resume parsed successfully',
        description:
          'Information has been extracted from the resume. Please review and edit as needed.',
      });
    }
  };

  const handleAddCandidate = () => {
    if (!candidateForm.fullName || !candidateForm.email) {
      toast({
        title: 'Missing required fields',
        description: "Please provide at least the candidate's name and email.",
        variant: 'destructive',
      });
      return;
    }
    addCandidate.mutate(candidateForm);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0';
      case 'draft':
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0';
      case 'on_hold':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0';
      case 'closed':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-0';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'sourced':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'screening':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'interview':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'offer':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'hired':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleScheduleInterview = () => {
    // Check each field individually for better error messages
    const missingFields = [];
    if (!scheduleForm.candidateId) missingFields.push('Candidate');
    if (!scheduleForm.interviewerId) missingFields.push('Interviewer');
    if (!scheduleForm.startDate) missingFields.push('Date');
    if (!scheduleForm.startTime) missingFields.push('Start Time');
    if (!scheduleForm.endTime) missingFields.push('End Time');
    if (!scheduleForm.interviewType) missingFields.push('Interview Type');

    if (missingFields.length > 0) {
      toast({
        title: 'Missing information',
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    const startDateTime = new Date(`${scheduleForm.startDate}T${scheduleForm.startTime}`);
    const endDateTime = new Date(`${scheduleForm.startDate}T${scheduleForm.endTime}`);

    const application = applications.find((app) => app.candidate.id === scheduleForm.candidateId);
    if (!application) {
      toast({
        title: 'Error',
        description: 'Application not found for selected candidate',
        variant: 'destructive',
      });
      return;
    }

    const attendeeEmails = [application.candidate.email];
    if (scheduleForm.interviewerId !== application.candidate.email) {
      attendeeEmails.push(scheduleForm.interviewerId);
    }

    scheduleInterview.mutate({
      candidateId: scheduleForm.candidateId,
      interviewerId: scheduleForm.interviewerId,
      requisitionId: id,
      applicationId: application.id,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      interviewType: scheduleForm.interviewType,
      attendeeEmails: attendeeEmails,
      subject: `Interview for ${requisition?.title} - ${application.candidate.full_name}`,
    });
  };

  if (isLoadingRequisition) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="text-lg text-muted-foreground">Loading requisition details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2">Requisition not found</h2>
            <p className="text-muted-foreground mb-4">
              The requisition you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/ats/requisitions')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Requisitions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 px-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-gray-100"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <span className="text-gray-400">/</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/ats/requisitions')}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Requisitions
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {requisition.title}
            </h1>
            <div className="flex items-center space-x-3 mt-2">
              <Badge className={getStatusColor(requisition.status)}>{requisition.status}</Badge>
              <div className="flex items-center text-sm text-gray-600">
                <Building2 className="mr-1 h-4 w-4" />
                {requisition.dept}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="mr-1 h-4 w-4" />
                {requisition.location}
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Edit Requisition
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Requisition</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This is a placeholder dialog. Edit functionality will be added soon.
              </p>
              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={() => setIsAddCandidateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidates ({applications.length})</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {requisition.description || 'No description provided.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {requisition.skills && requisition.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Required Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {requisition.skills.map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {requisition.min_experience || 0}-{requisition.max_experience || 10} years
                      experience
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm capitalize">
                      {requisition.employment_type?.replace('_', ' ') || 'Full Time'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Created {new Date(requisition.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {requisition.linkedin_job_id && (
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-600">Posted on LinkedIn</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {requisition.hiring_manager && (
                <Card>
                  <CardHeader>
                    <CardTitle>Hiring Manager</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {requisition.hiring_manager.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{requisition.hiring_manager.full_name}</p>
                        <p className="text-sm text-gray-600">{requisition.hiring_manager.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="candidates" className="h-[calc(100vh-200px)]">
          <div className="flex h-full">
            {/* Filters Sidebar */}
            <FiltersSidebar
              filters={filters}
              onFiltersChange={setFilters}
              stages={stages}
              sources={sources}
              totalCandidates={candidates.length}
              filteredCount={filteredCandidates.length}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      Candidate Pipeline
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      Drag and drop candidates between stages to manage your hiring process
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setIsScheduleDialogOpen(true)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                      size="sm"
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Schedule Interview
                    </Button>
                    <Button
                      onClick={() => setIsAddCandidateOpen(true)}
                      className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-lg"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Candidate
                    </Button>
                  </div>
                </div>
              </div>

              {/* Kanban Board Content */}
              <div className="flex-1 overflow-hidden p-6">
                {isLoadingApplications ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
                      <p className="text-lg text-muted-foreground">Loading candidates...</p>
                    </div>
                  </div>
                ) : applications.length === 0 ? (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-16">
                      <div className="rounded-full bg-muted/50 p-6 mb-4 mx-auto w-fit">
                        <Users className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No candidates yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Start sourcing candidates for this position.
                      </p>
                      <Button
                        className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                        onClick={() => setIsAddCandidateOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Candidate
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full">
                    <KanbanBoard
                      stages={stages}
                      cardsByStage={cardsByStage}
                      onDragEnd={(result: DropResult) => {
                        const { destination, source, draggableId } = result;

                        if (!destination) return;
                        if (
                          destination.droppableId === source.droppableId &&
                          destination.index === source.index
                        )
                          return;

                        const candidateId = draggableId;
                        const fromStage = source.droppableId;
                        const toStage = destination.droppableId;

                        // Optimistic update
                        queryClient.setQueryData(
                          ['applications', id],
                          (old: Application[] | undefined) => {
                            if (!old) return [];
                            return old.map((app) =>
                              app.candidate.id === candidateId ? { ...app, stage: toStage } : app
                            );
                          }
                        );

                        moveCandidateMutation.mutate({ candidateId, fromStage, toStage });
                      }}
                      onAddStage={() => setIsAddStageOpen(true)}
                      onManageStages={() => setIsManageStagesOpen(true)}
                      onCandidateClick={(candidate) => {
                        setSelectedCandidate(candidate);
                        setIsDrawerOpen(true);
                      }}
                      isLoading={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="interviews" className="space-y-6">
          {/* Schedule Interview Dialog */}
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Teams Interview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="candidate">Candidate</Label>
                  <Select
                    value={scheduleForm.candidateId}
                    onValueChange={(value) =>
                      setScheduleForm({ ...scheduleForm, candidateId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {applications.map((app) => (
                        <SelectItem key={app.candidate.id} value={app.candidate.id}>
                          {app.candidate.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="interviewer">Interviewer</Label>
                  <Select
                    value={scheduleForm.interviewerId}
                    onValueChange={(value) =>
                      setScheduleForm({ ...scheduleForm, interviewerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInterviewers?.map((interviewer) => (
                        <SelectItem key={interviewer.user_id} value={interviewer.email}>
                          {interviewer.full_name} ({interviewer.email}) - {interviewer.ats_role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Admins and users with INTERVIEWER role can conduct interviews. Add more in ATS
                    Settings.
                  </p>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduleForm.startDate}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={scheduleForm.startTime}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, startTime: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={scheduleForm.endTime}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="type">Interview Type</Label>
                  <Select
                    value={scheduleForm.interviewType}
                    onValueChange={(value) =>
                      setScheduleForm({ ...scheduleForm, interviewType: value })
                    }
                  >
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
                  disabled={scheduleInterview.isPending}
                  className="w-full"
                >
                  {scheduleInterview.isPending ? 'Scheduling...' : 'Schedule Interview'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Stage Dialog */}
          <AddStageDialog
            isOpen={isAddStageOpen}
            onClose={() => setIsAddStageOpen(false)}
            currentStages={stages}
          />

          {/* Manage Stages Dialog */}
          <ManageStagesDialog
            isOpen={isManageStagesOpen}
            onClose={() => setIsManageStagesOpen(false)}
            currentStages={stages}
          />
        </TabsContent>

        <TabsContent value="comments" className="space-y-6">
          {/* Add Comment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Comment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your comment..."
                rows={3}
              />
              <div>
                <Label>Visible to roles</Label>
                <Select
                  value={commentVisibility.join(',')}
                  onValueChange={(value) => setCommentVisibility(value.split(','))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN,TA_ADMIN">Admin & TA Admin only</SelectItem>
                    <SelectItem value="ADMIN,TA_ADMIN,HIRING_MANAGER">
                      Admin, TA Admin & Hiring Manager
                    </SelectItem>
                    <SelectItem value="ADMIN,TA_ADMIN,HIRING_MANAGER,INTERVIEWER">
                      All roles
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() =>
                  addComment.mutate({ comment: newComment, visibleToRoles: commentVisibility })
                }
                disabled={!newComment.trim() || addComment.isPending}
              >
                {addComment.isPending ? 'Adding...' : 'Add Comment'}
              </Button>
            </CardContent>
          </Card>

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : comments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No comments yet</h3>
                <p className="text-gray-600">Be the first to add a comment on this requisition.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {comment.user?.full_name?.charAt(0) || comment.user_id?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{comment.user?.full_name || 'User'}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}{' '}
                            {new Date(comment.created_at).toLocaleTimeString()}
                          </span>
                          <div className="flex space-x-1">
                            {comment.visible_to_roles.map((role) => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {role.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{comment.comment}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {isLoadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : requisitionActivities.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No activity yet</h3>
                <p className="text-gray-600">
                  Activity will appear here as actions are taken on this requisition.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requisitionActivities.map((activity: any) => (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                        {activity.user?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">
                            {activity.user?.full_name || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {activity.activity_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">
                          {activity.activity_description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Candidate Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        stages={stages}
        onStageChange={(candidateId, newStageId) => {
          const candidate = candidates.find((c) => c.id === candidateId);
          if (candidate && candidate.current_step !== newStageId) {
            moveCandidateMutation.mutate({
              candidateId,
              fromStage: candidate.current_step || 'sourced',
              toStage: newStageId,
            });
          }
        }}
      />

      {/* Add Candidate Dialog */}
      <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
          </DialogHeader>

          {/* Resume Upload Section */}
          <div className="space-y-4 border-b pb-4">
            <Label htmlFor="resume">Upload Resume (PDF or DOCX) - Auto-fills form data</Label>
            <Input
              id="resume"
              type="file"
              accept=".pdf,.docx"
              onChange={handleResumeUpload}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {candidateForm.resumeFile && (
              <p className="text-sm text-green-600">
                ✓ Resume uploaded: {candidateForm.resumeFile.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={candidateForm.fullName}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={candidateForm.email}
                onChange={(e) => setCandidateForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={candidateForm.phone}
                onChange={(e) => setCandidateForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Enter location"
                value={candidateForm.location}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="currentCompany">Current Company</Label>
              <Input
                id="currentCompany"
                placeholder="Enter current company"
                value={candidateForm.currentCompany}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, currentCompany: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="currentTitle">Current Title</Label>
              <Input
                id="currentTitle"
                placeholder="Enter current title"
                value={candidateForm.currentTitle}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, currentTitle: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="linkedinProfile">LinkedIn Profile</Label>
              <Input
                id="linkedinProfile"
                placeholder="Enter LinkedIn URL"
                value={candidateForm.linkedinProfile}
                onChange={(e) =>
                  setCandidateForm((prev) => ({ ...prev, linkedinProfile: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select
                value={candidateForm.source}
                onValueChange={(value) => setCandidateForm((prev) => ({ ...prev, source: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="direct">Direct Application</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the candidate"
              rows={3}
              value={candidateForm.notes}
              onChange={(e) => setCandidateForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={handleAddCandidate}
              disabled={addCandidate.isPending}
            >
              {addCandidate.isPending ? 'Adding...' : 'Add Candidate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
