-- Create AI Coaching Sessions table for storing Tavus conversation results
-- This table will store complete session data including transcripts and AI-generated summaries

CREATE TABLE ai_coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT UNIQUE NOT NULL, -- Tavus conversation ID
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Link to custom user account
  
  -- Session Content
  transcript TEXT NOT NULL, -- Full conversation transcript
  summary TEXT, -- AI-generated summary text
  
  -- Structured Summary Data
  session_title TEXT NOT NULL DEFAULT 'Coaching Session',
  main_topic TEXT NOT NULL DEFAULT 'Dog Training',
  urgency_level TEXT CHECK (urgency_level IN ('low', 'moderate', 'high')) DEFAULT 'low',
  key_points TEXT[] DEFAULT '{}', -- Array of key discussion points
  recommendations TEXT[] DEFAULT '{}', -- Array of recommendations
  techniques_taught TEXT[] DEFAULT '{}', -- Array of techniques taught
  next_steps TEXT[] DEFAULT '{}', -- Array of next steps
  progress_notes TEXT DEFAULT '',
  follow_up_timeline TEXT DEFAULT '',
  
  -- Session Metadata
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'completed',
  duration_seconds INTEGER DEFAULT 0,
  
  -- Raw Data (for debugging and future analysis)
  raw_conversation_data JSONB, -- Raw Tavus conversation response
  raw_captions JSONB, -- Raw captions array from Tavus
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_ai_coaching_sessions_user_id ON ai_coaching_sessions(user_id);
CREATE INDEX idx_ai_coaching_sessions_conversation_id ON ai_coaching_sessions(conversation_id);
CREATE INDEX idx_ai_coaching_sessions_created_at ON ai_coaching_sessions(created_at DESC);
CREATE INDEX idx_ai_coaching_sessions_status ON ai_coaching_sessions(status);
CREATE INDEX idx_ai_coaching_sessions_urgency_level ON ai_coaching_sessions(urgency_level);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_coaching_sessions_updated_at 
  BEFORE UPDATE ON ai_coaching_sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE ai_coaching_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON ai_coaching_sessions
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions" ON ai_coaching_sessions
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON ai_coaching_sessions
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Service role can do everything (for webhook)
CREATE POLICY "Service role can manage all sessions" ON ai_coaching_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Create a view for easier querying of recent sessions
CREATE OR REPLACE VIEW recent_coaching_sessions AS
SELECT 
  id,
  conversation_id,
  user_id,
  session_title,
  main_topic,
  urgency_level,
  key_points,
  recommendations,
  status,
  duration_seconds,
  created_at
FROM ai_coaching_sessions
WHERE status = 'completed'
ORDER BY created_at DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON recent_coaching_sessions TO authenticated;
GRANT ALL ON ai_coaching_sessions TO authenticated;
GRANT ALL ON ai_coaching_sessions TO service_role; 