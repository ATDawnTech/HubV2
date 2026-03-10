-- Create asset_categories table
create table if not exists "public"."asset_categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    constraint "asset_categories_pkey" primary key ("id"),
    constraint "asset_categories_name_key" unique ("name")
);

-- Enable RLS
alter table "public"."asset_categories" enable row level security;
alter table "public"."assets" enable row level security;

-- Policies for asset_categories
create policy "Admin can manage asset_categories"
on "public"."asset_categories"
as permissive
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Policies for assets (Drop if exists to avoid errors on rerun)
drop policy if exists "Admin can manage assets" on "public"."assets";
create policy "Admin can manage assets"
on "public"."assets"
as permissive
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Data Migration Block
do $$
begin
    -- 1. Populate asset_categories from existing assets
    insert into "public"."asset_categories" ("name")
    select distinct "category" from "public"."assets"
    where "category" is not null
    on conflict ("name") do nothing;

    -- 2. Add temporary column if it doesn't exist
    if not exists (select 1 from information_schema.columns where table_name = 'assets' and column_name = 'category_id') then
        alter table "public"."assets" add column "category_id" uuid;
    end if;

    -- 3. Map existing categories to ids
    update "public"."assets" a
    set "category_id" = ac."id"
    from "public"."asset_categories" ac
    where a."category" = ac."name";

    -- 4. Constraint and Cleanup
    -- We drop the old category column and rename the new one.
    -- WARNING: This is a destructive operation.
    
    -- Only proceed if we have a category column that is NOT uuid (to make this idempotent-ish)
    if exists (select 1 from information_schema.columns where table_name = 'assets' and column_name = 'category' and data_type != 'uuid') then
        alter table "public"."assets" drop column "category";
        alter table "public"."assets" rename column "category_id" to "category";
    end if;
     
    -- If we already ran it, category is uuid, and category_id might be hanging around if we didn't rename it (unlikely with above logic) or if we are re-running.
    -- Let's just ensure the FK exists.

end $$;

-- 5. Add FK constraint (outside DO block for better DDL handling usually, but here it's fine)
-- We use a separate block or statement to ensure it applies to the final 'category' column
alter table "public"."assets" 
drop constraint if exists "assets_category_fkey";

alter table "public"."assets" 
add constraint "assets_category_fkey" 
foreign key ("category") 
references "public"."asset_categories" ("id") 
on update cascade;