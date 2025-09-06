// Secure API Keys Management Edge Function
// API keys are stored as Supabase secrets (environment variables)
// This function provides secure access to keys for the mobile app

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApiKeyResponse {
  success: boolean;
  keys?: Record<string, string>;
  error?: string;
  cached_at?: string;
}

// Cache for API keys to avoid reading env variables on every request
let apiKeysCache: Record<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client for auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check cache first
    const now = Date.now()
    if (apiKeysCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          keys: apiKeysCache,
          cached_at: new Date(cacheTimestamp).toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Read API keys from environment secrets
    const apiKeys = {
      // AI Services
      GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY') || '',
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
      ELEVENLABS_API_KEY: Deno.env.get('ELEVENLABS_API_KEY') || '',
      
      // Tavus Video Coaching
      TAVUS_API_KEY: Deno.env.get('TAVUS_API_KEY') || '',
      TAVUS_PERSONA_ID: Deno.env.get('TAVUS_PERSONA_ID') || 'james-vet-coach',
      TAVUS_REPLICA_ID: Deno.env.get('TAVUS_REPLICA_ID') || 'james-vet-coach',
      
      // RevenueCat Subscriptions
      REVENUECAT_APPLE_API_KEY: Deno.env.get('REVENUECAT_APPLE_API_KEY') || '',
      REVENUECAT_GOOGLE_API_KEY: Deno.env.get('REVENUECAT_GOOGLE_API_KEY') || '',
      
      // Google OAuth Configuration
      GOOGLE_OAUTH_CLIENT_ID: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '',
      GOOGLE_OAUTH_REDIRECT_URI: Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI') || 'vetpaw://auth/callback',
      
      // Additional configuration
      WEBHOOK_SECRET: Deno.env.get('WEBHOOK_SECRET') || '',
    }

    // Update cache
    apiKeysCache = apiKeys
    cacheTimestamp = now

    // Return API keys
    const response: ApiKeyResponse = {
      success: true,
      keys: apiKeys,
      cached_at: new Date(cacheTimestamp).toISOString()
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('API Keys function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 