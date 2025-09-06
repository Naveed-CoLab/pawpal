// API Configuration for VetPaw
// Now uses dynamic API keys from secure edge function

import { apiKeysService } from '../lib/apiKeysService';

// Dynamic API Configuration Class
class DynamicApiConfig {
  private static instance: DynamicApiConfig;
  private keysCache: any = null;
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  private constructor() {}

  static getInstance(): DynamicApiConfig {
    if (!DynamicApiConfig.instance) {
      DynamicApiConfig.instance = new DynamicApiConfig();
    }
    return DynamicApiConfig.instance;
  }

  // Public accessor for cached config (read-only usage)
  public getCachedConfig() {
    return this.keysCache;
  }

  // Public accessor for fallback config
  public getFallbackConfigPublic() {
    return this.getFallbackConfig();
  }

  // Get fresh configuration with dynamic API keys
  async getConfig() {
    // Return cached config if still fresh
    if (this.keysCache && (Date.now() - this.lastUpdate) < this.CACHE_DURATION) {
      return this.keysCache;
    }

    try {
      // Fetch latest API keys
      const keys = await apiKeysService.getApiKeys();
      
      // Log RevenueCat API key sources for debugging
      console.log('📊 RevenueCat API Key Sources:');
      console.log(`  🍎 Apple: ${keys.REVENUECAT_APPLE_API_KEY ? keys.REVENUECAT_APPLE_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
      console.log(`  🤖 Google: ${keys.REVENUECAT_GOOGLE_API_KEY ? keys.REVENUECAT_GOOGLE_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
      
      // Build configuration object (Tavus values hardcoded per request)
      const config = {
        // Gemini AI Configuration
        GEMINI: {
          API_KEY: keys.GEMINI_API_KEY || '',
          API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
          USE_FALLBACK_RESPONSES: !keys.GEMINI_API_KEY || keys.GEMINI_API_KEY === '',
          REQUEST_TIMEOUT: 30000, // 30 seconds
          MAX_RETRIES: 2,
        },

        // Tavus API Configuration
        TAVUS: {
          API_KEY: '8d3321dcac4947f0b7f57222d4a73c97',
          API_URL: 'https://tavusapi.com/v2',
          PERSONA_ID: 'p27952133091',
          REPLICA_ID: 'r9d30b0e55ac',
          // Force live mode since keys are provided
          USE_MOCK_MODE: false,
          SESSION_MAX_DURATION: 180, // 3 minutes in seconds
          AUTO_END_ON_SILENCE: 15, // 15 seconds of silence
          WEBHOOK_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/tavus-webhook` : 
            'https://tisdiucvwgvnvgggdwii.supabase.co/functions/v1/tavus-webhook',
          WEBSOCKET_URL: 'wss://tavusapi.com/v2/ws',
          MOBILE_WEBSOCKET_URL: 'wss://echo.websocket.org',
          RECONNECT_ATTEMPTS: 3,
          RECONNECT_DELAY: 2000,
          MOBILE_API_URL: 'https://api.tavus.io/v2',
          ENABLE_MOCK_VIDEO: true,
          MOCK_HLS_URL: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8',
          JAMES_AVATAR_URL: 'https://storage.googleapis.com/vetpaw-assets/james-avatar-loop.mp4',
        },

        // RevenueCat Configuration
        REVENUECAT: {
          APPLE_API_KEY: keys.REVENUECAT_APPLE_API_KEY || 'appl_your_ios_api_key_here',
          GOOGLE_API_KEY: keys.REVENUECAT_GOOGLE_API_KEY || 'goog_jnQKGTTAKjhBfTsMVOAIHosFbPH',
          USE_MOCK_MODE: false,
        },

        // ElevenLabs Configuration
        ELEVENLABS: {
          API_KEY: keys.ELEVENLABS_API_KEY || 'your-elevenlabs-api-key-here',
          API_URL: 'https://api.elevenlabs.io/v1',
          USE_MOCK_MODE: !keys.ELEVENLABS_API_KEY || keys.ELEVENLABS_API_KEY === 'your-elevenlabs-api-key-here',
        },

        // OpenAI Configuration
        OPENAI: {
          API_KEY: keys.OPENAI_API_KEY || 'your-openai-api-key-here',
          API_URL: 'https://api.openai.com/v1',
          USE_MOCK_MODE: !keys.OPENAI_API_KEY || keys.OPENAI_API_KEY === 'your-openai-api-key-here',
        },

        // General Configuration
        GENERAL: {
          REQUEST_TIMEOUT: 30000,
          MAX_RETRIES: 3,
          RETRY_DELAY: 1000,
        }
      };

      // Update cache
      this.keysCache = config;
      this.lastUpdate = Date.now();

      return config;
    } catch (error) {
      console.error('Failed to get dynamic API config:', error);
      
      // Return fallback configuration with environment variables (override Tavus with hardcoded values)
      const fallback = this.getFallbackConfig();
      fallback.TAVUS.API_KEY = '8d3321dcac4947f0b7f57222d4a73c97';
      fallback.TAVUS.PERSONA_ID = 'p27952133091';
      fallback.TAVUS.REPLICA_ID = 'r9d30b0e55ac';
      fallback.TAVUS.USE_MOCK_MODE = false;
      return fallback;
    }
  }

  // Fallback to environment variables if dynamic loading fails
  private getFallbackConfig() {
    return {
      GEMINI: {
        API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
        API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        USE_FALLBACK_RESPONSES: !process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY === '',
        REQUEST_TIMEOUT: 30000,
        MAX_RETRIES: 2,
      },
      TAVUS: {
        API_KEY: process.env.EXPO_PUBLIC_TAVUS_API_KEY || 'your-tavus-api-key-here',
        API_URL: 'https://tavusapi.com/v2',
        PERSONA_ID: process.env.EXPO_PUBLIC_TAVUS_PERSONA_ID || 'james-vet-coach',
        REPLICA_ID: process.env.EXPO_PUBLIC_TAVUS_REPLICA_ID || process.env.EXPO_PUBLIC_TAVUS_PERSONA_ID || 'james-vet-coach',
        USE_MOCK_MODE: !process.env.EXPO_PUBLIC_TAVUS_API_KEY || process.env.EXPO_PUBLIC_TAVUS_API_KEY === 'your-tavus-api-key-here',
        SESSION_MAX_DURATION: 180,
        AUTO_END_ON_SILENCE: 15,
        WEBHOOK_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/tavus-webhook` : 
          'https://tisdiucvwgvnvgggdwii.supabase.co/functions/v1/tavus-webhook',
        WEBSOCKET_URL: 'wss://tavusapi.com/v2/ws',
        MOBILE_WEBSOCKET_URL: 'wss://echo.websocket.org',
        RECONNECT_ATTEMPTS: 3,
        RECONNECT_DELAY: 2000,
        MOBILE_API_URL: 'https://api.tavus.io/v2',
        ENABLE_MOCK_VIDEO: true,
        MOCK_HLS_URL: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8',
        JAMES_AVATAR_URL: 'https://storage.googleapis.com/vetpaw-assets/james-avatar-loop.mp4',
      },
      REVENUECAT: {
        APPLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY || 'appl_your_ios_api_key_here',
        GOOGLE_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY || 'goog_jnQKGTTAKjhBfTsMVOAIHosFbPH',
        USE_MOCK_MODE: false,
      },
      ELEVENLABS: {
        API_KEY: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || 'your-elevenlabs-api-key-here',
        API_URL: 'https://api.elevenlabs.io/v1',
        USE_MOCK_MODE: true,
      },
      OPENAI: {
        API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'your-openai-api-key-here',
        API_URL: 'https://api.openai.com/v1',
        USE_MOCK_MODE: true,
      },
      GENERAL: {
        REQUEST_TIMEOUT: 30000,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
      }
    };
  }

  // Force refresh configuration
  async refreshConfig() {
    this.keysCache = null;
    this.lastUpdate = 0;
    await apiKeysService.refreshApiKeys();
    return this.getConfig();
  }
}

// Create singleton instance
const dynamicApiConfig = DynamicApiConfig.getInstance();

// Legacy synchronous API for backward compatibility
// Note: This will use cached values or fallback to environment variables
export const ApiConfig = new Proxy({}, {
  get(target, prop) {
    // For immediate access, use cached config or fallback
    const instance = DynamicApiConfig.getInstance();
    const cached = instance.getCachedConfig();
    if (cached) {
      return (cached as any)[prop as string];
    }

    // Return fallback config for immediate access
    const fallback = instance.getFallbackConfigPublic();
    return (fallback as any)[prop as string];
  }
});

// New async API for getting fresh configuration
export const getApiConfig = () => dynamicApiConfig.getConfig();
export const refreshApiConfig = () => dynamicApiConfig.refreshConfig();

// Helper functions for API configuration (now async)
export const isApiConfigured = async (service: string) => {
  const config = await dynamicApiConfig.getConfig();
  
  switch (service) {
    case 'GEMINI':
      return !!config.GEMINI.API_KEY && !config.GEMINI.USE_FALLBACK_RESPONSES && validateGeminiApiKey(config.GEMINI.API_KEY);
    case 'TAVUS':
      return !config.TAVUS.USE_MOCK_MODE;
    case 'REVENUECAT':
      return !config.REVENUECAT.USE_MOCK_MODE;
    case 'ELEVENLABS':
      return !config.ELEVENLABS.USE_MOCK_MODE;
    case 'OPENAI':
      return !config.OPENAI.USE_MOCK_MODE;
    default:
      return false;
  }
};

export const getApiStatus = async () => {
  return {
    gemini: await isApiConfigured('GEMINI'),
    tavus: await isApiConfigured('TAVUS'),
    revenuecat: await isApiConfigured('REVENUECAT'),
    elevenlabs: await isApiConfigured('ELEVENLABS'),
    openai: await isApiConfigured('OPENAI'),
  };
};

// Validate API key format for Gemini
export const validateGeminiApiKey = (apiKey: string): boolean => {
  return apiKey.startsWith('AIza') && apiKey.length === 39;
};

// Initialize and log API configuration status (for debugging)
if (__DEV__) {
  // Use timeout to allow async initialization
  setTimeout(async () => {
    try {
      const status = await getApiStatus();
      console.log('🔧 Dynamic API Configuration Status:', status);
      
      const config = await dynamicApiConfig.getConfig();
      
      if (!status.gemini) {
        console.log('⚠️ Gemini API not configured - using fallback responses');
        if (config.GEMINI.API_KEY) {
          const isValidKey = validateGeminiApiKey(config.GEMINI.API_KEY);
          console.log(`🔑 Gemini API key validation: ${isValidKey ? 'VALID' : 'INVALID'}`);
          if (!isValidKey) {
            console.log('❌ Gemini API key format is incorrect. Expected format: AIza... (39 characters)');
          }
        } else {
          console.log('❌ No Gemini API key found');
        }
      }
      if (!status.tavus) console.log('⚠️ Tavus API not configured - using mock mode');
      if (!status.revenuecat) console.log('⚠️ RevenueCat not configured - using mock mode');
      if (!status.elevenlabs) console.log('⚠️ ElevenLabs not configured - using mock mode');
      if (!status.openai) console.log('⚠️ OpenAI not configured - using mock mode');
      
      console.log('🔄 API keys are now dynamically loaded and can be updated without app rebuild!');
    } catch (error) {
      console.error('Failed to initialize dynamic API config:', error);
    }
  }, 1000);
}