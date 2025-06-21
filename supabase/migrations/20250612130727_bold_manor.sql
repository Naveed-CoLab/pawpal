/*
  # Add missing columns to users table

  1. Changes
    - Add `full_name` column to users table (text, nullable)
    - Add `name` column to users table (text, nullable) 
    - Add `avatar_url` column to users table (text, nullable)
    - Add `provider` column to users table (text, not null, default 'email')
    - Add `provider_id` column to users table (text, nullable)
    - Add `last_login` column to users table (timestamptz, default now())

  2. Notes
    - These columns are required by the AuthService in lib/auth.ts
    - All columns are nullable except provider to maintain data integrity
    - Default values are set where appropriate
*/

-- Add missing columns to users table
DO $$
BEGIN
  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name text;
  END IF;

  -- Add name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users ADD COLUMN name text;
  END IF;

  -- Add avatar_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;

  -- Add provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'provider'
  ) THEN
    ALTER TABLE users ADD COLUMN provider text NOT NULL DEFAULT 'email';
  END IF;

  -- Add provider_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE users ADD COLUMN provider_id text;
  END IF;

  -- Add last_login column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing users to have a name if they don't have one
UPDATE users 
SET name = COALESCE(name, split_part(email, '@', 1))
WHERE name IS NULL;

-- Update existing users to have last_login set to created_at if not set
UPDATE users 
SET last_login = COALESCE(last_login, created_at)
WHERE last_login IS NULL;