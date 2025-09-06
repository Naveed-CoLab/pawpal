-- Fix foreign key constraint for ai_coaching_sessions table
-- Change from auth.users(id) to users(id) reference

-- Drop the existing foreign key constraint
ALTER TABLE ai_coaching_sessions 
DROP CONSTRAINT IF EXISTS ai_coaching_sessions_user_id_fkey;

-- Add the new foreign key constraint referencing custom users table
ALTER TABLE ai_coaching_sessions 
ADD CONSTRAINT ai_coaching_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE; 