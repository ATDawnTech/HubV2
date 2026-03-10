# SQL Queries Reference Guide

## Common Database Queries for AT Dawn Talent Hub

### 📊 ATS Queries

#### Get All Active Requisitions with Hiring Manager
```sql
SELECT 
  r.*,
  p.full_name as hiring_manager_name,
  p.email as hiring_manager_email,
  COUNT(DISTINCT a.id) as application_count
FROM requisitions r
LEFT JOIN profiles p ON r.hiring_manager_id = p.user_id
LEFT JOIN applications a ON a.requisition_id = r.id AND a.status = 'active'
WHERE r.status = 'open'
GROUP BY r.id, p.full_name, p.email
ORDER BY r.created_at DESC;
```

#### Get Candidate Pipeline by Stage
```sql
SELECT 
  a.stage,
  COUNT(*) as candidate_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - a.created_at))/86400) as avg_days_in_stage
FROM applications a
WHERE a.status = 'active'
GROUP BY a.stage
ORDER BY 
  CASE a.stage
    WHEN 'sourced' THEN 1
    WHEN 'screen' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'panel' THEN 4
    WHEN 'offer' THEN 5
    WHEN 'hired' THEN 6
  END;
```

#### Get Candidate with All Applications and Interviews
```sql
SELECT 
  c.*,
  json_agg(DISTINCT jsonb_build_object(
    'application_id', a.id,
    'requisition_title', r.title,
    'stage', a.stage,
    'status', a.status,
    'owner', p.full_name
  )) as applications,
  json_agg(DISTINCT jsonb_build_object(
    'interview_id', i.id,
    'interview_type', i.interview_type,
    'scheduled_start', i.scheduled_start,
    'status', i.status,
    'interviewer', ip.full_name
  )) as interviews
FROM ats_candidates c
LEFT JOIN applications a ON a.candidate_id = c.id
LEFT JOIN requisitions r ON r.id = a.requisition_id
LEFT JOIN profiles p ON p.user_id = a.owner_id
LEFT JOIN ats_interviews i ON i.candidate_id = c.id
LEFT JOIN profiles ip ON ip.user_id = i.interviewer_id
WHERE c.id = 'candidate_uuid_here'
GROUP BY c.id;
```

#### Get Interview Schedule for Next 7 Days
```sql
SELECT 
  i.*,
  c.full_name as candidate_name,
  c.email as candidate_email,
  r.title as position,
  p.full_name as interviewer_name,
  p.email as interviewer_email
FROM ats_interviews i
JOIN ats_candidates c ON c.id = i.candidate_id
JOIN requisitions r ON r.id = i.requisition_id
JOIN profiles p ON p.user_id = i.interviewer_id
WHERE i.scheduled_start BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND i.status = 'scheduled'
ORDER BY i.scheduled_start ASC;
```

#### Get Feedback Summary for Candidate
```sql
SELECT 
  c.full_name,
  f.recommendation,
  f.overall_percent,
  f.notes,
  p.full_name as reviewer_name,
  json_agg(jsonb_build_object(
    'criterion', fs.criterion,
    'score', fs.score,
    'comments', fs.comments
  )) as detailed_scores
FROM feedback f
JOIN ats_candidates c ON c.id = f.candidate_id
JOIN profiles p ON p.user_id = f.author_id
LEFT JOIN feedback_scores fs ON fs.feedback_id = f.id
WHERE f.candidate_id = 'candidate_uuid_here'
GROUP BY c.full_name, f.id, f.recommendation, f.overall_percent, f.notes, p.full_name
ORDER BY f.created_at DESC;
```

---

### 👥 Employee Management Queries

