ALTER TABLE public.hiring_surveys ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
