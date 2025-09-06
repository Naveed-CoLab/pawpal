-- Fix RLS policies for ai_coaching_sessions table
-- This migration updates the existing policies to work with the correct user ID relationship

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON ai_coaching_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON ai_coaching_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON ai_coaching_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON ai_coaching_sessions;

-- Create corrected RLS policies
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