#### Get All Employees with Skills and Certifications
```sql
SELECT 
  p.user_id,
  p.full_name,
  p.email,
  p.department,
  p.location,
  json_agg(DISTINCT jsonb_build_object(
    'skill', sc.name,
    'level', es.level,
    'years', es.years
  )) FILTER (WHERE sc.name IS NOT NULL) as skills,
  json_agg(DISTINCT jsonb_build_object(
    'name', ec.name,
    'authority', ec.authority,
    'issued_on', ec.issued_on,
    'expires_on', ec.expires_on
  )) FILTER (WHERE ec.name IS NOT NULL) as certifications
FROM profiles p
LEFT JOIN employee_skills es ON es.user_id = p.user_id
LEFT JOIN skills_catalog sc ON sc.id = es.skill_id
LEFT JOIN employee_certifications ec ON ec.user_id = p.user_id
GROUP BY p.user_id, p.full_name, p.email, p.department, p.location
ORDER BY p.full_name;
```

#### Find Employees by Skill
```sql
SELECT 
  p.full_name,
  p.email,
  p.department,
  es.level,
  es.years,
  sc.name as skill_name
FROM employee_skills es
JOIN skills_catalog sc ON sc.id = es.skill_id
JOIN profiles p ON p.user_id = es.user_id
WHERE sc.name ILIKE '%react%'
  AND es.level >= 3
ORDER BY es.level DESC, es.years DESC;
```

#### Get Expiring Certifications (Next 90 Days)
```sql
SELECT 
  p.full_name,
  p.email,
  ec.name as certification,
  ec.authority,
  ec.expires_on,
  (ec.expires_on - CURRENT_DATE) as days_until_expiry
FROM employee_certifications ec
JOIN profiles p ON p.user_id = ec.user_id
WHERE ec.expires_on BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
ORDER BY ec.expires_on ASC;
```

---

### 📋 Onboarding Queries

#### Get Active Onboarding Journeys with Progress
```sql
SELECT 
  oj.id,
  c.full_name as candidate_name,
  c.email,
  ot.name as template_name,
  oj.status,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
  ROUND(
    100.0 * COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') / 
    NULLIF(COUNT(DISTINCT t.id), 0), 
    2
  ) as completion_percentage
FROM onboarding_journeys oj
JOIN candidates c ON c.id = oj.candidate_id
JOIN onboarding_templates ot ON ot.id = oj.template_id
LEFT JOIN onboarding_tasks t ON t.journey_id = oj.id
WHERE oj.status IN ('not_started', 'in_progress')
GROUP BY oj.id, c.full_name, c.email, ot.name, oj.status
ORDER BY oj.created_at DESC;
```

#### Get Pending Tasks by Owner
```sql
SELECT 
  t.id,
  t.title,
  t.description,
  t.task_type,
  t.due_date,
  c.full_name as candidate_name,
  COALESCE(p.full_name, og.name) as owner_name,
  CASE 
    WHEN t.owner_user_id IS NOT NULL THEN 'user'
    ELSE 'group'
  END as owner_type
FROM onboarding_tasks t
JOIN onboarding_journeys oj ON oj.id = t.journey_id
JOIN candidates c ON c.id = oj.candidate_id
LEFT JOIN profiles p ON p.user_id = t.owner_user_id
LEFT JOIN owner_groups og ON og.id = t.owner_group_id
WHERE t.status IN ('pending', 'in_progress')
  AND (
    t.owner_user_id = 'user_uuid_here'
    OR t.owner_group_id IN (
      SELECT group_id FROM group_members WHERE user_id = 'user_uuid_here'
    )
  )
ORDER BY t.due_date ASC NULLS LAST;
```

#### Get Task Dependencies (DAG)
```sql
SELECT 
  t.id,
  t.title,
  t.status,
  json_agg(jsonb_build_object(
    'depends_on_id', dt.id,
    'depends_on_title', dt.title,
    'depends_on_status', dt.status
  )) as dependencies
FROM onboarding_tasks t
LEFT JOIN onboarding_task_dependencies td ON td.task_id = t.id
LEFT JOIN onboarding_tasks dt ON dt.id = td.depends_on_task_id
WHERE t.journey_id = 'journey_uuid_here'
GROUP BY t.id, t.title, t.status
ORDER BY t.sequence_order;
```

