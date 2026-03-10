-- Migration to replace full_name with first_name and last_name in candidates table
-- and add work_email column.
-- Also removes no longer needed get_my_tasks function.

-- 1. Remove get_my_tasks function
DROP FUNCTION IF EXISTS public.get_my_tasks(text, text, integer);

-- 2. Add new columns to candidates
ALTER TABLE public.candidates ADD COLUMN first_name text;
ALTER TABLE public.candidates ADD COLUMN last_name text;
ALTER TABLE public.candidates ADD COLUMN work_email text;

-- 3. Migrate existing data for names
UPDATE public.candidates 
SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE 
    WHEN position(' ' in full_name) > 0 THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE ''
  END;

-- 4. Set NOT NULL constraints for mandatory fields
ALTER TABLE public.candidates ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.candidates ALTER COLUMN last_name SET NOT NULL;

-- 5. Drop the old column
ALTER TABLE public.candidates DROP COLUMN full_name;

-- 6. Update launch_onboarding_journey function
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
        'candidate_name', v_candidate_record.first_name || ' ' || v_candidate_record.last_name,
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