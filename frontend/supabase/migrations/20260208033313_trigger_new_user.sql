create or replace function public.create_new_profile_from_auth()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id, 
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

-- Ensure the trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_new_profile_from_auth();