---

### 💼 Productivity Management Queries

#### Get Project Utilization Report
```sql
SELECT 
  pr.name as project_name,
  pr.client,
  pr.status,
  COUNT(DISTINCT pm.user_id) as team_size,
  SUM(pm.allocation_percent) as total_allocation,
  SUM(t.hours) as total_hours_logged,
  pr.budget,
  SUM(t.hours * pm.bill_rate_usd) as total_billed
FROM projects pr
LEFT JOIN project_members pm ON pm.project_id = pr.id
LEFT JOIN timesheets t ON t.project_id = pr.id AND t.user_id = pm.user_id
WHERE pr.status = 'active'
GROUP BY pr.id, pr.name, pr.client, pr.status, pr.budget
ORDER BY total_billed DESC;
```

#### Get Employee Timesheet Summary (Current Month)
```sql
SELECT 
  p.full_name,
  pr.name as project_name,
  SUM(t.hours) as total_hours,
  COUNT(DISTINCT DATE(t.date)) as days_worked,
  AVG(t.hours) as avg_hours_per_day
FROM timesheets t
JOIN profiles p ON p.user_id = t.user_id
JOIN projects pr ON pr.id = t.project_id
WHERE DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
  AND t.status = 'approved'
GROUP BY p.full_name, pr.name
ORDER BY p.full_name, total_hours DESC;
```

#### Get Pending Timesheet Approvals
```sql
SELECT 
  t.id,
  p.full_name as employee_name,
  pr.name as project_name,
  t.date,
  t.hours,
  t.description,
  t.status
FROM timesheets t
JOIN profiles p ON p.user_id = t.user_id
JOIN projects pr ON pr.id = t.project_id
WHERE t.status = 'submitted'
ORDER BY t.date DESC;
```

---

### 🖥️ Asset Management Queries

#### Get Asset Inventory Summary
```sql
SELECT 
  asset_type,
  status,
  COUNT(*) as count,
  json_agg(jsonb_build_object(
    'brand', brand,
    'model', model,
    'serial_number', serial_number
  )) as assets
FROM assets
GROUP BY asset_type, status
ORDER BY asset_type, status;
```

#### Get Assets Assigned to Employee
```sql
SELECT 
  a.*,
  p.full_name as assigned_to_name,
  p.email as assigned_to_email,
  CASE 
    WHEN a.warranty_expiry < CURRENT_DATE THEN 'expired'
    WHEN a.warranty_expiry < CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as warranty_status
FROM assets a
LEFT JOIN profiles p ON p.user_id = a.assigned_to
WHERE a.assigned_to = 'user_uuid_here'
ORDER BY a.asset_type;
```

#### Get Available Assets for Assignment
```sql
SELECT 
  asset_type,
  brand,
  model,
  serial_number,
  purchase_date,
  warranty_expiry
FROM assets
WHERE status = 'available'
  AND (warranty_expiry IS NULL OR warranty_expiry > CURRENT_DATE)
ORDER BY asset_type, purchase_date DESC;
```

---

### 📈 Analytics & Reporting Queries

#### ATS Funnel Metrics
```sql
SELECT 
  r.title as requisition,
  COUNT(DISTINCT a.id) as total_applications,
  COUNT(DISTINCT a.id) FILTER (WHERE a.stage = 'screen') as screen_stage,
  COUNT(DISTINCT a.id) FILTER (WHERE a.stage = 'manager') as manager_stage,
  COUNT(DISTINCT a.id) FILTER (WHERE a.stage = 'panel') as panel_stage,
  COUNT(DISTINCT a.id) FILTER (WHERE a.stage = 'offer') as offer_stage,
  COUNT(DISTINCT a.id) FILTER (WHERE a.stage = 'hired') as hired,
  ROUND(
    100.0 * COUNT(DISTINCT a.id) FILTER (WHERE a.stage = 'hired') / 
    NULLIF(COUNT(DISTINCT a.id), 0),
    2
  ) as conversion_rate
FROM requisitions r
LEFT JOIN applications a ON a.requisition_id = r.id
WHERE r.status = 'open'
GROUP BY r.id, r.title
ORDER BY total_applications DESC;
```

