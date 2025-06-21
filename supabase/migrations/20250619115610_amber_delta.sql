/*
  # Fix User Profile Updates

  1. Updates
    - Add phone column to users table if it doesn't exist
    - Add constraint to validate phone numbers
    - Update RLS policies to allow proper user profile management
  
  2. Security
    - Ensure RLS is enabled on the users table
    - Create proper policies for authenticated users
*/

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text;
    
    -- Add constraint to validate phone numbers
    ALTER TABLE users ADD CONSTRAINT users_phone_check 
      CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$');
  END IF;
END $$;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable select for users on own profile" ON users;
DROP POLICY IF EXISTS "Enable update for users on own profile" ON users;
DROP POLICY IF EXISTS "Enable delete for users on own profile" ON users;
DROP POLICY IF EXISTS "Enable delete for users on own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for users" ON users;
DROP POLICY IF EXISTS "Enable select for users" ON users;
DROP POLICY IF EXISTS "Enable update for users" ON users;
DROP POLICY IF EXISTS "Enable delete for users" ON users;

-- Create new policies that allow proper user management
CREATE POLICY "Enable insert for authenticated users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable select for users on own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Enable update for users on own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Enable delete for users on own profile"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Ensure RLS is enabled on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;