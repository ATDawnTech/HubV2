import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Phone,
  Mail,
  MessageSquare,
  Download,
  Home,
  Trash2,
  Upload,
  FileText,
  Eye,
  Star,
  Printer,
  Settings,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
import { FeedbackTab } from '@/components/FeedbackTab';
import { useAtsAccess } from '@/hooks/useAtsAccess';
import { useInterviewAutoUpdate } from '@/hooks/useInterviewAutoUpdate';
import { useActivityVisibility } from '@/hooks/useActivityVisibility';
import { PromptEditDialog } from '@/components/PromptEditDialog';
import { UserMentionTextarea } from '@/components/UserMentionTextarea';
import { CandidateTestsSection } from '@/components/ats/CandidateTestsSection';
import { InterviewManagement } from '@/components/InterviewManagement';
import { ActivityTimeline } from '@/components/ActivityTimeline';

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  current_company: string;
  current_title: string;
  linkedin_profile: string;
  source: string;
  notes: string;
  resume_url: string;
  resume_score: number;
  resume_analysis: any;
  last_scored_at: string;
  ai_summary?: string;
  ai_summary_generated_at?: string;
  created_at: string;
  updated_at: string;
}

interface Application {
  id: string;
  stage: string;
  status: string;
  created_at: string;
  requisition: {
    id: string;
    title: string;
    dept: string;
    location: string;
    status: string;
    description?: string;
    hiring_manager?: {
      full_name: string;
      email: string;
    };
  };
}

