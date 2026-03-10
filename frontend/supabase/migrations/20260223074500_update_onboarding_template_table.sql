ALTER TABLE "public"."onboarding_templates" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "public"."onboarding_templates" RENAME COLUMN "rules" TO "settings";