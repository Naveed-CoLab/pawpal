/*
  # Tavus Coaching Module Database Schema

  1. New Features
    - Add session_type enum to distinguish chat vs coaching sessions
    - Extend chats table with coaching-specific columns
    - Add functions for coaching session management
    - Create coaching session statistics view
    - Add coaching-specific badges

  2. Schema Changes
    - session_type: enum ('chat', 'coaching')
    - summary_data: jsonb for AI-generated summaries
    - coaching_metadata: jsonb for session details
    - session_duration: integer (seconds)
    - session_rating: integer (1-5 stars)

  3. Security
    - Update RLS policies to handle coaching sessions
    - Maintain user data isolation

  4. Performance
    - Add indexes for coaching session queries
    - Optimize for session type filtering
*/

-- Create enum for session types (drop first if exists to avoid conflicts)
DROP TYPE IF EXISTS chat_session_type CASCADE;
CREATE TYPE chat_session_type AS ENUM ('chat', 'coaching');

-- Add new columns to chats table
DO $$
BEGIN
  -- Add session_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE chats ADD COLUMN session_type chat_session_type DEFAULT 'chat';
  END IF;

  -- Add summary_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'summary_data'
  ) THEN
    ALTER TABLE chats ADD COLUMN summary_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add coaching_metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'coaching_metadata'
  ) THEN
    ALTER TABLE chats ADD COLUMN coaching_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add session_duration column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'session_duration'
  ) THEN
    ALTER TABLE chats ADD COLUMN session_duration integer DEFAULT 0;
  END IF;

  -- Add session_rating column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'session_rating'
  ) THEN
    ALTER TABLE chats ADD COLUMN session_rating integer CHECK (session_rating >= 1 AND session_rating <= 5);
  END IF;
END $$;

-- Create indexes for coaching sessions
CREATE INDEX IF NOT EXISTS idx_chats_session_type ON chats(session_type);
CREATE INDEX IF NOT EXISTS idx_chats_session_type_user ON chats(user_id, session_type);
CREATE INDEX IF NOT EXISTS idx_chats_coaching_created ON chats(created_at DESC) WHERE session_type = 'coaching';

-- Drop all existing policies on chats table to recreate them properly
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies for the chats table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'chats' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON chats';
    END LOOP;
END $$;

-- Create comprehensive RLS policies for chats including coaching
CREATE POLICY "Users can view own chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update own chats"
  ON chats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can delete own chats"
  ON chats
  FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Function to create coaching session with proper metadata
CREATE OR REPLACE FUNCTION create_coaching_session(
  p_user_id uuid,
  p_title text DEFAULT NULL,
  p_coaching_topic text DEFAULT NULL,
  p_pet_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  session_id uuid;
  default_title text;
BEGIN
  -- Generate default title if not provided
  IF p_title IS NULL THEN
    default_title := 'Coaching Session ' || to_char(now(), 'MM/DD/YYYY');
  ELSE
    default_title := p_title;
  END IF;

  -- Insert coaching session
  INSERT INTO chats (
    user_id,
    title,
    session_type,
    coaching_metadata
  ) VALUES (
    p_user_id,
    default_title,
    'coaching',
    jsonb_build_object(
      'topic', COALESCE(p_coaching_topic, 'general'),
      'pet_id', p_pet_id,
      'status', 'active',
      'started_at', now()
    )
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end coaching session and generate summary
CREATE OR REPLACE FUNCTION end_coaching_session(
  p_session_id uuid,
  p_summary_data jsonb DEFAULT NULL,
  p_duration integer DEFAULT NULL,
  p_rating integer DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  UPDATE chats 
  SET 
    summary_data = COALESCE(p_summary_data, summary_data),
    session_duration = COALESCE(p_duration, session_duration),
    session_rating = COALESCE(p_rating, session_rating),
    coaching_metadata = coaching_metadata || jsonb_build_object(
      'status', 'completed',
      'ended_at', now()
    ),
    updated_at = now()
  WHERE id = p_session_id 
    AND session_type = 'coaching';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for coaching session statistics
CREATE OR REPLACE VIEW coaching_session_stats AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE coaching_metadata->>'status' = 'completed') as completed_sessions,
  AVG(session_duration) FILTER (WHERE session_duration > 0) as avg_duration,
  AVG(session_rating) FILTER (WHERE session_rating IS NOT NULL) as avg_rating,
  MAX(created_at) as last_session_date,
  MIN(created_at) as first_session_date
FROM chats
WHERE session_type = 'coaching'
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON coaching_session_stats TO authenticated;

--- Update the coaching badge criteria
UPDATE badges 
SET description = 'You''ve completed your first coaching session with VetPaw AI!'
WHERE name = 'Chat Master';

-- Insert coaching-specific badges using icon instead of image_url
INSERT INTO badges (name, description, icon, category, points) VALUES
  ('Coaching Rookie', 'Completed your first live coaching session!', '🎯', 'coaching', 25),
  ('Coaching Pro', 'Completed 5 coaching sessions. You''re getting the hang of it!', '🏆', 'coaching', 75),
  ('Coaching Master', 'Completed 10 coaching sessions. You''re a true pet parent!', '👑', 'coaching', 150)
ON CONFLICT (name) DO NOTHING;
