/**
 * PreferenceService - Manages user notification preferences at module level
 * 
 * This service handles checking user notification preferences for backend processing.
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */

import { createClient } from '@supabase/supabase-js';
import { ModuleId } from './types.ts';

export class PreferenceService {
  private supabase;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Check if a user has notifications enabled for a specific module
   * 
   * @param userId - The user's ID
   * @param moduleId - The module ID to check
   * @returns true if notifications are enabled, false otherwise
   * @throws Error if database query fails
   */
  async checkPreference(userId: string, moduleId: ModuleId): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('enabled')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .single();

    if (error) {
      // If no preference exists, default to enabled (true)
      if (error.code === 'PGRST116') {
        return true;
      }
      throw new Error(`Failed to check preference: ${error.message}`);
    }

    return data?.enabled ?? true;
  }

  /**
   * Get user ID from email address
   */
  async getUserIdFromEmail(email: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return data.user_id;
  }
}
