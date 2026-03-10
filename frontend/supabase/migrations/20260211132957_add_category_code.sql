-- Add category_code to asset_categories
alter table "public"."asset_categories" 
add column "code" varchar(5) unique;

-- Add column owner to assets
alter table "public"."assets"
add column "owner" text;

-- Add column serial_number to assets
alter table "public"."assets"
add column "serial_number" text;

