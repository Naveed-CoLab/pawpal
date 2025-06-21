/*
  # Fix Users Table RLS Policies

  1. Security Updates
    - Drop conflicting RLS policies on users table
    - Create consistent policies that work with auth_user_id field
    - Ensure authenticated users can manage their own profiles
    
  2. Policy Changes
    - Allow authenticated users to select their own profile using auth_user_id
    - Allow authenticated users to insert their own profile during signup
    - Allow authenticated users to update their own profile
    - Remove conflicting policies that use different field references
*/

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create consistent RLS policies using auth_user_id
CREATE POLICY "Users can select own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete own profile"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);