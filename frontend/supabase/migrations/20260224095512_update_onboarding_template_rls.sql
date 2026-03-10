-- Remove all current policies of onboarding_templates table
DROP POLICY IF EXISTS "Users can create templates" ON "public"."onboarding_templates";
DROP POLICY IF EXISTS "Users can update their templates" ON "public"."onboarding_templates";
DROP POLICY IF EXISTS "Users can view active templates" ON "public"."onboarding_templates";
DROP POLICY IF EXISTS "Only admins can delete onboarding templates" ON "public"."onboarding_templates";

-- Add a policy that admin can do anything on that table
CREATE POLICY "Admin can do anything on onboarding_templates"
ON "public"."onboarding_templates"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));