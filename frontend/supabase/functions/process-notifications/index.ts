/**
 * Process Notifications Edge Function v1
 * 
 * This Edge Function processes notification events from the queue.
 * It should be triggered periodically (e.g., every minute) via a cron job or pg_cron.
 * 
 * POST /v1/process-notifications
 * 
 * Workflow:
 * 1. Poll the notification queue for pending events
 * 2. Process each event (check preferences, render template, send email)
 * 3. Update event status (sent/failed)
 * 4. Handle retries with exponential backoff
 * 5. Move permanently failed events to dead letter queue
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 6.2, 9.1, 9.2
 */

import { createClient } from '@supabase/supabase-js';
import { PreferenceService } from '../_shared/notifications/preference-service.ts';
import { TemplateEngine } from '../_shared/notifications/template-engine.ts';
import {
  NotificationStatus,
  type NotificationEvent,
  type ProcessResult,
  type ModuleId,
  type RenderedEmail
} from '../_shared/notifications/types.ts';

/**
 * Configuration for retry logic
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BACKOFF_DELAYS: [1000, 2000, 4000] // 1s, 2s, 4s in milliseconds
};

/**
 * QueueProcessor class for processing notification events
 */
class QueueProcessor {
  private supabase;
  private preferenceService: PreferenceService;
  private templateEngine: TemplateEngine;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.preferenceService = new PreferenceService();
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Main processing method - polls queue for pending events
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      // Query pending events ordered by priority DESC, created_at ASC
      const { data: events, error } = await this.supabase
        .from('notification_queue')
        .select('*')
        .eq('status', NotificationStatus.PENDING)
        .order('priority', { ascending: false }) // high priority first
        .order('created_at', { ascending: true }) // oldest first
        .limit(10); // Process in batches of 10

      if (error) {
        console.error('Error fetching pending events:', error);
        throw new Error(`Failed to fetch pending events: ${error.message}`);
      }

      if (!events || events.length === 0) {
        console.log('No pending events to process');
        return { processed: 0, failed: 0 };
      }

      console.log(`Processing ${events.length} pending events`);

      // Process each event
      for (const eventData of events) {
        const event = this.convertToNotificationEvent(eventData);
        const result = await this.processEvent(event);
        
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      }

