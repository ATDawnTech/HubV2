

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."ats_role" AS ENUM (
    'ADMIN',
    'TA_ADMIN',
    'HIRING_MANAGER',
    'INTERVIEWER'
);


ALTER TYPE "public"."ats_role" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'staff',
    'hr',
    'finance'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_feedback_overall_percent"("p_feedback_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  total_stars NUMERIC;
  proficiency_count INTEGER;
  v_overall_percent INTEGER;
BEGIN
  SELECT 
    COALESCE(SUM(stars), 0),
    COUNT(*)
  INTO total_stars, proficiency_count
  FROM public.feedback_scores 
  WHERE feedback_id = p_feedback_id;
  
  IF proficiency_count = 0 THEN
    v_overall_percent := 0;
  ELSE
    v_overall_percent := ROUND(100 * (total_stars / (5.0 * proficiency_count)));
  END IF;
  
  UPDATE public.feedback f
  SET overall_percent = v_overall_percent,
      updated_at = now()
  WHERE f.id = p_feedback_id;
  
  RETURN v_overall_percent;
END;
$$;


ALTER FUNCTION "public"."calculate_feedback_overall_percent"("p_feedback_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_project_member_margin"("p_bill_rate_usd" numeric, "p_member_discount_pct" numeric, "p_project_discount_pct" numeric, "p_base_rate_usd" numeric) RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  net_bill NUMERIC;
  margin_pct NUMERIC;
BEGIN
  -- Calculate net bill rate after discounts
  net_bill := p_bill_rate_usd * (1 - COALESCE(p_member_discount_pct, p_project_discount_pct, 0) / 100.0);
  
  -- Calculate margin percentage
  IF net_bill > 0 THEN
    margin_pct := (net_bill - p_base_rate_usd) / net_bill * 100.0;
  ELSE
    margin_pct := 0;
  END IF;
  
  RETURN ROUND(margin_pct, 2);
END;
$$;


ALTER FUNCTION "public"."calculate_project_member_margin"("p_bill_rate_usd" numeric, "p_member_discount_pct" numeric, "p_project_discount_pct" numeric, "p_base_rate_usd" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_utilization"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT ("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))::"date", "p_end_date" "date" DEFAULT (("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone) + '1 mon -1 days'::interval))::"date") RETURNS TABLE("user_id" "uuid", "billable_hours" numeric, "capacity_hours" numeric, "utilization_pct" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_working_days integer;
BEGIN
  -- Calculate working days (excluding weekends and holidays)
  SELECT COUNT(*)::integer INTO v_working_days
  FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d
  WHERE EXTRACT(dow FROM d) NOT IN (0, 6) -- Not weekend
  AND d::date NOT IN (SELECT holiday_date FROM holidays WHERE region = 'default');

  RETURN QUERY
  SELECT 
    ts.user_id,
    COALESCE(SUM(ts.hours), 0) as billable_hours,
    (v_working_days * 8)::numeric as capacity_hours,
    CASE 
      WHEN v_working_days > 0 THEN (COALESCE(SUM(ts.hours), 0) / (v_working_days * 8) * 100)
      ELSE 0 
    END as utilization_pct
  FROM (
    SELECT DISTINCT u.id as user_id 
    FROM auth.users u 
    WHERE (p_user_id IS NULL OR u.id = p_user_id)
  ) users
  LEFT JOIN timesheets ts ON ts.user_id = users.user_id 
    AND ts.work_date BETWEEN p_start_date AND p_end_date
    AND ts.status = 'approved'
  GROUP BY ts.user_id;
END;
$$;


ALTER FUNCTION "public"."calculate_utilization"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_productivity"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT is_admin(auth.uid());
$$;


ALTER FUNCTION "public"."can_access_productivity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_be_interviewer"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = p_user_id 
    AND ats_role IN ('ADMIN', 'INTERVIEWER')
  );
$$;


ALTER FUNCTION "public"."can_be_interviewer"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_test_invite_token"() RETURNS "text"
    LANGUAGE "sql"
    AS $$
  SELECT replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_');
$$;


ALTER FUNCTION "public"."generate_test_invite_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_tasks"("p_block" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50) RETURNS TABLE("task_id" "uuid", "task_name" "text", "task_description" "text", "task_status" "text", "due_at" timestamp with time zone, "started_at" timestamp with time zone, "completed_at" timestamp with time zone, "candidate_name" "text", "candidate_email" "text", "journey_id" "uuid", "block" "text", "sla_hours" integer, "is_overdue" boolean, "external_completion" boolean, "required_attachments" "jsonb", "assignee_name" "text", "assignee_email" "text", "owner_group_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ot.id as task_id,
    ot.name as task_name,
    ot.description as task_description,
    ot.status as task_status,
    ot.due_at,
    ot.started_at,
    ot.completed_at,
    c.full_name as candidate_name,
    c.email as candidate_email,
    ot.journey_id,
    ot.block,
    ot.sla_hours,
    (ot.due_at < now() AND ot.status NOT IN ('completed', 'skipped')) as is_overdue,
    ot.external_completion,
    ot.required_attachments,
    COALESCE(assignee_profiles.full_name, '') as assignee_name,
    COALESCE(assignee_profiles.email, '') as assignee_email,
    COALESCE(og.name, '') as owner_group_name
  FROM onboarding_tasks ot
  JOIN onboarding_journeys oj ON ot.journey_id = oj.id
  JOIN candidates c ON oj.candidate_id = c.id
  LEFT JOIN profiles assignee_profiles ON ot.assignee = assignee_profiles.user_id
  LEFT JOIN owner_groups og ON ot.owner_group_id = og.id
  WHERE
    (ot.assignee = auth.uid() OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = ot.owner_group_id AND gm.user_id = auth.uid()
    ))
    AND (p_block IS NULL OR ot.block = p_block)
    AND (p_status IS NULL OR ot.status = p_status)
  ORDER BY
    CASE WHEN ot.due_at < now() AND ot.status NOT IN ('completed', 'skipped') THEN 0 ELSE 1 END,
    ot.due_at ASC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_my_tasks"("p_block" "text", "p_status" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_site_url"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    -- In production, this should be set to your actual domain
    current_setting('app.settings.site_url', true),
    -- Fallback to a reasonable default - you'll need to update this
    'https://your-app-domain.com'
  );
$$;


ALTER FUNCTION "public"."get_site_url"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_ats_role"("p_user_id" "uuid") RETURNS "public"."ats_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ats_role FROM profiles WHERE user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_ats_role"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_ats_role_safe"("p_user_id" "uuid") RETURNS "public"."ats_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ats_role FROM profiles WHERE user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_ats_role_safe"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_ats_role"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND ats_role IS NOT NULL
  );
$$;


ALTER FUNCTION "public"."has_any_ats_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_ats_role"("p_role" "public"."ats_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (ats_role = 'ADMIN' OR ats_role = p_role)
  );
$$;


ALTER FUNCTION "public"."has_ats_role"("p_role" "public"."ats_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."instantiate_template"("p_candidate_id" "uuid", "p_template_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_journey_id uuid;
  v_task_template record;
  v_task_id uuid;
  v_task_map jsonb := '{}';
  v_dep record;
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM candidates 
    WHERE id = p_candidate_id 
    AND (user_id = auth.uid() OR is_admin(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Candidate not found or access denied';
  END IF;

  -- Get or create journey
  SELECT id INTO v_journey_id 
  FROM onboarding_journeys 
  WHERE candidate_id = p_candidate_id;
  
  IF v_journey_id IS NULL THEN
    INSERT INTO onboarding_journeys (candidate_id, template_id, template_version, created_by)
    SELECT p_candidate_id, p_template_id, 1, auth.uid()
    RETURNING id INTO v_journey_id;
  END IF;

  -- Create tasks from template
  FOR v_task_template IN 
    SELECT * FROM onboarding_task_templates 
    WHERE template_id = p_template_id 
    ORDER BY order_index
  LOOP
    INSERT INTO onboarding_tasks (
      journey_id, block, name, description, owner_group_id,
      due_at, sla_hours, external_completion, required_attachments, status
    ) VALUES (
      v_journey_id,
      v_task_template.block,
      v_task_template.name,
      v_task_template.description,
      v_task_template.owner_group_id,
      now() + (v_task_template.sla_hours || ' hours')::interval,
      v_task_template.sla_hours,
      v_task_template.external_completion,
      v_task_template.required_attachments,
      'pending'
    ) RETURNING id INTO v_task_id;
    
    v_task_map := v_task_map || jsonb_build_object(v_task_template.id::text, v_task_id);
  END LOOP;

  RETURN v_journey_id;
END;
$$;


ALTER FUNCTION "public"."instantiate_template"("p_candidate_id" "uuid", "p_template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("p_user" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = p_user AND role = 'admin')
$$;


ALTER FUNCTION "public"."is_admin"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_lead"("p_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'lead'
  );
$$;


ALTER FUNCTION "public"."is_group_lead"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_project_member"("pid" "uuid", "uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from public.project_members pm
    where pm.project_id = pid and pm.user_id = uid and coalesce(pm.status, 'active') = 'active'
  );
$$;


ALTER FUNCTION "public"."is_project_member"("pid" "uuid", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."launch_onboarding_journey"("p_candidate_id" "uuid", "p_template_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_journey_id UUID;
  v_candidate_record RECORD;
  v_template_record RECORD;
  v_task_template RECORD;
  v_task_id UUID;
  v_due_at TIMESTAMPTZ;
  v_user_id UUID;
  v_create_accounts_task_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if user profile exists, if not create it
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = v_user_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists AND v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, email, full_name)
    SELECT 
      v_user_id,
      COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), 'unknown@example.com'),
      COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), 'Unknown User')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Get candidate details
  SELECT * INTO v_candidate_record
  FROM candidates
  WHERE id = p_candidate_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found or access denied';
  END IF;
  
  -- Check if onboarding journey already exists for this candidate
  IF EXISTS (SELECT 1 FROM onboarding_journeys WHERE candidate_id = p_candidate_id) THEN
    RAISE EXCEPTION 'Onboarding journey already exists for this candidate';
  END IF;
  
  -- Get template details
  SELECT * INTO v_template_record
  FROM onboarding_templates
  WHERE id = p_template_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;
  
  -- Create onboarding journey
  INSERT INTO onboarding_journeys (
    candidate_id,
    template_id,
    template_version,
    doj,
    geo,
    location,
    created_by
  ) VALUES (
    p_candidate_id,
    p_template_id,
    v_template_record.version,
    v_candidate_record.date_of_joining,
    COALESCE(v_candidate_record.email, 'IN'), -- Default geo if not set
    'Bangalore', -- Default location
    v_user_id
  )
  RETURNING id INTO v_journey_id;
  
  -- Create tasks from templates
  FOR v_task_template IN
    SELECT *
    FROM onboarding_task_templates
    WHERE template_id = p_template_id
    ORDER BY order_index
  LOOP
    -- Calculate due date (default to DOJ - 3 days for most tasks)
    v_due_at := COALESCE(v_candidate_record.date_of_joining, CURRENT_DATE + INTERVAL '30 days') - INTERVAL '3 days';
    
    -- Adjust due date based on task type
    IF v_task_template.block = 'IT' THEN
      v_due_at := v_due_at - INTERVAL '7 days'; -- IT tasks earlier
    ELSIF v_task_template.block = 'Facilities' THEN
      v_due_at := v_due_at - INTERVAL '5 days'; -- Facilities tasks earlier
    END IF;
    
    INSERT INTO onboarding_tasks (
      journey_id,
      block,
      name,
      description,
      owner_group_id,
      due_at,
      sla_hours,
      depends_on,
      external_completion,
      required_attachments,
      meta,
      status
    ) VALUES (
      v_journey_id,
      v_task_template.block,
      v_task_template.name,
      v_task_template.description,
      v_task_template.owner_group_id,
      v_due_at,
      v_task_template.sla_hours,
      NULL, -- Will set dependencies after creating all tasks
      v_task_template.external_completion,
      v_task_template.required_attachments,
      jsonb_build_object(
        'template_task_id', v_task_template.id,
        'candidate_name', v_candidate_record.full_name,
        'candidate_email', v_candidate_record.email
      ),
      CASE 
        WHEN v_task_template.name = 'Create User Accounts' THEN 'pending'
        ELSE 'waiting_for_dependency'
      END
    )
    RETURNING id INTO v_task_id;
    
    -- Store the Create User Accounts task ID
    IF v_task_template.name = 'Create User Accounts' THEN
      v_create_accounts_task_id := v_task_id;
    END IF;
    
    -- Log SLA event
    INSERT INTO task_sla_events (task_id, event, meta)
    VALUES (v_task_id, 'created', jsonb_build_object('journey_id', v_journey_id));
  END LOOP;
  
  -- Set dependencies: All tasks except "Create User Accounts" depend on it
  IF v_create_accounts_task_id IS NOT NULL THEN
    UPDATE onboarding_tasks 
    SET depends_on = v_create_accounts_task_id
    WHERE journey_id = v_journey_id 
      AND id != v_create_accounts_task_id
      AND name != 'Create User Accounts';
      
    -- Also update background check to not depend on Create User Accounts (it can run in parallel)
    UPDATE onboarding_tasks 
    SET depends_on = NULL,
        status = 'pending'
    WHERE journey_id = v_journey_id 
      AND (name ILIKE '%background%check%' OR name ILIKE '%background%verification%');
  END IF;
  
  RETURN v_journey_id;
