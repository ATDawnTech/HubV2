-- Drop existing messy policies
DROP POLICY IF EXISTS "Admins have full profile access" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can create their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can view allowed profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "admin all profiles" ON "public"."profiles";

-- Policy for Admins: Full access to all profiles
CREATE POLICY "Admins have full access"
ON "public"."profiles"
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Policy for Users: View own profile
CREATE POLICY "Users can view their own profile"
ON "public"."profiles"
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for Users: Update own profile
CREATE POLICY "Users can update their own profile"
ON "public"."profiles"
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for Users: Create own profile (Initial creation)
CREATE POLICY "Users can create their own profile"
ON "public"."profiles"
FOR INSERT
WITH CHECK (auth.uid() = user_id);