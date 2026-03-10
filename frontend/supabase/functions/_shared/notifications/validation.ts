/**
 * Schema validation utilities for the Notification System (Backend)
 * 
 * Provides validation functions for NotificationEvent schema and other data models.
 * Used by Edge Functions for request validation.
 */

import { ModuleId, NotificationPriority, ValidationResult } from './types.ts';

/**
 * Validates a notification event request
 */
export function validateNotificationEvent(event: any): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!event.notification_type || typeof event.notification_type !== 'string') {
    errors.push('notification_type is required and must be a string');
  }

  if (!event.recipient_email || typeof event.recipient_email !== 'string') {
    errors.push('recipient_email is required and must be a string');
  } else if (!isValidEmail(event.recipient_email)) {
    errors.push('recipient_email must be a valid email address');
  }

  if (!event.module_id || typeof event.module_id !== 'string') {
    errors.push('module_id is required and must be a string');
  } else if (!isValidModuleId(event.module_id)) {
    errors.push(`module_id must be one of: ${Object.values(ModuleId).join(', ')}`);
  }

  if (!event.template_id || typeof event.template_id !== 'string') {
    errors.push('template_id is required and must be a string');
  }

  // Validate optional fields if present
  if (event.priority && !isValidPriority(event.priority)) {
    errors.push(`priority must be one of: ${Object.values(NotificationPriority).join(', ')}`);
  }

  if (event.variables !== undefined && (typeof event.variables !== 'object' || Array.isArray(event.variables))) {
    errors.push('variables must be an object');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a module ID
 */
export function isValidModuleId(moduleId: string): boolean {
  return Object.values(ModuleId).includes(moduleId as ModuleId);
}

/**
 * Validates a priority value
 */
export function isValidPriority(priority: string): boolean {
  return Object.values(NotificationPriority).includes(priority as NotificationPriority);
}

/**
 * Validates a notification status
 */
export function isValidStatus(status: string): boolean {
  const validStatuses = ['pending', 'processing', 'sent', 'failed', 'retrying'];
  return validStatuses.includes(status);
}

/**
 * Validates template variables against schema
 */
export function validateTemplateVariables(
  variables: Record<string, any>,
  schema: Record<string, { type: string; required: boolean; description: string }>
): ValidationResult {
  const errors: string[] = [];

  // Check required variables
  for (const [key, config] of Object.entries(schema)) {
    if (config.required && !(key in variables)) {
      errors.push(`Required variable '${key}' is missing`);
    }

    // Type checking if variable is present
    if (key in variables) {
      const value = variables[key];
      const expectedType = config.type;

      if (!isValidVariableType(value, expectedType)) {
        errors.push(`Variable '${key}' should be of type '${expectedType}'`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates a variable's type
 */
function isValidVariableType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return value instanceof Date || !isNaN(Date.parse(value));
    default:
      return true; // Unknown types pass validation
  }
}