END;
$$;


ALTER FUNCTION "public"."launch_onboarding_journey"("p_candidate_id" "uuid", "p_template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_candidate_activity"("p_candidate_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO candidate_activities (
    candidate_id, actor_id, activity_type, activity_description, metadata
  ) VALUES (
    p_candidate_id, auth.uid(), p_activity_type, p_activity_description, p_metadata
  );
END;
$$;


ALTER FUNCTION "public"."log_candidate_activity"("p_candidate_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_requisition_activity"("p_requisition_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO requisition_activities (
    requisition_id, actor_id, activity_type, activity_description, metadata
  ) VALUES (
    p_requisition_id, auth.uid(), p_activity_type, p_activity_description, p_metadata
  );
END;
$$;


ALTER FUNCTION "public"."log_requisition_activity"("p_requisition_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_activities_as_seen"("p_candidate_id" "uuid", "p_activity_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- If no specific activity IDs provided, mark all activities for this candidate as seen
  IF p_activity_ids IS NULL THEN
    UPDATE public.candidate_activities 
    SET seen_by = CASE 
      WHEN seen_by @> ARRAY[v_user_id] THEN seen_by
      ELSE seen_by || v_user_id
    END
    WHERE candidate_id = p_candidate_id;
  ELSE
    -- Mark specific activities as seen
    UPDATE public.candidate_activities 
    SET seen_by = CASE 
      WHEN seen_by @> ARRAY[v_user_id] THEN seen_by
      ELSE seen_by || v_user_id
    END
    WHERE id = ANY(p_activity_ids) AND candidate_id = p_candidate_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."mark_activities_as_seen"("p_candidate_id" "uuid", "p_activity_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_candidate_stage"("p_candidate_id" "uuid", "p_from_stage" "text", "p_to_stage" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update candidate's current step
  UPDATE ats_candidates 
  SET 
    current_step = p_to_stage,
    updated_at = now()
  WHERE id = p_candidate_id;
  
  -- Log the workflow update
  INSERT INTO workflow_updates (
    candidate_id,
    actor_id,
    from_step,
    to_step,
    note,
    step_name,
    old_status,
    new_status,
    updated_by
  ) VALUES (
    p_candidate_id,
    auth.uid(),
    p_from_stage,
    p_to_stage,
    p_note,
    'stage_change',
    p_from_stage,
    p_to_stage,
    (SELECT email FROM profiles WHERE user_id = auth.uid())
  );
END;
$$;


ALTER FUNCTION "public"."move_candidate_stage"("p_candidate_id" "uuid", "p_from_stage" "text", "p_to_stage" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_template"("p_template_id" "uuid", "p_name" "text", "p_tasks" "jsonb", "p_dependencies" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_template_id uuid;
  v_task jsonb;
  v_task_id uuid;
  v_task_map jsonb := '{}';
  v_dep jsonb;
  v_visited uuid[];
  v_visiting uuid[];
BEGIN
  -- Update or create template
  IF p_template_id IS NOT NULL THEN
    UPDATE onboarding_templates 
    SET name = p_name, updated_at = now()
    WHERE id = p_template_id AND created_by = auth.uid()
    RETURNING id INTO v_template_id;
  ELSE
    INSERT INTO onboarding_templates (name, created_by)
    VALUES (p_name, auth.uid())
    RETURNING id INTO v_template_id;
  END IF;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template not found or access denied';
  END IF;

  -- Delete existing task templates and dependencies
  DELETE FROM onboarding_task_templates WHERE template_id = v_template_id;

  -- Insert tasks and build ID mapping
  FOR v_task IN SELECT jsonb_array_elements(p_tasks)
  LOOP
    INSERT INTO onboarding_task_templates (
      template_id, block, name, description, owner_group_id, sla_hours, 
      external_completion, required_attachments, order_index
    ) VALUES (
      v_template_id,
      v_task->>'block',
      v_task->>'name',
      v_task->>'description', 
      (v_task->>'owner_group_id')::uuid,
      (v_task->>'sla_hours')::integer,
      (v_task->>'external_completion')::boolean,
      v_task->'required_attachments',
      (v_task->>'order_index')::integer
    ) RETURNING id INTO v_task_id;
    
    -- Store mapping from old ID to new ID
    v_task_map := v_task_map || jsonb_build_object(v_task->>'temp_id', v_task_id);
  END LOOP;

  -- TODO: Add cycle detection for dependencies here
  -- For now, just skip dependency creation to avoid cycles
  
  RETURN v_template_id;
END;
$$;


ALTER FUNCTION "public"."save_template"("p_template_id" "uuid", "p_name" "text", "p_tasks" "jsonb", "p_dependencies" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_default_proficiencies"("p_candidate_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.candidate_proficiencies (candidate_id, name, created_by)
  VALUES 
    (p_candidate_id, 'Communication', auth.uid()),
    (p_candidate_id, 'Technical Ability', auth.uid())
  ON CONFLICT (candidate_id, name) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."seed_default_proficiencies"("p_candidate_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ats_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ats_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_feedback_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_feedback_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_requisition_comments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_requisition_comments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task_status"("p_task_id" "uuid", "p_status" "text", "p_comment" "text" DEFAULT NULL::"text", "p_assignee" "uuid" DEFAULT NULL::"uuid", "p_candidate_email" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_task_record RECORD;
  v_old_status TEXT;
  v_old_assignee UUID;
  v_current_user UUID;
  v_journey_id UUID;
  v_candidate_id UUID;
BEGIN
  v_current_user := auth.uid();
  
  -- Get current task details
  SELECT * INTO v_task_record
  FROM onboarding_tasks
  WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Check if user has permission to update this task (admin bypass added)
  IF NOT (
    is_admin(v_current_user) OR
    v_task_record.assignee = v_current_user OR
    EXISTS (
      SELECT 1 FROM onboarding_journeys oj
      JOIN candidates c ON oj.candidate_id = c.id
      WHERE oj.id = v_task_record.journey_id AND c.user_id = v_current_user
    ) OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = v_task_record.owner_group_id AND gm.user_id = v_current_user
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  v_old_status := v_task_record.status;
  v_old_assignee := v_task_record.assignee;
  v_journey_id := v_task_record.journey_id;
  
  -- Get candidate_id for the journey
  SELECT candidate_id INTO v_candidate_id
  FROM onboarding_journeys
  WHERE id = v_journey_id;
  
  -- Check dependencies if moving to in_progress
  IF p_status = 'in_progress' AND v_task_record.depends_on IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM onboarding_tasks
      WHERE id = v_task_record.depends_on AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Cannot start task: dependency not completed';
    END IF;
  END IF;
  
  -- Update task
  UPDATE onboarding_tasks
  SET
    status = p_status,
    assignee = COALESCE(p_assignee, assignee),
    candidate_email = CASE 
      WHEN p_candidate_email IS NOT NULL THEN p_candidate_email 
      ELSE candidate_email 
    END,
    started_at = CASE WHEN p_status = 'in_progress' AND started_at IS NULL THEN now() ELSE started_at END,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = p_task_id;
  
  -- If this is "Create User Accounts" task being completed, update all other tasks in the journey with the candidate email
  IF p_status = 'completed' AND v_task_record.name = 'Create User Accounts' AND p_candidate_email IS NOT NULL THEN
    UPDATE onboarding_tasks
    SET candidate_email = p_candidate_email
    WHERE journey_id = v_journey_id AND id != p_task_id;
  END IF;
  
  -- If this task is being completed and other tasks depend on it, update their status
  IF p_status = 'completed' THEN
    UPDATE onboarding_tasks
    SET status = 'pending'
    WHERE journey_id = v_journey_id 
      AND depends_on = p_task_id 
      AND status = 'waiting_for_dependency';
  END IF;
  
  -- Log SLA event
  INSERT INTO task_sla_events (task_id, event, meta)
  VALUES (
    p_task_id,
    CASE
      WHEN p_status = 'in_progress' THEN 'started'
      WHEN p_status = 'completed' THEN 'completed'
      WHEN p_status = 'skipped' THEN 'skipped'
      WHEN p_assignee IS NOT NULL AND p_assignee != v_task_record.assignee THEN 'reassigned'
      ELSE 'updated'
    END,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_status,
      'comment', p_comment,
      'updated_by', v_current_user,
      'assignee', COALESCE(p_assignee, v_task_record.assignee),
      'candidate_email', p_candidate_email
    )
  );
  
  -- Log to workflow_updates for audit
  INSERT INTO workflow_updates (
    candidate_id,
    step_name,
    old_status,
    new_status,
    comments,
    updated_by
  )
  SELECT
    v_candidate_id,
    'onboarding_task_' || v_task_record.name,
    v_old_status,
    p_status,
    p_comment,
    (SELECT email FROM profiles WHERE user_id = v_current_user)
  WHERE v_candidate_id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."update_task_status"("p_task_id" "uuid", "p_status" "text", "p_comment" "text", "p_assignee" "uuid", "p_candidate_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_test_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_test_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workflow_step"("p_candidate_id" "uuid", "p_step_name" "text", "p_status" "text", "p_comments" "text" DEFAULT NULL::"text", "p_completed_by" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  old_status text;
BEGIN
  -- Get current status
  CASE p_step_name
    WHEN 'background_check' THEN
      SELECT background_check_status INTO old_status FROM candidates WHERE id = p_candidate_id;
      
      UPDATE candidates SET
        background_check_status = p_status,
        background_check_comments = COALESCE(p_comments, background_check_comments),
        background_check_completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE background_check_completed_at END,
        background_check_completed_by = CASE WHEN p_status = 'completed' THEN COALESCE(p_completed_by, background_check_completed_by) ELSE background_check_completed_by END,
        background_check_initiated_at = CASE WHEN p_status = 'in_progress' AND background_check_initiated_at IS NULL THEN now() ELSE background_check_initiated_at END,
        updated_at = now()
      WHERE id = p_candidate_id;
      
    WHEN 'pre_joining' THEN
      SELECT pre_joining_status INTO old_status FROM candidates WHERE id = p_candidate_id;
      
      UPDATE candidates SET
        pre_joining_status = p_status,
        pre_joining_comments = COALESCE(p_comments, pre_joining_comments),
        pre_joining_completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE pre_joining_completed_at END,
        pre_joining_completed_by = CASE WHEN p_status = 'completed' THEN COALESCE(p_completed_by, pre_joining_completed_by) ELSE pre_joining_completed_by END,
        pre_joining_introduced_at = CASE WHEN p_status = 'in_progress' AND pre_joining_introduced_at IS NULL THEN now() ELSE pre_joining_introduced_at END,
        updated_at = now()
      WHERE id = p_candidate_id;
      
    WHEN 'buddy_assignment' THEN
      SELECT buddy_assignment_status INTO old_status FROM candidates WHERE id = p_candidate_id;
      
      UPDATE candidates SET
        buddy_assignment_status = p_status,
        buddy_assignment_comments = COALESCE(p_comments, buddy_assignment_comments),
        buddy_assignment_completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE buddy_assignment_completed_at END,
        buddy_assignment_completed_by = CASE WHEN p_status = 'completed' THEN COALESCE(p_completed_by, buddy_assignment_completed_by) ELSE buddy_assignment_completed_by END,
        buddy_assigned_at = CASE WHEN p_status = 'in_progress' AND buddy_assigned_at IS NULL THEN now() ELSE buddy_assigned_at END,
        updated_at = now()
      WHERE id = p_candidate_id;
      
    WHEN 'send_goodies' THEN
      SELECT goodies_status INTO old_status FROM candidates WHERE id = p_candidate_id;
      
      UPDATE candidates SET
        goodies_status = p_status,
        goodies_comments = COALESCE(p_comments, goodies_comments),
        goodies_completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE goodies_completed_at END,
        goodies_completed_by = CASE WHEN p_status = 'completed' THEN COALESCE(p_completed_by, goodies_completed_by) ELSE goodies_completed_by END,
        send_goodies_at = CASE WHEN p_status = 'in_progress' AND send_goodies_at IS NULL THEN now() ELSE send_goodies_at END,
        updated_at = now()
      WHERE id = p_candidate_id;
      
    WHEN 'send_laptop' THEN
      SELECT laptop_status INTO old_status FROM candidates WHERE id = p_candidate_id;
      
      UPDATE candidates SET
        laptop_status = p_status,
        laptop_comments = COALESCE(p_comments, laptop_comments),
        laptop_completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE laptop_completed_at END,
        laptop_completed_by = CASE WHEN p_status = 'completed' THEN COALESCE(p_completed_by, laptop_completed_by) ELSE laptop_completed_by END,
        send_laptop_at = CASE WHEN p_status = 'in_progress' AND send_laptop_at IS NULL THEN now() ELSE send_laptop_at END,
        updated_at = now()
      WHERE id = p_candidate_id;
  END CASE;
  
  -- Log the change
  INSERT INTO workflow_updates (candidate_id, step_name, old_status, new_status, comments, updated_by)
  VALUES (p_candidate_id, p_step_name, old_status, p_status, p_comments, p_completed_by);
END;
$$;


ALTER FUNCTION "public"."update_workflow_step"("p_candidate_id" "uuid", "p_step_name" "text", "p_status" "text", "p_comments" "text", "p_completed_by" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_completion_token"("token_to_check" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.external_completions 
    WHERE completion_token = token_to_check
    AND expires_at > now()
    AND completed = false
  );
$$;


ALTER FUNCTION "public"."validate_completion_token"("token_to_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_test_token"("token_to_check" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.test_assignments 
    WHERE invite_token = token_to_check
    AND expires_at > now()
    AND status IN ('assigned', 'started')
  );
$$;


ALTER FUNCTION "public"."validate_test_token"("token_to_check" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."access_grants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prompt_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "system_prompt" "text" NOT NULL,
    "user_prompt" "text" DEFAULT 'Please generate a comprehensive technical assessment for this candidate.'::"text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "severity" "text" NOT NULL,
    "route" "text",
    "operation" "text",
    "message" "text" NOT NULL,
    "payload_size" integer,
    "duration_ms" integer,
    "request_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "app_logs_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warn'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."app_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid",
    "requisition_id" "uuid",
    "stage" "text" DEFAULT 'sourced'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "applications_stage_check" CHECK (("stage" = ANY (ARRAY['sourced'::"text", 'screen'::"text", 'manager'::"text", 'panel'::"text", 'offer'::"text", 'hired'::"text", 'rejected'::"text"]))),
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'on_hold'::"text", 'rejected'::"text", 'withdrawn'::"text", 'hired'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "approver_group_id" "uuid",
    "approver_user_id" "uuid",
    "status" "text" DEFAULT 'requested'::"text",
    "comments" "text",
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "approvals_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_tag" "text" NOT NULL,
    "model" "text" NOT NULL,
    "category" "text",
    "location" "text",
    "assigned_to" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "procurement_date" "date",
    "notes" "text",
    "vendor" "text",
    "warranty_start_date" "date",
    "warranty_end_date" "date",
    "attachments" json
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ats_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "storage_path" "text" NOT NULL,
    "file_size" integer,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ats_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ats_audit" (
    "id" bigint NOT NULL,
    "actor" "uuid",
    "entity" "text" NOT NULL,
    "entity_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ats_audit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ats_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ats_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ats_audit_id_seq" OWNED BY "public"."ats_audit"."id";



CREATE TABLE IF NOT EXISTS "public"."ats_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "location" "text",
    "source" "text",
    "current_company" "text",
    "current_title" "text",
    "resume_url" "text",
    "linkedin_profile" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resume_score" numeric(5,2),
    "resume_analysis" "jsonb",
    "last_scored_at" timestamp with time zone,
    "ai_summary" "text",
    "ai_summary_generated_at" timestamp with time zone,
    "current_step" "text" DEFAULT 'sourced'::"text"
);


ALTER TABLE "public"."ats_candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ats_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid",
    "author_id" "uuid",
    "body" "text" NOT NULL,
    "visible_to" "public"."ats_role"[] DEFAULT ARRAY['ADMIN'::"public"."ats_role", 'TA_ADMIN'::"public"."ats_role", 'HIRING_MANAGER'::"public"."ats_role"] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ats_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ats_interviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "requisition_id" "uuid" NOT NULL,
    "interviewer_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "scheduled_start" timestamp with time zone NOT NULL,
    "scheduled_end" timestamp with time zone NOT NULL,
    "meeting_link" "text",
    "teams_meeting_id" "text",
    "interview_type" "text" DEFAULT 'technical'::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ats_interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "table_name" "text",
    "record_id" "uuid",
    "action" "text",
    "old_value" "text",
    "new_value" "text",
    "created_by" "uuid",
    "record_updated_at" timestamp with time zone
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


ALTER TABLE "public"."audit_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."candidate_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "activity_type" "text" NOT NULL,
    "activity_description" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "seen_by" "uuid"[] DEFAULT '{}'::"uuid"[]
);


ALTER TABLE "public"."candidate_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidate_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "comment" "text" NOT NULL,
    "visible_to_roles" "text"[] DEFAULT ARRAY['ADMIN'::"text", 'TA_ADMIN'::"text"] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."candidate_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidate_proficiencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."candidate_proficiencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "address" "text" NOT NULL,
    "email" "text" NOT NULL,
    "workflow_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "current_step" integer DEFAULT 1 NOT NULL,
    "background_check_initiated_at" timestamp with time zone,
    "pre_joining_introduced_at" timestamp with time zone,
    "buddy_assigned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date_of_joining" "date",
    "type_of_joining" "text",
    "send_goodies_at" timestamp with time zone,
    "send_laptop_at" timestamp with time zone,
    "background_check_status" "text" DEFAULT 'pending'::"text",
    "background_check_comments" "text",
    "background_check_completed_at" timestamp with time zone,
    "background_check_completed_by" "text",
    "pre_joining_status" "text" DEFAULT 'pending'::"text",
    "pre_joining_comments" "text",
    "pre_joining_completed_at" timestamp with time zone,
    "pre_joining_completed_by" "text",
    "buddy_assignment_status" "text" DEFAULT 'pending'::"text",
    "buddy_assignment_comments" "text",
    "buddy_assignment_completed_at" timestamp with time zone,
    "buddy_assignment_completed_by" "text",
    "goodies_status" "text" DEFAULT 'pending'::"text",
    "goodies_comments" "text",
    "goodies_completed_at" timestamp with time zone,
    "goodies_completed_by" "text",
    "laptop_status" "text" DEFAULT 'pending'::"text",
    "laptop_comments" "text",
    "laptop_completed_at" timestamp with time zone,
    "laptop_completed_by" "text",
    CONSTRAINT "candidates_type_of_joining_check" CHECK (("type_of_joining" = ANY (ARRAY['In Person'::"text", 'Remote'::"text"])))
);


ALTER TABLE "public"."candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compensation_private" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid",
    "ctc_expected" numeric,
    "ctc_offered" numeric,
    "currency" "text" DEFAULT 'USD'::"text",
    "rate_card" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."compensation_private" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."docs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content_md" "text" NOT NULL,
    "tags" "text"[],
    "tsv" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("content_md", ''::"text")))) STORED
);


ALTER TABLE "public"."docs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_certifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "authority" "text",
    "credential_id" "text",
    "issued_on" "date",
    "expires_on" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_certifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_rates" (
    "user_id" "uuid" NOT NULL,
    "base_rate_usd" numeric NOT NULL,
    "effective_from" "date" DEFAULT "now"() NOT NULL,
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_skills" (
    "user_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "level" integer NOT NULL,
    "years" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_skills_level_check" CHECK ((("level" >= 0) AND ("level" <= 9)))
);


ALTER TABLE "public"."employee_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "step_name" "text" NOT NULL,
    "completion_token" "text" NOT NULL,
    "email_sent_to" "text" NOT NULL,
    "completed" boolean DEFAULT false,
    "comments" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL
);


ALTER TABLE "public"."external_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "overall_percent" integer,
    "recommendation" "text",
    "notes" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_recommendation_check" CHECK (("recommendation" = ANY (ARRAY['no_hire'::"text", 'maybe'::"text", 'hire'::"text", 'strong_hire'::"text", 'exceptional'::"text"]))),
    CONSTRAINT "feedback_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text"])))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_id" "uuid" NOT NULL,
    "proficiency_name" "text" NOT NULL,
    "stars" numeric(2,1) NOT NULL,
    "max_stars" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_scores_stars_check" CHECK ((("stars" >= 0.5) AND ("stars" <= 5.0)))
);


