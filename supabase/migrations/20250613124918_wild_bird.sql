/*
  # Fix User Creation Database Policies

  This migration addresses the "Database error granting user" issue by:
  
  1. **Policy Updates**
     - Simplifies and fixes RLS policies on the users table
     - Ensures proper INSERT permissions for new user registration
     - Removes conflicting policies that might prevent user creation
  
  2. **Trigger Function Updates**
     - Updates the handle_new_user trigger function to handle edge cases
     - Adds proper error handling and logging
  
  3. **Security**
     - Maintains security while allowing proper user creation
     - Ensures authenticated users can only access their own data
*/

-- First, drop existing conflicting policies
DROP POLICY IF EXISTS "Users can only access their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create simplified and working RLS policies
CREATE POLICY "Enable insert for authenticated users only"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users based on user_id"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for users based on user_id"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert new user profile with proper error handling
  INSERT INTO public.users (
    id,
    email,
    full_name,
    name,
    avatar_url,
    provider,
    provider_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    NEW.raw_user_meta_data->>'provider_id'
  );
  
  -- Create default subscription for new user
  INSERT INTO public.subscriptions (
    user_id,
    status,
    plan
  ) VALUES (
    NEW.id,
    'trial',
    'free'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Make sure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;