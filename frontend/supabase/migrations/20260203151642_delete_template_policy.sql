-- Drop existing broad policy for task templates
DROP POLICY IF EXISTS "Allow authenticated users to manage task templates" ON "public"."onboarding_task_templates";

-- Create specific policies for onboarding_task_templates
CREATE POLICY "Authenticated users can view task templates"
ON "public"."onboarding_task_templates"
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert task templates"
ON "public"."onboarding_task_templates"
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update task templates"
ON "public"."onboarding_task_templates"
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete task templates"
ON "public"."onboarding_task_templates"
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Create delete policy for onboarding_templates
CREATE POLICY "Only admins can delete onboarding templates"
ON "public"."onboarding_templates"
FOR DELETE
USING (public.is_admin(auth.uid()));
