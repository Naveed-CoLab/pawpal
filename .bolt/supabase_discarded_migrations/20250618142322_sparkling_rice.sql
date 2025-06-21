/*
  # VetPaw AI Coach System Database Schema

  1. New Tables
    - `coaching_sessions` - Main coaching session records
    - `coaching_messages` - Session transcript storage
    - `session_summaries` - AI-generated session summaries

  2. Security
    - Enable RLS on all coaching tables
    - Add policies for user data isolation

  3. Performance
    - Add indexes for efficient querying
    - Optimize for session type filtering
*/

-- Create coaching sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    tavus_session_id text,
    primary_concern text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create coaching messages table for transcript
CREATE TABLE IF NOT EXISTS coaching_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES coaching_sessions(id) ON DELETE CASCADE,
    speaker_type varchar(10) NOT NULL CHECK (speaker_type IN ('user', 'ai')),
    content text NOT NULL,
    timestamp timestamp with time zone DEFAULT now(),
    confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Create session summaries table
CREATE TABLE IF NOT EXISTS session_summaries (
    session_id uuid PRIMARY KEY REFERENCES coaching_sessions(id) ON DELETE CASCADE,
    urgency_level varchar(10) NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high')),
    primary_issue text NOT NULL,
    recommendations jsonb DEFAULT '[]'::jsonb,
    follow_up_steps jsonb DEFAULT '[]'::jsonb,
    analysis_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for coaching_sessions
CREATE POLICY "Users can view own coaching sessions"
  ON coaching_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own coaching sessions"
  ON coaching_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update own coaching sessions"
  ON coaching_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- Create RLS policies for coaching_messages
CREATE POLICY "Users can view own coaching messages"
  ON coaching_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (
    SELECT u.auth_user_id FROM users u 
    JOIN coaching_sessions cs ON u.id = cs.user_id 
    WHERE cs.id = session_id
  ));

CREATE POLICY "Users can insert own coaching messages"
  ON coaching_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (
    SELECT u.auth_user_id FROM users u 
    JOIN coaching_sessions cs ON u.id = cs.user_id 
    WHERE cs.id = session_id
  ));

-- Create RLS policies for session_summaries
CREATE POLICY "Users can view own session summaries"
  ON session_summaries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (
    SELECT u.auth_user_id FROM users u 
    JOIN coaching_sessions cs ON u.id = cs.user_id 
    WHERE cs.id = session_id
  ));

CREATE POLICY "Users can insert own session summaries"
  ON session_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (
    SELECT u.auth_user_id FROM users u 
    JOIN coaching_sessions cs ON u.id = cs.user_id 
    WHERE cs.id = session_id
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_status ON coaching_sessions(status);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_created_at ON coaching_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_messages_session_id ON coaching_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_coaching_messages_timestamp ON coaching_messages(timestamp);

-- Add trigger to update updated_at column
CREATE TRIGGER update_coaching_sessions_updated_at
BEFORE UPDATE ON coaching_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON coaching_sessions TO authenticated;
GRANT ALL ON coaching_messages TO authenticated;
GRANT ALL ON session_summaries TO authenticated;