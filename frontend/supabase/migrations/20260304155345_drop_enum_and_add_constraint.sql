-- 1. Data Migration: Map old statuses to new values in onboarding_journeys
UPDATE "public"."onboarding_journeys" 
SET status = CASE 
  WHEN status = 'draft' THEN 'not_started'
  WHEN status = 'in_progress' THEN 'in_progress'
  WHEN status = 'completed' THEN 'completed'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'not_started'
END;

-- 2. Data Migration: Map old statuses to new values in onboarding_tasks
UPDATE "public"."onboarding_tasks" 
SET status = CASE 
  WHEN status = 'pending' THEN 'todo'
  WHEN status = 'waiting_for_dependency' THEN 'todo'
  WHEN status = 'blocked' THEN 'todo'
  WHEN status = 'in_progress' THEN 'in_progress'
  WHEN status = 'completed' THEN 'completed'
  WHEN status = 'skipped' THEN 'completed'
  ELSE 'todo'
END;

-- 3. Update Constraints for onboarding_journeys
ALTER TABLE "public"."onboarding_journeys" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."onboarding_journeys" DROP CONSTRAINT IF EXISTS "onboarding_journeys_status_check";
ALTER TABLE "public"."onboarding_journeys" ADD CONSTRAINT "onboarding_journeys_status_check" 
  CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled'));
ALTER TABLE "public"."onboarding_journeys" ALTER COLUMN "status" SET DEFAULT 'not_started';

-- 4. Update Constraints for onboarding_tasks
ALTER TABLE "public"."onboarding_tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."onboarding_tasks" DROP CONSTRAINT IF EXISTS "onboarding_tasks_status_check";
ALTER TABLE "public"."onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_status_check" 
  CHECK (status IN ('todo', 'in_progress', 'completed', 'overdue'));
ALTER TABLE "public"."onboarding_tasks" ALTER COLUMN "status" SET DEFAULT 'todo';

-- 5. Drop the enums that were recently created but are no longer desired
DROP TYPE IF EXISTS ONBOARDING_JOURNEY_STATUS;
DROP TYPE IF EXISTS ONBOARDING_TASK_STATUS;
