/*
  # Create mood_logs table for Snap-My-Mood feature

  1. New Tables
    - `mood_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `pet_id` (uuid, foreign key to pets)
      - `mood` (text, detected mood state)
      - `confidence` (double precision, 0-1 confidence score)
      - `cues` (text array, visual cues detected)
      - `advice` (text, AI-generated advice)
      - `context` (text, optional user context)
      - `image_url` (text, optional image URL)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `mood_logs` table
    - Add policies for users to manage their own mood logs

  3. Performance
    - Add indexes for user_id, pet_id, created_at, and mood columns
*/

-- Create mood_logs table
CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  mood text NOT NULL,
  confidence double precision NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  cues text[] NOT NULL DEFAULT '{}',
  advice text NOT NULL,
  context text,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id ON mood_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_pet_id ON mood_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_created_at ON mood_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_logs_mood ON mood_logs(mood);

-- Enable Row Level Security
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own mood logs" ON mood_logs;
DROP POLICY IF EXISTS "Users can insert their own mood logs" ON mood_logs;
DROP POLICY IF EXISTS "Users can update their own mood logs" ON mood_logs;
DROP POLICY IF EXISTS "Users can delete their own mood logs" ON mood_logs;

-- Create policies for mood_logs
CREATE POLICY "Users can view their own mood logs"
  ON mood_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert their own mood logs"
  ON mood_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update their own mood logs"
  ON mood_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can delete their own mood logs"
  ON mood_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));