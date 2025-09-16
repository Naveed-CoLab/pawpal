// API Keys Service
// Fetches API keys securely from Supabase Edge Function
// Provides caching and fallback to environment variables

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiKeysResponse {
  success: boolean;
  keys?: Record<string, string>;
  error?: string;
  cached_at?: string;
}

interface ApiKeys {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  TAVUS_API_KEY: string;
  TAVUS_PERSONA_ID: string;
  TAVUS_REPLICA_ID: string;
  REVENUECAT_APPLE_API_KEY: string;
  REVENUECAT_GOOGLE_API_KEY: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_REDIRECT_URI: string;
  WEBHOOK_SECRET: string;
}

class ApiKeysService {
  private static instance: ApiKeysService;
  private apiKeys: ApiKeys | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'api_keys_cache';
  private readonly STORAGE_TIMESTAMP_KEY = 'api_keys_timestamp';
  private fetchPromise: Promise<ApiKeys> | null = null;

  private constructor() {}

  static getInstance(): ApiKeysService {
    if (!ApiKeysService.instance) {
      ApiKeysService.instance = new ApiKeysService();
    }
    return ApiKeysService.instance;
  }

  // Get fallback keys from environment variables
  private getFallbackKeys(): ApiKeys {
    // Per requirement: Do NOT use env for external AI keys. Only RevenueCat can be hardcoded from env.
    const fallbackKeys = {
      GEMINI_API_KEY: '',
      OPENAI_API_KEY: '',
      ELEVENLABS_API_KEY: '',
      TAVUS_API_KEY: '',
      TAVUS_PERSONA_ID: '',
      TAVUS_REPLICA_ID: '',
      REVENUECAT_APPLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || '',
      REVENUECAT_GOOGLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || '',
      GOOGLE_OAUTH_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '272010092004-la0167jf3d6o7f7g6hc50961ll7m7ujr.apps.googleusercontent.com',
      GOOGLE_OAUTH_REDIRECT_URI: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 'vetpaw://auth/callback',
      WEBHOOK_SECRET: '',
    } as ApiKeys;

    return fallbackKeys;
  }

  // Load cached keys from AsyncStorage
  private async loadCachedKeys(): Promise<ApiKeys | null> {
    try {
      const [cachedKeys, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY),
        AsyncStorage.getItem(this.STORAGE_TIMESTAMP_KEY)
      ]);

      if (!cachedKeys || !cachedTimestamp) {
        return null;
      }

      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();

      // Check if cache is still valid
      if (now - timestamp < this.CACHE_DURATION) {
        console.log('📱 Using cached API keys');
        this.lastFetchTime = timestamp;
        return JSON.parse(cachedKeys);
      }