ALTER TABLE "public"."feedback_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fx_rates" (
    "code" "text" NOT NULL,
    "rate_to_usd" numeric NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fx_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "group_members_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'lead'::"text"])))
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hiring_surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_title" "text" NOT NULL,
    "hiring_manager_name" "text" NOT NULL,
    "department_function" "text" NOT NULL,
    "location" "text" NOT NULL,
    "mandatory_skills" "text" NOT NULL,
    "nice_to_have_skills" "text",
    "experience_range_min" integer NOT NULL,
    "experience_range_max" integer NOT NULL,
    "salary_range_min" numeric,
    "salary_range_max" numeric,
    "salary_currency" "text" NOT NULL,
    "hire_type" "text" NOT NULL,
    "preferred_start_date" "date",
    "number_of_positions" integer DEFAULT 1 NOT NULL,
    "budget_approved" boolean NOT NULL,
    "key_perks_benefits" "text",
    "preferred_interview_panelists" "text",
    "vendors_to_include" "text",
    "client_facing" boolean NOT NULL,
    "client_expectations" "text",
    "comments_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client" "text",
    "hiring_manager_email" "text",
    CONSTRAINT "hiring_surveys_hire_type_check" CHECK (("hire_type" = ANY (ARRAY['Internal'::"text", 'External'::"text", 'Staff Aug'::"text"]))),
    CONSTRAINT "hiring_surveys_location_check" CHECK (("location" = ANY (ARRAY['Onsite'::"text", 'Remote'::"text", 'Hybrid'::"text"]))),
    CONSTRAINT "hiring_surveys_salary_currency_check" CHECK (("salary_currency" = ANY (ARRAY['INR'::"text", 'USD'::"text"])))
);


