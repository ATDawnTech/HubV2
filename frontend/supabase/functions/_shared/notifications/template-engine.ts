/**
 * TemplateEngine - Renders email templates with dynamic variables
 * 
 * This service handles:
 * - Rendering email templates using Handlebars
 * - Merging templates with provided variables
 * - Handling undefined variables (replaced with empty strings)
 * - Supporting both HTML and plain text rendering
 * 
 * Requirements: 4.1, 4.2, 4.5
 */

import Handlebars from 'npm:handlebars@4.7.8';
import { createClient } from '@supabase/supabase-js';
import type { RenderedEmail, EmailTemplate } from './types.ts';

/**
 * TemplateEngine class for rendering email templates
 */
export class TemplateEngine {
  private supabase;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Render an email template with provided variables
   * 
   * @param templateId - The unique identifier of the template to render
   * @param variables - Dynamic variables to merge into the template
   * @returns Rendered email with subject, HTML body, and text body
   * @throws Error if template not found or rendering fails
   */
  async render(templateId: string, variables: Record<string, any>): Promise<RenderedEmail> {
    // Fetch template from database
    const template = await this.fetchTemplate(templateId);

    // Prepare variables with defaults for undefined values
    const safeVariables = this.prepareVariables(variables);

    // Compile and render each template part
    const subject = this.renderTemplate(template.subject_template, safeVariables);
    const html_body = this.renderTemplate(template.html_body_template, safeVariables);
    const text_body = this.renderTemplate(template.text_body_template, safeVariables);

    return {
      subject,
      html_body,
      text_body
    };
  }

  /**
   * Render an email template from a template object (used for preview)
   * 
   * @param template - The template object to render
   * @param variables - Dynamic variables to merge into the template
   * @returns Rendered email with subject, HTML body, and text body
   * @throws Error if rendering fails
   */
  async renderFromTemplate(template: any, variables: Record<string, any>): Promise<RenderedEmail> {
    // Prepare variables with defaults for undefined values
    const safeVariables = this.prepareVariables(variables);

    // Compile and render each template part
    const subject = this.renderTemplate(template.subject_template, safeVariables);
    const html_body = this.renderTemplate(template.html_body_template, safeVariables);
    const text_body = this.renderTemplate(template.text_body_template, safeVariables);

    return {
      subject,
      html_body,
      text_body
    };
  }

  /**
   * Fetch template from database
   */
  private async fetchTemplate(templateId: string): Promise<EmailTemplate> {
    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error(`Failed to fetch template: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Convert database dates to Date objects
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    } as EmailTemplate;
  }

  /**
   * Prepare variables by ensuring all values are defined
   * Undefined or null values are replaced with empty strings
   */
  private prepareVariables(variables: Record<string, any>): Record<string, any> {
    const safeVariables: Record<string, any> = {};

    for (const [key, value] of Object.entries(variables)) {
      // Replace undefined or null with empty string
      if (value === undefined || value === null) {
        safeVariables[key] = '';
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively handle nested objects
        safeVariables[key] = this.prepareVariables(value);
      } else {
        safeVariables[key] = value;
      }
    }

    return safeVariables;
  }

  /**
   * Render a single template string with variables using Handlebars
   */
  private renderTemplate(templateString: string, variables: Record<string, any>): string {
    try {
      // Configure Handlebars to not throw on missing variables
      const template = Handlebars.compile(templateString, {
        strict: false, // Don't throw on missing variables
        noEscape: false // Keep HTML escaping enabled for security
      });

      // Register a helper to handle undefined values
      Handlebars.registerHelper('default', function(value: any, defaultValue: string) {
        return value !== undefined && value !== null ? value : defaultValue;
      });

      return template(variables);
    } catch (error) {
      throw new Error(`Failed to render template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate template syntax
   */
  validateTemplate(template: EmailTemplate): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    try {
      Handlebars.compile(template.subject_template);
    } catch (error) {
      errors.push(`Subject template error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      Handlebars.compile(template.html_body_template);
    } catch (error) {
      errors.push(`HTML body template error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      Handlebars.compile(template.text_body_template);
    } catch (error) {
      errors.push(`Text body template error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
