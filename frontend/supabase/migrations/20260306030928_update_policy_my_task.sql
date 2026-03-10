DROP POLICY IF EXISTS "Users can view and manage task assignments" ON public.task_assignees;
CREATE POLICY "Users can view and manage task assignments"
ON public.task_assignees
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can do anything on onboarding_tasks" ON public.onboarding_tasks;
CREATE POLICY "Users can do anything on onboarding_tasks"
ON public.onboarding_tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);