ALTER TABLE "public"."hiring_surveys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."holidays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region" "text" NOT NULL,
    "holiday_date" "date" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."holidays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interview_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_id" "uuid",
    "interviewer_id" "uuid",
    "candidate_id" "uuid",
    "role" "text" DEFAULT 'primary'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "interview_assignments_role_check" CHECK (("role" = ANY (ARRAY['primary'::"text", 'observer'::"text"])))
);


ALTER TABLE "public"."interview_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interview_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interview_id" "uuid",
    "interviewer_id" "uuid",
    "ratings" "jsonb",
    "summary" "text",
    "recommendation" "text",
    "is_final" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "interview_feedback_recommendation_check" CHECK (("recommendation" = ANY (ARRAY['strong_yes'::"text", 'yes'::"text", 'leaning_yes'::"text", 'no'::"text", 'strong_no'::"text"])))
);


ALTER TABLE "public"."interview_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid",
    "type" "text",
    "scheduled_start" timestamp with time zone,
    "scheduled_end" timestamp with time zone,
    "meeting_link" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "interviews_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text", 'cancelled'::"text", 'rescheduled'::"text"]))),
    CONSTRAINT "interviews_type_check" CHECK (("type" = ANY (ARRAY['screen'::"text", 'technical'::"text", 'behavioral'::"text", 'panel'::"text", 'final'::"text"])))
);


ALTER TABLE "public"."interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leaves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "type" "text" NOT NULL,
    "approved" boolean DEFAULT false
);


ALTER TABLE "public"."leaves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "event_type" "text" NOT NULL,
    "recipients" "text"[] NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "last_sent" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_journeys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "template_version" integer NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text",
    "doj" "date",
    "geo" "text",
    "location" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "onboarding_journeys_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'in_progress'::"text", 'completed'::"text", 'paused'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."onboarding_journeys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_task_dependencies" (
    "task_id" "uuid" NOT NULL,
    "depends_on_task_id" "uuid" NOT NULL,
    CONSTRAINT "onboarding_task_dependencies_check" CHECK (("task_id" <> "depends_on_task_id"))
);


ALTER TABLE "public"."onboarding_task_dependencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_task_template_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_template_id" "uuid" NOT NULL,
    "depends_on_task_template_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."onboarding_task_template_dependencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "block" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "owner_group_id" "uuid",
    "sla_hours" integer DEFAULT 72,
    "depends_on" "uuid",
    "dynamic_rules" "jsonb",
    "external_completion" boolean DEFAULT false,
    "required_attachments" "jsonb",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "onboarding_task_templates_block_check" CHECK (("block" = ANY (ARRAY['HR'::"text", 'IT'::"text", 'Facilities'::"text", 'Finance'::"text", 'Vendor'::"text"])))
);


ALTER TABLE "public"."onboarding_task_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "journey_id" "uuid" NOT NULL,
    "block" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "owner_group_id" "uuid",
    "assignee" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "due_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "sla_hours" integer DEFAULT 72,
    "depends_on" "uuid",
    "external_completion" boolean DEFAULT false,
    "required_attachments" "jsonb",
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "candidate_email" "text",
    "official_email" "text",
    CONSTRAINT "onboarding_tasks_block_check" CHECK (("block" = ANY (ARRAY['HR'::"text", 'IT'::"text", 'Facilities'::"text", 'Finance'::"text", 'Vendor'::"text"]))),
    CONSTRAINT "onboarding_tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'waiting_for_dependency'::"text", 'completed'::"text", 'skipped'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."onboarding_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true,
    "rules" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."onboarding_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."owner_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."owner_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "pending_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."pending_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proctor_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "payload_json" "jsonb" NOT NULL,
    "ts" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."proctor_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proctor_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_path" "text" NOT NULL,
    "hash" "text",
    "flagged_bool" boolean DEFAULT false
);