      return null;
    } catch (error) {
      console.error('Failed to load cached API keys:', error);
      return null;
    }
  }

  // Save keys to AsyncStorage
  private async saveCachedKeys(keys: ApiKeys): Promise<void> {
    try {
      const timestamp = Date.now();
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys)),
        AsyncStorage.setItem(this.STORAGE_TIMESTAMP_KEY, timestamp.toString())
      ]);
      this.lastFetchTime = timestamp;
    } catch (error) {
      console.error('Failed to save API keys to cache:', error);
    }
  }

  // Fetch keys from edge function
  private async fetchKeysFromServer(): Promise<ApiKeys> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('🔑 API Keys Debug - Session check:');
      console.log('- Session error:', sessionError);
      console.log('- Has session:', !!session);
      console.log('- Session user:', session?.user?.email);
      console.log('- Token expires:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown');
      
      // Try invoke even if session is missing (function may allow anon); otherwise fall back to RC-only env

      // Use existing Supabase client to invoke edge function with auth
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const { data: result, error: invokeError } = await supabase.functions.invoke('api-keys', {
        // Default method is POST; include auth headers explicitly
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          ...(anonKey ? { apikey: anonKey } : {}),
        },
      }) as { data: ApiKeysResponse | null; error: any };

      if (invokeError || !result) {
        throw new Error(invokeError?.message || 'Invoke failed');
      }

      if (!result.success || !result.keys) {
        throw new Error(result.error || 'Failed to fetch API keys');
      }

      console.log('🔑 Successfully fetched API keys from server');
      console.log('📋 Keys received:', Object.keys(result.keys || {}));
      
      // Log RevenueCat specific keys for debugging
      const keys = result.keys as unknown as ApiKeys;
      console.log('💰 RevenueCat Keys Status:');
      console.log(`  🍎 Apple: ${keys.REVENUECAT_APPLE_API_KEY ? keys.REVENUECAT_APPLE_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
      console.log(`  🤖 Google: ${keys.REVENUECAT_GOOGLE_API_KEY ? keys.REVENUECAT_GOOGLE_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
      
      return keys;

    } catch (error) {
      console.error('Failed to fetch API keys from server:', error);
      return this.getFallbackKeys();
    }
  }

  // Main method to get API keys
  async getApiKeys(): Promise<ApiKeys> {
    // Return cached keys if available and fresh
    if (this.apiKeys && (Date.now() - this.lastFetchTime) < this.CACHE_DURATION) {
      console.log('🗂️ Using cached API keys (cache age:', Math.round((Date.now() - this.lastFetchTime) / 1000), 'seconds)');
      return this.apiKeys;
    }

    // If there's already a fetch in progress, wait for it
    if (this.fetchPromise) {
      console.log('⏳ API keys fetch already in progress, waiting...');
      return this.fetchPromise;
    }

    // Start a new fetch
    this.fetchPromise = this.performFetch();
    
    try {
      this.apiKeys = await this.fetchPromise;
      return this.apiKeys;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async performFetch(): Promise<ApiKeys> {
    // Try to load from cache first
    const cachedKeys = await this.loadCachedKeys();
    if (cachedKeys) {
      this.apiKeys = cachedKeys;
      return cachedKeys;
    }

    // Fetch from server
    const keys = await this.fetchKeysFromServer();
    
    // Save to cache
    await this.saveCachedKeys(keys);
    
    return keys;
  }

  // Get specific API key
  async getApiKey(keyName: keyof ApiKeys): Promise<string> {
    const keys = await this.getApiKeys();
    return keys[keyName] || '';
  }

  // Force refresh API keys
  async refreshApiKeys(): Promise<ApiKeys> {
    console.log('🔄 FORCE REFRESH: Clearing all caches and fetching fresh API keys...');
    
    this.apiKeys = null;
    this.lastFetchTime = 0;
    this.fetchPromise = null;
    
    // Clear cache
    try {
      await AsyncStorage.multiRemove([this.STORAGE_KEY, this.STORAGE_TIMESTAMP_KEY]);
      console.log('🗑️ Cleared AsyncStorage cache');
    } catch (error) {
      console.error('Failed to clear API keys cache:', error);
    }
    
    const keys = await this.getApiKeys();
    console.log('✅ Fresh API keys obtained');
    console.log('🔑 New RevenueCat Google Key:', keys.REVENUECAT_GOOGLE_API_KEY ? keys.REVENUECAT_GOOGLE_API_KEY.substring(0, 15) + '...' : 'NOT SET');
    return keys;
  }

  // Check if keys are configured (not empty)
  async isConfigured(keyName: keyof ApiKeys): Promise<boolean> {
    const key = await this.getApiKey(keyName);
    return key !== '' && key !== 'your-' + keyName.toLowerCase().replace('_', '-') + '-here';
  }

  // Get configuration status for all services
  async getConfigurationStatus() {
    const keys = await this.getApiKeys();
    
    return {
      gemini: keys.GEMINI_API_KEY !== '' && keys.GEMINI_API_KEY.startsWith('AIza'),
      tavus: keys.TAVUS_API_KEY !== '' && keys.TAVUS_API_KEY !== 'your-tavus-api-key-here',
      openai: keys.OPENAI_API_KEY !== '' && keys.OPENAI_API_KEY !== 'your-openai-api-key-here',
      elevenlabs: keys.ELEVENLABS_API_KEY !== '' && keys.ELEVENLABS_API_KEY !== 'your-elevenlabs-api-key-here',
      revenuecat_apple: keys.REVENUECAT_APPLE_API_KEY !== '',
      revenuecat_google: keys.REVENUECAT_GOOGLE_API_KEY !== '',
      google_oauth: keys.GOOGLE_OAUTH_CLIENT_ID !== '' && keys.GOOGLE_OAUTH_CLIENT_ID.includes('.apps.googleusercontent.com'),
    };
  }

  // Convenience methods for Google OAuth
  async getGoogleOAuthConfig(): Promise<{ clientId: string; redirectUri: string }> {
    const keys = await this.getApiKeys();
    return {
      clientId: keys.GOOGLE_OAUTH_CLIENT_ID,
      redirectUri: keys.GOOGLE_OAUTH_REDIRECT_URI,
    };
  }
}

// Export singleton instance
export const apiKeysService = ApiKeysService.getInstance();
export type { ApiKeys }; 