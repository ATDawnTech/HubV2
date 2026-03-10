-- Centralized Notification System Database Schema
-- This migration creates all tables required for the notification system

-- ============================================================================
-- 1. NOTIFICATION QUEUE TABLE
-- ============================================================================
-- Stores notification events for asynchronous processing
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  module_id TEXT NOT NULL CHECK (module_id IN ('onboarding', 'ats', 'asset_management')),
  template_id TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'retrying')),
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_queue_status ON notification_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON notification_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_queue_module ON notification_queue(module_id);
CREATE INDEX IF NOT EXISTS idx_queue_created_at ON notification_queue(created_at);

-- ============================================================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- ============================================================================
-- Stores user notification preferences at module level
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL CHECK (module_id IN ('onboarding', 'ats', 'asset_management')),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Indexes for preference lookups
CREATE INDEX IF NOT EXISTS idx_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user_module ON notification_preferences(user_id, module_id);

-- ============================================================================
-- 3. EMAIL TEMPLATES TABLE
-- ============================================================================
-- Stores admin-configurable email templates with versioning
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  module_id TEXT NOT NULL CHECK (module_id IN ('onboarding', 'ats', 'asset_management')),
  notification_type TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  html_body_template TEXT NOT NULL,
  text_body_template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb, -- Schema of expected variables
  version INTEGER DEFAULT 1 CHECK (version > 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(template_id, version)
);

-- Indexes for template queries
CREATE INDEX IF NOT EXISTS idx_templates_module ON email_templates(module_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_template_id ON email_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON email_templates(notification_type);

-- ============================================================================
-- 4. NOTIFICATION LOGS TABLE
-- ============================================================================
-- Stores notification processing history for monitoring and debugging
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  recipient_email_hash TEXT, -- Hashed for GDPR compliance
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'retrying')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for log queries and analytics
CREATE INDEX IF NOT EXISTS idx_logs_notification_id ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_logs_module ON notification_logs(module_id);
CREATE INDEX IF NOT EXISTS idx_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_module_status ON notification_logs(module_id, status);

-- ============================================================================
-- 5. DEAD LETTER QUEUE TABLE
-- ============================================================================
-- Stores permanently failed notification events for manual review
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_event JSONB NOT NULL, -- Complete original notification event
  failure_reason TEXT NOT NULL,
  retry_attempts INTEGER NOT NULL,
  last_error TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- Indexes for DLQ management
CREATE INDEX IF NOT EXISTS idx_dlq_resolved ON dead_letter_queue(resolved, created_at);
CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp on notification_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Notification Queue Policies
-- Service role can do everything
CREATE POLICY "Service role can manage notification_queue"
  ON notification_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can insert their own notifications
CREATE POLICY "Users can insert notifications"
  ON notification_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Notification Preferences Policies
-- Users can view and update their own preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all preferences
CREATE POLICY "Service role can manage preferences"
  ON notification_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Email Templates Policies
-- All authenticated users can read active templates
CREATE POLICY "Users can view active templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Service role can manage all templates
CREATE POLICY "Service role can manage templates"
  ON email_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Notification Logs Policies
-- Service role can manage all logs
CREATE POLICY "Service role can manage logs"
  ON notification_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Dead Letter Queue Policies
-- Service role can manage DLQ
CREATE POLICY "Service role can manage DLQ"
  ON dead_letter_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notification_queue IS 'Queue for asynchronous notification processing';
COMMENT ON TABLE notification_preferences IS 'User notification preferences at module level';
COMMENT ON TABLE email_templates IS 'Admin-configurable email templates with versioning';
COMMENT ON TABLE notification_logs IS 'Notification processing history for monitoring';
COMMENT ON TABLE dead_letter_queue IS 'Permanently failed notifications for manual review';

COMMENT ON COLUMN notification_queue.status IS 'Current processing status: pending, processing, sent, failed, retrying';
COMMENT ON COLUMN notification_queue.priority IS 'Processing priority: high or normal';
COMMENT ON COLUMN notification_queue.retry_count IS 'Number of retry attempts (max 3)';
COMMENT ON COLUMN notification_preferences.enabled IS 'Whether notifications are enabled for this module';
COMMENT ON COLUMN email_templates.version IS 'Template version number for versioning support';
COMMENT ON COLUMN email_templates.is_active IS 'Whether this template version is active';
COMMENT ON COLUMN notification_logs.recipient_email_hash IS 'Hashed email for GDPR compliance';
COMMENT ON COLUMN dead_letter_queue.resolved IS 'Whether the failed notification has been resolved';
