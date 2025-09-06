-- Fix foreign key constraint for ai_coaching_sessions table
-- Change from auth.users(id) to users(id) reference

-- Drop the existing foreign key constraint
ALTER TABLE ai_coaching_sessions 
DROP CONSTRAINT IF EXISTS ai_coaching_sessions_user_id_fkey;

-- Add the new foreign key constraint referencing custom users table
ALTER TABLE ai_coaching_sessions 
ADD CONSTRAINT ai_coaching_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verify the constraint was created successfully
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='ai_coaching_sessions'
  AND kcu.column_name='user_id'; 