CREATE TABLE IF NOT EXISTS public.onboarding_tasks_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.onboarding_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.onboarding_tasks_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users or Admin can view their own task logs" ON public.onboarding_tasks_logs
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users or Admin can insert task logs when performing actions" ON public.onboarding_tasks_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Function to log status changes
CREATE OR REPLACE FUNCTION public.log_onboarding_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.onboarding_tasks_logs (
      task_id,
      user_id,
      old_status,
      new_status
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.status,
      NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_onboarding_task_status_change
  AFTER UPDATE OF status ON public.onboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_onboarding_task_status_change();



-- Index for faster log retrieval
CREATE INDEX idx_onboarding_tasks_logs_task_id ON public.onboarding_tasks_logs(task_id);