export const AtsCandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<string[]>(['ADMIN', 'TA_ADMIN']);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Candidate>>({});
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const aiReviewRef = useRef<HTMLDivElement>(null);
  const aiSummaryRef = useRef<HTMLDivElement>(null);

  const { hasAtsRole } = useAtsAccess();

  // Enable automatic interview status updates
  useInterviewAutoUpdate(id);

  // Immediately trigger a manual interview status check once on load for this candidate
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('manual-interview-status-check', {
          body: { candidateId: id },
        });
        if (error) {
          console.error('Manual interview status check error:', error);
        } else {
          console.log('Manual interview status check result:', data);
        }
      } catch (err) {
        console.error('Manual interview status check exception:', err);
      }
    })();
  }, [id]);
  // Track activity visibility for the blinker
  const { unseenActivityIds } = useActivityVisibility(id!);

  const { data: candidate, isLoading: isLoadingCandidate } = useQuery({
    queryKey: ['ats-candidate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ats_candidates')
        .select('*, ai_summary, ai_summary_generated_at')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Candidate;
    },
    enabled: !!id,
  });

  // Load persisted AI summary when candidate data loads
  useEffect(() => {
    if (candidate?.ai_summary) {
      setAiSummary(candidate.ai_summary);
    } else {
      setAiSummary(null); // Clear summary if candidate doesn't have one
    }
  }, [candidate?.ai_summary]);

  useEffect(() => {
    const resolvePreview = async () => {
      if (!candidate?.resume_url) {
        setResumePreviewUrl(null);
        return;
      }

      let resumeUrl = candidate.resume_url;

      // Check if it's already a full URL
      if (resumeUrl.startsWith('http')) {
        // Use the URL directly since the bucket is now public
        setResumePreviewUrl(resumeUrl);
        return;
      }

      // If it's just a path, construct the public URL
      const publicUrl = `https://wfxpuzgtqbmobfyakcrg.supabase.co/storage/v1/object/public/resumes/${resumeUrl}`;
      setResumePreviewUrl(publicUrl);
    };
    resolvePreview();
  }, [candidate?.resume_url]);

  const { data: applications = [], isLoading: isLoadingApplications } = useQuery({
    queryKey: ['candidate-applications', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(
          `
          id, stage, status, created_at,
          requisition:requisitions(
            id, title, dept, location, status, description,
            hiring_manager:profiles!hiring_manager_id(full_name, email)
          )
        `
        )
        .eq('candidate_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((app: any) => ({
        ...app,
        requisition: app.requisition ? {
          ...app.requisition,
          hiring_manager: Array.isArray(app.requisition.hiring_manager)
            ? app.requisition.hiring_manager[0]
            : app.requisition.hiring_manager
        } : null
      })) as Application[];
    },
    enabled: !!id,
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: interviews = [], isLoading: isLoadingInterviews } = useQuery({
    queryKey: ['candidate-interviews', id],
    queryFn: async () => {
      console.log('Fetching interviews for candidate:', id);
      const { data, error } = await supabase
        .from('ats_interviews')
        .select(
          `
          id, scheduled_start, scheduled_end, interview_type, status, meeting_link, notes,
          interviewer:profiles!interviewer_id(full_name, email)
        `
        )
        .eq('candidate_id', id)
        .order('scheduled_start', { ascending: false });

      if (error) {
        console.error('Error fetching interviews:', error);
        throw error;
      }
      console.log('Interviews fetched:', data);
      return (data || []).map((i: any) => ({
        ...i,
        interviewer: Array.isArray(i.interviewer) ? i.interviewer[0] : i.interviewer
      }));
    },
    enabled: !!id,
  });

  const { data: candidateActivities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['candidate-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_activities')
        .select('id, activity_type, activity_description, metadata, created_at, actor_id')
        .eq('candidate_id', id)
        .order('created_at', { ascending: false })
        .limit(20); // Limit to recent activities for performance
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
    staleTime: 180_000, // Cache for 3 minutes
    refetchOnWindowFocus: false,
  });

  const { data: candidateComments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['candidate-comments', id],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('candidate_comments')
        .select('id, comment, created_at, updated_at, visible_to_roles, user_id')
        .eq('candidate_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!comments || comments.length === 0) {
        return [];
      }

      const userIds = Array.from(new Set(comments.map((c: any) => c.user_id).filter(Boolean)));
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      }

      return comments.map((c: any) => ({ ...c, user: profileMap[c.user_id] }));
    },
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const addComment = useMutation({
    mutationFn: async ({
      comment,
      visibleToRoles,
      mentions,
    }: {
      comment: string;
      visibleToRoles: string[];
      mentions: string[];
    }) => {
      const { data, error } = await supabase
        .from('candidate_comments')
        .insert({
          candidate_id: id,
          user_id: user?.id,
          comment,
          visible_to_roles: visibleToRoles,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications for mentions
      if (mentions.length > 0) {
        try {
          await supabase.functions.invoke('send-comment-notifications', {
            body: {
              commentId: data.id,
              candidateId: id,
              authorName: user?.user_metadata?.full_name || user?.email || 'Unknown User',
              candidateName: candidate?.full_name || 'Unknown Candidate',
              comment,
              mentions,
            },
          });
        } catch (notificationError) {
          console.error('Failed to send notifications:', notificationError);
        }
      }

      return data;
    },
    onSuccess: async (newComment) => {
      // Add the new comment to the cache immediately for instant UI update
      queryClient.setQueryData(['candidate-comments', id], (oldComments: any[] = []) => {
        return [
          {
            ...newComment,
            user: { full_name: user?.user_metadata?.full_name || user?.email, email: user?.email },
          },
          ...oldComments,
        ];
      });

      // Log activity in background
      try {
        await supabase.rpc('log_candidate_activity', {
          p_candidate_id: id,
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

  const updateCandidate = useMutation({
    mutationFn: async (updatedData: Partial<Candidate>) => {
      const { data, error } = await supabase
        .from('ats_candidates')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log detailed activity for profile changes
      const changedFields = Object.keys(updatedData).filter((key) => {
        const oldValue = candidate?.[key as keyof typeof candidate];
        const newValue = updatedData[key as keyof typeof updatedData];
        return oldValue !== newValue;
      });

      if (changedFields.length > 0) {
        const changes = changedFields.map((field) => {
          const oldValue = candidate?.[field as keyof typeof candidate];
          const newValue = updatedData[field as keyof typeof updatedData];
          return {
            field,
            old_value: oldValue,
            new_value: newValue,
          };
        });

        const fieldDisplayNames: Record<string, string> = {
          full_name: 'Full Name',
          email: 'Email',
          phone: 'Phone',
          location: 'Location',
          current_company: 'Current Company',
          current_title: 'Current Title',
          linkedin_profile: 'LinkedIn Profile',
          source: 'Source',
          notes: 'Notes',
        };

        const description = `Profile updated: ${changedFields.map((field) => fieldDisplayNames[field] || field).join(', ')}`;

        await supabase.rpc('log_candidate_activity', {
          p_candidate_id: id,
          p_activity_type: 'profile_updated',
          p_activity_description: description,
          p_metadata: {
            changes,
            updated_fields: changedFields,
            field_count: changedFields.length,
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-candidate', id] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities', id] });
      setIsEditDialogOpen(false);
      toast({
        title: 'Candidate updated',
        description: 'The candidate profile has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating candidate',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCandidate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ats_candidates').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Candidate deleted',
        description: 'The candidate has been permanently deleted.',
      });
      navigate('/ats/candidates');
    },
    onError: (error) => {
      toast({
        title: 'Error deleting candidate',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadResume = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidate.id}.${fileExt}`;
      const filePath = `candidates/${fileName}`;

      // Delete existing resume if it exists
      if (candidate.resume_url) {
        // Support both stored path and public URL formats
        let pathToDelete = candidate.resume_url;
        if (pathToDelete.startsWith('http')) {
          try {
            const urlObj = new URL(pathToDelete);
            const afterBucket = decodeURIComponent(urlObj.pathname.split('/resumes/')[1] || '');
            if (afterBucket) pathToDelete = afterBucket;
          } catch { }
        }
        if (pathToDelete) {
          await supabase.storage.from('resumes').remove([pathToDelete]);
        }
      }

      // Upload new resume (private bucket)
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the public URL for easier viewing
      const publicUrl = `https://wfxpuzgtqbmobfyakcrg.supabase.co/storage/v1/object/public/resumes/${filePath}`;
      const { data, error } = await supabase
        .from('ats_candidates')
        .update({ resume_url: publicUrl })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_candidate_activity', {
        p_candidate_id: id,
        p_activity_type: 'resume_updated',
        p_activity_description: 'Resume file uploaded',
        p_metadata: { file_name: file.name, file_size: file.size },
      });

      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['ats-candidate', id] });
      queryClient.invalidateQueries({ queryKey: ['candidate-activities', id] });
      setIsUploadingResume(false);
      toast({
        title: 'Resume uploaded',
        description: 'The resume has been uploaded and will be scored automatically.',
      });

      // Auto score using latest application details if available (asynchronous)
      const latestApp = (applications || [])[0];
      if (latestApp?.requisition?.title) {
        // Fire and forget - don't await to avoid blocking UI
        setTimeout(async () => {
          try {
            await supabase.functions.invoke('score-resume', {
              body: {
                candidateId: id,
                resumeText: 'Resume uploaded - analyze from file',
                jobTitle: latestApp.requisition.title,
                jobDescription:
                  latestApp.requisition.description ||
                  latestApp.requisition.title ||
                  'General software engineering role',
              },
            });
            queryClient.invalidateQueries({ queryKey: ['ats-candidate', id] });
            toast({
              title: 'AI review completed',
              description: 'Resume analysis is now available.',
            });
          } catch (e) {
            console.error('Auto scoring failed:', e);
          }
        }, 500);
        toast({ title: 'Scoring started', description: 'AI review will refresh shortly.' });
      }
    },
    onError: (error) => {
      setIsUploadingResume(false);
      toast({
        title: 'Error uploading resume',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const generateAISummary = async () => {
    if (!candidate?.id) return;

    if (!hasAtsRole('ADMIN') && !hasAtsRole('TA_ADMIN') && !hasAtsRole('HIRING_MANAGER')) {
      toast({
        title: 'Access denied',
        description: "You don't have permission to generate AI summaries.",
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingSummary(true);

    try {
      toast({
        title: 'Generating Summary...',
        description: 'AI is analyzing the candidate data. This may take a moment.',
      });

      const response = await supabase.functions.invoke('generate-ai-summary', {
        body: { candidateId: candidate.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate summary');
      }

      if (response.data?.success && response.data?.summary) {
        const generatedSummary = response.data.summary;
        setAiSummary(generatedSummary);

        // Store the summary in the database with timestamp
        const { error: updateError } = await supabase
          .from('ats_candidates')
          .update({
            ai_summary: generatedSummary,
            ai_summary_generated_at: new Date().toISOString(),
          } as any)
          .eq('id', id);

        if (updateError) {
          console.error('Error saving AI summary:', updateError);
        }

        // Create activity record
        const { error: activityError } = await supabase.from('candidate_activities').insert({
          candidate_id: id,
          actor_id: user?.id,
          activity_type: 'ai_summary_generated',
          activity_description: 'Generated AI summary for candidate analysis',
          metadata: {
            summary_length: generatedSummary.length,
            generated_at: new Date().toISOString(),
          },
        });

        if (activityError) {
          console.error('Error creating activity record:', activityError);
        }

        // Refresh the activities list and candidate data
        queryClient.invalidateQueries({ queryKey: ['candidate-activities', id] });
        queryClient.invalidateQueries({ queryKey: ['ats-candidate', id] });

        toast({
          title: 'Summary Generated',
          description: 'AI summary has been generated and saved successfully.',
        });
      } else {
        throw new Error(response.data?.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast({
        title: 'Error generating summary',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const exportAIReviewToPDF = async () => {
    if (!candidate.resume_analysis || !aiReviewRef.current) return;

    try {
      toast({
        title: 'Generating PDF...',
        description: 'Please wait while we create your AI analysis report.',
      });

      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Create a high-fidelity clone of the AI review section
      const originalElement = aiReviewRef.current;
      const clonedElement = originalElement.cloneNode(true) as HTMLElement;

      // Remove only the export button, keep everything else
      const buttons = clonedElement.querySelectorAll('button');
      buttons.forEach((button) => {
        const buttonText = button.textContent?.toLowerCase() || '';
        if (buttonText.includes('export pdf') || buttonText.includes('recalculate')) {
          button.remove();
        }
      });

      // Create a temporary container with optimal styling for PDF
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '1400px'; // Wider for better content capture
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      tempContainer.style.fontSize = '14px';
      tempContainer.style.lineHeight = '1.5';
      tempContainer.style.color = '#000000';
      tempContainer.style.padding = '20px';
      tempContainer.style.boxSizing = 'border-box';

      // Enhance styling for all elements in the clone
      const styleAllElements = (element: HTMLElement) => {
        // Reset any problematic styles
        element.style.transform = 'none';
        element.style.transition = 'none';
        element.style.animation = 'none';

        // Ensure visibility
        if (element.style.display === 'none') {
          element.style.display = 'block';
        }

        // Force colors to be visible
        if (
          getComputedStyle(element).color === 'rgba(0, 0, 0, 0)' ||
          getComputedStyle(element).color === 'transparent'
        ) {
          element.style.color = '#000000';
        }

        // Ensure backgrounds are visible
        const bgColor = getComputedStyle(element).backgroundColor;
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
          if (element.className.includes('bg-')) {
            element.style.backgroundColor = '#f8f9fa'; // Light gray for background elements
          }
        }

        // Process child elements
        Array.from(element.children).forEach((child) => {
          if (child instanceof HTMLElement) {
            styleAllElements(child);
          }
        });
      };

      styleAllElements(clonedElement);
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);

      // Wait for layout and fonts to load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate canvas with maximum quality
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1400,
        height: tempContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        logging: false,
        removeContainer: false,
        foreignObjectRendering: true,
        imageTimeout: 15000,
      });

      // Clean up
      document.body.removeChild(tempContainer);

      // Create PDF with optimal settings
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Calculate dimensions
      const contentWidth = pageWidth - 2 * margin;
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add professional header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('AI Resume Analysis Report', margin, 20);

      // Add a line under the header
      pdf.setLineWidth(0.5);
      pdf.line(margin, 25, pageWidth - margin, 25);

      // Add candidate information
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Candidate: ${candidate.full_name}`, margin, 35);
      pdf.text(`Position: ${candidate.current_title || 'Not specified'}`, margin, 42);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        margin,
        49
      );

      if (candidate.last_scored_at) {
        pdf.text(
          `Analysis Date: ${new Date(candidate.last_scored_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          margin,
          56
        );
      }

      // Add content starting position
      let yPosition = 65;
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let pageCount = 1;

      // Process content in chunks to handle multiple pages
      while (remainingHeight > 0) {
        const availableHeight = pageHeight - yPosition - margin;
        const sliceHeight = Math.min(remainingHeight, (availableHeight * canvas.width) / imgWidth);

        if (sliceHeight <= 10) {
          // Minimum slice height
          if (pageCount === 1) break; // Don't create empty first page
          pdf.addPage();
          yPosition = margin;
          pageCount++;
          continue;
        }

        // Create high-quality slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.max(sliceHeight, 10);
        const sliceCtx = sliceCanvas.getContext('2d');

        if (sliceCtx) {
          // Fill with white background
          sliceCtx.fillStyle = '#ffffff';
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

          // Draw the content slice
          sliceCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            Math.max(sliceHeight, 10),
            0,
            0,
            canvas.width,
            Math.max(sliceHeight, 10)
          );

          // Convert to high-quality image
          const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
          const sliceImgHeight = (Math.max(sliceHeight, 10) * imgWidth) / canvas.width;

          // Add to PDF
          pdf.addImage(sliceImgData, 'PNG', margin, yPosition, imgWidth, sliceImgHeight);

          // Update position tracking
          remainingHeight -= sliceHeight;
          sourceY += sliceHeight;

          // Add new page if needed
          if (remainingHeight > 0) {
            pdf.addPage();
            yPosition = margin;
            pageCount++;
          }
        } else {
          break; // Exit if canvas context fails
        }
      }

      // Save the PDF
      const fileName = `${candidate.full_name.replace(/[^a-zA-Z0-9]/g, '_')}_AI_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'PDF exported successfully',
        description: `Complete AI analysis report saved as ${fileName}`,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error generating the PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const exportAISummaryToPDF = async () => {
    if (!aiSummary || !aiSummaryRef.current) return;

    try {
      toast({
        title: 'Generating PDF...',
        description: 'Please wait while we create your AI summary report.',
      });

      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Create a dedicated container for PDF content
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '210mm'; // A4 width
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.padding = '20mm';
      pdfContainer.style.fontFamily = '"Helvetica", "Arial", sans-serif';
      pdfContainer.style.fontSize = '12px';
      pdfContainer.style.lineHeight = '1.6';
      pdfContainer.style.color = '#000000';

      // Add header
      const header = document.createElement('div');
      header.style.marginBottom = '20px';
      header.style.borderBottom = '2px solid #333';
      header.style.paddingBottom = '10px';
      header.innerHTML = `
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">AI Summary Report</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
          <strong>Candidate:</strong> ${candidate.full_name}<br>
          <strong>Generated:</strong> ${new Date().toLocaleDateString()}<br>
          ${candidate.ai_summary_generated_at ? `<strong>Summary Date:</strong> ${new Date(candidate.ai_summary_generated_at).toLocaleDateString()}` : ''}
        </p>
      `;
      pdfContainer.appendChild(header);

      // Process and clean the AI summary content
      const contentDiv = document.createElement('div');
      contentDiv.style.width = '100%';
      contentDiv.style.overflow = 'visible';

      // Parse and format the AI summary content
      let formattedContent = aiSummary
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
        .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
        .replace(/^\s*/, '<p style="margin: 12px 0;">')
        .replace(/\s*$/, '</p>');

      // Handle tables more carefully
      const tableRegex = /\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
      let tableRows = [];
      let match;

      while ((match = tableRegex.exec(aiSummary)) !== null) {
        tableRows.push(`
          <tr style="border: 1px solid #ccc;">
            <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top; width: 25%;">${match[1].trim()}</td>
            <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top; width: 20%;">${match[2].trim()}</td>
            <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top; width: 35%;">${match[3].trim()}</td>
            <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top; width: 20%;">${match[4].trim()}</td>
          </tr>
        `);
      }

      if (tableRows.length > 0) {
        const tableHtml = `
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; page-break-inside: auto;">
            <thead>
              <tr style="background-color: #f5f5f5; border: 1px solid #ccc;">
                <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-weight: bold;">Qualification</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-weight: bold;">Assessment</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-weight: bold;">Justification</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-weight: bold;">Found In</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows.join('')}
            </tbody>
          </table>
        `;

        // Replace table markers with properly formatted table
        formattedContent =
          formattedContent.replace(tableRegex, '').replace(/\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|/g, '') +
          tableHtml;
      }

      contentDiv.innerHTML = formattedContent;
      pdfContainer.appendChild(contentDiv);

      // Add to DOM temporarily
      document.body.appendChild(pdfContainer);

      // Wait for rendering and fonts to load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate PDF using jsPDF with manual content processing
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Render content in chunks to handle large content
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: pdfContainer.scrollWidth,
        height: pdfContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: pdfContainer.scrollWidth,
        windowHeight: pdfContainer.scrollHeight,
        logging: false,
        imageTimeout: 0,
        removeContainer: false,
      });

      // Clean up
      document.body.removeChild(pdfContainer);

      // Calculate dimensions
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      const pageContentHeight = pageHeight - margin * 2;

      let yPosition = margin;
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let pageCount = 0;

      // Add content page by page
      while (remainingHeight > 0) {
        if (pageCount > 0) {
          pdf.addPage();
        }

        const availableHeight = pageContentHeight;
        const sliceHeight = Math.min(remainingHeight, (availableHeight * canvas.width) / imgWidth);

        if (sliceHeight <= 0) break;

        // Create canvas slice
        const sliceCanvas = document.createElement('canvas');
        const ratio = canvas.width / imgWidth;
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight * ratio;
        const sliceCtx = sliceCanvas.getContext('2d');

        if (sliceCtx) {
          sliceCtx.drawImage(
            canvas,
            0,
            sourceY * ratio,
            canvas.width,
            sliceHeight * ratio,
            0,
            0,
            canvas.width,
            sliceHeight * ratio
          );

          const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
          const actualSliceHeight = Math.min(sliceHeight, availableHeight);

          pdf.addImage(sliceImgData, 'PNG', margin, yPosition, imgWidth, actualSliceHeight);

          remainingHeight -= sliceHeight;
          sourceY += sliceHeight;
          pageCount++;
        } else {
          break;
        }
      }

      // Save the PDF
      const fileName = `${candidate.full_name.replace(/[^a-zA-Z0-9]/g, '_')}_AI_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'PDF exported successfully',
        description: `AI summary report saved as ${fileName}`,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error generating the PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'sourced':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'screening':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'interviewed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'offered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'hired':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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

  if (isLoadingCandidate) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="text-lg text-muted-foreground">Loading candidate details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2">Candidate not found</h2>
            <p className="text-muted-foreground mb-4">
              The candidate you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/ats/candidates')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Candidates
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
            onClick={() => {
              const latestApp = (applications || [])[0];
              if (latestApp?.requisition?.id) {
                navigate(`/ats/requisitions/${latestApp.requisition.id}`);
              } else {
                navigate('/ats/candidates');
              }
            }}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {(applications || [])[0]?.requisition?.title ? 'Back to Job' : 'Candidates'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {candidate.full_name}
            </h1>
            <p className="text-gray-600 mt-1">
              {candidate.current_title} at {candidate.current_company}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditForm({
                full_name: candidate.full_name,
                email: candidate.email,
                phone: candidate.phone,
                location: candidate.location,
                current_company: candidate.current_company,
                current_title: candidate.current_title,
                linkedin_profile: candidate.linkedin_profile,
                source: candidate.source,
                notes: candidate.notes,
              });
              setIsEditDialogOpen(true);
            }}
          >
            Edit Profile
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                confirm(
                  `Are you sure you want to permanently delete ${candidate.full_name}? This action cannot be undone.`
                )
              ) {
                deleteCandidate.mutate();
              }
            }}
            disabled={deleteCandidate.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteCandidate.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="ai-review">AI Review</TabsTrigger>
          <TabsTrigger value="ai-summary">AI Summary</TabsTrigger>
          <TabsTrigger value="feedback">
            <Star className="w-4 h-4 mr-1" />
            Feedback
          </TabsTrigger>

          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="activity" className="relative">
            Activity
            {unseenActivityIds.length > 0 && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse"></div>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <span>{candidate.email}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <span>{candidate.location}</span>
                    </div>
                  )}
                  {candidate.linkedin_profile && (
                    <div className="flex items-center space-x-3">
                      <ExternalLink className="h-5 w-5 text-blue-500" />
                      <a
                        href={candidate.linkedin_profile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resume Preview - Full Width */}
              {candidate.resume_url && (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <span>Resume Preview</span>
                        </CardTitle>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsResumeDialogOpen(true)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Full Screen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!resumePreviewUrl) return;
                              try {
                                // Create a temporary link and click it for download
                                const response = await fetch(resumePreviewUrl);
                                if (!response.ok) throw new Error('Failed to fetch resume');

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;

                                // Extract filename from URL or use default
                                let filename = `${candidate.full_name?.replace(/\s+/g, '_')}_resume.pdf`;
                                try {
                                  const urlPath = new URL(resumePreviewUrl).pathname;
                                  const originalFilename = urlPath.split('/').pop();
                                  if (originalFilename && originalFilename.includes('.')) {
                                    filename = originalFilename;
                                  }
                                } catch (e) {
                                  console.warn('Could not extract filename from URL');
                                }

                                link.download = filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error('Download failed:', error);
                                // Fallback: open in new window
                                window.open(resumePreviewUrl, '_blank');
                              }
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full border rounded-lg overflow-hidden bg-gray-50">
                        {resumePreviewUrl ? (
                          <object
                            data={resumePreviewUrl}
                            type="application/pdf"
                            className="w-full h-[600px]"
                            onLoad={() => console.log('Resume loaded successfully')}
                          >
                            <iframe
                              src={`https://docs.google.com/viewer?url=${encodeURIComponent(resumePreviewUrl)}&embedded=true`}
                              className="w-full h-[600px] border-0"
                              title="Resume Preview"
                              onLoad={() => console.log('Resume loaded successfully')}
                              onError={(e) => {
                                console.error('Resume preview error:', e);
                              }}
                            />
                          </object>
                        ) : (
                          <div className="w-full h-[600px] flex items-center justify-center text-gray-500">
                            {candidate?.resume_url
                              ? 'Loading resume preview...'
                              : 'No resume available'}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resume Full Screen Dialog */}
                  <Dialog open={isResumeDialogOpen} onOpenChange={setIsResumeDialogOpen}>
                    <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0">
                      {resumePreviewUrl && (
                        <object
                          data={resumePreviewUrl}
                          type="application/pdf"
                          className="w-full h-full"
                        >
                          <iframe
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(resumePreviewUrl)}&embedded=true`}
                            className="w-full h-full border-0"
                            title="Resume Fullscreen"
                          />
                        </object>
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {candidate.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {candidate.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.current_company && (
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{candidate.current_company}</span>
                    </div>
                  )}
                  {candidate.source && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm capitalize">Source: {candidate.source}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Added {new Date(candidate.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {candidate.resume_score !== null && candidate.resume_score !== undefined && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-900">Resume Match</span>
                        <div className="flex items-center space-x-2">
                          <div className="text-lg font-bold text-blue-600">
                            {candidate.resume_score}%
                          </div>
                          <Badge
                            variant={
                              candidate.resume_score >= 75
                                ? 'default'
                                : candidate.resume_score >= 50
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {candidate.resume_score >= 75
                              ? 'Strong'
                              : candidate.resume_score >= 50
                                ? 'Moderate'
                                : 'Weak'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const latestApp = (applications || [])[0];
                          const title = latestApp?.requisition?.title || 'General role';
                          const description = latestApp?.requisition?.description || '';
                          setTimeout(async () => {
                            try {
                              await supabase.functions.invoke('score-resume', {
                                body: {
                                  candidateId: id,
                                  resumeText: 'Recalculate on demand',
                                  jobTitle: title,
                                  jobDescription: description || title,
                                },
                              });
                              queryClient.invalidateQueries({ queryKey: ['ats-candidate', id] });
                              toast({
                                title: 'Recalculating',
                                description: 'AI review will refresh shortly.',
                              });
                            } catch (e) {
                              console.error('Rescore failed:', e);
                              toast({
                                title: 'Error',
                                description: 'Failed to start re-scoring',
                                variant: 'destructive',
                              });
                            }
                          }, 100);
                        }}
                      >
                        Recalculate score
                      </Button>
                    </div>
                  )}
                  {candidate.resume_url && (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          if (!resumePreviewUrl) return;
                          try {
                            // Create a temporary link and click it for download
                            const response = await fetch(resumePreviewUrl);
                            if (!response.ok) throw new Error('Failed to fetch resume');

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;

                            // Extract filename from URL or use default
                            let filename = `${candidate.full_name?.replace(/\s+/g, '_')}_resume.pdf`;
                            try {
                              const urlPath = new URL(resumePreviewUrl).pathname;
                              const originalFilename = urlPath.split('/').pop();
                              if (originalFilename && originalFilename.includes('.')) {
                                filename = originalFilename;
                              }
                            } catch (e) {
                              console.warn('Could not extract filename from URL');
                            }

                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Download failed:', error);
                            // Fallback: open in new window
                            window.open(resumePreviewUrl, '_blank');
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Resume
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (resumePreviewUrl) window.open(resumePreviewUrl, '_blank');
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Resume
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          {isLoadingApplications ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                <p className="text-lg text-muted-foreground">Loading applications...</p>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4 mx-auto w-fit">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No applications yet</h3>
                <p className="text-gray-600 mb-6">
                  This candidate hasn't been added to any requisitions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {applications.map((application) => (
                <Card
                  key={application.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{application.requisition.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>{application.requisition.dept}</span>
                          <span>• {application.requisition.location}</span>
                          {application.requisition.hiring_manager && (
                            <span>• HM: {application.requisition.hiring_manager.full_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(application.requisition.status)}>
                          {application.requisition.status}
                        </Badge>
                        <Badge className={getStageColor(application.stage)}>
                          {application.stage}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(application.created_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/ats/requisitions/${application.requisition.id}`)
                          }
                        >
                          View Requisition
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai-review" className="space-y-6" ref={aiReviewRef}>
          {candidate.resume_analysis ? (
            <div className="space-y-6">
              {/* Resume Analysis Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Resume Analysis Summary
                    <div className="flex items-center gap-2">
                      {candidate.last_scored_at && (
                        <span className="text-sm font-normal text-gray-500">
                          Analyzed {new Date(candidate.last_scored_at).toLocaleDateString()}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportAIReviewToPDF}
                        className="flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Export PDF
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {candidate.resume_score}%
                      </div>
                      <div className="text-sm text-gray-600">Overall Match</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Badge
                        variant={
                          candidate.resume_analysis.decision === 'Yes'
                            ? 'default'
                            : candidate.resume_analysis.decision === 'Maybe'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className="text-lg px-4 py-2"
                      >
                        {candidate.resume_analysis.decision}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-2">Recommendation</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {candidate.resume_analysis.factors?.filter((f: any) => f.score >= 75)
                          .length || 0}
                      </div>
                      <div className="text-sm text-gray-600">Strong Areas</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      {candidate.resume_analysis.reason_summary}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Must-Have Requirements */}
              {candidate.resume_analysis.must_haves && (
                <Card>
                  <CardHeader>
                    <CardTitle
                      className={`flex items-center space-x-2 ${candidate.resume_analysis.must_haves.status === 'pass' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      <span>Must-Have Requirements</span>
                      <Badge
                        variant={
                          candidate.resume_analysis.must_haves.status === 'pass'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {candidate.resume_analysis.must_haves.status.toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidate.resume_analysis.must_haves.status === 'pass' ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>All must-have requirements are satisfied</span>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-red-700 mb-3">
                          Missing Critical Requirements:
                        </div>
                        <div className="space-y-2">
                          {candidate.resume_analysis.must_haves.missing?.map(
                            (missing: string, index: number) => (
                              <div key={index} className="flex items-start space-x-2 text-red-600">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0"></span>
                                <span className="text-sm">{missing}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Detailed Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {candidate.resume_analysis.factors?.map((factor: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium capitalize text-lg">
                            {factor.name.replace(/_/g, ' ')}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <div className="text-2xl font-bold">{factor.score}/100</div>
                            <Badge
                              variant={
                                factor.score >= 75
                                  ? 'default'
                                  : factor.score >= 50
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {factor.score >= 75
                                ? 'Strong'
                                : factor.score >= 50
                                  ? 'Good'
                                  : 'Needs Work'}
                            </Badge>
                          </div>
                        </div>

                        {/* Analysis Details */}
                        {factor.analysis && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-700 mb-1">Analysis:</div>
                            <p className="text-sm text-gray-600">{factor.analysis}</p>
                          </div>
                        )}

                        {factor.evidence && factor.evidence.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-2">Evidence:</div>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {factor.evidence.map((evidence: string, evidenceIndex: number) => (
                                <li key={evidenceIndex} className="flex items-start">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 mr-2 flex-shrink-0"></span>
                                  {evidence}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {factor.matched_skills && factor.matched_skills.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-green-700 mb-2">
                              Matched Skills:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {factor.matched_skills.map((skill: string, skillIndex: number) => (
                                <Badge
                                  key={skillIndex}
                                  variant="outline"
                                  className="text-xs bg-green-50 text-green-700 border-green-200"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {factor.missing_skills && factor.missing_skills.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-red-700 mb-2">
                              Missing Skills:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {factor.missing_skills.map((skill: string, skillIndex: number) => (
                                <Badge
                                  key={skillIndex}
                                  variant="outline"
                                  className="text-xs bg-red-50 text-red-700 border-red-200"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {factor.impact_examples && factor.impact_examples.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-purple-700 mb-2">
                              Impact Examples:
                            </div>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {factor.impact_examples.map(
                                (example: string, exampleIndex: number) => (
                                  <li key={exampleIndex} className="flex items-start">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 mr-2 flex-shrink-0"></span>
                                    {example}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                        {factor.keywords_hit && factor.keywords_hit.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-blue-700 mb-2">
                              Keywords Found:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {factor.keywords_hit.map((keyword: string, keywordIndex: number) => (
                                <Badge
                                  key={keywordIndex}
                                  variant="outline"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {factor.domains_matched && factor.domains_matched.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-indigo-700 mb-2">
                              Domain Experience:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {factor.domains_matched.map((domain: string, domainIndex: number) => (
                                <Badge
                                  key={domainIndex}
                                  variant="outline"
                                  className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200"
                                >
                                  {domain}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {factor.relevant && factor.relevant.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-teal-700 mb-2">
                              Education & Certifications:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {factor.relevant.map((item: string, itemIndex: number) => (
                                <Badge
                                  key={itemIndex}
                                  variant="outline"
                                  className="text-xs bg-teal-50 text-teal-700 border-teal-200"
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {factor.years_relevant && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              Relevant Experience:
                            </div>
                            <span className="text-sm text-gray-600">
                              {factor.years_relevant} years
                            </span>
                          </div>
                        )}

                        {factor.notes && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">Notes:</div>
                            <p className="text-sm text-gray-600">{factor.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Analysis */}
              {candidate.resume_analysis.summary_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Summary Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {candidate.resume_analysis.summary_analysis}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Key Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {candidate.resume_analysis.key_strengths &&
                  candidate.resume_analysis.key_strengths.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-600">Key Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {candidate.resume_analysis.key_strengths.map(
                            (strength: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-400 mt-2 mr-3 flex-shrink-0"></span>
                                <span className="text-sm text-gray-700">{strength}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                {candidate.resume_analysis.key_weaknesses &&
                  candidate.resume_analysis.key_weaknesses.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-600">Areas for Improvement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {candidate.resume_analysis.key_weaknesses.map(
                            (weakness: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="inline-block w-2 h-2 rounded-full bg-red-400 mt-2 mr-3 flex-shrink-0"></span>
                                <span className="text-sm text-gray-700">{weakness}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
              </div>

              {/* Risk Flags */}
              {candidate.resume_analysis.risk_flags &&
                candidate.resume_analysis.risk_flags.length > 0 &&
                candidate.resume_analysis.risk_flags[0] !== 'none' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-amber-600">Risk Flags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.resume_analysis.risk_flags.map((flag: string, index: number) => (
                          <Badge
                            key={index}
                            variant="destructive"
                            className="bg-amber-100 text-amber-800 border-amber-200"
                          >
                            {flag.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Must-Haves Assessment */}
              {candidate.resume_analysis.must_haves && (
                <Card>
                  <CardHeader>
                    <CardTitle
                      className={`${candidate.resume_analysis.must_haves.status === 'pass' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      Must-Have Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge
                        variant={
                          candidate.resume_analysis.must_haves.status === 'pass'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {candidate.resume_analysis.must_haves.status.toUpperCase()}
                      </Badge>
                    </div>
                    {candidate.resume_analysis.must_haves.missing &&
                      candidate.resume_analysis.must_haves.missing.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-red-700 mb-2">
                            Missing Requirements:
                          </div>
                          <ul className="text-sm text-red-600 space-y-1">
                            {candidate.resume_analysis.must_haves.missing.map(
                              (missing: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mt-2 mr-2 flex-shrink-0"></span>
                                  {missing}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4 mx-auto w-fit">
                  <MessageSquare className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No AI analysis available</h3>
                <p className="text-gray-600 mb-6">
                  This candidate's resume hasn't been analyzed yet. The AI review will appear here
                  once scoring is complete.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-6">
          {/* Add Comment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Comment</CardTitle>
              <CardDescription>
                Use @username to mention team members and send them notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UserMentionTextarea
                value={newComment}
                onChange={setNewComment}
                placeholder="Add your comment about this candidate... Use @name to mention team members"
                onSubmit={(comment, mentions) => {
                  addComment.mutate({ comment, visibleToRoles: commentVisibility, mentions });
                }}
                submitLabel="Add Comment"
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
            </CardContent>
          </Card>

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            </div>
          ) : candidateComments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No comments yet</h3>
                <p className="text-gray-600">Be the first to add a comment about this candidate.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {candidateComments.map((comment: any) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {comment.user?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">
                            {comment.user?.full_name || 'Unknown User'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                          <div className="flex space-x-1">
                            {comment.visible_to_roles.map((role: string) => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div
                          className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: comment.comment.replace(
                              /@([^@\s]+(?:\s+[^@\s]+)*?)(?=\s|$|@)/g,
                              '<span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded">@$1</span>'
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai-summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                AI Summary
                <div className="flex items-center gap-2">
                  {(hasAtsRole('ADMIN') ||
                    hasAtsRole('TA_ADMIN') ||
                    hasAtsRole('HIRING_MANAGER')) && (
                      <Button onClick={() => setIsPromptDialogOpen(true)} size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Update Prompt
                      </Button>
                    )}
                  {aiSummary && (
                    <Button onClick={() => exportAISummaryToPDF()} size="sm" variant="outline">
                      <Printer className="h-4 w-4 mr-2" />
                      Generate PDF
                    </Button>
                  )}
                  {(hasAtsRole('ADMIN') ||
                    hasAtsRole('TA_ADMIN') ||
                    hasAtsRole('HIRING_MANAGER')) && (
                      <Button onClick={generateAISummary} disabled={isGeneratingSummary} size="sm">
                        {isGeneratingSummary
                          ? 'Generating...'
                          : aiSummary
                            ? 'Regenerate Summary'
                            : 'Generate Summary'}
                      </Button>
                    )}
                </div>
              </CardTitle>
              <CardDescription>
                AI-powered comprehensive analysis and summary of candidate qualifications and fit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!aiSummary && !isGeneratingSummary && (
                <div className="text-center py-16">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-6 mb-4 mx-auto w-fit">
                    <MessageSquare className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No AI Summary Generated</h3>
                  <p className="text-muted-foreground mb-6">
                    Generate a comprehensive technical assessment using AI analysis of the
                    candidate's profile, resume, and interview feedback.
                  </p>
                  {hasAtsRole('ADMIN') || hasAtsRole('TA_ADMIN') || hasAtsRole('HIRING_MANAGER') ? (
                    <Button onClick={generateAISummary}>Generate AI Summary</Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Only hiring managers and admins can generate AI summaries
                    </p>
                  )}
                </div>
              )}

              {isGeneratingSummary && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-lg text-muted-foreground">Generating AI Summary...</p>
                    <p className="text-sm text-muted-foreground">
                      This may take a moment as AI analyzes the candidate data
                    </p>
                  </div>
                </div>
              )}

              {aiSummary && (
                <div className="space-y-4">
                  {candidate.ai_summary_generated_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-2">
                      <span>
                        Generated on: {new Date(candidate.ai_summary_generated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div
                      ref={aiSummaryRef}
                      className="whitespace-pre-wrap text-sm bg-card p-6 rounded-lg border"
                      dangerouslySetInnerHTML={{
                        __html: aiSummary
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n\n/g, '</p><p>')
                          .replace(/^\s*/, '<p>')
                          .replace(/\s*$/, '</p>')
                          .replace(
                            /\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g,
                            '<tr><td>$1</td><td>$2</td><td>$3</td><td>$4</td></tr>'
                          )
                          .replace(
                            /(<tr>.*?<\/tr>)/gs,
                            '<table class="min-w-full border-collapse border border-gray-300 mt-4 mb-4"><thead><tr><th class="border border-gray-300 px-2 py-1 bg-muted">Qualification</th><th class="border border-gray-300 px-2 py-1 bg-muted">Assessment</th><th class="border border-gray-300 px-2 py-1 bg-muted">Justification</th><th class="border border-gray-300 px-2 py-1 bg-muted">Found In</th></tr></thead><tbody>$1</tbody></table>'
                          ),
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <FeedbackTab candidateId={id!} />
        </TabsContent>

        <TabsContent value="interviews" className="space-y-6">
          <InterviewManagement
            interviews={interviews || []}
            candidateId={id!}
            onInterviewUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['candidate-interviews', id] });
              queryClient.invalidateQueries({ queryKey: ['candidate-activities', id] });
            }}
          />
        </TabsContent>

        <TabsContent value="tests" className="space-y-6">
          <CandidateTestsSection candidateId={id!} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {isLoadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <ActivityTimeline activities={candidateActivities} candidateId={id!} />
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Candidate Profile</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editFullName">Full Name</Label>
              <Input
                id="editFullName"
                value={editForm.full_name || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editLocation">Location</Label>
              <Input
                id="editLocation"
                value={editForm.location || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editCurrentCompany">Current Company</Label>
              <Input
                id="editCurrentCompany"
                value={editForm.current_company || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, current_company: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="editCurrentTitle">Current Title</Label>
              <Input
                id="editCurrentTitle"
                value={editForm.current_title || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, current_title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="editLinkedinProfile">LinkedIn Profile</Label>
              <Input
                id="editLinkedinProfile"
                value={editForm.linkedin_profile || ''}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, linkedin_profile: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="editSource">Source</Label>
              <Select
                value={editForm.source || ''}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, source: value }))}
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

          {/* Resume Upload Section */}
          <div className="space-y-3">
            <Label>Resume</Label>
            <div className="flex items-center space-x-3">
              {candidate.resume_url && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>Current resume uploaded</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(candidate.resume_url, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              )}
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsUploadingResume(true);
                    uploadResume.mutate(file);
                  }
                }}
                className="hidden"
                id="resumeUpload"
              />
              <Label htmlFor="resumeUpload" className="cursor-pointer">
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div className="text-sm">
                    <span className="font-medium text-blue-600">Click to upload</span>
                    <span className="text-gray-500"> a new resume</span>
                  </div>
                  <span className="text-xs text-gray-400">PDF, DOC, DOCX up to 10MB</span>
                </div>
              </Label>
              {isUploadingResume && (
                <div className="mt-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Uploading resume...</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="editNotes">Notes</Label>
            <Textarea
              id="editNotes"
              rows={3}
              value={editForm.notes || ''}
              onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => updateCandidate.mutate(editForm)}
              disabled={updateCandidate.isPending}
            >
              {updateCandidate.isPending ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prompt Edit Dialog */}
      <PromptEditDialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen} />
    </div>
  );
};