ALTER TABLE "public"."proctor_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "public"."user_role" DEFAULT 'staff'::"public"."user_role",
    "photo_path" "text",
    "resume_path" "text",
    "location" "text" DEFAULT 'US'::"text",
    "is_active" boolean DEFAULT true,
    "cost_annual" numeric,
    "currency_code" "text" DEFAULT 'USD'::"text",
    "margin_pct" numeric DEFAULT 30,
    "rate_hourly" numeric GENERATED ALWAYS AS (
CASE
    WHEN (("cost_annual" IS NOT NULL) AND ("cost_annual" > (0)::numeric)) THEN (("cost_annual" * ((1)::numeric + (COALESCE("margin_pct", (30)::numeric) / (100)::numeric))) / ((160 * 12))::numeric)
    ELSE NULL::numeric
END) STORED,
    "employee_code" "text",
    "job_title" "text",
    "department" "text",
    "manager_id" "uuid",
    "joined_on" "date",
    "blocked" boolean DEFAULT false,
    "tsv" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((((((COALESCE("full_name", ''::"text") || ' '::"text") || COALESCE("department", ''::"text")) || ' '::"text") || COALESCE("location", ''::"text")) || ' '::"text") || COALESCE("email", ''::"text")))) STORED,
    "ats_role" "public"."ats_role",
    CONSTRAINT "profiles_cost_annual_check" CHECK (("cost_annual" >= (0)::numeric)),
    CONSTRAINT "profiles_currency_code_check" CHECK (("currency_code" = ANY (ARRAY['USD'::"text", 'INR'::"text", 'VND'::"text", 'SGD'::"text"]))),
    CONSTRAINT "profiles_margin_pct_check" CHECK ((("margin_pct" >= (0)::numeric) AND ("margin_pct" <= (100)::numeric)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bill_rate_usd" numeric NOT NULL,
    "role" "text",
    "member_discount_pct" numeric DEFAULT 0,
    "effective_from" "date" DEFAULT CURRENT_DATE,
    "effective_to" "date",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "project_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "start_date" "date",
    "end_date" "date",
    "project_manager" "uuid",
    "sales_manager" "uuid",
    "discount_pct" numeric DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discount_reason" "text",
    "client" "text"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requisition_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "activity_type" "text" NOT NULL,
    "activity_description" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."requisition_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requisition_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "visible_to_roles" "text"[] DEFAULT ARRAY['ADMIN'::"text", 'TA_ADMIN'::"text"] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."requisition_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requisitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "dept" "text",
    "location" "text",
    "employment_type" "text",
    "description" "text",
    "min_experience" integer DEFAULT 0,
    "max_experience" integer,
    "skills" "text"[],
    "status" "text" DEFAULT 'draft'::"text",
    "hiring_manager_id" "uuid",
    "created_by" "uuid",
    "linkedin_job_id" "text",
    "linkedin_posted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "requisitions_employment_type_check" CHECK (("employment_type" = ANY (ARRAY['full_time'::"text", 'part_time'::"text", 'contract'::"text", 'internship'::"text"]))),
    CONSTRAINT "requisitions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'open'::"text", 'on_hold'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."requisitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skills_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."skills_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text",
    "kind" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "depends_on_task_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_dependencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_sla_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "event" "text" NOT NULL,
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_sla_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "application_id" "uuid",
    "template_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'assigned'::"text" NOT NULL,
    "invite_token" "text" NOT NULL,
    "invite_sent_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "response_json" "jsonb" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_scores" (
    "session_id" "uuid" NOT NULL,
    "overall_pct" numeric NOT NULL,
    "section_scores_json" "jsonb" NOT NULL,
    "auto_score_breakdown_json" "jsonb",
    "scored_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "webcam_uptime_pct" numeric DEFAULT 0,
    "tab_switches" integer DEFAULT 0,
    "flags_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "config_json" "jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timesheets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "work_date" "date" NOT NULL,
    "hours" numeric NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "week_start" "date",
    "billable" boolean DEFAULT true NOT NULL,
    CONSTRAINT "timesheets_hours_check" CHECK ((("hours" >= (0)::numeric) AND ("hours" <= (24)::numeric)))
);


ALTER TABLE "public"."timesheets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "step_name" "text" NOT NULL,
    "old_status" "text",
    "new_status" "text",
    "comments" "text",
    "updated_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actor_id" "uuid",
    "from_step" "text",
    "to_step" "text",
    "note" "text"
);


ALTER TABLE "public"."workflow_updates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ats_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ats_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_resource_type_resource_id_user_id_key" UNIQUE ("resource_type", "resource_id", "user_id");



ALTER TABLE ONLY "public"."ai_prompts"
    ADD CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_logs"
    ADD CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_candidate_id_requisition_id_key" UNIQUE ("candidate_id", "requisition_id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_asset_tag_key" UNIQUE ("asset_tag");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ats_attachments"
    ADD CONSTRAINT "ats_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ats_audit"
    ADD CONSTRAINT "ats_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ats_candidates"
    ADD CONSTRAINT "ats_candidates_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."ats_candidates"
    ADD CONSTRAINT "ats_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ats_comments"
    ADD CONSTRAINT "ats_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ats_interviews"
    ADD CONSTRAINT "ats_interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_activities"
    ADD CONSTRAINT "candidate_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_comments"
    ADD CONSTRAINT "candidate_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_proficiencies"
    ADD CONSTRAINT "candidate_proficiencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compensation_private"
    ADD CONSTRAINT "compensation_private_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."config"
    ADD CONSTRAINT "config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."config"
    ADD CONSTRAINT "config_user_id_key_key" UNIQUE ("user_id", "key");



ALTER TABLE ONLY "public"."docs"
    ADD CONSTRAINT "docs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."docs"
    ADD CONSTRAINT "docs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."employee_certifications"
    ADD CONSTRAINT "employee_certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_rates"
    ADD CONSTRAINT "employee_rates_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."employee_skills"
    ADD CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("user_id", "skill_id");



ALTER TABLE ONLY "public"."external_completions"
    ADD CONSTRAINT "external_completions_completion_token_key" UNIQUE ("completion_token");



ALTER TABLE ONLY "public"."external_completions"
    ADD CONSTRAINT "external_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_scores"
    ADD CONSTRAINT "feedback_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fx_rates"
    ADD CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hiring_surveys"
    ADD CONSTRAINT "hiring_surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_assignments"
    ADD CONSTRAINT "interview_assignments_interview_id_interviewer_id_key" UNIQUE ("interview_id", "interviewer_id");



ALTER TABLE ONLY "public"."interview_assignments"
    ADD CONSTRAINT "interview_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_feedback"
    ADD CONSTRAINT "interview_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interviews"
    ADD CONSTRAINT "interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leaves"
    ADD CONSTRAINT "leaves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_journeys"
    ADD CONSTRAINT "onboarding_journeys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_task_dependencies"
    ADD CONSTRAINT "onboarding_task_dependencies_pkey" PRIMARY KEY ("task_id", "depends_on_task_id");



ALTER TABLE ONLY "public"."onboarding_task_template_dependencies"
    ADD CONSTRAINT "onboarding_task_template_depe_task_template_id_depends_on_t_key" UNIQUE ("task_template_id", "depends_on_task_template_id");



ALTER TABLE ONLY "public"."onboarding_task_template_dependencies"
    ADD CONSTRAINT "onboarding_task_template_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_task_templates"
    ADD CONSTRAINT "onboarding_task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_tasks"
    ADD CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_templates"
    ADD CONSTRAINT "onboarding_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."owner_groups"
    ADD CONSTRAINT "owner_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."owner_groups"
    ADD CONSTRAINT "owner_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_invites"
    ADD CONSTRAINT "pending_invites_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."pending_invites"
    ADD CONSTRAINT "pending_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proctor_events"
    ADD CONSTRAINT "proctor_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proctor_images"
    ADD CONSTRAINT "proctor_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_employee_code_key" UNIQUE ("employee_code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id", "user_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requisition_activities"
    ADD CONSTRAINT "requisition_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requisition_comments"
    ADD CONSTRAINT "requisition_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requisitions"
    ADD CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skills_catalog"
    ADD CONSTRAINT "skills_catalog_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."skills_catalog"
    ADD CONSTRAINT "skills_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_sla_events"
    ADD CONSTRAINT "task_sla_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_assignments"
    ADD CONSTRAINT "test_assignments_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."test_assignments"
    ADD CONSTRAINT "test_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_responses"
    ADD CONSTRAINT "test_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_scores"
    ADD CONSTRAINT "test_scores_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."test_sessions"
    ADD CONSTRAINT "test_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_templates"
    ADD CONSTRAINT "test_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_journeys"
    ADD CONSTRAINT "unique_candidate_journey" UNIQUE ("candidate_id");



ALTER TABLE ONLY "public"."candidate_proficiencies"
    ADD CONSTRAINT "unique_candidate_proficiency" UNIQUE ("candidate_id", "name");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "unique_candidate_requisition" UNIQUE ("candidate_id", "requisition_id");



ALTER TABLE ONLY "public"."feedback_scores"
    ADD CONSTRAINT "unique_feedback_proficiency" UNIQUE ("feedback_id", "proficiency_name");



ALTER TABLE ONLY "public"."workflow_updates"
    ADD CONSTRAINT "workflow_updates_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_access_grants_resource" ON "public"."access_grants" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_access_grants_user" ON "public"."access_grants" USING "btree" ("user_id");



CREATE INDEX "idx_app_logs_created_at" ON "public"."app_logs" USING "btree" ("created_at");



CREATE INDEX "idx_app_logs_severity" ON "public"."app_logs" USING "btree" ("severity");



CREATE INDEX "idx_app_logs_user_id" ON "public"."app_logs" USING "btree" ("user_id");



CREATE INDEX "idx_applications_candidate" ON "public"."applications" USING "btree" ("candidate_id");



CREATE INDEX "idx_applications_requisition" ON "public"."applications" USING "btree" ("requisition_id");



CREATE INDEX "idx_audit_entity" ON "public"."ats_audit" USING "btree" ("entity", "entity_id");



CREATE INDEX "idx_candidate_activities_candidate_id" ON "public"."candidate_activities" USING "btree" ("candidate_id");



CREATE INDEX "idx_candidate_activities_created_at" ON "public"."candidate_activities" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_candidate_activities_seen_by" ON "public"."candidate_activities" USING "gin" ("seen_by");



CREATE INDEX "idx_candidate_comments_candidate_created_at" ON "public"."candidate_comments" USING "btree" ("candidate_id", "created_at" DESC);



CREATE INDEX "idx_candidate_comments_candidate_id" ON "public"."candidate_comments" USING "btree" ("candidate_id");



CREATE INDEX "idx_candidate_comments_created_at" ON "public"."candidate_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_candidate_comments_user_id" ON "public"."candidate_comments" USING "btree" ("user_id");



CREATE INDEX "idx_candidates_survey_id" ON "public"."candidates" USING "btree" ("survey_id");



CREATE INDEX "idx_candidates_user_id" ON "public"."candidates" USING "btree" ("user_id");



CREATE INDEX "idx_candidates_workflow_status" ON "public"."candidates" USING "btree" ("workflow_status");



CREATE INDEX "idx_comments_application" ON "public"."ats_comments" USING "btree" ("application_id");



CREATE INDEX "idx_config_user_id_key" ON "public"."config" USING "btree" ("user_id", "key");



CREATE INDEX "idx_docs_tags" ON "public"."docs" USING "gin" ("tags");



CREATE INDEX "idx_docs_tsv" ON "public"."docs" USING "gin" ("tsv");



CREATE INDEX "idx_interview_assignments_candidate" ON "public"."interview_assignments" USING "btree" ("candidate_id");



CREATE INDEX "idx_interview_assignments_interviewer" ON "public"."interview_assignments" USING "btree" ("interviewer_id");



CREATE INDEX "idx_interviews_application" ON "public"."interviews" USING "btree" ("application_id");



CREATE INDEX "idx_proctor_events_session_id" ON "public"."proctor_events" USING "btree" ("session_id");



CREATE INDEX "idx_proctor_events_ts" ON "public"."proctor_events" USING "btree" ("ts");



CREATE INDEX "idx_proctor_images_session_id" ON "public"."proctor_images" USING "btree" ("session_id");



CREATE INDEX "idx_proctor_images_ts" ON "public"."proctor_images" USING "btree" ("ts");



CREATE INDEX "idx_requisition_activities_created_at" ON "public"."requisition_activities" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_requisition_activities_requisition_id" ON "public"."requisition_activities" USING "btree" ("requisition_id");



CREATE INDEX "idx_requisitions_hiring_manager" ON "public"."requisitions" USING "btree" ("hiring_manager_id");



CREATE INDEX "idx_task_template_dependencies_depends_on_id" ON "public"."onboarding_task_template_dependencies" USING "btree" ("depends_on_task_template_id");



CREATE INDEX "idx_task_template_dependencies_task_id" ON "public"."onboarding_task_template_dependencies" USING "btree" ("task_template_id");



CREATE INDEX "idx_test_assignments_candidate_created" ON "public"."test_assignments" USING "btree" ("candidate_id", "created_at" DESC);



CREATE INDEX "idx_test_assignments_candidate_id" ON "public"."test_assignments" USING "btree" ("candidate_id");



CREATE INDEX "idx_test_assignments_status" ON "public"."test_assignments" USING "btree" ("status");



CREATE INDEX "idx_test_assignments_template_id" ON "public"."test_assignments" USING "btree" ("template_id");



CREATE INDEX "idx_test_responses_session_id" ON "public"."test_responses" USING "btree" ("session_id");



CREATE INDEX "idx_test_sessions_assignment" ON "public"."test_sessions" USING "btree" ("assignment_id");



CREATE INDEX "idx_test_sessions_assignment_id" ON "public"."test_sessions" USING "btree" ("assignment_id");



CREATE INDEX "idx_workflow_updates_candidate_created" ON "public"."workflow_updates" USING "btree" ("candidate_id", "created_at" DESC);



CREATE INDEX "profiles_tsv_idx" ON "public"."profiles" USING "gin" ("tsv");



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."assets" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "update_ai_prompts_updated_at" BEFORE UPDATE ON "public"."ai_prompts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_applications_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_ats_updated_at"();



CREATE OR REPLACE TRIGGER "update_ats_interviews_updated_at" BEFORE UPDATE ON "public"."ats_interviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_ats_updated_at"();



CREATE OR REPLACE TRIGGER "update_candidate_comments_updated_at" BEFORE UPDATE ON "public"."candidate_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_candidates_updated_at" BEFORE UPDATE ON "public"."ats_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."update_ats_updated_at"();



CREATE OR REPLACE TRIGGER "update_candidates_updated_at" BEFORE UPDATE ON "public"."candidates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_compensation_updated_at" BEFORE UPDATE ON "public"."compensation_private" FOR EACH ROW EXECUTE FUNCTION "public"."update_ats_updated_at"();



CREATE OR REPLACE TRIGGER "update_config_updated_at" BEFORE UPDATE ON "public"."config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feedback_updated_at" BEFORE UPDATE ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_feedback_updated_at"();



CREATE OR REPLACE TRIGGER "update_feedback_updated_at" BEFORE UPDATE ON "public"."interview_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_ats_updated_at"();



CREATE OR REPLACE TRIGGER "update_hiring_surveys_updated_at" BEFORE UPDATE ON "public"."hiring_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interviews_updated_at" BEFORE UPDATE ON "public"."interviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_ats_updated_at"();



CREATE OR REPLACE TRIGGER "update_onboarding_journeys_updated_at" BEFORE UPDATE ON "public"."onboarding_journeys" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_onboarding_task_templates_updated_at" BEFORE UPDATE ON "public"."onboarding_task_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_onboarding_tasks_updated_at" BEFORE UPDATE ON "public"."onboarding_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_onboarding_templates_updated_at" BEFORE UPDATE ON "public"."onboarding_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_owner_groups_updated_at" BEFORE UPDATE ON "public"."owner_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at_trigger" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "update_requisition_comments_updated_at" BEFORE UPDATE ON "public"."requisition_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_requisition_comments_updated_at"();



CREATE OR REPLACE TRIGGER "update_requisitions_updated_at" BEFORE UPDATE ON "public"."requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."update_ats_updated_at"();



CREATE OR REPLACE TRIGGER "update_test_assignments_updated_at" BEFORE UPDATE ON "public"."test_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_test_updated_at"();



CREATE OR REPLACE TRIGGER "update_test_templates_updated_at" BEFORE UPDATE ON "public"."test_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_test_updated_at"();



ALTER TABLE ONLY "public"."access_grants"
    ADD CONSTRAINT "access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_prompts"
    ADD CONSTRAINT "ai_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."app_logs"
    ADD CONSTRAINT "app_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."ats_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_approver_group_id_fkey" FOREIGN KEY ("approver_group_id") REFERENCES "public"."owner_groups"("id");



ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."approvals"
    ADD CONSTRAINT "approvals_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."onboarding_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ats_attachments"
    ADD CONSTRAINT "ats_attachments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ats_attachments"
    ADD CONSTRAINT "ats_attachments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."ats_audit"
    ADD CONSTRAINT "ats_audit_actor_fkey" FOREIGN KEY ("actor") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."ats_comments"
    ADD CONSTRAINT "ats_comments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ats_comments"
    ADD CONSTRAINT "ats_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."ats_interviews"
    ADD CONSTRAINT "ats_interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."ats_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ats_interviews"
    ADD CONSTRAINT "ats_interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."candidate_activities"
    ADD CONSTRAINT "candidate_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."candidate_activities"
    ADD CONSTRAINT "candidate_activities_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."ats_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candidate_comments"
    ADD CONSTRAINT "candidate_comments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."ats_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candidate_comments"
    ADD CONSTRAINT "candidate_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."hiring_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compensation_private"
    ADD CONSTRAINT "compensation_private_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compensation_private"
    ADD CONSTRAINT "compensation_private_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."employee_certifications"
    ADD CONSTRAINT "employee_certifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_rates"
    ADD CONSTRAINT "employee_rates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_skills"
    ADD CONSTRAINT "employee_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_skills"
    ADD CONSTRAINT "employee_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_scores"
    ADD CONSTRAINT "feedback_scores_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."owner_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_assignments"
    ADD CONSTRAINT "interview_assignments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."ats_candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_assignments"
    ADD CONSTRAINT "interview_assignments_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_assignments"
    ADD CONSTRAINT "interview_assignments_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."interview_feedback"
    ADD CONSTRAINT "interview_feedback_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_feedback"
    ADD CONSTRAINT "interview_feedback_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."interviews"
    ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interviews"
    ADD CONSTRAINT "interviews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."leaves"
    ADD CONSTRAINT "leaves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."onboarding_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_journeys"
    ADD CONSTRAINT "onboarding_journeys_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_journeys"
    ADD CONSTRAINT "onboarding_journeys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."onboarding_journeys"
    ADD CONSTRAINT "onboarding_journeys_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id");



ALTER TABLE ONLY "public"."onboarding_task_dependencies"
    ADD CONSTRAINT "onboarding_task_dependencies_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."onboarding_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_task_dependencies"
    ADD CONSTRAINT "onboarding_task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."onboarding_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_task_template_dependencies"
    ADD CONSTRAINT "onboarding_task_template_depen_depends_on_task_template_id_fkey" FOREIGN KEY ("depends_on_task_template_id") REFERENCES "public"."onboarding_task_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_task_template_dependencies"
    ADD CONSTRAINT "onboarding_task_template_dependencies_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "public"."onboarding_task_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_task_templates"
    ADD CONSTRAINT "onboarding_task_templates_depends_on_fkey" FOREIGN KEY ("depends_on") REFERENCES "public"."onboarding_task_templates"("id");



ALTER TABLE ONLY "public"."onboarding_task_templates"
    ADD CONSTRAINT "onboarding_task_templates_owner_group_id_fkey" FOREIGN KEY ("owner_group_id") REFERENCES "public"."owner_groups"("id");



ALTER TABLE ONLY "public"."onboarding_task_templates"
    ADD CONSTRAINT "onboarding_task_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_tasks"
    ADD CONSTRAINT "onboarding_tasks_assignee_fkey" FOREIGN KEY ("assignee") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."onboarding_tasks"
    ADD CONSTRAINT "onboarding_tasks_depends_on_fkey" FOREIGN KEY ("depends_on") REFERENCES "public"."onboarding_tasks"("id");



ALTER TABLE ONLY "public"."onboarding_tasks"
    ADD CONSTRAINT "onboarding_tasks_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "public"."onboarding_journeys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_tasks"
    ADD CONSTRAINT "onboarding_tasks_owner_group_id_fkey" FOREIGN KEY ("owner_group_id") REFERENCES "public"."owner_groups"("id");



ALTER TABLE ONLY "public"."onboarding_templates"
    ADD CONSTRAINT "onboarding_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pending_invites"
    ADD CONSTRAINT "pending_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."proctor_events"
    ADD CONSTRAINT "proctor_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id");



