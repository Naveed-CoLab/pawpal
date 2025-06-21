/*
  # Create users table for VetPaw authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `full_name` (text)
      - `avatar_url` (text, optional)
      - `provider` (enum: 'email', 'google', 'facebook')
      - `provider_id` (text, optional for social logins)
      - `created_at` (timestamp)
      - `last_login` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for users to update their own profile

  3. Indexes
    - Index on email for fast lookups
    - Index on provider_id for social login lookups
*/

-- Create enum for authentication providers
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'facebook');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  provider auth_provider NOT NULL DEFAULT 'email',
  provider_id text,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_provider_id_check CHECK (
    (provider = 'email' AND provider_id IS NULL) OR 
    (provider IN ('google', 'facebook') AND provider_id IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_provider_id_idx ON users(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to handle user creation/update on auth events
CREATE OR REPLACE FUNCTION handle_auth_user()
RETURNS trigger AS $$
BEGIN
  -- Insert or update user record
  INSERT INTO users (id, email, full_name, avatar_url, provider, provider_id, last_login)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN NEW.app_metadata->>'provider' = 'google' THEN 'google'::auth_provider
      WHEN NEW.app_metadata->>'provider' = 'facebook' THEN 'facebook'::auth_provider
      ELSE 'email'::auth_provider
    END,
    NEW.raw_user_meta_data->>'provider_id',
    now()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    last_login = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth events
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user();