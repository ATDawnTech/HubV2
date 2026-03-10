import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Request ID generator
const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Structured error type
export interface ApiError {
  message: string;
  code?: string;
  requestId: string;
  route?: string;
  operation?: string;
}

// Exponential backoff delay
const getBackoffDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000);

// Log helper function
export const log = async (
  severity: 'info' | 'warn' | 'error',
  message: string,
  operation?: string,
  route?: string,
  payloadSize?: number,
  duration?: number,
  requestId?: string
) => {
  try {
    await supabase.from('app_logs').insert({
      severity,
      message,
      operation,
      route,
      payload_size: payloadSize,
      duration_ms: duration,
      request_id: requestId || generateRequestId()
    });
  } catch (error) {
    console.error('Failed to log to database:', error);
  }
};

// Supabase wrapper with retry, timeout, and logging
export class SupaApi {
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    route?: string,
    maxRetries = 2,
    timeoutMs = 10000
  ): Promise<T> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error('Request timeout'));
            });
          })
        ]);

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        await log('info', `${operationName} succeeded`, operationName, route, undefined, duration, requestId);

        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          // Log error and show toast
          const apiError: ApiError = {
            message: error.message || 'An unexpected error occurred',
            code: error.code,
            requestId,
            route,
            operation: operationName
          };

          await log('error', apiError.message, operationName, route, undefined, duration, requestId);

          toast({
            title: "Error",
            description: apiError.message,
            variant: "destructive"
          });

          throw apiError;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, getBackoffDelay(attempt)));
      }
    }

    throw new Error('Unexpected error in retry logic');
  }

  // RPC methods with type safety
  static async rpc<T = any>(
    functionName: 'save_template' | 'instantiate_template' | 'calculate_utilization' | 'get_my_tasks' | 'launch_onboarding_journey' | 'update_task_status',
    params?: any,
    route?: string
  ): Promise<T> {
    return this.executeWithRetry(
      async () => {
        const { data, error } = await supabase.rpc(functionName as any, params);
        if (error) throw error;
        return data as T;
      },
      `rpc_${functionName}`,
      route
    );
  }

  // Edge function calls
  static async callEdgeFunction<T = any>(
    functionName: string,
    params?: any,
    route?: string
  ): Promise<T> {
    return this.executeWithRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: params,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });
        if (error) throw error;
        return data as T;
      },
      `edge_${functionName}`,
      route
    );
  }

  // Direct supabase access for type safety
  static get client() {
    return supabase;
  }
}