      return { processed, failed };
    } catch (error) {
      console.error('Error in processQueue:', error);
      throw error;
    }
  }

  /**
   * Process a single notification event
   */
  async processEvent(event: NotificationEvent): Promise<ProcessResult> {
    const startTime = Date.now();

    try {
      console.log(`Processing event ${event.id} (type: ${event.notification_type})`);

      // Update status to "processing"
      await this.updateEventStatus(event.id, NotificationStatus.PROCESSING);

      // Check user preferences
      const shouldSend = await this.checkUserPreferences(
        event.recipient_email,
        event.module_id
      );

      if (!shouldSend) {
        console.log(`Skipping notification for ${event.recipient_email} - module ${event.module_id} disabled`);
        await this.updateEventStatus(event.id, NotificationStatus.SENT, 'Skipped due to user preferences');
        await this.logNotification(event, NotificationStatus.SENT, Date.now() - startTime, 'Skipped due to user preferences');
        
        return {
          success: true,
          notification_id: event.id,
          error: 'Skipped due to user preferences'
        };
      }

      // Render email template
      const renderedEmail = await this.templateEngine.render(
        event.template_id,
        event.variables
      );

      // Send email
      await this.sendEmail(event.recipient_email, renderedEmail);

      // Update status to "sent"
      await this.updateEventStatus(event.id, NotificationStatus.SENT);
      await this.updateProcessedAt(event.id);
      await this.logNotification(event, NotificationStatus.SENT, Date.now() - startTime);

      console.log(`Successfully processed event ${event.id}`);

      return {
        success: true,
        notification_id: event.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing event ${event.id}:`, errorMessage);
      return await this.handleFailure(event, errorMessage, startTime);
    }
  }

  /**
   * Handle event processing failure with retry logic
   */
  private async handleFailure(
    event: NotificationEvent,
    errorMessage: string,
    startTime: number
  ): Promise<ProcessResult> {
    const currentRetryCount = event.retry_count || 0;

    if (currentRetryCount < RETRY_CONFIG.MAX_RETRIES) {
      // Retry with exponential backoff
      const nextRetryCount = currentRetryCount + 1;
      
      console.log(
        `Scheduling retry ${nextRetryCount}/${RETRY_CONFIG.MAX_RETRIES} for event ${event.id}`
      );

      // Update status to "pending" for retry and increment retry count
      await this.updateEventForRetry(event.id, nextRetryCount, errorMessage);
      await this.logNotification(event, NotificationStatus.RETRYING, Date.now() - startTime, errorMessage);

      return {
        success: false,
        notification_id: event.id,
        error: `Retry scheduled (attempt ${nextRetryCount}/${RETRY_CONFIG.MAX_RETRIES})`
      };

    } else {
      // Max retries exceeded - move to dead letter queue
      console.log(`Max retries exceeded for event ${event.id}, moving to DLQ`);

      await this.moveToDeadLetterQueue(event, errorMessage);
      await this.updateEventStatus(event.id, NotificationStatus.FAILED, errorMessage);
      await this.logNotification(event, NotificationStatus.FAILED, Date.now() - startTime, errorMessage);

      return {
        success: false,
        notification_id: event.id,
        error: `Permanently failed after ${RETRY_CONFIG.MAX_RETRIES} retries`
      };
    }
  }

  /**
   * Check if user has notifications enabled for the module
   */
  private async checkUserPreferences(
    recipientEmail: string,
    moduleId: ModuleId
  ): Promise<boolean> {
    try {
      // Get user_id from email
      const userId = await this.preferenceService.getUserIdFromEmail(recipientEmail);

      if (!userId) {
        // If user not found, default to sending (allow notifications)
        console.log(`User not found for email ${recipientEmail}, defaulting to send`);
        return true;
      }

      // Check preference
      const isEnabled = await this.preferenceService.checkPreference(userId, moduleId);
      return isEnabled;

    } catch (error) {
      // On error, default to sending (fail open)
      console.error('Error checking user preferences:', error);
      return true;
    }
  }

  /**
   * Send email using Resend API
   */
  private async sendEmail(
    recipientEmail: string,
    renderedEmail: RenderedEmail
  ): Promise<void> {
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY not configured');
      }

      // Call Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Notification System <notifications@atdawntech.com>',
          to: [recipientEmail],
          subject: renderedEmail.subject,
          html: renderedEmail.html_body,
          text: renderedEmail.text_body
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Email send failed: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);

    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Move event to dead letter queue
   */
  private async moveToDeadLetterQueue(
    event: NotificationEvent,
    lastError: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('dead_letter_queue')
        .insert({
          original_event: event,
          failure_reason: 'Max retry attempts exceeded',
          retry_attempts: event.retry_count || 0,
          last_error: lastError,
          resolved: false
        });

      if (error) {
        console.error('Error moving to DLQ:', error);
        throw new Error(`Failed to move to DLQ: ${error.message}`);
      }

      console.log(`Event ${event.id} moved to dead letter queue`);

    } catch (error) {
      console.error('Error in moveToDeadLetterQueue:', error);
      throw error;
    }
  }

  /**
   * Update event status in the queue
   */
  private async updateEventStatus(
    eventId: string,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = { status };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await this.supabase
      .from('notification_queue')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      console.error('Error updating event status:', error);
      throw new Error(`Failed to update event status: ${error.message}`);
    }
  }

  /**
   * Update event for retry
   */
  private async updateEventForRetry(
    eventId: string,
    retryCount: number,
    errorMessage: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('notification_queue')
      .update({
        status: NotificationStatus.PENDING,
        retry_count: retryCount,
        error_message: errorMessage
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error updating event for retry:', error);
      throw new Error(`Failed to update event for retry: ${error.message}`);
    }
  }

  /**
   * Update processed_at timestamp
   */
  private async updateProcessedAt(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notification_queue')
      .update({
        processed_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (error) {
      console.error('Error updating processed_at:', error);
    }
  }

  /**
   * Log notification processing to notification_logs table
   */
  private async logNotification(
    event: NotificationEvent,
    status: NotificationStatus,
    processingTimeMs: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Hash email for GDPR compliance
      const emailHash = await this.hashEmail(event.recipient_email);

      const logEntry = {
        notification_id: event.id,
        module_id: event.module_id,
        notification_type: event.notification_type,
        recipient_email_hash: emailHash,
        status: status,
        sent_at: status === NotificationStatus.SENT ? new Date().toISOString() : null,
        error_message: errorMessage || null,
        retry_count: event.retry_count || 0,
        processing_time_ms: Math.round(processingTimeMs)
      };

      const { error } = await this.supabase
        .from('notification_logs')
        .insert(logEntry);

      if (error) {
        console.error('Error logging notification:', error);
      }

    } catch (error) {
      console.error('Error in logNotification:', error);
    }
  }

  /**
   * Hash email address for GDPR compliance
   */
  private async hashEmail(email: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(email);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Convert database row to NotificationEvent
   */
  private convertToNotificationEvent(data: any): NotificationEvent {
    return {
      id: data.id,
      notification_type: data.notification_type,
      recipient_email: data.recipient_email,
      module_id: data.module_id as ModuleId,
      template_id: data.template_id,
      variables: data.variables || {},
      priority: data.priority,
      status: data.status as NotificationStatus,
      retry_count: data.retry_count || 0,
      created_at: new Date(data.created_at),
      processed_at: data.processed_at ? new Date(data.processed_at) : undefined,
      error_message: data.error_message || undefined
    };
  }
}

// Edge Function handler
Deno.serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Method not allowed. Use POST.' 
      }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('Starting notification queue processing...');
    
    const processor = new QueueProcessor();
    const result = await processor.processQueue();

    console.log(`Queue processing complete: ${result.processed} processed, ${result.failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: result.processed,
        failed: result.failed,
        message: 'Queue processing complete'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing queue:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
