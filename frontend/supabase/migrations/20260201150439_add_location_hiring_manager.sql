-- 1. Remove duplicate profiles if they exist (keeping the oldest record)
DELETE FROM profiles a USING profiles b 
WHERE a.user_id = b.user_id 
  AND a.created_at > b.created_at;

-- 2. If timestamps are identical, use the ID as a tie-breaker
DELETE FROM profiles a USING profiles b 
WHERE a.user_id = b.user_id 
  AND a.id > b.id;

-- 3. Add the unique constraint required for the foreign key
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique_for_fk UNIQUE (user_id);

-- 4. Add the columns to the candidates table
ALTER TABLE candidates ADD COLUMN location TEXT;
ALTER TABLE candidates ADD COLUMN hiring_manager UUID REFERENCES profiles(user_id);