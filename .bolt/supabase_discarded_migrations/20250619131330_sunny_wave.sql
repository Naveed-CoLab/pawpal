-- Create mood_logs table for the Snap-My-Mood feature
CREATE TABLE IF NOT EXISTS mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  cues TEXT[] NOT NULL DEFAULT '{}',
  advice TEXT NOT NULL,
  context TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id ON mood_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_pet_id ON mood_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_created_at ON mood_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_logs_mood ON mood_logs(mood);

-- Enable Row Level Security
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

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