ALTER TABLE ONLY "public"."proctor_images"
    ADD CONSTRAINT "proctor_images_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_project_manager_fkey" FOREIGN KEY ("project_manager") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_sales_manager_fkey" FOREIGN KEY ("sales_manager") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requisition_activities"
    ADD CONSTRAINT "requisition_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requisition_activities"
    ADD CONSTRAINT "requisition_activities_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requisitions"
    ADD CONSTRAINT "requisitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."requisitions"
    ADD CONSTRAINT "requisitions_hiring_manager_id_fkey" FOREIGN KEY ("hiring_manager_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."onboarding_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."task_sla_events"
    ADD CONSTRAINT "task_sla_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."onboarding_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_assignments"
    ADD CONSTRAINT "test_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."test_templates"("id");



ALTER TABLE ONLY "public"."test_responses"
    ADD CONSTRAINT "test_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id");



ALTER TABLE ONLY "public"."test_scores"
    ADD CONSTRAINT "test_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id");



ALTER TABLE ONLY "public"."test_sessions"
    ADD CONSTRAINT "test_sessions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."test_assignments"("id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheets"
    ADD CONSTRAINT "timesheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_updates"
    ADD CONSTRAINT "workflow_updates_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



CREATE POLICY "ADMIN and TA_ADMIN can insert proctor events" ON "public"."proctor_events" FOR INSERT WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "ADMIN and TA_ADMIN can manage assignments" ON "public"."test_assignments" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role"))) WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "ADMIN and TA_ADMIN can manage proctor images" ON "public"."proctor_images" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role"))) WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "ADMIN and TA_ADMIN can manage test templates" ON "public"."test_templates" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role"))) WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "AI prompts access for ATS roles" ON "public"."ai_prompts" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role"))) WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role")));



CREATE POLICY "ATS access control" ON "public"."requisitions" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND ("hiring_manager_id" = "auth"."uid"()))));



CREATE POLICY "ATS access control for candidate activities" ON "public"."candidate_activities" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."candidate_id" = "candidate_activities"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."interview_assignments" "ia"
  WHERE (("ia"."candidate_id" = "candidate_activities"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))));



CREATE POLICY "ATS access control for candidate comments" ON "public"."candidate_comments" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."candidate_id" = "candidate_comments"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."interview_assignments" "ia"
  WHERE (("ia"."candidate_id" = "candidate_comments"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"()))))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "ATS access control for candidate proficiencies" ON "public"."candidate_proficiencies" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."candidate_id" = "candidate_proficiencies"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."interview_assignments" "ia"
  WHERE (("ia"."candidate_id" = "candidate_proficiencies"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))));