#### Time to Hire by Requisition
```sql
SELECT 
  r.title,
  AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))/86400) as avg_days_to_hire,
  MIN(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))/86400) as min_days,
  MAX(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))/86400) as max_days,
  COUNT(*) as hires
FROM applications a
JOIN requisitions r ON r.id = a.requisition_id
WHERE a.stage = 'hired'
  AND a.updated_at >= NOW() - INTERVAL '6 months'
GROUP BY r.id, r.title
ORDER BY avg_days_to_hire;
```

#### Interview Completion Rate
```sql
SELECT 
  DATE_TRUNC('month', i.scheduled_start) as month,
  COUNT(*) as total_scheduled,
  COUNT(*) FILTER (WHERE i.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE i.status = 'cancelled') as cancelled,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE i.status = 'completed') / 
    NULLIF(COUNT(*), 0),
    2
  ) as completion_rate
FROM ats_interviews i
WHERE i.scheduled_start >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', i.scheduled_start)
ORDER BY month DESC;
```

---

### 🔍 Audit & Activity Queries

#### Get Recent Activity for Candidate
```sql
SELECT 
  ca.activity_type,
  ca.activity_description,
  ca.created_at,
  p.full_name as actor_name,
  ca.metadata
FROM candidate_activities ca
LEFT JOIN profiles p ON p.user_id = ca.actor_id
WHERE ca.candidate_id = 'candidate_uuid_here'
ORDER BY ca.created_at DESC
LIMIT 50;
```

#### Get ATS Audit Trail
```sql
SELECT 
  aa.entity,
  aa.action,
  aa.created_at,
  p.full_name as actor_name,
  aa.details
FROM ats_audit aa
LEFT JOIN profiles p ON p.user_id = aa.actor
WHERE aa.entity_id = 'entity_uuid_here'
ORDER BY aa.created_at DESC;
```

---

### 🔐 User & Permission Queries

#### Get Users by ATS Role
```sql
SELECT 
  p.full_name,
  p.email,
  p.ats_role,
  p.department,
  COUNT(DISTINCT r.id) as managed_requisitions
FROM profiles p
LEFT JOIN requisitions r ON r.hiring_manager_id = p.user_id
WHERE p.ats_role IS NOT NULL
GROUP BY p.user_id, p.full_name, p.email, p.ats_role, p.department
ORDER BY p.ats_role, p.full_name;
```

#### Get Group Members
```sql
SELECT 
  og.name as group_name,
  p.full_name as member_name,
  p.email,
  gm.role
FROM owner_groups og
JOIN group_members gm ON gm.group_id = og.id
JOIN profiles p ON p.user_id = gm.user_id
WHERE og.id = 'group_uuid_here'
ORDER BY gm.role, p.full_name;
```

---

## 🛠️ Utility Functions

### Check if User Has ATS Role
```sql
SELECT has_ats_role('ADMIN'::ats_role);
SELECT has_ats_role('TA_ADMIN'::ats_role);
```

### Get Current User ID
```sql
SELECT auth.uid();
```

### Update Timestamps (Automatic via Trigger)
```sql
-- Triggers automatically update 'updated_at' on:
-- requisitions, ats_candidates, applications, ats_interviews, 
-- interview_feedback, compensation_private
```

---

## 📝 Notes

- All queries respect Row Level Security (RLS) policies
- Use parameterized queries to prevent SQL injection
- Replace `'uuid_here'` with actual UUIDs
- Timestamps are in UTC (timestamptz)
- JSON aggregations may return `null` if no related records exist
- Use `FILTER (WHERE ...)` for conditional aggregations
- Always test queries in development before production

---

**Last Updated**: January 2026
