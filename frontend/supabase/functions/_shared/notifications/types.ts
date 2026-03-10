/**
 * Shared TypeScript types for the Notification System (Backend)
 * 
 * These types are used by Edge Functions for backend processing.
 * Client-side types remain in src/services/notifications/types/
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum NotificationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export enum NotificationPriority {
  HIGH = 'high',
  NORMAL = 'normal'
}

export enum ModuleId {
  ONBOARDING = 'onboarding',
  ATS = 'ats',
  ASSET_MANAGEMENT = 'asset_management'
}

// ============================================================================
// CORE DATA MODELS
// ============================================================================

export interface NotificationEvent {
  id: string;
  notification_type: string;
  recipient_email: string;
  module_id: ModuleId;
  template_id: string;
  variables: Record<string, any>;
  priority: NotificationPriority;
  status: NotificationStatus;
  retry_count: number;
  created_at: Date;
  processed_at?: Date;
  error_message?: string;
}

export interface VariableSchema {
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  description: string;
}

export interface EmailTemplate {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  module_id: ModuleId;
  notification_type: string;
  subject_template: string;
  html_body_template: string;
  text_body_template: string;
  variables: Record<string, VariableSchema>;
  version: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

export interface RenderedEmail {
  subject: string;
  html_body: string;
  text_body: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ProcessResult {
  success: boolean;
  notification_id: string;
  error?: string;
}
