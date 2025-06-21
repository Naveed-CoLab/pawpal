/*
  # Fix Users Table RLS Policies

  1. Security Policy Updates
    - Drop existing restrictive policies that prevent user creation
    - Add proper policies for authenticated users to manage their own profiles
    - Allow users to insert their own profile during signup
    - Allow users to update their own profile data
    - Allow users to select their own profile data
    - Allow users to delete their own profile

  2. Policy Details
    - INSERT: Allow authenticated users to create their own profile
    - SELECT: Allow authenticated users to read their own profile  
    - UPDATE: Allow authenticated users to update their own profile
    - DELETE: Allow authenticated users to delete their own profile

  This fixes the "new row violates row-level security policy" error during user registration.
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can select own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;

-- Create new policies that allow proper user management
CREATE POLICY "Enable insert for authenticated users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Enable select for users on own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Enable update for users on own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Enable delete for users on own profile"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Ensure RLS is enabled on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;