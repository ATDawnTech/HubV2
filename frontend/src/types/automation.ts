export interface AutomationTask {
  id: string;
  template_id: string;
  name: string;
  n8n_webhook_url: string | null;
  enabled: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type AutomationTaskInsert = Omit<
  AutomationTask,
  'id' | 'created_at' | 'updated_at'
>;

export type AutomationTaskUpdate = Partial<
  Pick<AutomationTask, 'name' | 'enabled' | 'order_index' | 'n8n_webhook_url'>
>;

/** Payload sent to N8N webhooks when triggering automation tasks. */
export interface N8nWebhookPayload {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  startDate: string;
  managerName: string;
}
