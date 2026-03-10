export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.4';
  };
  public: {
    Tables: {
      access_grants: {
        Row: {
          created_at: string | null;
          id: string;
          resource_id: string;
          resource_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          resource_id: string;
          resource_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          resource_id?: string;
          resource_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_prompts: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_default: boolean;
          prompt_type: string;
          system_prompt: string;
          title: string;
          updated_at: string;
          user_prompt: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_default?: boolean;
          prompt_type: string;
          system_prompt: string;
          title: string;
          updated_at?: string;
          user_prompt?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_default?: boolean;
          prompt_type?: string;
          system_prompt?: string;
          title?: string;
          updated_at?: string;
          user_prompt?: string;
        };
        Relationships: [];
      };
      app_logs: {
        Row: {
          created_at: string | null;
          duration_ms: number | null;
          id: string;
          message: string;
          operation: string | null;
          payload_size: number | null;
          request_id: string | null;
          route: string | null;
          severity: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          duration_ms?: number | null;
          id?: string;
          message: string;
          operation?: string | null;
          payload_size?: number | null;
          request_id?: string | null;
          route?: string | null;
          severity: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          duration_ms?: number | null;
          id?: string;
          message?: string;
          operation?: string | null;
          payload_size?: number | null;
          request_id?: string | null;
          route?: string | null;
          severity?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          candidate_id: string | null;
          created_at: string | null;
          id: string;
          owner_id: string | null;
          requisition_id: string | null;
          stage: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          candidate_id?: string | null;
          created_at?: string | null;
          id?: string;
          owner_id?: string | null;
          requisition_id?: string | null;
          stage?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          candidate_id?: string | null;
          created_at?: string | null;
          id?: string;
          owner_id?: string | null;
          requisition_id?: string | null;
          stage?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'applications_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'ats_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'applications_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'applications_requisition_id_fkey';
            columns: ['requisition_id'];
            isOneToOne: false;
            referencedRelation: 'requisitions';
            referencedColumns: ['id'];
          },
        ];
      };
      approvals: {
        Row: {
          approver_group_id: string | null;
          approver_user_id: string | null;
          comments: string | null;
          created_at: string;
          decided_at: string | null;
          id: string;
          status: string | null;
          task_id: string;
        };
        Insert: {
          approver_group_id?: string | null;
          approver_user_id?: string | null;
          comments?: string | null;
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          status?: string | null;
          task_id: string;
        };
        Update: {
          approver_group_id?: string | null;
          approver_user_id?: string | null;
          comments?: string | null;
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          status?: string | null;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'approvals_approver_group_id_fkey';
            columns: ['approver_group_id'];
            isOneToOne: false;
            referencedRelation: 'owner_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approvals_approver_user_id_fkey';
            columns: ['approver_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approvals_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      assets: {
        Row: {
          asset_tag: string;
          assigned_to: string | null;
          attachments: string[] | null;
          category: string;
          created_at: string;
          id: string;
          location: string;
          model: string;
          notes: string | null;
          procurement_date: string;
          status: string | null;
          updated_at: string;
          vendor: string | null;
          warranty_end_date: string;
          warranty_start_date: string;
        };
        Insert: {
          asset_tag: string;
          assigned_to?: string | null;
          attachments?: string[] | null;
          category: string;
          created_at?: string;
          id?: string;
          location: string;
          model: string;
          notes?: string | null;
          procurement_date: string;
          status?: string | null;
          updated_at?: string;
          vendor?: string | null;
          warranty_end_date: string;
          warranty_start_date: string;
        };
        Update: {
          asset_tag?: string;
          assigned_to?: string | null;
          attachments?: string[] | null;
          category?: string;
          created_at?: string;
          id?: string;
          location?: string;
          model?: string;
          notes?: string | null;
          procurement_date?: string;
          status?: string | null;
          updated_at?: string;
          vendor?: string | null;
          warranty_end_date?: string;
          warranty_start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ats_attachments: {
        Row: {
          application_id: string | null;
          created_at: string | null;
          created_by: string | null;
          file_name: string;
          file_size: number | null;
          file_type: string | null;
          id: string;
          storage_path: string;
        };
        Insert: {
          application_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          file_name: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          storage_path: string;
        };
        Update: {
          application_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          file_name?: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ats_attachments_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ats_attachments_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      ats_audit: {
        Row: {
          action: string;
          actor: string | null;
          created_at: string | null;
          details: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
        };
        Insert: {
          action: string;
          actor?: string | null;
          created_at?: string | null;
          details?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: number;
        };
        Update: {
          action?: string;
          actor?: string | null;
          created_at?: string | null;
          details?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ats_audit_actor_fkey';
            columns: ['actor'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      ats_candidates: {
        Row: {
          ai_summary: string | null;
          ai_summary_generated_at: string | null;
          created_at: string | null;
          current_company: string | null;
          current_step: string | null;
          current_title: string | null;
          email: string;
          full_name: string;
          id: string;
          last_scored_at: string | null;
          linkedin_profile: string | null;
          location: string | null;
          notes: string | null;
          phone: string | null;
          resume_analysis: Json | null;
          resume_score: number | null;
          resume_url: string | null;
          source: string | null;
          updated_at: string | null;
        };
        Insert: {
          ai_summary?: string | null;
          ai_summary_generated_at?: string | null;
          created_at?: string | null;
          current_company?: string | null;
          current_step?: string | null;
          current_title?: string | null;
          email: string;
          full_name: string;
          id?: string;
          last_scored_at?: string | null;
          linkedin_profile?: string | null;
          location?: string | null;
          notes?: string | null;
          phone?: string | null;
          resume_analysis?: Json | null;
          resume_score?: number | null;
          resume_url?: string | null;
          source?: string | null;
          updated_at?: string | null;
        };
        Update: {
          ai_summary?: string | null;
          ai_summary_generated_at?: string | null;
          created_at?: string | null;
          current_company?: string | null;
          current_step?: string | null;
          current_title?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          last_scored_at?: string | null;
          linkedin_profile?: string | null;
          location?: string | null;
          notes?: string | null;
          phone?: string | null;
          resume_analysis?: Json | null;
          resume_score?: number | null;
          resume_url?: string | null;
          source?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      ats_comments: {
        Row: {
          application_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string | null;
          id: string;
          visible_to: Database['public']['Enums']['ats_role'][];
        };
        Insert: {
          application_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string | null;
          id?: string;
          visible_to?: Database['public']['Enums']['ats_role'][];
        };
        Update: {
          application_id?: string | null;
          author_id?: string | null;
          body?: string;
          created_at?: string | null;
          id?: string;
          visible_to?: Database['public']['Enums']['ats_role'][];
        };
        Relationships: [
          {
            foreignKeyName: 'ats_comments_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ats_comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      ats_interviews: {
        Row: {
          application_id: string;
          candidate_id: string;
          created_at: string;
          created_by: string;
          id: string;
          interview_type: string;
          interviewer_id: string;
          meeting_link: string | null;
          notes: string | null;
          requisition_id: string;
          scheduled_end: string;
          scheduled_start: string;
          status: string;
          teams_meeting_id: string | null;
          updated_at: string;
        };
        Insert: {
          application_id: string;
          candidate_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          interview_type?: string;
          interviewer_id: string;
          meeting_link?: string | null;
          notes?: string | null;
          requisition_id: string;
          scheduled_end: string;
          scheduled_start: string;
          status?: string;
          teams_meeting_id?: string | null;
          updated_at?: string;
        };
        Update: {
          application_id?: string;
          candidate_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          interview_type?: string;
          interviewer_id?: string;
          meeting_link?: string | null;
          notes?: string | null;
          requisition_id?: string;
          scheduled_end?: string;
          scheduled_start?: string;
          status?: string;
          teams_meeting_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ats_interviews_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'ats_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ats_interviews_interviewer_id_fkey';
            columns: ['interviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          created_by: string | null;
          id: string;
          new_value: string | null;
          old_value: string | null;
          record_id: string | null;
          record_updated_at: string | null;
          table_name: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
          record_id?: string | null;
          record_updated_at?: string | null;
          table_name: string;
        };
        Relationships: [];
      };
      candidate_activities: {
        Row: {
          activity_description: string;
          activity_type: string;
          actor_id: string | null;
          candidate_id: string;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          seen_by: string[] | null;
        };
        Insert: {
          activity_description: string;
          activity_type: string;
          actor_id?: string | null;
          candidate_id: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          seen_by?: string[] | null;
        };
        Update: {
          activity_description?: string;
          activity_type?: string;
          actor_id?: string | null;
          candidate_id?: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          seen_by?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'candidate_activities_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'ats_candidates';
            referencedColumns: ['id'];
          },
        ];
      };
      candidate_comments: {
        Row: {
          candidate_id: string;
          comment: string;
          created_at: string | null;
          id: string;
          updated_at: string | null;
          user_id: string | null;
          visible_to_roles: string[];
        };
        Insert: {
          candidate_id: string;
          comment: string;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string | null;
          visible_to_roles?: string[];
        };
        Update: {
          candidate_id?: string;
          comment?: string;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string | null;
          visible_to_roles?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'candidate_comments_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'ats_candidates';
            referencedColumns: ['id'];
          },
        ];
      };
      candidate_proficiencies: {
        Row: {
          candidate_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
        };
        Insert: {
          candidate_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          candidate_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      candidates: {
        Row: {
          address: string;
          created_at: string;
          date_of_joining: string | null;
          email: string;
          first_name: string;
          hiring_manager: string | null;
          id: string;
          last_name: string;
          location: string | null;
          phone_number: string;
          resume_url: string | null;
          survey_id: string;
          type_of_joining: string | null;
          updated_at: string;
          user_id: string;
          work_email: string | null;
        };
        Insert: {
          address: string;
          created_at?: string;
          date_of_joining?: string | null;
          email: string;
          first_name: string;
          hiring_manager?: string | null;
          id?: string;
          last_name: string;
          location?: string | null;
          phone_number: string;
          resume_url?: string | null;
          survey_id: string;
          type_of_joining?: string | null;
          updated_at?: string;
          user_id: string;
          work_email?: string | null;
        };
        Update: {
          address?: string;
          created_at?: string;
          date_of_joining?: string | null;
          email?: string;
          first_name?: string;
          hiring_manager?: string | null;
          id?: string;
          last_name?: string;
          location?: string | null;
          phone_number?: string;
          resume_url?: string | null;
          survey_id?: string;
          type_of_joining?: string | null;
          updated_at?: string;
          user_id?: string;
          work_email?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'candidates_hiring_manager_fkey';
            columns: ['hiring_manager'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'candidates_survey_id_fkey';
            columns: ['survey_id'];
            isOneToOne: false;
            referencedRelation: 'hiring_surveys';
            referencedColumns: ['id'];
          },
        ];
      };
      compensation_private: {
        Row: {
          application_id: string | null;
          created_at: string | null;
          created_by: string | null;
          ctc_expected: number | null;
          ctc_offered: number | null;
          currency: string | null;
          id: string;
          notes: string | null;
          rate_card: string | null;
          updated_at: string | null;
        };
        Insert: {
          application_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          ctc_expected?: number | null;
          ctc_offered?: number | null;
          currency?: string | null;
          id?: string;
          notes?: string | null;
          rate_card?: string | null;
          updated_at?: string | null;
        };
        Update: {
          application_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          ctc_expected?: number | null;
          ctc_offered?: number | null;
          currency?: string | null;
          id?: string;
          notes?: string | null;
          rate_card?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'compensation_private_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compensation_private_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      config: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          updated_at: string;
          user_id: string;
          value: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          updated_at?: string;
          user_id: string;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          updated_at?: string;
          user_id?: string;
          value?: string;
        };
        Relationships: [];
      };
      docs: {
        Row: {
          content_md: string;
          id: string;
          slug: string;
          tags: string[] | null;
          title: string;
          tsv: unknown;
        };
        Insert: {
          content_md: string;
          id?: string;
          slug: string;
          tags?: string[] | null;
          title: string;
          tsv?: unknown;
        };
        Update: {
          content_md?: string;
          id?: string;
          slug?: string;
          tags?: string[] | null;
          title?: string;
          tsv?: unknown;
        };
        Relationships: [];
      };
      employee_certifications: {
        Row: {
          authority: string | null;
          created_at: string | null;
          credential_id: string | null;
          expires_on: string | null;
          id: string;
          issued_on: string | null;
          name: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          authority?: string | null;
          created_at?: string | null;
          credential_id?: string | null;
          expires_on?: string | null;
          id?: string;
          issued_on?: string | null;
          name: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          authority?: string | null;
          created_at?: string | null;
          credential_id?: string | null;
          expires_on?: string | null;
          id?: string;
          issued_on?: string | null;
          name?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      employee_rates: {
        Row: {
          base_rate_usd: number;
          effective_from: string;
          notes: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          base_rate_usd: number;
          effective_from?: string;
          notes?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          base_rate_usd?: number;
          effective_from?: string;
          notes?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      employee_skills: {
        Row: {
          created_at: string | null;
          level: number;
          skill_id: string;
          updated_at: string | null;
          user_id: string;
          years: number | null;
        };
        Insert: {
          created_at?: string | null;
          level: number;
          skill_id: string;
          updated_at?: string | null;
          user_id: string;
          years?: number | null;
        };
        Update: {
          created_at?: string | null;
          level?: number;
          skill_id?: string;
          updated_at?: string | null;
          user_id?: string;
          years?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_skills_skill_id_fkey';
            columns: ['skill_id'];
            isOneToOne: false;
            referencedRelation: 'skills_catalog';
            referencedColumns: ['id'];
          },
        ];
      };
      external_completions: {
        Row: {
          candidate_id: string;
          comments: string | null;
          completed: boolean | null;
          completed_at: string | null;
          completion_token: string;
          created_at: string;
          email_sent_to: string;
          expires_at: string;
          id: string;
          step_name: string;
        };
        Insert: {
          candidate_id: string;
          comments?: string | null;
          completed?: boolean | null;
          completed_at?: string | null;
          completion_token: string;
          created_at?: string;
          email_sent_to: string;
          expires_at?: string;
          id?: string;
          step_name: string;
        };
        Update: {
          candidate_id?: string;
          comments?: string | null;
          completed?: boolean | null;
          completed_at?: string | null;
          completion_token?: string;
          created_at?: string;
          email_sent_to?: string;
          expires_at?: string;
          id?: string;
          step_name?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          author_id: string;
          candidate_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          overall_percent: number | null;
          recommendation: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          candidate_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          overall_percent?: number | null;
          recommendation?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          candidate_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          overall_percent?: number | null;
          recommendation?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      feedback_scores: {
        Row: {
          created_at: string;
          feedback_id: string;
          id: string;
          max_stars: number;
          proficiency_name: string;
          stars: number;
        };
        Insert: {
          created_at?: string;
          feedback_id: string;
          id?: string;
          max_stars?: number;
          proficiency_name: string;
          stars: number;
        };
        Update: {
          created_at?: string;
          feedback_id?: string;
          id?: string;
          max_stars?: number;
          proficiency_name?: string;
          stars?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_scores_feedback_id_fkey';
            columns: ['feedback_id'];
            isOneToOne: false;
            referencedRelation: 'feedback';
            referencedColumns: ['id'];
          },
        ];
      };
      fx_rates: {
        Row: {
          code: string;
          rate_to_usd: number;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          rate_to_usd: number;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          rate_to_usd?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          role: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          role?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          role?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'owner_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      hiring_surveys: {
        Row: {
          budget_approved: boolean;
          client: string | null;
          client_expectations: string | null;
          client_facing: boolean;
          comments_notes: string | null;
          created_at: string;
          department_function: string;
          experience_range_max: number;
          experience_range_min: number;
          hire_type: string;
          hiring_manager_email: string | null;
          hiring_manager_name: string;
          id: string;
          key_perks_benefits: string | null;
          location: string;
          mandatory_skills: string;
          nice_to_have_skills: string | null;
          number_of_positions: number;
          preferred_interview_panelists: string | null;
          preferred_start_date: string | null;
          role_title: string;
          salary_currency: string;
          salary_range_max: number | null;
          salary_range_min: number | null;
          updated_at: string;
          user_id: string;
          vendors_to_include: string | null;
        };
        Insert: {
          budget_approved: boolean;
          client?: string | null;
          client_expectations?: string | null;
          client_facing: boolean;
          comments_notes?: string | null;
          created_at?: string;
          department_function: string;
          experience_range_max: number;
          experience_range_min: number;
          hire_type: string;
          hiring_manager_email?: string | null;
          hiring_manager_name: string;
          id?: string;
          key_perks_benefits?: string | null;
          location: string;
          mandatory_skills: string;
          nice_to_have_skills?: string | null;
          number_of_positions?: number;
          preferred_interview_panelists?: string | null;
          preferred_start_date?: string | null;
          role_title: string;
          salary_currency: string;
          salary_range_max?: number | null;
          salary_range_min?: number | null;
          updated_at?: string;
          user_id: string;
          vendors_to_include?: string | null;
        };
        Update: {
          budget_approved?: boolean;
          client?: string | null;
          client_expectations?: string | null;
          client_facing?: boolean;
          comments_notes?: string | null;
          created_at?: string;
          department_function?: string;
          experience_range_max?: number;
          experience_range_min?: number;
          hire_type?: string;
          hiring_manager_email?: string | null;
          hiring_manager_name?: string;
          id?: string;
          key_perks_benefits?: string | null;
          location?: string;
          mandatory_skills?: string;
          nice_to_have_skills?: string | null;
          number_of_positions?: number;
          preferred_interview_panelists?: string | null;
          preferred_start_date?: string | null;
          role_title?: string;
          salary_currency?: string;
          salary_range_max?: number | null;
          salary_range_min?: number | null;
          updated_at?: string;
          user_id?: string;
          vendors_to_include?: string | null;
        };
        Relationships: [];
      };
      holidays: {
        Row: {
          holiday_date: string;
          id: string;
          name: string;
          region: string;
        };
        Insert: {
          holiday_date: string;
          id?: string;
          name: string;
          region: string;
        };
        Update: {
          holiday_date?: string;
          id?: string;
          name?: string;
          region?: string;
        };
        Relationships: [];
      };
      interview_assignments: {
        Row: {
          candidate_id: string | null;
          created_at: string | null;
          id: string;
          interview_id: string | null;
          interviewer_id: string | null;
          role: string | null;
        };
        Insert: {
          candidate_id?: string | null;
          created_at?: string | null;
          id?: string;
          interview_id?: string | null;
          interviewer_id?: string | null;
          role?: string | null;
        };
        Update: {
          candidate_id?: string | null;
          created_at?: string | null;
          id?: string;
          interview_id?: string | null;
          interviewer_id?: string | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'interview_assignments_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'ats_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'interview_assignments_interview_id_fkey';
            columns: ['interview_id'];
            isOneToOne: false;
            referencedRelation: 'interviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'interview_assignments_interviewer_id_fkey';
            columns: ['interviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      interview_feedback: {
        Row: {
          created_at: string | null;
          id: string;
          interview_id: string | null;
          interviewer_id: string | null;
          is_final: boolean | null;
          ratings: Json | null;
          recommendation: string | null;
          summary: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          interview_id?: string | null;
          interviewer_id?: string | null;
          is_final?: boolean | null;
          ratings?: Json | null;
          recommendation?: string | null;
          summary?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          interview_id?: string | null;
          interviewer_id?: string | null;
          is_final?: boolean | null;
          ratings?: Json | null;
          recommendation?: string | null;
          summary?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'interview_feedback_interview_id_fkey';
            columns: ['interview_id'];
            isOneToOne: false;
            referencedRelation: 'interviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'interview_feedback_interviewer_id_fkey';
            columns: ['interviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      interviews: {
        Row: {
          application_id: string | null;
          created_at: string | null;
          created_by: string | null;
          id: string;
          meeting_link: string | null;
          scheduled_end: string | null;
          scheduled_start: string | null;
          status: string | null;
          type: string | null;
          updated_at: string | null;
        };
        Insert: {
          application_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          meeting_link?: string | null;
          scheduled_end?: string | null;
          scheduled_start?: string | null;
          status?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          application_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          meeting_link?: string | null;
          scheduled_end?: string | null;
          scheduled_start?: string | null;
          status?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'interviews_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'interviews_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      leaves: {
        Row: {
          approved: boolean | null;
          end_date: string;
          id: string;
          start_date: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          approved?: boolean | null;
          end_date: string;
          id?: string;
          start_date: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          approved?: boolean | null;
          end_date?: string;
          id?: string;
          start_date?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          event_type: string;
          id: string;
          last_sent: string | null;
          recipients: string[];
          sent_at: string | null;
          task_id: string | null;
        };
        Insert: {
          event_type: string;
          id?: string;
          last_sent?: string | null;
          recipients: string[];
          sent_at?: string | null;
          task_id?: string | null;
        };
        Update: {
          event_type?: string;
          id?: string;
          last_sent?: string | null;
          recipients?: string[];
          sent_at?: string | null;
          task_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_journeys: {
        Row: {
          candidate_id: string;
          created_at: string;
          created_by: string | null;
          doj: string | null;
          geo: string | null;
          id: string;
          location: string | null;
          status: string | null;
          template_id: string;
          template_version: number;
          updated_at: string;
        };
        Insert: {
          candidate_id: string;
          created_at?: string;
          created_by?: string | null;
          doj?: string | null;
          geo?: string | null;
          id?: string;
          location?: string | null;
          status?: string | null;
          template_id: string;
          template_version: number;
          updated_at?: string;
        };
        Update: {
          candidate_id?: string;
          created_at?: string;
          created_by?: string | null;
          doj?: string | null;
          geo?: string | null;
          id?: string;
          location?: string | null;
          status?: string | null;
          template_id?: string;
          template_version?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_journeys_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: true;
            referencedRelation: 'candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_journeys_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'onboarding_journeys_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_task_dependencies: {
        Row: {
          depends_on_task_id: string;
          task_id: string;
        };
        Insert: {
          depends_on_task_id: string;
          task_id: string;
        };
        Update: {
          depends_on_task_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_task_dependencies_depends_on_task_id_fkey';
            columns: ['depends_on_task_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_task_dependencies_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_task_template_dependencies: {
        Row: {
          created_at: string;
          depends_on_task_template_id: string;
          id: string;
          task_template_id: string;
        };
        Insert: {
          created_at?: string;
          depends_on_task_template_id: string;
          id?: string;
          task_template_id: string;
        };
        Update: {
          created_at?: string;
          depends_on_task_template_id?: string;
          id?: string;
          task_template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_task_template_depen_depends_on_task_template_id_fkey';
            columns: ['depends_on_task_template_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_task_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_task_template_dependencies_task_template_id_fkey';
            columns: ['task_template_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_task_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_task_templates: {
        Row: {
          block: string;
          created_at: string;
          depends_on: string | null;
          description: string | null;
          dynamic_rules: Json | null;
          external_completion: boolean | null;
          id: string;
          name: string;
          order_index: number | null;
          owner_group_id: string | null;
          required_attachments: Json | null;
          sla_hours: number | null;
          template_id: string;
          updated_at: string;
        };
        Insert: {
          block: string;
          created_at?: string;
          depends_on?: string | null;
          description?: string | null;
          dynamic_rules?: Json | null;
          external_completion?: boolean | null;
          id?: string;
          name: string;
          order_index?: number | null;
          owner_group_id?: string | null;
          required_attachments?: Json | null;
          sla_hours?: number | null;
          template_id: string;
          updated_at?: string;
        };
        Update: {
          block?: string;
          created_at?: string;
          depends_on?: string | null;
          description?: string | null;
          dynamic_rules?: Json | null;
          external_completion?: boolean | null;
          id?: string;
          name?: string;
          order_index?: number | null;
          owner_group_id?: string | null;
          required_attachments?: Json | null;
          sla_hours?: number | null;
          template_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_task_templates_depends_on_fkey';
            columns: ['depends_on'];
            isOneToOne: false;
            referencedRelation: 'onboarding_task_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_task_templates_owner_group_id_fkey';
            columns: ['owner_group_id'];
            isOneToOne: false;
            referencedRelation: 'owner_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_task_templates_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_tasks: {
        Row: {
          assignee: string | null;
          block: string;
          candidate_email: string | null;
          completed_at: string | null;
          created_at: string;
          depends_on: string | null;
          description: string | null;
          due_at: string | null;
          external_completion: boolean | null;
          id: string;
          journey_id: string;
          meta: Json | null;
          name: string;
          official_email: string | null;
          owner_group_id: string | null;
          required_attachments: Json | null;
          sla_hours: number | null;
          started_at: string | null;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          assignee?: string | null;
          block: string;
          candidate_email?: string | null;
          completed_at?: string | null;
          created_at?: string;
          depends_on?: string | null;
          description?: string | null;
          due_at?: string | null;
          external_completion?: boolean | null;
          id?: string;
          journey_id: string;
          meta?: Json | null;
          name: string;
          official_email?: string | null;
          owner_group_id?: string | null;
          required_attachments?: Json | null;
          sla_hours?: number | null;
          started_at?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          assignee?: string | null;
          block?: string;
          candidate_email?: string | null;
          completed_at?: string | null;
          created_at?: string;
          depends_on?: string | null;
          description?: string | null;
          due_at?: string | null;
          external_completion?: boolean | null;
          id?: string;
          journey_id?: string;
          meta?: Json | null;
          name?: string;
          official_email?: string | null;
          owner_group_id?: string | null;
          required_attachments?: Json | null;
          sla_hours?: number | null;
          started_at?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_tasks_assignee_fkey';
            columns: ['assignee'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'onboarding_tasks_depends_on_fkey';
            columns: ['depends_on'];
            isOneToOne: false;
            referencedRelation: 'onboarding_tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_tasks_journey_id_fkey';
            columns: ['journey_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_journeys';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_tasks_owner_group_id_fkey';
            columns: ['owner_group_id'];
            isOneToOne: false;
            referencedRelation: 'owner_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean | null;
          location: string | null;
          name: string;
          settings: Json | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          location?: string | null;
          name: string;
          settings?: Json | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          location?: string | null;
          name?: string;
          settings?: Json | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_templates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      owner_groups: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pending_invites: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          email: string;
          expires_at: string | null;
          id: string;
          status: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          email: string;
          expires_at?: string | null;
          id?: string;
          status?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          email?: string;
          expires_at?: string | null;
          id?: string;
          status?: string | null;
        };
        Relationships: [];
      };
      proctor_events: {
        Row: {
          id: string;
          payload_json: Json;
          session_id: string;
          ts: string;
          type: string;
        };
        Insert: {
          id?: string;
          payload_json: Json;
          session_id: string;
          ts?: string;
          type: string;
        };
        Update: {
          id?: string;
          payload_json?: Json;
          session_id?: string;
          ts?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'proctor_events_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'test_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      proctor_images: {
        Row: {
          flagged_bool: boolean | null;
          hash: string | null;
          id: string;
          image_path: string;
          session_id: string;
          ts: string;
        };
        Insert: {
          flagged_bool?: boolean | null;
          hash?: string | null;
          id?: string;
          image_path: string;
          session_id: string;
          ts?: string;
        };
        Update: {
          flagged_bool?: boolean | null;
          hash?: string | null;
          id?: string;
          image_path?: string;
          session_id?: string;
          ts?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'proctor_images_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'test_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          ats_role: Database['public']['Enums']['ats_role'] | null;
          blocked: boolean | null;
          cost_annual: number | null;
          created_at: string;
          currency_code: string | null;
          department: string | null;
          email: string;
          employee_code: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean | null;
          job_title: string | null;
          joined_on: string | null;
          location: string | null;
          manager_id: string | null;
          margin_pct: number | null;
          photo_path: string | null;
          rate_hourly: number | null;
          resume_path: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          tsv: unknown;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ats_role?: Database['public']['Enums']['ats_role'] | null;
          blocked?: boolean | null;
          cost_annual?: number | null;
          created_at?: string;
          currency_code?: string | null;
          department?: string | null;
          email: string;
          employee_code?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean | null;
          job_title?: string | null;
          joined_on?: string | null;
          location?: string | null;
          manager_id?: string | null;
          margin_pct?: number | null;
          photo_path?: string | null;
          rate_hourly?: number | null;
          resume_path?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          tsv?: unknown;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ats_role?: Database['public']['Enums']['ats_role'] | null;
          blocked?: boolean | null;
          cost_annual?: number | null;
          created_at?: string;
          currency_code?: string | null;
          department?: string | null;
          email?: string;
          employee_code?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean | null;
          job_title?: string | null;
          joined_on?: string | null;
          location?: string | null;
          manager_id?: string | null;
          margin_pct?: number | null;
          photo_path?: string | null;
          rate_hourly?: number | null;
          resume_path?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          tsv?: unknown;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          bill_rate_usd: number;
          created_at: string | null;
          effective_from: string | null;
          effective_to: string | null;
          member_discount_pct: number | null;
          project_id: string;
          role: string | null;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          bill_rate_usd: number;
          created_at?: string | null;
          effective_from?: string | null;
          effective_to?: string | null;
          member_discount_pct?: number | null;
          project_id: string;
          role?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          bill_rate_usd?: number;
          created_at?: string | null;
          effective_from?: string | null;
          effective_to?: string | null;
          member_discount_pct?: number | null;
          project_id?: string;
          role?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          client: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          discount_pct: number | null;
          discount_reason: string | null;
          end_date: string | null;
          id: string;
          name: string;
          project_manager: string | null;
          sales_manager: string | null;
          start_date: string | null;
          updated_at: string | null;
        };
        Insert: {
          client?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_pct?: number | null;
          discount_reason?: string | null;
          end_date?: string | null;
          id?: string;
          name: string;
          project_manager?: string | null;
          sales_manager?: string | null;
          start_date?: string | null;
          updated_at?: string | null;
        };
        Update: {
          client?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_pct?: number | null;
          discount_reason?: string | null;
          end_date?: string | null;
          id?: string;
          name?: string;
          project_manager?: string | null;
          sales_manager?: string | null;
          start_date?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      requisition_activities: {
        Row: {
          activity_description: string;
          activity_type: string;
          actor_id: string | null;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          requisition_id: string;
        };
        Insert: {
          activity_description: string;
          activity_type: string;
          actor_id?: string | null;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          requisition_id: string;
        };
        Update: {
          activity_description?: string;
          activity_type?: string;
          actor_id?: string | null;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          requisition_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'requisition_activities_requisition_id_fkey';
            columns: ['requisition_id'];
            isOneToOne: false;
            referencedRelation: 'requisitions';
            referencedColumns: ['id'];
          },
        ];
      };
      requisition_comments: {
        Row: {
          comment: string;
          created_at: string;
          id: string;
          requisition_id: string;
          updated_at: string;
          user_id: string;
          visible_to_roles: string[];
        };
        Insert: {
          comment: string;
          created_at?: string;
          id?: string;
          requisition_id: string;
          updated_at?: string;
          user_id: string;
          visible_to_roles?: string[];
        };
        Update: {
          comment?: string;
          created_at?: string;
          id?: string;
          requisition_id?: string;
          updated_at?: string;
          user_id?: string;
          visible_to_roles?: string[];
        };
        Relationships: [];
      };
      requisitions: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          dept: string | null;
          description: string | null;
          employment_type: string | null;
          hiring_manager_id: string | null;
          id: string;
          linkedin_job_id: string | null;
          linkedin_posted_at: string | null;
          location: string | null;
          max_experience: number | null;
          min_experience: number | null;
          skills: string[] | null;
          status: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          dept?: string | null;
          description?: string | null;
          employment_type?: string | null;
          hiring_manager_id?: string | null;
          id?: string;
          linkedin_job_id?: string | null;
          linkedin_posted_at?: string | null;
          location?: string | null;
          max_experience?: number | null;
          min_experience?: number | null;
          skills?: string[] | null;
          status?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          dept?: string | null;
          description?: string | null;
          employment_type?: string | null;
          hiring_manager_id?: string | null;
          id?: string;
          linkedin_job_id?: string | null;
          linkedin_posted_at?: string | null;
          location?: string | null;
          max_experience?: number | null;
          min_experience?: number | null;
          skills?: string[] | null;
          status?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'requisitions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'requisitions_hiring_manager_id_fkey';
            columns: ['hiring_manager_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      skills_catalog: {
        Row: {
          category: string | null;
          created_at: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      task_attachments: {
        Row: {
          file_name: string | null;
          file_url: string;
          id: string;
          kind: string | null;
          task_id: string;
          uploaded_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          file_name?: string | null;
          file_url: string;
          id?: string;
          kind?: string | null;
          task_id: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          file_name?: string | null;
          file_url?: string;
          id?: string;
          kind?: string | null;
          task_id?: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'task_attachments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_attachments_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_dependencies: {
        Row: {
          created_at: string;
          depends_on_task_id: string;
          id: string;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          depends_on_task_id: string;
          id?: string;
          task_id: string;
        };
        Update: {
          created_at?: string;
          depends_on_task_id?: string;
          id?: string;
          task_id?: string;
        };
        Relationships: [];
      };
      task_sla_events: {
        Row: {
          created_at: string;
          event: string;
          id: string;
          meta: Json | null;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          event: string;
          id?: string;
          meta?: Json | null;
          task_id: string;
        };
        Update: {
          created_at?: string;
          event?: string;
          id?: string;
          meta?: Json | null;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_sla_events_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      test_assignments: {
        Row: {
          application_id: string | null;
          candidate_id: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          invite_sent_at: string | null;
          invite_token: string;
          status: string;
          template_id: string;
          updated_at: string;
        };
        Insert: {
          application_id?: string | null;
          candidate_id: string;
          created_at?: string;
          created_by: string;
          expires_at: string;
          id?: string;
          invite_sent_at?: string | null;
          invite_token: string;
          status?: string;
          template_id: string;
          updated_at?: string;
        };
        Update: {
          application_id?: string | null;
          candidate_id?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          invite_sent_at?: string | null;
          invite_token?: string;
          status?: string;
          template_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_assignments_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'test_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      test_responses: {
        Row: {
          id: string;
          question_id: string;
          response_json: Json;
          session_id: string;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          response_json: Json;
          session_id: string;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          response_json?: Json;
          session_id?: string;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_responses_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'test_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      test_scores: {
        Row: {
          auto_score_breakdown_json: Json | null;
          overall_pct: number;
          scored_at: string;
          section_scores_json: Json;
          session_id: string;
        };
        Insert: {
          auto_score_breakdown_json?: Json | null;
          overall_pct: number;
          scored_at?: string;
          section_scores_json: Json;
          session_id: string;
        };
        Update: {
          auto_score_breakdown_json?: Json | null;
          overall_pct?: number;
          scored_at?: string;
          section_scores_json?: Json;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_scores_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: true;
            referencedRelation: 'test_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      test_sessions: {
        Row: {
          assignment_id: string;
          created_at: string;
          ended_at: string | null;
          flags_json: Json | null;
          id: string;
          started_at: string;
          tab_switches: number | null;
          webcam_uptime_pct: number | null;
        };
        Insert: {
          assignment_id: string;
          created_at?: string;
          ended_at?: string | null;
          flags_json?: Json | null;
          id?: string;
          started_at?: string;
          tab_switches?: number | null;
          webcam_uptime_pct?: number | null;
        };
        Update: {
          assignment_id?: string;
          created_at?: string;
          ended_at?: string | null;
          flags_json?: Json | null;
          id?: string;
          started_at?: string;
          tab_switches?: number | null;
          webcam_uptime_pct?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'test_sessions_assignment_id_fkey';
            columns: ['assignment_id'];
            isOneToOne: false;
            referencedRelation: 'test_assignments';
            referencedColumns: ['id'];
          },
        ];
      };
      test_templates: {
        Row: {
          config_json: Json;
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          config_json: Json;
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          config_json?: Json;
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      timesheets: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          billable: boolean;
          created_at: string | null;
          hours: number;
          id: string;
          notes: string | null;
          project_id: string | null;
          rejection_reason: string | null;
          status: string;
          user_id: string | null;
          week_start: string | null;
          work_date: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          billable?: boolean;
          created_at?: string | null;
          hours: number;
          id?: string;
          notes?: string | null;
          project_id?: string | null;
          rejection_reason?: string | null;
          status?: string;
          user_id?: string | null;
          week_start?: string | null;
          work_date: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          billable?: boolean;
          created_at?: string | null;
          hours?: number;
          id?: string;
          notes?: string | null;
          project_id?: string | null;
          rejection_reason?: string | null;
          status?: string;
          user_id?: string | null;
          week_start?: string | null;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'timesheets_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'timesheets_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      workflow_updates: {
        Row: {
          actor_id: string | null;
          candidate_id: string;
          comments: string | null;
          created_at: string;
          from_step: string | null;
          id: string;
          new_status: string | null;
          note: string | null;
          old_status: string | null;
          step_name: string;
          to_step: string | null;
          updated_by: string | null;
        };
        Insert: {
          actor_id?: string | null;
          candidate_id: string;
          comments?: string | null;
          created_at?: string;
          from_step?: string | null;
          id?: string;
          new_status?: string | null;
          note?: string | null;
          old_status?: string | null;
          step_name: string;
          to_step?: string | null;
          updated_by?: string | null;
        };
        Update: {
          actor_id?: string | null;
          candidate_id?: string;
          comments?: string | null;
          created_at?: string;
          from_step?: string | null;
          id?: string;
          new_status?: string | null;
          note?: string | null;
          old_status?: string | null;
          step_name?: string;
          to_step?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_feedback_overall_percent: {
        Args: { p_feedback_id: string };
        Returns: number;
      };
      calculate_project_member_margin: {
        Args: {
          p_base_rate_usd: number;
          p_bill_rate_usd: number;
          p_member_discount_pct: number;
          p_project_discount_pct: number;
        };
        Returns: number;
      };
      calculate_utilization: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id?: string };
        Returns: {
          billable_hours: number;
          capacity_hours: number;
          user_id: string;
          utilization_pct: number;
        }[];
      };
      can_access_productivity: { Args: never; Returns: boolean };
      can_be_interviewer: { Args: { p_user_id?: string }; Returns: boolean };
      generate_test_invite_token: { Args: never; Returns: string };
      get_my_tasks: {
        Args: { p_block?: string; p_limit?: number; p_status?: string };
        Returns: {
          assignee_email: string;
          assignee_name: string;
          block: string;
          candidate_email: string;
          candidate_name: string;
          completed_at: string;
          due_at: string;
          external_completion: boolean;
          is_overdue: boolean;
          journey_id: string;
          owner_group_name: string;
          required_attachments: Json;
          sla_hours: number;
          started_at: string;
          task_description: string;
          task_id: string;
          task_name: string;
          task_status: string;
        }[];
      };
      get_site_url: { Args: never; Returns: string };
      get_user_ats_role: {
        Args: { p_user_id: string };
        Returns: Database['public']['Enums']['ats_role'];
      };
      get_user_ats_role_safe: {
        Args: { p_user_id: string };
        Returns: Database['public']['Enums']['ats_role'];
      };
      has_ats_role: {
        Args: { p_role: Database['public']['Enums']['ats_role'] };
        Returns: boolean;
      };
      instantiate_template: {
        Args: { p_candidate_id: string; p_template_id: string };
        Returns: string;
      };
      is_admin: { Args: { p_user: string }; Returns: boolean };
      is_group_lead: { Args: { p_group_id: string }; Returns: boolean };
      is_project_member: {
        Args: { pid: string; uid: string };
        Returns: boolean;
      };
      launch_onboarding_journey: {
        Args: { p_candidate_id: string; p_template_id: string };
        Returns: string;
      };
      log_candidate_activity: {
        Args: {
          p_activity_description: string;
          p_activity_type: string;
          p_candidate_id: string;
          p_metadata?: Json;
        };
        Returns: undefined;
      };
      log_requisition_activity: {
        Args: {
          p_activity_description: string;
          p_activity_type: string;
          p_metadata?: Json;
          p_requisition_id: string;
        };
        Returns: undefined;
      };
      mark_activities_as_seen: {
        Args: { p_activity_ids?: string[]; p_candidate_id: string };
        Returns: undefined;
      };
      move_candidate_stage: {
        Args: {
          p_candidate_id: string;
          p_from_stage: string;
          p_note?: string;
          p_to_stage: string;
        };
        Returns: undefined;
      };
      save_template: {
        Args: {
          p_dependencies: Json;
          p_name: string;
          p_tasks: Json;
          p_template_id: string;
        };
        Returns: string;
      };
      seed_default_proficiencies: {
        Args: { p_candidate_id: string };
        Returns: undefined;
      };
      update_task_status: {
        Args: {
          p_assignee?: string;
          p_candidate_email?: string;
          p_comment?: string;
          p_status: string;
          p_task_id: string;
        };
        Returns: undefined;
      };
      update_workflow_step: {
        Args: {
          p_candidate_id: string;
          p_comments?: string;
          p_completed_by?: string;
          p_status: string;
          p_step_name: string;
        };
        Returns: undefined;
      };
      validate_completion_token: {
        Args: { token_to_check: string };
        Returns: boolean;
      };
      validate_test_token: {
        Args: { token_to_check: string };
        Returns: boolean;
      };
    };
    Enums: {
      ats_role: 'ADMIN' | 'TA_ADMIN' | 'HIRING_MANAGER' | 'INTERVIEWER';
      user_role: 'admin' | 'staff' | 'hr' | 'finance';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      ats_role: ['ADMIN', 'TA_ADMIN', 'HIRING_MANAGER', 'INTERVIEWER'],
      user_role: ['admin', 'staff', 'hr', 'finance'],
    },
  },
} as const;
