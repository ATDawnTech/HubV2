CREATE TYPE ONBOARDING_JOURNEY_STATUS AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled');
CREATE TYPE ONBOARDING_TASK_STATUS AS ENUM ('todo', 'in_progress', 'completed', 'overdue');

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_tasks_assignee_fkey') THEN
        ALTER TABLE "public"."onboarding_tasks" 
            ADD CONSTRAINT "onboarding_tasks_assignee_fkey" 
            FOREIGN KEY ("assignee") REFERENCES "public"."profiles"("user_id");
    END IF;
END $$;