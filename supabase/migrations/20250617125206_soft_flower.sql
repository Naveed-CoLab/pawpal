/*
  # Add Coaching Sessions Table

  1. New Tables
    - `coaching_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `start_time` (timestamp with time zone)
      - `end_time` (timestamp with time zone, nullable)
      - `transcript` (jsonb, nullable)
      - `summary` (jsonb, nullable)
      - `status` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `coaching_sessions` table
    - Add policies for users to manage their own coaching sessions

  3. Triggers
    - Add trigger to update `updated_at` column automatically
*/

-- Create coaching_sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  transcript jsonb,
  summary jsonb,
  status text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert own coaching sessions"
  ON coaching_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can view own coaching sessions"
  ON coaching_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update own coaching sessions"
  ON coaching_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Add a trigger to update the `updated_at` column automatically
CREATE TRIGGER update_coaching_sessions_updated_at
BEFORE UPDATE ON coaching_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON coaching_sessions TO authenticated;