CREATE POLICY "ATS access control for requisition activities" ON "public"."requisition_activities" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."requisitions" "r"
  WHERE (("r"."id" = "requisition_activities"."requisition_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR "public"."has_ats_role"('INTERVIEWER'::"public"."ats_role")));



CREATE POLICY "ATS applications access control" ON "public"."applications" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "ATS users can view all candidates" ON "public"."ats_candidates" FOR SELECT USING ("public"."has_any_ats_role"());



CREATE POLICY "ATS users can view all sources" ON "public"."ats_candidates" FOR SELECT USING ("public"."has_any_ats_role"());



CREATE POLICY "Admins and TA_ADMIN can manage all candidates" ON "public"."ats_candidates" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "Admins and leads can delete group members" ON "public"."group_members" FOR DELETE USING (("public"."is_admin"("auth"."uid"()) OR "public"."is_group_lead"("group_id") OR (EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_members"."group_id") AND ("gm"."user_id" = "auth"."uid"()) AND ("gm"."role" = 'lead'::"text"))))));



CREATE POLICY "Admins and leads can insert group members" ON "public"."group_members" FOR INSERT WITH CHECK (("public"."is_admin"("auth"."uid"()) OR "public"."is_group_lead"("group_id") OR (EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_members"."group_id") AND ("gm"."user_id" = "auth"."uid"()) AND ("gm"."role" = 'lead'::"text"))))));



CREATE POLICY "Admins and leads can update group members" ON "public"."group_members" FOR UPDATE USING (("public"."is_admin"("auth"."uid"()) OR "public"."is_group_lead"("group_id") OR (EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_members"."group_id") AND ("gm"."user_id" = "auth"."uid"()) AND ("gm"."role" = 'lead'::"text"))))));



CREATE POLICY "Admins can delete feedback" ON "public"."feedback" FOR DELETE USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "Admins can manage all grants" ON "public"."access_grants" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage pending invites" ON "public"."pending_invites" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can manage skills catalog" ON "public"."skills_catalog" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all logs" ON "public"."app_logs" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins have full profile access" ON "public"."profiles" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Allow authenticated users to manage task templates" ON "public"."onboarding_task_templates" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Anyone can insert audit entries" ON "public"."ats_audit" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert logs" ON "public"."app_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can insert workflow updates" ON "public"."workflow_updates" FOR INSERT WITH CHECK (true);



CREATE POLICY "Attachment access based on ATS roles" ON "public"."ats_attachments" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."id" = "ats_attachments"."application_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."interviews" "i"
     JOIN "public"."interview_assignments" "ia" ON (("ia"."interview_id" = "i"."id")))
  WHERE (("i"."application_id" = "ats_attachments"."application_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))));



CREATE POLICY "Audit log access for admins and TA_ADMIN only" ON "public"."ats_audit" FOR SELECT USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "Authors and admins can update feedback" ON "public"."feedback" FOR UPDATE USING ((("author_id" = "auth"."uid"()) OR "public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "Block public access to external completions" ON "public"."external_completions" FOR SELECT USING (false);



CREATE POLICY "Block public updates to external completions" ON "public"."external_completions" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "Comments visibility based on role and visible_to array" ON "public"."ats_comments" FOR SELECT USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") AND ('TA_ADMIN'::"public"."ats_role" = ANY ("visible_to"))) OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND ('HIRING_MANAGER'::"public"."ats_role" = ANY ("visible_to")) AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."id" = "ats_comments"."application_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND ('INTERVIEWER'::"public"."ats_role" = ANY ("visible_to")) AND (EXISTS ( SELECT 1
   FROM ("public"."interviews" "i"
     JOIN "public"."interview_assignments" "ia" ON (("ia"."interview_id" = "i"."id")))
  WHERE (("i"."application_id" = "ats_comments"."application_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))));



CREATE POLICY "Everyone can view skills catalog" ON "public"."skills_catalog" FOR SELECT USING (true);



CREATE POLICY "Feedback access based on ATS roles" ON "public"."feedback" FOR SELECT USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."candidate_id" = "feedback"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("author_id" = "auth"."uid"())));



CREATE POLICY "Feedback access based on ATS roles" ON "public"."interview_feedback" FOR SELECT USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM (("public"."interviews" "i"
     JOIN "public"."applications" "a" ON (("a"."id" = "i"."application_id")))
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("i"."id" = "interview_feedback"."interview_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND ("interviewer_id" = "auth"."uid"()))));



CREATE POLICY "Feedback scores access based on feedback access" ON "public"."feedback_scores" USING ((EXISTS ( SELECT 1
   FROM "public"."feedback" "f"
  WHERE (("f"."id" = "feedback_scores"."feedback_id") AND ("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM ("public"."applications" "a"
             JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
          WHERE (("a"."candidate_id" = "f"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("f"."author_id" = "auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."feedback" "f"
  WHERE (("f"."id" = "feedback_scores"."feedback_id") AND (("f"."author_id" = "auth"."uid"()) OR "public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role"))))));



CREATE POLICY "Hiring managers can create applications for their requisitions" ON "public"."applications" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."requisitions" "r"
  WHERE (("r"."id" = "applications"."requisition_id") AND ("r"."hiring_manager_id" = "auth"."uid"())))));



CREATE POLICY "Hiring managers can create candidates" ON "public"."ats_candidates" FOR INSERT WITH CHECK ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role"));



CREATE POLICY "Hiring managers can delete applications for their requisitions" ON "public"."applications" FOR DELETE USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."requisitions" "r"
  WHERE (("r"."id" = "applications"."requisition_id") AND ("r"."hiring_manager_id" = "auth"."uid"())))))));



CREATE POLICY "Hiring managers can manage applications for their requisitions" ON "public"."applications" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."requisitions" "r"
  WHERE (("r"."id" = "applications"."requisition_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))))) WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."requisitions" "r"
  WHERE (("r"."id" = "applications"."requisition_id") AND ("r"."hiring_manager_id" = "auth"."uid"())))))));



CREATE POLICY "Hiring managers can view assignments for their candidates" ON "public"."test_assignments" FOR SELECT USING (("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."candidate_id" = "test_assignments"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))));



CREATE POLICY "Hiring managers can view candidates for their requisitions" ON "public"."ats_candidates" FOR SELECT USING (("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."candidate_id" = "ats_candidates"."id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))));



CREATE POLICY "Interview access based on ATS roles" ON "public"."ats_interviews" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."requisitions" "r"
  WHERE (("r"."id" = "ats_interviews"."requisition_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND ("interviewer_id" = "auth"."uid"()))));



CREATE POLICY "Interview access based on ATS roles" ON "public"."interviews" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."id" = "interviews"."application_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."interview_assignments" "ia"
  WHERE (("ia"."interview_id" = "interviews"."id") AND ("ia"."interviewer_id" = "auth"."uid"())))))));



CREATE POLICY "Interview assignment access" ON "public"."interview_assignments" USING ((("public"."get_user_ats_role_safe"("auth"."uid"()) = 'ADMIN'::"public"."ats_role") OR ("public"."get_user_ats_role_safe"("auth"."uid"()) = 'TA_ADMIN'::"public"."ats_role") OR ("interviewer_id" = "auth"."uid"()))) WITH CHECK ((("public"."get_user_ats_role_safe"("auth"."uid"()) = 'ADMIN'::"public"."ats_role") OR ("public"."get_user_ats_role_safe"("auth"."uid"()) = 'TA_ADMIN'::"public"."ats_role") OR ("interviewer_id" = "auth"."uid"())));



CREATE POLICY "Interviewers can create/update their own feedback" ON "public"."interview_feedback" USING (("interviewer_id" = "auth"."uid"())) WITH CHECK (("interviewer_id" = "auth"."uid"()));



CREATE POLICY "Interviewers can view assigned candidates" ON "public"."ats_candidates" FOR SELECT USING (("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."interview_assignments" "ia"
  WHERE (("ia"."candidate_id" = "ats_candidates"."id") AND ("ia"."interviewer_id" = "auth"."uid"()))))));



CREATE POLICY "Interviewers can view assignments for assigned candidates" ON "public"."test_assignments" FOR SELECT USING (("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."interview_assignments" "ia"
  WHERE (("ia"."candidate_id" = "test_assignments"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"()))))));



CREATE POLICY "Only admins, TA_ADMIN, and hiring managers can access compensat" ON "public"."compensation_private" USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."id" = "compensation_private"."application_id") AND ("r"."hiring_manager_id" = "auth"."uid"())))))));



CREATE POLICY "Proctor events follow session access" ON "public"."proctor_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."test_sessions" "ts"
     JOIN "public"."test_assignments" "ta" ON (("ta"."id" = "ts"."assignment_id")))
  WHERE (("ts"."id" = "proctor_events"."session_id") AND ("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM ("public"."applications" "a"
             JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
          WHERE (("a"."candidate_id" = "ta"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM "public"."interview_assignments" "ia"
          WHERE (("ia"."candidate_id" = "ta"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"()))))))))));



CREATE POLICY "Service role can access external completions" ON "public"."external_completions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Test responses follow session access" ON "public"."test_responses" USING ((EXISTS ( SELECT 1
   FROM ("public"."test_sessions" "ts"
     JOIN "public"."test_assignments" "ta" ON (("ta"."id" = "ts"."assignment_id")))
  WHERE (("ts"."id" = "test_responses"."session_id") AND ("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM ("public"."applications" "a"
             JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
          WHERE (("a"."candidate_id" = "ta"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM "public"."interview_assignments" "ia"
          WHERE (("ia"."candidate_id" = "ta"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))))))) WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "Test scores follow session access" ON "public"."test_scores" USING ((EXISTS ( SELECT 1
   FROM ("public"."test_sessions" "ts"
     JOIN "public"."test_assignments" "ta" ON (("ta"."id" = "ts"."assignment_id")))
  WHERE (("ts"."id" = "test_scores"."session_id") AND ("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM ("public"."applications" "a"
             JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
          WHERE (("a"."candidate_id" = "ta"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM "public"."interview_assignments" "ia"
          WHERE (("ia"."candidate_id" = "ta"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))))))) WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "Test sessions follow assignment access" ON "public"."test_sessions" USING ((EXISTS ( SELECT 1
   FROM "public"."test_assignments" "ta"
  WHERE (("ta"."id" = "test_sessions"."assignment_id") AND ("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM ("public"."applications" "a"
             JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
          WHERE (("a"."candidate_id" = "ta"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
           FROM "public"."interview_assignments" "ia"
          WHERE (("ia"."candidate_id" = "ta"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))))))) WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role")));



CREATE POLICY "Users can create comments" ON "public"."requisition_comments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") OR "public"."has_ats_role"('INTERVIEWER'::"public"."ats_role"))));



CREATE POLICY "Users can create comments for accessible applications" ON "public"."ats_comments" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND ("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."id" = "ats_comments"."application_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."interviews" "i"
     JOIN "public"."interview_assignments" "ia" ON (("ia"."interview_id" = "i"."id")))
  WHERE (("i"."application_id" = "i"."application_id") AND ("ia"."interviewer_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can create feedback with proper access control" ON "public"."feedback" FOR INSERT WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR (("author_id" = "auth"."uid"()) AND ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."interview_assignments" "ia"
  WHERE (("ia"."candidate_id" = "feedback"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can create journeys for their candidates" ON "public"."onboarding_journeys" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."candidates"
  WHERE (("candidates"."id" = "onboarding_journeys"."candidate_id") AND ("candidates"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create owner groups" ON "public"."owner_groups" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can create templates" ON "public"."onboarding_templates" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create their own config" ON "public"."config" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own surveys" ON "public"."hiring_surveys" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create workflow updates" ON "public"."workflow_updates" FOR INSERT WITH CHECK (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") OR "public"."has_ats_role"('INTERVIEWER'::"public"."ats_role")));



CREATE POLICY "Users can delete their own config" ON "public"."config" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own surveys" ON "public"."hiring_surveys" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert external completions for their candidates" ON "public"."external_completions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."candidates"
  WHERE (("candidates"."id" = "external_completions"."candidate_id") AND ("candidates"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage task template dependencies" ON "public"."onboarding_task_template_dependencies" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can manage their own certifications" ON "public"."employee_certifications" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can manage their own skills" ON "public"."employee_skills" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can update journeys for their candidates" ON "public"."onboarding_journeys" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."candidates"
  WHERE (("candidates"."id" = "onboarding_journeys"."candidate_id") AND ("candidates"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update owner groups they're leads of" ON "public"."owner_groups" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "owner_groups"."id") AND ("group_members"."user_id" = "auth"."uid"()) AND ("group_members"."role" = 'lead'::"text")))));



CREATE POLICY "Users can update tasks they're assigned to or own" ON "public"."onboarding_tasks" FOR UPDATE USING ((("assignee" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."onboarding_journeys" "oj"
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE (("oj"."id" = "onboarding_tasks"."journey_id") AND ("c"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "onboarding_tasks"."owner_group_id") AND ("gm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own comments" ON "public"."requisition_comments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own config" ON "public"."config" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own surveys" ON "public"."hiring_surveys" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their templates" ON "public"."onboarding_templates" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can upload attachments for accessible tasks" ON "public"."task_attachments" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM (("public"."onboarding_tasks" "ot"
     JOIN "public"."onboarding_journeys" "oj" ON (("ot"."journey_id" = "oj"."id")))
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE (("ot"."id" = "task_attachments"."task_id") AND (("c"."user_id" = "auth"."uid"()) OR ("ot"."assignee" = "auth"."uid"()))))) AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Users can view SLA events for accessible tasks" ON "public"."task_sla_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."onboarding_tasks" "ot"
     JOIN "public"."onboarding_journeys" "oj" ON (("ot"."journey_id" = "oj"."id")))
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE (("ot"."id" = "task_sla_events"."task_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view active templates" ON "public"."onboarding_templates" FOR SELECT USING ((("is_active" = true) OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Users can view all owner groups" ON "public"."owner_groups" FOR SELECT USING (true);



CREATE POLICY "Users can view allowed profiles" ON "public"."profiles" FOR SELECT USING (((NOT "blocked") AND (("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"()))));



CREATE POLICY "Users can view approvals for accessible tasks" ON "public"."approvals" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (("public"."onboarding_tasks" "ot"
     JOIN "public"."onboarding_journeys" "oj" ON (("ot"."journey_id" = "oj"."id")))
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE (("ot"."id" = "approvals"."task_id") AND ("c"."user_id" = "auth"."uid"())))) OR ("approver_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "approvals"."approver_group_id") AND ("gm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view attachments for accessible tasks" ON "public"."task_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."onboarding_tasks" "ot"
     JOIN "public"."onboarding_journeys" "oj" ON (("ot"."journey_id" = "oj"."id")))
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE (("ot"."id" = "task_attachments"."task_id") AND (("c"."user_id" = "auth"."uid"()) OR ("ot"."assignee" = "auth"."uid"()))))));



CREATE POLICY "Users can view comments based on their role" ON "public"."requisition_comments" FOR SELECT USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND ('HIRING_MANAGER'::"text" = ANY ("visible_to_roles"))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND ('INTERVIEWER'::"text" = ANY ("visible_to_roles"))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view grants about themselves" ON "public"."access_grants" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view group members" ON "public"."group_members" FOR SELECT USING (true);



CREATE POLICY "Users can view journeys for their candidates" ON "public"."onboarding_journeys" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."candidates"
  WHERE (("candidates"."id" = "onboarding_journeys"."candidate_id") AND ("candidates"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view task dependencies" ON "public"."task_dependencies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."onboarding_tasks" "ot"
     JOIN "public"."onboarding_journeys" "oj" ON (("ot"."journey_id" = "oj"."id")))
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE ((("ot"."id" = "task_dependencies"."task_id") OR ("ot"."id" = "task_dependencies"."depends_on_task_id")) AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view task template dependencies" ON "public"."onboarding_task_template_dependencies" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view tasks for their journeys or assigned tasks" ON "public"."onboarding_tasks" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."onboarding_journeys" "oj"
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE (("oj"."id" = "onboarding_tasks"."journey_id") AND ("c"."user_id" = "auth"."uid"())))) OR ("assignee" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "onboarding_tasks"."owner_group_id") AND ("gm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own certifications" ON "public"."employee_certifications" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can view their own config" ON "public"."config" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own logs" ON "public"."app_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own skills" ON "public"."employee_skills" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can view their own surveys" ON "public"."hiring_surveys" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view workflow updates for accessible candidates" ON "public"."workflow_updates" FOR SELECT USING (("public"."has_ats_role"('ADMIN'::"public"."ats_role") OR "public"."has_ats_role"('TA_ADMIN'::"public"."ats_role") OR ("public"."has_ats_role"('HIRING_MANAGER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM ("public"."applications" "a"
     JOIN "public"."requisitions" "r" ON (("r"."id" = "a"."requisition_id")))
  WHERE (("a"."candidate_id" = "workflow_updates"."candidate_id") AND ("r"."hiring_manager_id" = "auth"."uid"()))))) OR ("public"."has_ats_role"('INTERVIEWER'::"public"."ats_role") AND (EXISTS ( SELECT 1
   FROM "public"."interview_assignments" "ia"
  WHERE (("ia"."candidate_id" = "workflow_updates"."candidate_id") AND ("ia"."interviewer_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view workflow updates for their candidates" ON "public"."workflow_updates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."candidates"
  WHERE (("candidates"."id" = "workflow_updates"."candidate_id") AND ("candidates"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."access_grants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin all candidates" ON "public"."candidates" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin all leaves" ON "public"."leaves" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin all notifications" ON "public"."notifications" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin all profiles" ON "public"."profiles" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin all task deps" ON "public"."onboarding_task_dependencies" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage all employee rates" ON "public"."employee_rates" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage all project members" ON "public"."project_members" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage all projects" ON "public"."projects" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage all timesheets" ON "public"."timesheets" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage docs" ON "public"."docs" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage employee rates" ON "public"."employee_rates" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage fx rates" ON "public"."fx_rates" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage holidays" ON "public"."holidays" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage project members" ON "public"."project_members" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "admin can manage projects" ON "public"."projects" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."ai_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ats_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ats_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ats_candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ats_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ats_interviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidate_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidate_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidate_proficiencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compensation_private" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."docs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "docs viewable by authenticated users" ON "public"."docs" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."employee_certifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fx rates viewable by all" ON "public"."fx_rates" FOR SELECT USING (true);



ALTER TABLE "public"."fx_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hiring_surveys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."holidays" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "holidays viewable by all" ON "public"."holidays" FOR SELECT USING (true);



ALTER TABLE "public"."interview_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leaves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_journeys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_task_dependencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_task_template_dependencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_task_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owner or admin delete candidates" ON "public"."candidates" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "owner or admin update candidates" ON "public"."candidates" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "owner or admin write candidates" ON "public"."candidates" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "owner or granted read candidates" ON "public"."candidates" FOR SELECT USING (("public"."is_admin"("auth"."uid"()) OR ("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."access_grants" "g"
  WHERE (("g"."resource_type" = 'candidate'::"text") AND ("g"."resource_id" = "candidates"."id") AND ("g"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."owner_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proctor_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proctor_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requisition_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requisition_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requisitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skills_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_dependencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_sla_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timesheets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user can view task deps for their journeys" ON "public"."onboarding_task_dependencies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."onboarding_tasks" "ot"
     JOIN "public"."onboarding_journeys" "oj" ON (("ot"."journey_id" = "oj"."id")))
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE (("ot"."id" = "onboarding_task_dependencies"."task_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "users can manage own timesheets" ON "public"."timesheets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users can manage own timesheets only" ON "public"."timesheets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users can view notifications for their tasks" ON "public"."notifications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."onboarding_tasks" "ot"
     JOIN "public"."onboarding_journeys" "oj" ON (("ot"."journey_id" = "oj"."id")))
     JOIN "public"."candidates" "c" ON (("oj"."candidate_id" = "c"."id")))
  WHERE (("ot"."id" = "notifications"."task_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "users can view own employee rate" ON "public"."employee_rates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users can view own rate" ON "public"."employee_rates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users manage own leaves" ON "public"."leaves" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."workflow_updates" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_feedback_overall_percent"("p_feedback_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_feedback_overall_percent"("p_feedback_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_feedback_overall_percent"("p_feedback_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_project_member_margin"("p_bill_rate_usd" numeric, "p_member_discount_pct" numeric, "p_project_discount_pct" numeric, "p_base_rate_usd" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_project_member_margin"("p_bill_rate_usd" numeric, "p_member_discount_pct" numeric, "p_project_discount_pct" numeric, "p_base_rate_usd" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_project_member_margin"("p_bill_rate_usd" numeric, "p_member_discount_pct" numeric, "p_project_discount_pct" numeric, "p_base_rate_usd" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_utilization"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_utilization"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_utilization"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_productivity"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_productivity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_productivity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_be_interviewer"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_be_interviewer"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_be_interviewer"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_test_invite_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_test_invite_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_test_invite_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_tasks"("p_block" "text", "p_status" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_tasks"("p_block" "text", "p_status" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_tasks"("p_block" "text", "p_status" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_site_url"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_site_url"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_site_url"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_ats_role"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_ats_role"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_ats_role"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_ats_role_safe"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_ats_role_safe"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_ats_role_safe"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_any_ats_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."has_any_ats_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_ats_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_ats_role"("p_role" "public"."ats_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_ats_role"("p_role" "public"."ats_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_ats_role"("p_role" "public"."ats_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."instantiate_template"("p_candidate_id" "uuid", "p_template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."instantiate_template"("p_candidate_id" "uuid", "p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."instantiate_template"("p_candidate_id" "uuid", "p_template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("p_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_lead"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_lead"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_lead"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_project_member"("pid" "uuid", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_member"("pid" "uuid", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_member"("pid" "uuid", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."launch_onboarding_journey"("p_candidate_id" "uuid", "p_template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."launch_onboarding_journey"("p_candidate_id" "uuid", "p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."launch_onboarding_journey"("p_candidate_id" "uuid", "p_template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_candidate_activity"("p_candidate_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_candidate_activity"("p_candidate_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_candidate_activity"("p_candidate_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_requisition_activity"("p_requisition_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_requisition_activity"("p_requisition_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_requisition_activity"("p_requisition_id" "uuid", "p_activity_type" "text", "p_activity_description" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_activities_as_seen"("p_candidate_id" "uuid", "p_activity_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_activities_as_seen"("p_candidate_id" "uuid", "p_activity_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_activities_as_seen"("p_candidate_id" "uuid", "p_activity_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."move_candidate_stage"("p_candidate_id" "uuid", "p_from_stage" "text", "p_to_stage" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."move_candidate_stage"("p_candidate_id" "uuid", "p_from_stage" "text", "p_to_stage" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_candidate_stage"("p_candidate_id" "uuid", "p_from_stage" "text", "p_to_stage" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_template"("p_template_id" "uuid", "p_name" "text", "p_tasks" "jsonb", "p_dependencies" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_template"("p_template_id" "uuid", "p_name" "text", "p_tasks" "jsonb", "p_dependencies" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_template"("p_template_id" "uuid", "p_name" "text", "p_tasks" "jsonb", "p_dependencies" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_proficiencies"("p_candidate_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_proficiencies"("p_candidate_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_proficiencies"("p_candidate_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ats_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ats_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ats_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_feedback_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_feedback_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_feedback_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_requisition_comments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_requisition_comments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_requisition_comments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_task_status"("p_task_id" "uuid", "p_status" "text", "p_comment" "text", "p_assignee" "uuid", "p_candidate_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_task_status"("p_task_id" "uuid", "p_status" "text", "p_comment" "text", "p_assignee" "uuid", "p_candidate_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task_status"("p_task_id" "uuid", "p_status" "text", "p_comment" "text", "p_assignee" "uuid", "p_candidate_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_test_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_test_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_test_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_workflow_step"("p_candidate_id" "uuid", "p_step_name" "text", "p_status" "text", "p_comments" "text", "p_completed_by" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_workflow_step"("p_candidate_id" "uuid", "p_step_name" "text", "p_status" "text", "p_comments" "text", "p_completed_by" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_workflow_step"("p_candidate_id" "uuid", "p_step_name" "text", "p_status" "text", "p_comments" "text", "p_completed_by" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_completion_token"("token_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_completion_token"("token_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_completion_token"("token_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_test_token"("token_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_test_token"("token_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_test_token"("token_to_check" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."access_grants" TO "anon";
GRANT ALL ON TABLE "public"."access_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."access_grants" TO "service_role";



GRANT ALL ON TABLE "public"."ai_prompts" TO "anon";
GRANT ALL ON TABLE "public"."ai_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."app_logs" TO "anon";
GRANT ALL ON TABLE "public"."app_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."app_logs" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."approvals" TO "anon";
GRANT ALL ON TABLE "public"."approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."approvals" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."ats_attachments" TO "anon";
GRANT ALL ON TABLE "public"."ats_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."ats_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."ats_audit" TO "anon";
GRANT ALL ON TABLE "public"."ats_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."ats_audit" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ats_audit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ats_audit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ats_audit_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ats_candidates" TO "anon";
GRANT ALL ON TABLE "public"."ats_candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."ats_candidates" TO "service_role";



GRANT ALL ON TABLE "public"."ats_comments" TO "anon";
GRANT ALL ON TABLE "public"."ats_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ats_comments" TO "service_role";



GRANT ALL ON TABLE "public"."ats_interviews" TO "anon";
GRANT ALL ON TABLE "public"."ats_interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."ats_interviews" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_activities" TO "anon";
GRANT ALL ON TABLE "public"."candidate_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_activities" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_comments" TO "anon";
GRANT ALL ON TABLE "public"."candidate_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_comments" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_proficiencies" TO "anon";
GRANT ALL ON TABLE "public"."candidate_proficiencies" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_proficiencies" TO "service_role";



GRANT ALL ON TABLE "public"."candidates" TO "anon";
GRANT ALL ON TABLE "public"."candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."candidates" TO "service_role";



GRANT ALL ON TABLE "public"."compensation_private" TO "anon";
GRANT ALL ON TABLE "public"."compensation_private" TO "authenticated";
GRANT ALL ON TABLE "public"."compensation_private" TO "service_role";



GRANT ALL ON TABLE "public"."config" TO "anon";
GRANT ALL ON TABLE "public"."config" TO "authenticated";
GRANT ALL ON TABLE "public"."config" TO "service_role";



GRANT ALL ON TABLE "public"."docs" TO "anon";
GRANT ALL ON TABLE "public"."docs" TO "authenticated";
GRANT ALL ON TABLE "public"."docs" TO "service_role";



GRANT ALL ON TABLE "public"."employee_certifications" TO "anon";
GRANT ALL ON TABLE "public"."employee_certifications" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_certifications" TO "service_role";



GRANT ALL ON TABLE "public"."employee_rates" TO "anon";
GRANT ALL ON TABLE "public"."employee_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_rates" TO "service_role";



GRANT ALL ON TABLE "public"."employee_skills" TO "anon";
GRANT ALL ON TABLE "public"."employee_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_skills" TO "service_role";



GRANT ALL ON TABLE "public"."external_completions" TO "anon";
GRANT ALL ON TABLE "public"."external_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."external_completions" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_scores" TO "anon";
GRANT ALL ON TABLE "public"."feedback_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_scores" TO "service_role";



GRANT ALL ON TABLE "public"."fx_rates" TO "anon";
GRANT ALL ON TABLE "public"."fx_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."fx_rates" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."hiring_surveys" TO "anon";
GRANT ALL ON TABLE "public"."hiring_surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."hiring_surveys" TO "service_role";



GRANT ALL ON TABLE "public"."holidays" TO "anon";
GRANT ALL ON TABLE "public"."holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."holidays" TO "service_role";



GRANT ALL ON TABLE "public"."interview_assignments" TO "anon";
GRANT ALL ON TABLE "public"."interview_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."interview_feedback" TO "anon";
GRANT ALL ON TABLE "public"."interview_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."interviews" TO "anon";
GRANT ALL ON TABLE "public"."interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."interviews" TO "service_role";



GRANT ALL ON TABLE "public"."leaves" TO "anon";
GRANT ALL ON TABLE "public"."leaves" TO "authenticated";
GRANT ALL ON TABLE "public"."leaves" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_journeys" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_journeys" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_journeys" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_task_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_task_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_task_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_task_template_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_task_template_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_task_template_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_task_templates" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_tasks" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_templates" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_templates" TO "service_role";



GRANT ALL ON TABLE "public"."owner_groups" TO "anon";
GRANT ALL ON TABLE "public"."owner_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."owner_groups" TO "service_role";



GRANT ALL ON TABLE "public"."pending_invites" TO "anon";
GRANT ALL ON TABLE "public"."pending_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_invites" TO "service_role";



GRANT ALL ON TABLE "public"."proctor_events" TO "anon";
GRANT ALL ON TABLE "public"."proctor_events" TO "authenticated";
GRANT ALL ON TABLE "public"."proctor_events" TO "service_role";



GRANT ALL ON TABLE "public"."proctor_images" TO "anon";
GRANT ALL ON TABLE "public"."proctor_images" TO "authenticated";
GRANT ALL ON TABLE "public"."proctor_images" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."requisition_activities" TO "anon";
GRANT ALL ON TABLE "public"."requisition_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."requisition_activities" TO "service_role";



GRANT ALL ON TABLE "public"."requisition_comments" TO "anon";
GRANT ALL ON TABLE "public"."requisition_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."requisition_comments" TO "service_role";



GRANT ALL ON TABLE "public"."requisitions" TO "anon";
GRANT ALL ON TABLE "public"."requisitions" TO "authenticated";
GRANT ALL ON TABLE "public"."requisitions" TO "service_role";



GRANT ALL ON TABLE "public"."skills_catalog" TO "anon";
GRANT ALL ON TABLE "public"."skills_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."skills_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."task_attachments" TO "anon";
GRANT ALL ON TABLE "public"."task_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."task_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."task_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."task_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."task_sla_events" TO "anon";
GRANT ALL ON TABLE "public"."task_sla_events" TO "authenticated";
GRANT ALL ON TABLE "public"."task_sla_events" TO "service_role";



GRANT ALL ON TABLE "public"."test_assignments" TO "anon";
GRANT ALL ON TABLE "public"."test_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."test_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."test_responses" TO "anon";
GRANT ALL ON TABLE "public"."test_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."test_responses" TO "service_role";



GRANT ALL ON TABLE "public"."test_scores" TO "anon";
GRANT ALL ON TABLE "public"."test_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."test_scores" TO "service_role";



GRANT ALL ON TABLE "public"."test_sessions" TO "anon";
GRANT ALL ON TABLE "public"."test_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."test_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."test_templates" TO "anon";
GRANT ALL ON TABLE "public"."test_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."test_templates" TO "service_role";



GRANT ALL ON TABLE "public"."timesheets" TO "anon";
GRANT ALL ON TABLE "public"."timesheets" TO "authenticated";
GRANT ALL ON TABLE "public"."timesheets" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_updates" TO "anon";
GRANT ALL ON TABLE "public"."workflow_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_updates" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























