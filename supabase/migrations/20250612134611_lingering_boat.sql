/*
  # Add full_name column to users table

  1. Changes
    - Add `full_name` column to `users` table as text type
    - Make it nullable to support existing users
    - Update the user creation trigger to handle full_name field

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add full_name column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name text;
  END IF;
END $$;

-- Update the trigger function to handle full_name if it exists
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, full_name, avatar_url, provider, provider_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN new.raw_app_meta_data->>'provider' = 'google' THEN 'google'::text
      WHEN new.raw_app_meta_data->>'provider' = 'facebook' THEN 'facebook'::text
      ELSE 'email'::text
    END,
    new.raw_user_meta_data->>'provider_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;