-- API Keys Management System
-- This migration creates a table to store API keys dynamically
-- so they can be updated from Supabase dashboard without app rebuilds

-- Create API Keys Management Table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_service_name ON public.api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_environment ON public.api_keys(environment);

-- Add RLS (Row Level Security)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for API keys access
-- Only authenticated users can read API keys (for the app to function)
CREATE POLICY "Allow authenticated read access" ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only service role can insert/update/delete API keys (for admin management)
CREATE POLICY "Allow service role full access" ON public.api_keys
  FOR ALL
  TO service_role
  USING (true);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_api_keys_updated_at_trigger
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- Insert default API key entries (initially empty, to be filled from dashboard)
INSERT INTO public.api_keys (service_name, api_key, description, environment) VALUES
  ('GEMINI', '', 'Google Gemini AI API Key for conversation processing', 'production'),
  ('TAVUS', '', 'Tavus API Key for video coaching sessions', 'production'),
  ('REVENUECAT_APPLE', '', 'RevenueCat Apple API Key for iOS subscriptions', 'production'),
  ('REVENUECAT_GOOGLE', '', 'RevenueCat Google API Key for Android subscriptions', 'production'),
  ('ELEVENLABS', '', 'ElevenLabs API Key for text-to-speech (future feature)', 'production'),
  ('OPENAI', '', 'OpenAI API Key as backup for Gemini', 'production'),
  ('TAVUS_PERSONA_ID', '', 'Tavus Persona ID for coaching sessions', 'production'),
  ('TAVUS_REPLICA_ID', '', 'Tavus Replica ID for video sessions', 'production')
ON CONFLICT (service_name) DO NOTHING; 