import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req: Request) => {
  const { search = '', status = [], owner_groups = [], assignees = [] } = await req.json().catch(() => ({}));

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  let query = supabase.from('tasks').select('*');

  if (search) {
    query = query.ilike('task_name', `%${search}%`)
      .or(`candidate_name.ilike.%${search}%,task_description.ilike.%${search}%`);
  }
  if (Array.isArray(status) && status.length > 0) {
    query = query.in('task_status', status);
  }
  if (Array.isArray(owner_groups) && owner_groups.length > 0) {
    query = query.in('owner_group_name', owner_groups);
  }
  if (Array.isArray(assignees) && assignees.length > 0) {
    query = query.in('assignee_name', assignees);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
