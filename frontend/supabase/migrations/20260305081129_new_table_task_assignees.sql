ALTER TABLE hiring_surveys DROP COLUMN IF EXISTS current_location;

-- 2. Add work_model column (if not present)
ALTER TABLE hiring_surveys ADD COLUMN IF NOT EXISTS work_model text NOT NULL DEFAULT 'On-site';

-- 3. Add location column (if not present)
ALTER TABLE hiring_surveys ADD COLUMN IF NOT EXISTS location text;

-- 3. Drop old check constraint on location (if present)

-- 4. Drop old check constraint on location (if present)
ALTER TABLE hiring_surveys DROP CONSTRAINT IF EXISTS hiring_surveys_location_check;

-- 4. (Optional) Add a length constraint for location (max 50 chars)

-- 5. Add a length constraint for location (max 50 chars)
ALTER TABLE hiring_surveys
    ADD CONSTRAINT hiring_surveys_location_check CHECK (length(location) <= 50);

-- 5. Update NOT NULL and DEFAULT constraints as needed

-- 6. Update NOT NULL and DEFAULT constraints as needed
ALTER TABLE hiring_surveys ALTER COLUMN work_model DROP DEFAULT;



DROP POLICY IF EXISTS "Users can update tasks they're assigned to or own" ON "public"."onboarding_tasks";
DROP POLICY IF EXISTS "Users can upload attachments for accessible tasks" ON "public"."task_attachments";
DROP POLICY IF EXISTS "Users can view attachments for accessible tasks" ON "public"."task_attachments";
DROP POLICY IF EXISTS "Users can view tasks for their journeys or assigned tasks" ON "public"."onboarding_tasks";

-- Create the task_assignees table
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES public.onboarding_tasks(id) ON DELETE CASCADE,
    assignee_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(task_id, assignee_id)
);

-- Drop foreign key constraint first
ALTER TABLE public.onboarding_tasks DROP CONSTRAINT IF EXISTS onboarding_tasks_assignee_fkey;

-- Remove assignee from onboarding_tasks
ALTER TABLE public.onboarding_tasks DROP COLUMN IF EXISTS assignee;

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Admins can do everything on task_assignees"
ON public.task_assignees
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Add a more permissive policy for task_assignees
CREATE POLICY "Users can view and manage task assignments"
ON public.task_assignees
FOR ALL
TO authenticated
USING (
    assignee_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.onboarding_tasks ot
        JOIN public.onboarding_journeys oj ON ot.journey_id = oj.id
        WHERE ot.id = task_assignees.task_id
    )
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can do anything on onboarding_tasks"
ON public.onboarding_tasks
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.task_assignees ta
        WHERE ta.task_id = onboarding_tasks.id AND ta.assignee_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.onboarding_journeys oj
        JOIN public.candidates c ON oj.candidate_id = c.id
        WHERE oj.id = onboarding_tasks.journey_id
    )
    OR public.is_admin(auth.uid())
);

-- Add policy for task_attachments since they were dropped in the previous migration
DROP POLICY IF EXISTS "Users can upload attachments for accessible tasks" ON "public"."task_attachments";
DROP POLICY IF EXISTS "Users can view attachments for accessible tasks" ON "public"."task_attachments";

ALTER TABLE public.group_members
ADD CONSTRAINT group_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
