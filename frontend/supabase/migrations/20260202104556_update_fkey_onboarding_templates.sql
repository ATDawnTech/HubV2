ALTER TABLE "public"."onboarding_templates" DROP CONSTRAINT IF EXISTS "onboarding_templates_created_by_fkey";

ALTER TABLE ONLY "public"."onboarding_templates"
    ADD CONSTRAINT "onboarding_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id");